const apn = Npm.require('apn');

Meteor.methods({
  'raix:configure-push-connections-legacy': (vetId) => {
    check(vetId, String);
    const vet = GlobalVets.findOne({_id: vetId, $or: [{disabled: false}, {disabled: {$exists: false}}]});
    if (vet) {
      const key = vet.appIdentifier;
      Push.legacy.Connections[key] = {};
      console.log('Configuring push connection for: ', key);

      if (process.env.NODE_ENV === 'production' && vet.apn) {
        Push.legacy.Connections[key].apn = {
          passphrase: vet.apn.passphrase,
          certData: vet.apn.cert,
          keyData: vet.apn.key,
          connectTimeout: 30000
        };
      } else {
        if (vet['apn-dev']) {
          Push.legacy.Connections[key].apn = {
            certData: vet['apn-dev'].cert,
            keyData: vet['apn-dev'].key,
            connectTimeout: 30000
          };
        }
      }
      if (vet.gcm) {
        Push.legacy.Connections[key].gcm = {
          apiKey: vet.firebaseConfig && vet.firebaseConfig.cloudMessaging && firebaseConfig.cloudMessaging.serverKey,
          projectNumber: vet.firebaseConfig && vet.firebaseConfig.cloudMessaging && firebaseConfig.cloudMessaging.projectNumber
        };
      }

      if (Push.legacy.Connections[key] && Push.legacy.Connections[key].apn) {
        Push.legacy.Connections[key].apnConnection = new apn.Connection(Push.legacy.Connections[key].apn);
        Push.legacy.Connections[key].apnConnection.on('transmissionError', Meteor.bindEnvironment(function (errCode, notification, recipient) {
          if (Push.debug) {
            console.log('Got error code %d for token %s', errCode, notification.token);
          }
          if ([2, 5, 8].indexOf(errCode) >= 0) {
            // Invalid token errors...
            _removeToken({
              apn: notification.token
            });
          }
        }));
      }
    }
  }
});
