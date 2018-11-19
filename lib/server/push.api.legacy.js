/* eslint-disable no-param-reassign */

/*
  A general purpose user CordovaPush
  ios, android, mail, twitter?, facebook?, sms?, snailMail? :)

  Phonegap generic :
  https://github.com/phonegap-build/PushPlugin
 */

// getText / getBinary
Push.legacy = {};

Push.legacy.Connections = {};

let isConfigured = false;

const defaults = {
  sendInterval: 5000
};

Push.legacy.Configure = function (options) {

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
    console.warn('Push.legacy.Configure should only be called once.');
  }

  isConfigured = true;

  // Add debug info
  if (Push.debug) {
    console.log('Push.legacy.Configure', options);
  }

  // This function is called when a token is replaced on a device - normally
  // this should not happen, but if it does we should take action on it
  _replaceToken = function (currentToken, newToken) {
    // console.log('Replace token: ' + currentToken + ' -- ' + newToken);
    // If the server gets a token event its passing in the current token and
    // the new value - if new value is undefined this empty the token
    Push.emitState('token', currentToken, newToken);
  };

  // Rig the removeToken callback
  _removeToken = function (token) {
    console.log('Remove token: ' + token);
    // Invalidate the token
    Push.emitState('token', token, null);
  };

  if (Push.debug) {
    console.log('Push: APN configured');
  }

  const apn = Npm.require('apn');

  const useProductionCert = process.env.NODE_ENV === 'production';

  if (!useProductionCert) {
    console.log('This is being configured in development mode');
  }

  const vets = GlobalVets.find({
    $and: [
      {$or: [{disabled: {$exists: false}}, {disabled: false}]},
      {$or: [{useFirebaseForMessaging: {$exists: false}}, {useFirebaseForMessaging: false}]}
    ]
  }).fetch();

  vets.forEach((vet) => {
    let daysRemaining = Meteor.call('checkCertificate', vet._id);

    if (daysRemaining > 1) {
      Meteor.call('raix:configure-push-connections-legacy', vet._id);
    }
  });

  // apnConnection.connect().then(function() {
  //     console.info('CHECK: Push APN connection OK');
  // }, function(err) {
  //     console.warn('CHECK: Push APN connection FAILURE');
  // });
  // Note: the above code spoils the connection - investigate how to
  // shutdown/close it.

  Push.legacy._sendAPN = function (userToken, notification) {
    if (Match.test(notification.apn, Object)) {
      notification = _.extend({}, notification, notification.apn);
    }

    if (!Match.test(notification.appIdentifier, String)) {
      console.error('ERROR: Push.legacy._sendAPN - No appIdentifier found for notification: ', notification);
      return;
    }

    let key = notification.appIdentifier;
    if (!Push.legacy.Connections[key].apnConnection) {
      console.error('ERROR: Push.legacy._sendAPN - No apn connection found for appIdentifier: ', notification.appIdentifier);
      return;
    }

    // console.log('_sendAPN', notification.from, userToken, notification.title, notification.text,
    // notification.badge, notification.priority);
    const priority = (notification.priority || notification.priority === 0) ? notification.priority : 10;

    const myDevice = new apn.Device(userToken);

    const note = new apn.Notification();

    note.expiry = Math.floor(Date.now() / 1000) + 7200; // Expires 2 hours from now.
    if (typeof notification.badge !== 'undefined') {
      note.badge = notification.badge;
    }
    if (typeof notification.sound !== 'undefined') {
      note.sound = notification.sound;
    }
    // console.log(notification.contentAvailable);
    // console.log("lala2");
    // console.log(notification);
    if (typeof notification.contentAvailable !== 'undefined') {
      // console.log("lala");
      note.setContentAvailable(notification.contentAvailable);
      // console.log(note);
    }

    // adds category support for iOS8 custom actions as described here:
    // https://developer.apple.com/library/ios/documentation/NetworkingInternet/Conceptual/
    // RemoteNotificationsPG/Chapters/IPhoneOSClientImp.html#//apple_ref/doc/uid/TP40008194-CH103-SW36
    if (typeof notification.category !== 'undefined') {
      note.category = notification.category;
    }

    note.alert = notification.text;
    // Allow the user to set payload data
    note.payload = (notification.payload) ? {ejson: EJSON.stringify(notification.payload)} : {};

    note.payload.messageFrom = notification.from;
    note.priority = priority;

    // Store the token on the note so we can reference it if there was an error
    note.token = userToken;

    console.log('Send message to: ' + userToken);

    Push.legacy.Connections[key].apnConnection.pushNotification(note, myDevice);
  };


  Push.legacy._sendGCM = function (userTokens, notification) {
    if (Match.test(notification.gcm, Object)) {
      notification = _.extend({}, notification, notification.gcm);
    }

    if (!Match.test(notification.appIdentifier, String)) {
      console.error('ERROR: Push.legacy._sendGCM - No appIdentifier found for notification: ', notification);
      return;
    }

    let key = notification.appIdentifier;
    if (!Push.legacy.Connections[key].gcm || !Push.legacy.Connections[key].gcm.apiKey) {
      console.error('ERROR: Push.legacy._sendGCM - No gcm configuration found for appIdentifier: ', notification.appIdentifier);
      return;
    }

    // Make sure userTokens are an array of strings
    if (userTokens === '' + userTokens) {
      userTokens = [userTokens];
    }

    // Check if any tokens in there to send
    if (!userTokens.length) {
      if (Push.debug) {
        console.log('_sendGCM no push tokens found');
      }
      return;
    }

    if (Push.debug) {
      console.log('_sendGCM', userTokens, notification);
    }

    const gcm = Npm.require('node-gcm');
    const Fiber = Npm.require('fibers');

    // Allow user to set payload
    const data = (notification.payload) ? {ejson: EJSON.stringify(notification.payload)} : {};

    data.title = notification.title;
    data.message = notification.text;

    // Set image
    if (typeof notification.image !== 'undefined') {
      data.image = notification.image;
    }

    // Set extra details
    if (typeof notification.badge !== 'undefined') {
      data.msgcnt = notification.badge;
    }
    if (typeof notification.sound !== 'undefined') {
      data.soundname = notification.sound;
    }
    if (typeof notification.notId !== 'undefined') {
      data.notId = notification.notId;
    }

    // var message = new gcm.Message();
    const message = new gcm.Message({
      collapseKey: notification.from,
      //    delayWhileIdle: true,
      //    timeToLive: 4,
      //    restricted_package_name: 'dk.gi2.app'
      data: data
    });

    if (Push.debug) {
      console.log('Create GCM Sender using "' + Push.legacy.Connections[key].gcm.apiKey + '"');
    }
    const sender = new gcm.Sender(Push.legacy.Connections[key].gcm.apiKey);

    _.each(userTokens, function (value /* , key */) {
      if (Push.debug) {
        console.log('A:Send message to: ' + value);
      }
    });

    /* message.addData('title', title);
    message.addData('message', text);
    message.addData('msgcnt', '1');
    message.collapseKey = 'sitDrift';
    message.delayWhileIdle = true;
    message.timeToLive = 3; */

    // /**
    //  * Parameters: message-literal, userTokens-array, No. of retries, callback-function
    //  */

    const userToken = (userTokens.length === 1) ? userTokens[0] : null;

    sender.send(message, userTokens, 5, function (err, result) {
      if (err) {
        if (Push.debug) {
          console.log('ANDROID ERROR: result of sender: ' + result);
        }
      } else {
        if (result === null) {
          if (Push.debug) {
            console.log('ANDROID: Result of sender is null');
          }
          return;
        }
        if (Push.debug) {
          console.log('ANDROID: Result of sender: ' + JSON.stringify(result));
        }
        if (result.canonical_ids === 1 && userToken) { // jshint ignore:line

          // This is an old device, token is replaced
          Fiber(function (config) {
            // Run in fiber
            try {
              config.callback(config.oldToken, config.newToken);
            } catch (e) {
            }

          }).run({
            oldToken: {gcm: userToken},
            newToken: {gcm: result.results[0].registration_id}, // jshint ignore:line
            callback: _replaceToken
          });
          // _replaceToken({ gcm: userToken }, { gcm: result.results[0].registration_id });

        }
        // We cant send to that token - might not be registred
        // ask the user to remove the token from the list
        if (result.failure !== 0 && userToken) {

          // This is an old device, token is replaced
          Fiber(function (config) {
            // Run in fiber
            try {
              config.callback(config.token);
            } catch (err) {

            }

          }).run({
            token: {gcm: userToken},
            callback: _removeToken
          });
          // _replaceToken({ gcm: userToken }, { gcm: result.results[0].registration_id });

        }

      }
    });
    // /** Use the following line if you want to send the message without retries
    // sender.sendNoRetry(message, userTokens, function (result) {
    //     console.log('ANDROID: ' + JSON.stringify(result));
    // });
    // **/
  }; // EO sendAndroid

  // Universal send function
  const _querySend = function (query, options) {

    const countApn = [];
    const countGcm = [];

    console.log('Sending notifications for query: ', query);

    Push.appTokens.find(query).forEach(function (app) {
      console.log('Iterating...', app);

      if (Push.debug) {
        console.log('send to token', app.token);
      }

      if (app.token.apn) {
        console.log('app.token.apn', 'passed');
        countApn.push(app._id);
        // Send to APN
        if (Push.legacy._sendAPN) {
          console.log('sending apn');
          Push.legacy._sendAPN(app.token.apn, options);
        }
      } else if (app.token.gcm) {
        countGcm.push(app._id);

        // Send to GCM
        // We do support multiple here - so we should construct an array
        // and send it bulk - Investigate limit count of id's
        if (Push.legacy._sendGCM) {
          Push.legacy._sendGCM(app.token.gcm, options);
        }

      } else {
        throw new Error('Push.send got a faulty query');
      }

    });

    if (Push.debug) {

      console.log('Push: Sent message "' + options.title + '" to ' + countApn.length + ' ios apps ' +
        countGcm.length + ' android apps');

      // Add some verbosity about the send result, making sure the developer
      // understands what just happened.
      if (!countApn.length && !countGcm.length) {
        if (Push.appTokens.find().count() === 0) {
          console.log('Push, GUIDE: The "Push.appTokens" is empty -' +
            ' No clients have registred on the server yet...');
        }
      } else if (!countApn.length) {
        if (Push.appTokens.find({'token.apn': {$exists: true}}).count() === 0) {
          console.log('Push, GUIDE: The "Push.appTokens" - No APN clients have registred on the server yet...');
        }
      } else if (!countGcm.length) {
        if (Push.appTokens.find({'token.gcm': {$exists: true}}).count() === 0) {
          console.log('Push, GUIDE: The "Push.appTokens" - No GCM clients have registred on the server yet...');
        }
      }

    }

    return {
      apn: countApn,
      gcm: countGcm
    };
  };

  Push.legacy._serverSend = function (options) {
    options = options || {badge: 0};
    let query;

    // Check basic options
    if (options.from !== '' + options.from) {
      throw new Error('Push.send: option "from" not a string');
    }

    if (options.title !== '' + options.title) {
      throw new Error('Push.send: option "title" not a string');
    }

    if (options.text !== '' + options.text) {
      throw new Error('Push.send: option "text" not a string');
    }

    if (options.token || options.tokens) {

      // The user set one token or array of tokens
      const tokenList = (options.token) ? [options.token] : options.tokens;

      if (Push.debug) {
        console.log('Push: Send message "' + options.title + '" via token(s)', tokenList);
      }

      query = {
        $or: [
          // XXX: Test this query: can we hand in a list of push tokens?
          {
            $and: [
              {appName: options.appIdentifier},
              {token: {$in: tokenList}},
              // And is not disabled
              {enabled: {$ne: false}}
            ]
          },
          // XXX: Test this query: does this work on app id?
          {
            $and: [
              {appName: options.appIdentifier},
              {_in: {$in: tokenList}}, // one of the app ids
              {
                $or: [
                  {'token.apn': {$exists: true}}, // got apn token
                  {'token.gcm': {$exists: true}} // got gcm token
                ]
              },
              // And is not disabled
              {enabled: {$ne: false}}
            ]
          }
        ]
      };

    } else if (options.query) {

      if (Push.debug) {
        console.log('Push: Send message "' + options.title + '" via query', options.query);
      }

      query = {
        $and: [
          options.query, // query object
          {appName: options.appIdentifier},
          {
            $or: [
              {'token.apn': {$exists: true}}, // got apn token
              {'token.gcm': {$exists: true}} // got gcm token
            ]
          },
          // And is not disabled
          {enabled: {$ne: false}}
        ]
      };
    }


    if (query) {

      // Convert to querySend and return status
      return _querySend(query, options);

    } else {
      throw new Error('Push.send: please set option "token"/"tokens" or "query"');
    }

  };

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
          {useFirebaseForMessaging: false}
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
            result = Push.legacy._serverSend(notification);
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
          Push.emit('send', {notification: notification._id, result: result});

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
