/* eslint-disable no-param-reassign */

/*
  A general purpose user CordovaPush
  ios, android, mail, twitter?, facebook?, sms?, snailMail? :)

  Phonegap generic :
  https://github.com/phonegap-build/PushPlugin
 */

// getText / getBinary

Push.setBadge = function (/* id, count */) {
  // throw new Error('Push.setBadge not implemented on the server');
};

Push.Connections = {};

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
    console.log('Push.Configure', options);
  }

  // This function is called when a token is replaced on a device - normally
  // this should not happen, but if it does we should take action on it
  _replaceToken = function (currentToken, newToken) {
    // console.log('Replace token: ' + currentToken + ' -- ' + newToken);
    // If the server gets a token event its passing in the current token and
    // the new value - if new value is undefined this empty the token
    self.emitState('token', currentToken, newToken);
  };

  // Rig the removeToken callback
  _removeToken = function (token) {
    console.log('Remove token: ' + token);
    // Invalidate the token
    self.emitState('token', token, null);
  };

  if (Push.debug) {
    console.log('Push: APN configured');
  }

  const useProductionCert = process.env.NODE_ENV === 'production';

  if (!useProductionCert) {
    console.log('This is being configured in development mode');
  }

  const vets = GlobalVets.find({$or: [{disabled: {$exists: false}}, {disabled: false}]}).fetch();
  vets.forEach((vet) => {
    let daysRemaining = Meteor.call('checkCertificate', vet._id);

    if (daysRemaining > 1) {
      Meteor.call('raix:configure-push-connections', vet._id);
    }
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
          {$or: [{delayUntil: {$exists: false}}, {delayUntil: {$lte: new Date()}}]}
        ]
      }, {
        // Sort by created date
        sort: {createdAt: 1},
        limit: batchSize
      }).fetch();

      pendingNotifications.forEach(function (notification) {
        console.log('Found notification, reserving...');

        if (process.env.NODE_ENV === 'development') {
          console.log('DEV environment - not sending the notification', notification);
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
          console.log('Notification reserved, processing...');

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
          let result;
          try {
            result = serverSend(notification);
          } catch (e) {
            console.log('Exception sending notification');
            if (e instanceof Error) {
              console.log(e.toString());
            } else {
              console.log(JSON.stringify(e));
            }
          }

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
                // Count
                count: result,
                // Not being sent anymore
                sending: false
              }
            });

          }

          // Emit the send
          self.emit('send', {notification: notification._id, result: result});

        } // Else could not reserve

      }); // EO forEach

      // Remove the send fence
      isSendingNotification = false;
    }, cfgOptions.sendInterval || 5000); // Default every 15th sec
  } else {
    if (Push.debug) {
      console.log('Push: Send server is disabled');
    }
  }
};

function serverSend(raixNotification) {
  raixNotification = raixNotification || {};
  let query;

  // Check basic raixNotification
  if (typeof raixNotification.from !== 'string') {
    throw new Error('Push.send: option "from" not a string');
  }

  if (typeof raixNotification.title !== 'string') {
    throw new Error('Push.send: option "title" not a string');
  }

  if (typeof raixNotification.text !== 'string') {
    throw new Error('Push.send: option "text" not a string');
  }

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
            {token: {$in: tokenList}},
            // And is not disabled
            {enabled: {$ne: false}}
          ]
        },
        // XXX: Test this query: does this work on app id?
        {
          $and: [
            {appName: raixNotification.appIdentifier},
            {_in: {$in: tokenList}}, // one of the app ids
            {'token.fcm': {$exists: true}},
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
        {'token.fcm': {$exists: true}},
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
  const countApn = [];
  const countGcm = [];

  console.log('Sending notifications for query: ', query);

  Push.appTokens.find(query).forEach(function (appToken) {
    console.log('Iterating...', appToken);

    if (Push.debug) {
      console.log('send to token', appToken.token);
    }

    if (appToken.token.fcm) {
      console.log('appToken.token.fcm', 'passed');
      if (/ios/i.test(appToken.platform)) {
        countApn.push(appToken._id);
      } else if (/android/i.test(appToken.platform)) {
        countGcm.push(appToken._id);
      }
      fcmSingleMessage(appToken.token.fcm, raixNotification);
    } else {
      throw new Error('Push.send got a faulty query');
    }

  });

  if (Push.debug) {
    console.log('Push: Sent message "' + raixNotification.title + '" to ' + countApn.length + ' ios apps ' +
      countGcm.length + ' android apps');

    // Add some verbosity about the send result, making sure the developer
    // understands what just happened.
    if (!countApn.length && !countGcm.length) {
      if (Push.appTokens.find().count() === 0) {
        console.log('Push, GUIDE: The "Push.appTokens" is empty - No clients have registred on the server yet...');
      }
    }
  }

  return {
    apn: countApn,
    gcm: countGcm
  };
}

function topicsSend(topics, raixNotification) {
  topics.forEach(function (topic) {
    const fcmMessage = getFcmMessageForTopic(topic, raixNotification);
    const appIdentifier = raixNotification.appIdentifier;
    sendFcmMessage(appIdentifier, fcmMessage);
  });
}

function fcmSingleMessage(userFcmToken, raixNotification) {
  // https://firebase.google.com/docs/reference/admin/node/admin.messaging.Message
  let fcmMessage = getFcmMessageForIndividualDevice(userFcmToken, raixNotification);
  const appIdentifier = raixNotification.appIdentifier;
  sendFcmMessage(appIdentifier, fcmMessage);
}

function sendFcmMessage(appIdentifier, fcmMessage) {
  if (!Match.test(appIdentifier, String)) {
    console.error('ERROR: PUSH.sendFCM - No appIdentifier found for notification: ', raixNotification);
    return;
  }
  const firebaseApp = Push.Connections[appIdentifier];
  if (!firebaseApp) {
    console.error('ERROR: PUSH.sendFCM - No firebase app found for notification: ', raixNotification);
    return;
  }

  firebaseApp.messaging().send(fcmMessage); // TODO @slobodan handle response
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

function getFcmMessage(raixNotification) {
  return {
    notification: {
      title: raixNotification.title,
      body: raixNotification.text
    },
    data: raixNotification.payload,
    android: {
      notification: {
        sound: raixNotification.gcm.sound
      }
    },
    apns: {
      headers: {
        'apns-expiration': moment.utc().add(30, 'days').unix()
      },
      payload: {
        aps: {
          sound: raixNotification.apn.sound,
          badge: raixNotification.badge
        }
      }
    }
  };
}
