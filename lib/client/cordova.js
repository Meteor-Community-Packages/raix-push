var getService = function() {
  if (/android/i.test(device.platform)) {
    return 'gcm';
  } else if (/ios/i.test(device.platform)) {
    return 'apn';
  } else if (/win/i.test(device.platform)) {
    return 'mpns';
  }

  return 'unknown';
};

/**
 * https://github.com/phonegap/phonegap-plugin-push#pushnotificationinitoptions
 */
class PushHandle extends EventState {
  constructor() {
    super();
    this.configured = false;
  }
  setBadge(count) {
    this.once('ready', () => {
      if (/ios/i.test(device.platform)) {
        // xxx: at the moment only supported on iOS
        this.push.setApplicationIconBadgeNumber(() => {}, (e) => {
          this.emit('error', {
            type: getService() + '.cordova',
            error: 'Push.setBadge Error: ' + e.message
          });
        }, count);

      }
    });
  }
  unregister(successHandler, errorHandler) {
    if (this.push) {
      this.push.unregister(successHandler, errorHandler);
    } else {
      errorHandler(new Error('Push.unregister, Error: "Push not configured"'));
    }
  }
  Configure(options = {}) {

    if (!this.configured) {

      this.configured = true;

      Meteor.startup(() => {

        if (typeof PushNotification !== 'undefined') {

          this.push = PushNotification.init(options);

          this.push.on('registration', (data) => {

            if (data && data.registrationId) {
              this.emitState('token', {
                [getService()]: data.registrationId
              });
            }

            this.emitState('registration', ...arguments);
          });

          this.push.on('notification', (data) => {
            // xxx: check ejson support on "additionalData" json object

            // Emit alert event - this requires the app to be in forground
            if (data.message && data.additionalData.foreground) {
              this.emit('alert', data);
            }

            // Emit sound event
            if (data.sound) {
              this.emit('sound', data);
            }

            // Emit badge event
            if (typeof data.count !== 'undefined') {
              this.emit('badge', data);
            }

            if (data.additionalData.foreground) {
              this.emit('message', data);
            } else {
              this.emitState('startup', data);
            }

            this.emitState();
          });

          this.push.on('error', (e) => {
            this.emit('error', {
              type: getService() + '.cordova',
              error: e.message
            });
          });

          this.emitState('ready');
        }

      });
    } else {
      throw new Error('Push.Configure may only be called once');
    }
  }
}

Push = new PushHandle();
