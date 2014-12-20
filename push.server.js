/*
  A general purpose user CordovaPush
  ios, android, mail, twitter?, facebook?, sms?, snailMail? :)

  Phonegap generic :
  https://github.com/phonegap-build/PushPlugin
 */

// getText / getBinary

Push = new EventEmitter();

Push.setBadge = function(appId, count) {
    throw new Error('Push.setBadge not implemented on the server');
};

Push.init = function(options) {
    var self = this;
    // https://npmjs.org/package/apn

    // After requesting the certificate from Apple, export your private key as a .p12 file and download the .cer file from the iOS Provisioning Portal.

    // gateway.push.apple.com, port 2195
    // gateway.sandbox.push.apple.com, port 2195

    // Now, in the directory containing cert.cer and key.p12 execute the following commands to generate your .pem files:
    // $ openssl x509 -in cert.cer -inform DER -outform PEM -out cert.pem
    // $ openssl pkcs12 -in key.p12 -out key.pem -nodes



    // This function is called when a token is replaced on a device - normally
    // this should not happen, but if it does we should take action on it
    _replaceToken = function(currentToken, newToken) {
        // console.log('Replace token: ' + currentToken + ' -- ' + newToken);
        // If the server gets a token event its passing in the current token and
        // the new value - if new value is undefined this empty the token
        self.emit('token', currentToken, newToken);
    };

    // Rig the removeToken callback
    _removeToken = function(token) {
        // console.log('Remove token: ' + token);
        // Invalidate the token
        self.emit('token', token, null);
    };


    if (options.apn) {
        // console.log('Push: APN configured');

        // We check the apn gateway i the options, we could risk shipping
        // server into production while using the production configuration.
        // On the other hand we could be in development but using the production
        // configuration. And finally we could have configured an unknown apn
        // gateway (this could change in the future - but a warning about typos
        // can save hours of debugging)
        //
        // Warn about gateway configurations - it's more a guide
        if (options.apn.gateway) {

            if (options.apn.gateway == 'gateway.sandbox.push.apple.com') {
                // Using the development sandbox
                console.warn('WARNING: Push APN is in development mode');
            } else if (options.apn.gateway == 'gateway.push.apple.com') {
                // In production - but warn if we are running on localhost
                if (/http:\/\/localhost/.test(Meteor.absoluteUrl())) {
                    console.warn('WARNING: Push APN is configured to production mode - but server is running from localhost');
                }
            } else {
                // Warn about gateways we dont know about
                console.warn('WARNING: Push APN unkown gateway "' + options.apn.gateway + '"');
            }

        } else {
            if (options.apn.production) {
                if (/http:\/\/localhost/.test(Meteor.absoluteUrl())) {
                    console.warn('WARNING: Push APN is configured to production mode - but server is running from localhost');
                }
            } else {
                console.warn('WARNING: Push APN is in development mode');
            }
        }

        // Check certificate data
        if (!options.apn['certData'] || !options.apn['certData'].length)
            console.error('ERROR: Push server could not find certData');

        // Check key data
        if (!options.apn['keyData'] || !options.apn['keyData'].length)
            console.error('ERROR: Push server could not find keyData');

        // Rig apn connection
        var apn = Npm.require('apn');
        var apnConnection = new apn.Connection( options.apn );


        // XXX: should we do a test of the connection? It would be nice to know
        // That the server/certificates/network are correct configured

        // apnConnection.connect().then(function() {
        //     console.info('CHECK: Push APN connection OK');
        // }, function(err) {
        //     console.warn('CHECK: Push APN connection FAILURE');
        // });
        // Note: the above code spoils the connection - investigate how to
        // shutdown/close it.

        // (cert.pem and key.pem)
        self.sendAPN = function(from, userToken, title, text, count, priority) {
            // console.log('sendAPN', from, userToken, title, text, count, priority);
            priority = (priority || priority === 0)? priority : 10;

            var myDevice = new apn.Device(userToken);

            var note = new apn.Notification();

            note.expiry = Math.floor(Date.now() / 1000) + 3600; // Expires 1 hour from now.
            note.badge = count;
            note.sound = ""; // XXX: Does this work?
            note.alert = text;
            note.payload = {'messageFrom': from };
            note.priority = priority;

            // console.log('I:Send message to: ' + userToken + ' count=' + count);

            apnConnection.pushNotification(note, myDevice);

        };


        self.initFeedback = function() {
            var apn = Npm.require('apn');
            // console.log('Init feedback');
            var feedbackOptions = {
                "batchFeedback": true,
                "interval": 1000,
                'address': 'feedback.push.apple.com'
            };

            var feedback = new apn.Feedback(feedbackOptions);
            feedback.on("feedback", function(devices) {
                devices.forEach(function(item) {
                    // Do something with item.device and item.time;
                    // console.log('A:PUSH FEEDBACK ' + item.device + ' - ' + item.time);
                    // The app is most likely removed from the device, we should
                    // remove the token
                    _removeToken({ apn: item.device});
                });
            });
        };

    } // EO ios options

    if (options.gcm && options.gcm.pushId) {
        // console.log('GCM configured');
        self.sendGCM = function(from, userTokens, title, text, count, priority) {
            // console.log('sendGCM', from, userToken, title, text, count, priority);
            var gcm = Npm.require('node-gcm');
            var Fiber = Npm.require('fibers');

            //var message = new gcm.Message();
            var message = new gcm.Message({
                collapseKey: from,
            //    delayWhileIdle: true,
            //    timeToLive: 4,
            //    restricted_package_name: 'dk.gi2.app'
                data: {
                    title: title,
                    message: text,
                    msgcnt: count
                }
            });
            var sender = new gcm.Sender(options.gcm.pushId);

            _.each(userTokens, function(value, key) {
                // console.log('A:Send message to: ' + value + ' count=' + count);
            });

            /*message.addData('title', title);
            message.addData('message', text);
            message.addData('msgcnt', '1');
            message.collapseKey = 'sitDrift';
            message.delayWhileIdle = true;
            message.timeToLive = 3;*/

            // /**
            //  * Parameters: message-literal, userTokens-array, No. of retries, callback-function
            //  */

            var userToken = (userTokens.length === 1)?userTokens[0]:null;

            sender.send(message, userTokens, 5, function (err, result) {
                if (err) {
                    // console.log('ANDROID ERROR: result of sender: ' + result);
                } else {
                    // console.log('ANDROID: Result of sender: ' + JSON.stringify(result));
                    if (result.canonical_ids === 1 && userToken) {

                        // This is an old device, token is replaced
                        Fiber(function(self) {
                            // Run in fiber
                            try {
                                self.callback(self.oldToken, self.newToken);
                            } catch(err) {

                            }

                        }).run({
                            oldToken: { gcm: userToken },
                            newToken: { gcm: result.results[0].registration_id },
                            callback: _replaceToken
                        });
                        //_replaceToken({ gcm: userToken }, { gcm: result.results[0].registration_id });

                    }
                    // We cant send to that token - might not be registred
                    // ask the user to remove the token from the list
                    if (result.failure !== 0 && userToken) {

                        // This is an old device, token is replaced
                        Fiber(function(self) {
                            // Run in fiber
                            try {
                                self.callback(self.token);
                            } catch(err) {

                            }

                        }).run({
                            token: { gcm: userToken },
                            callback: _removeToken
                        });
                        //_replaceToken({ gcm: userToken }, { gcm: result.results[0].registration_id });

                    }

                }
            });
            // /** Use the following line if you want to send the message without retries
            // sender.sendNoRetry(message, userTokens, function (result) {
            //     console.log('ANDROID: ' + JSON.stringify(result));
            // });
            // **/
        }; // EO sendAndroid

    } // EO Android

    // Universal send function
    self.send = function(from, appIds, title, text, count, priority) {
        console.warn('WARN: Push.Send is not tested or validated yet!');
        // TODO:
        // This function will take an array of app id's then fetch all those
        // who have a token apn or gcm...
        // tokens are found in the Push.appCollection and look like:
        // { apn: 'xxxxx' } or { gcm: 'xxxxx' }

        // Convert into array
        if (appIds === ''+appIds) appIds = [appIds];

        Push.appCollection.find({
            $or: [
                // XXX: Test this query: can we hand in a list of push tokens?
                { token: { $in: appIds } },
                // XXX: Test this query: does this work on app id? 
                { $and: [
                    { _in: { $in: appIds } }, // one of the app ids
                    { $or: [
                        { 'token.apn': { $exists: true }  }, // got apn token
                        { 'token.gcm': { $exists: true }  }  // got gcm token
                    ]}
                ]}
            ]
        }).forEach(function(app) {
      var countApn = 0;
      var countGcm = 0;

            if (app.token.apn) {
              countApn++;
                // Send to APN
                if (self.sendAPN) self.sendAPN(from, userTokens, title, text, count, priority);

            } else if (app.token.gcm) {
              countGcm++;

                // Send to GCM
                // We do support multiple here - so we should construct an array
                // and send it bulk - Investigate limit count of id's
                if (self.sendGCM) self.sendGCM(from, userTokens, title, text, count, priority);

            } else {
                throw new Error('Push.send got a faulty query - WIP');
            }

        });

        return {
          apn: countApn,
          gcm: countGcm
        };
    };

};