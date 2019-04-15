/* eslint-disable no-param-reassign */
import Promise from 'bluebird';
import {FirebaseMessagingError} from 'firebase-admin/lib/utils/error';
import {RaixPushError} from '../common/pushError';

/*
  A general purpose user CordovaPush
  ios, android, mail, twitter?, facebook?, sms?, snailMail? :)

  Phonegap generic :
  https://github.com/phonegap-build/PushPlugin
 */

// getText / getBinary

const ERROR_ACTION = {
  EMIT_ERROR: 'EMIT_ERROR',
  RESEND_NOTIFICATION: 'RESEND_NOTIFICATION',
  REMOVE_TOKEN: 'REMOVE_TOKEN'
};

Push.setBadge = function (/* id, count */) {
  // throw new Error('Push.setBadge not implemented on the server');
};

Push.FirebaseApps = {};

let isConfigured = false;

const defaults = {
  sendInterval: 5000
};

Push.Configure = function (options) {
  const self = this;

  let cfgOptions = _.extend(defaults, options);
  // https://npmjs.org/package/apn

  // After requesting the certificate from Apple, export your private key as
  // a .p12 file anddownload the .cer file from the iOS Provisioning Portal.

  // gateway.push.apple.com, port 2195
  // gateway.sandbox.push.apple.com, port 2195

  // Now, in the directory containing cert.cer and key.p12 execute the
  // following commands to generate your .pem files:
  // $ openssl x509 -in cert.cer -inform DER -outform PEM -out cert.pem
  // $ openssl pkcs12 -in key.p12 -out key.pem -nodes

  // Block multiple calls
  if (isConfigured) {
    console.warn('Push.Configure should only be called once.');
  }

  isConfigured = true;

  // Add debug info
  if (Push.debug) {
    console.log('Push: Push.Configure', options);
  }

  // This function is called when a token is replaced on a device - normally
  // this should not happen, but if it does we should take action on it
  _replaceToken = function (currentToken, newToken) {
    // console.log('Push: Replace token: ' + currentToken + ' -- ' + newToken);
    // If the server gets a token event its passing in the current token and
    // the new value - if new value is undefined this empty the token
    self.emitState('token', currentToken, newToken);
  };

  // Rig the removeToken callback
  _removeToken = function (token) {
    console.log('Push: Remove token: ' + token);
    // Invalidate the token
    self.emitState('token', token, null);
  };

  if (Push.debug) {
    console.log('Push: APN configured');
  }

  const useProductionCert = process.env.NODE_ENV === 'production';

  if (!useProductionCert) {
    console.log('Push: This is being configured in development mode');
  }

  const vets = GlobalVets.find({$or: [{disabled: {$exists: false}}, {disabled: false}], useFirebaseForMessaging: true}).fetch();
  vets.forEach((vet) => {
    Meteor.call('raix:configure-push-connections', vet._id);
  });

  // This interval will allow only one notification to be sent at a time, it
  // will check for new notifications at every `options.sendInterval`
  // (default interval is 15000 ms)
  //
  // It looks in notifications collection to see if theres any pending
  // notifications, if so it will try to reserve the pending notification.
  // If successfully reserved the send is started.
  //
  // If notification.query is type string, it's assumed to be a json string
  // version of the query selector. Making it able to carry `$` properties in
  // the mongo collection.
  //
  // Pr. default notifications are removed from the collection after send have
  // completed. Setting `options.keepNotifications` will update and keep the
  // notification eg. if needed for historical reasons.
  //
  // After the send have completed a "send" event will be emitted with a
  // status object containing notification id and the send result object.
  //
  let isSendingNotification = false;

  if (cfgOptions.sendInterval !== null && !(process.env.PUSH_NOTIFICATIONS_DISABLED === true || process.env.PUSH_NOTIFICATIONS_DISABLED === 'true')) {
    // This will require index since we sort notifications by createdAt
    Push.notifications._ensureIndex({createdAt: 1});

    Meteor.setInterval(function () {
      if (isSendingNotification) {
        return;
      }
      // Set send fence
      isSendingNotification = true;

      // var countSent = 0;
      const batchSize = cfgOptions.sendBatchSize || 100;

      // Find notifications that are not being or already sent
      const pendingNotifications = Push.notifications.find({
        $and: [
          // Message is not sent
          {sent: {$ne: true}},
          // And not being sent by other instances
          {sending: {$ne: true}},
          // And not queued for future
          {$or: [{delayUntil: {$exists: false}}, {delayUntil: {$lte: new Date()}}]},
          {useFirebaseForMessaging: true}
        ]
      }, {
        // Sort by created date
        sort: {createdAt: 1},
        limit: batchSize
      }).fetch();

      pendingNotifications.forEach(function (notification) {
        console.log('Push: Found notification, reserving...');

        if (process.env.NODE_ENV === 'development') {
          console.log('Push: DEV environment - not sending the notification', notification);
          return;
        }

        // Reserve notification
        const reserved = Push.notifications.update({
          $and: [
            // Try to reserve the current notification
            {_id: notification._id},
            // Make sure no other instances have reserved it
            {sending: {$ne: true}}
          ]
        }, {
          $set: {
            // Try to reserve
            sending: true
          }
        });

        // Make sure we only handle notifications reserved by this
        // instance
        if (reserved) {
          console.log('Push: Notification reserved, processing...');

          // Check if query is set and is type String
          if (notification.query && notification.query === '' + notification.query) {
            try {
              // The query is in string json format - we need to parse it
              notification.query = JSON.parse(notification.query);
            } catch (err) {
              // Did the user tamper with this??
              throw new Error('Push: Error while parsing query string, Error: ' + err.message);
            }
          }

          // Send the notification
          serverSend(notification)
            .then(Meteor.bindEnvironment(result => {
              let hasErrors = false;
              result.forEach(function (item) {
                if (!item.isFulfilled()) {
                  hasErrors = true;
                  handleFailedNotification(notification, item.reason());
                }
              });

              if (!cfgOptions.keepNotifications) {
                // Pr. Default we will remove notifications
                Push.notifications.remove({_id: notification._id});
              } else {

                // Update the notification
                Push.notifications.update({_id: notification._id}, {
                  $set: {
                    // Mark as sent
                    sent: true,
                    // Set the sent date
                    sentAt: new Date(),
                    // Not being sent anymore
                    sending: false,
                    success: !hasErrors
                  }
                });

              }

              // Emit the send
              self.emit('send', {notification: notification._id, result: result});
            }))
            .catch(Meteor.bindEnvironment(e => {
              console.log('Push: Error sending notification');
              if (e instanceof Error) {
                console.log(e.toString());
              } else {
                console.log(JSON.stringify(e));
              }

              handleSendNotificationException(notification, e);

            }));

        } // Else could not reserve

      }); // EO forEach

      // Remove the send fence
      isSendingNotification = false;
    }, cfgOptions.sendInterval || 5000); // Default every 15th sec
  } else if (Push.debug) {
    console.log('Push: Send server is disabled');
  }
};

function serverSend(raixNotification) {
  raixNotification = raixNotification || {};
  let query;

  // Check basic raixNotification
  if (typeof raixNotification.from !== 'string') {
    throw new Error('Push.send: option "from" not a string');
  }

  if (typeof raixNotification.title !== 'string' && typeof raixNotification.text !== 'string') {
    throw new Error('Push.send: option "title" and "text" are not a string');
  }

  /**
   * token is fcm token and tokens are array of fcm tokens
   */
  if (raixNotification.token || raixNotification.tokens) {
    // The user set one token or array of tokens
    const tokenList = (raixNotification.token) ? [raixNotification.token] : raixNotification.tokens;

    if (Push.debug) {
      console.log('Push: Send message "' + raixNotification.title + '" via token(s)', tokenList);
    }

    query = {
      $or: [
        // XXX: Test this query: can we hand in a list of push tokens?
        {
          $and: [
            {appName: raixNotification.appIdentifier},
            {fcmToken: {$in: tokenList}},
            // And is not disabled
            {enabled: {$ne: false}}
          ]
        },
        // XXX: Test this query: does this work on app id?
        {
          $and: [
            {appName: raixNotification.appIdentifier},
            {_in: {$in: tokenList}}, // one of the app ids
            {fcmToken: {$exists: true}},
            // And is not disabled
            {enabled: {$ne: false}}
          ]
        }
      ]
    };

  } else if (raixNotification.query) {
    if (Push.debug) {
      console.log('Push: Send message "' + raixNotification.title + '" via query', raixNotification.query);
    }

    query = {
      $and: [
        raixNotification.query, // query object
        {appName: raixNotification.appIdentifier},
        {enabled: {$ne: false}} // And is not disabled
      ]
    };
  }

  if (query) {
    // Convert to querySend and return status
    return querySend(query, raixNotification);
  } else if (raixNotification.topics) {
    return topicsSend(raixNotification.topics, raixNotification);
  } else {
    throw new Error('Push.send: please set option "token"/"tokens" or "query"');
  }
}

function querySend(query, raixNotification) {
  console.log('Push: Sending notifications for query: ', query);

  let firebasePromises = [];

  Push.appTokens.find(query).forEach(function (appToken) {
    console.log('Push: Iterating...', appToken);

    if (Push.debug) {
      console.log('Push: send to token', appToken.fcmToken);
    }

    if (appToken.fcmToken) {
      console.log('Push: appToken.fcmToken', 'passed');
      firebasePromises.push(new Promise((resolve, reject) => {
        fcmSingleMessage(appToken.fcmToken, raixNotification)
          .then(result => {
            resolve(_.extend(result, {tokenId: appToken._id, platform: appToken.platform}));
          })
          .catch(error => {
            reject(error);
          });
      }));
    } else {
      firebasePromises.push(Promise.reject(new RaixPushError(
        {
          code: 'push/no-fcm-token',
          message: `ERROR: PUSH.querySend - No fcm token:  ${JSON.stringify(appToken)}`
        },
        `ERROR: PUSH.querySend - No fcm token:  ${JSON.stringify(appToken)}`
      )));
    }

  });


  let allMessagesPromise = Promise.all(firebasePromises.map(function (promise) {
    return promise.reflect();
  }));

  if (Push.debug) {
    allMessagesPromise.then(result => {
      let androidCnt = 0;
      let iosCnt = 0;
      let unknownCnt = 0;
      let failedCnt = 0;

      result.forEach(function (item) {
        if (item.isFulfilled()) {
          if (item.value().platform) {
            androidCnt += /android/i.test(item.value().platform) ? 1 : 0;
            iosCnt += /ios/i.test(item.value().platform) ? 1 : 0;
            unknownCnt += (!item.value().platform) ? 1 : 0;
          }
        } else {
          failedCnt++;
        }
      });

      console.log(`Push: Sent message "${raixNotification.title}" to ${iosCnt} ios apps, ${androidCnt} android apps and ${unknownCnt} unknown apps. Failed to send ${failedCnt} messages`);

    });
  }

  return allMessagesPromise;

}

function topicsSend(topics, raixNotification) {
  let firebasePromises = [];

  topics.forEach(function (topic) {
    const fcmMessage = getFcmMessageForTopic(topic, raixNotification);
    const appIdentifier = raixNotification.appIdentifier;
    firebasePromises.push(sendFcmMessage(appIdentifier, fcmMessage));
  });

  return Promise.all(firebasePromises.map(function (promise) {
    return promise.reflect();
  }));
}

function fcmSingleMessage(userFcmToken, raixNotification) {
  // https://firebase.google.com/docs/reference/admin/node/admin.messaging.Message
  let fcmMessage = getFcmMessageForIndividualDevice(userFcmToken, raixNotification);
  const appIdentifier = raixNotification.appIdentifier;
  return sendFcmMessage(appIdentifier, fcmMessage);
}

function sendFcmMessage(appIdentifier, fcmMessage) {
  if (!Match.test(appIdentifier, String)) {
    console.error('ERROR: PUSH.sendFCM - No appIdentifier found for notification: ', fcmMessage);
    return Promise.reject(new RaixPushError(
      {
        code: 'push/no-app-identifier',
        message: `ERROR: PUSH.sendFCM - No appIdentifier found for notification:  ${JSON.stringify(fcmMessage)}`
      },
      `ERROR: PUSH.sendFCM - No appIdentifier found for notification:  ${JSON.stringify(fcmMessage)}`,
      fcmMessage
    ));
  }
  const firebaseApp = Push.FirebaseApps[appIdentifier];
  if (!firebaseApp) {
    console.error('ERROR: PUSH.sendFCM - No firebase app found for notification: ', fcmMessage);
    return Promise.reject(new RaixPushError(
      {
        code: 'push/no-firebase-app-found',
        message: `ERROR: PUSH.sendFCM - No firebase app found for notification:  ${JSON.stringify(fcmMessage)}`
      },
      `ERROR: PUSH.sendFCM - No firebase app found for notification:  ${JSON.stringify(fcmMessage)}`,
      fcmMessage
    ));
  }

  return new Promise((resolve, reject) => {
    try {
      firebaseApp.messaging().send(fcmMessage)
        .then(result => {
          resolve(result);
        })
        .catch(reason => {
          reject(_.extend(reason, {fcmMessage: fcmMessage}));
        });
    } catch (e) {
      reject(_.extend(e, {fcmMessage: fcmMessage}));
    }
  });
}

function getFcmMessageForIndividualDevice(userFcmToken, raixNotification) {
  let fcmMessage = getFcmMessage(raixNotification);
  fcmMessage.token = userFcmToken;
  return fcmMessage;
}

function getFcmMessageForTopic(topicName, raixNotification) {
  let fcmMessage = getFcmMessage(raixNotification);
  fcmMessage.topic = topicName;
  return fcmMessage;
}

function cleanPayload(payload) {
  let cleanedPayload = {};
  Object.keys(payload).forEach(key => {
    if (typeof payload[key] === 'string') {
      cleanedPayload[key] = payload[key];
    }
  });

  return cleanedPayload;
}

function getFcmMessage(raixNotification) {
  return {
    notification: {
      title: raixNotification.title,
      body: raixNotification.text
    },
    data: cleanPayload(raixNotification.payload),
    android: {
      notification: {
        sound: raixNotification.gcm.sound,
        icon: 'notification_icon',
        color: '#a7cd45'
      }
    },
    apns: {
      headers: {
        'apns-expiration': moment.utc().add(30, 'days').unix().toString()
      },
      payload: {
        aps: {
          sound: raixNotification.apn.sound,
          badge: raixNotification.apn.badge || raixNotification.badge
        }
      }
    }
  };
}

function handleSendNotificationException(notification, error) {
  emitError(notification, error);
  resendEntireNotification(notification);
}

function resendEntireNotification(notification) {
  if (!notification.failedCount || notification.failedCount < 5) {
    let failedCount = (notification.failedCount) ? notification.failedCount + 1 : 1;

    Push.notifications.update({_id: notification._id}, {
      $set: {
        sent: false,
        sending: false,
        failedCount: failedCount,
        // eslint-disable-next-line no-restricted-properties
        delayUntil: moment().add(Math.pow(2, failedCount), 'minutes').toDate()
      }
    });
  } else {
    // Max retry count reached - deleting notification
    Push.notifications.remove({_id: notification._id});
  }
}

function handleFailedNotification(notification, reason) {
  switch (classifyError(reason)) {
    case ERROR_ACTION.RESEND_NOTIFICATION: {
      resendFailedNotification(notification, reason.fcmMessage);
      break;
    }
    case ERROR_ACTION.REMOVE_TOKEN: {
      // TODO @mj remove token
      break;
    }
    case ERROR_ACTION.EMIT_ERROR:
    default: {
      emitError(notification, reason);
    }
  }
}

function resendFailedNotification(notification, fcmMessage) {
  if (!notification.failedCount || notification.failedCount < 5) {
    let failedCount = (notification.failedCount) ? notification.failedCount + 1 : 1;

    let clonedNotification = Object.assign({}, notification, {failedCount: failedCount});
    delete clonedNotification.query;
    delete clonedNotification.token;
    delete clonedNotification.tokens;
    delete clonedNotification.topics;

    if (fcmMessage.token) {
      clonedNotification.token = fcmMessage.token;
    } else if (fcmMessage.topic) {
      clonedNotification.topics = [fcmMessage.topic];
    } else {
      emitError(notification, new Error(`Unexpected fcmMessage: ${JSON.stringify(fcmMessage)}`));
      return;
    }

    // eslint-disable-next-line no-restricted-properties
    clonedNotification.delayUntil = moment().add(Math.pow(2, failedCount), 'minutes').toDate();

    Push.send(clonedNotification);
  } else {
    // Max retry count reached - deleting notification
    Push.notifications.remove({_id: notification._id});
  }
}

function classifyError(reason) {
  if (reason instanceof RaixPushError) {
    return ERROR_ACTION.EMIT_ERROR;
  } else if (reason instanceof FirebaseMessagingError) {
    if (reason.errorInfo && reason.errorInfo.code) {
      switch (reason.errorInfo.code) {
        case 'messaging/registration-token-not-registered': {
          return ERROR_ACTION.REMOVE_TOKEN;
        }
        case 'messaging/message-rate-exceeded':
        case 'messaging/device-message-rate-exceeded':
        case 'messaging/topics-message-rate-exceeded':
        case 'messaging/server-unavailable':
        case 'messaging/internal-error': {
          return ERROR_ACTION.RESEND_NOTIFICATION;
        }
        case 'messaging/invalid-argument':
        case 'messaging/invalid-recipient':
        case 'messaging/invalid-payload':
        case 'messaging/invalid-data-payload-key':
        case 'messaging/payload-size-limit-exceeded':
        case 'messaging/invalid-options':
        case 'messaging/invalid-registration-token':
        case 'messaging/invalid-package-name':
        case 'messaging/too-many-topics':
        case 'messaging/invalid-apns-credentials':
        case 'messaging/mismatched-credential':
        case 'messaging/authentication-error':
        case 'messaging/unknown-error':
        default: {
          return ERROR_ACTION.EMIT_ERROR;
        }
      }
    } else {
      return ERROR_ACTION.EMIT_ERROR;
    }
  } else {
    return ERROR_ACTION.EMIT_ERROR;
  }
}

function emitError(notification, error) {
  Push.emit('errorSendingNotification', {notification, error});
}
