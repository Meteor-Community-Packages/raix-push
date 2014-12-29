Push.setBadge = function(count) {
  // Helper
  var pushNotification = window.plugins.pushNotification;

  // If the set application badge is available
  if (typeof pushNotification.setApplicationIconBadgeNumber == 'function') {
    // Set the badge
    pushNotification.setApplicationIconBadgeNumber(function(result) {
      // Success callback
    }, function(err) {
      // Error callback
      Push.emit('error', { type: 'badge', error: err });
    }, count);

  }
};

// handle APNS notifications for iOS
onNotificationAPN = function(e) {
  if (e.alert) {
    // navigator.notification.vibrate(500);
    // navigator.notification.alert(e.alert);
  }

  if (e.sound) {
    // var snd = new Media(e.sound);
    // snd.play();
  }

  if (e.badge) {
    // XXX: Test if this allows the server to set the badge
    Push.setBadge(e.badge);
  }

  // e.sound, e.badge, e.alert
  Push.emit('startup', e);
};

// handle GCM notifications for Android
onNotificationGCM = function(e) {
  switch( e.event ) {
    case 'registered':
      if ( e.regid.length > 0 ) {
        Push.emit('token', { gcm: ''+e.regid } );
      }
    break;

    case 'message':
      // if this flag is set, this notification happened while we were in the foreground.
      // you might want to play a sound to get the user's attention, throw up a dialog, etc.
      if (e.foreground)
      {
      // if the notification contains a soundname, play it.
      // var my_media = new Media("/android_asset/www/"+e.soundname);
      // my_media.play();
      } else {
        // navigator.notification.vibrate(500);
        // navigator.notification.alert(e.payload.message);
      }

      // e.foreground, e.foreground, Coldstart or background
      Push.emit('startup', e);
      // e.payload.message, e.payload.msgcnt, e.msg, e.soundname
    break;

    case 'error':
      // e.msg
      Push.emit('error', { type: 'gcm.cordova', error: e });
    break;
  }
};

var rigDefaultEventListeners = function(options) {
  // Set default badge behaviour
  if (options.badge) Push.addListener('badge', function(notification) {
    Push.setBadge(notification.badge);
  });

  // Set default sound behaviour
  if (options.sound) Push.addListener('sound', function(notification) {
    var snd = new Media(notification.sound);
    snd.play();
  });

  // Set default alert behaviour
  if (options.alert) Push.addListener('alert', function(notification) {

    // If notification in forground
    if (notification.foreground) {

      if (navigator.notification && navigator.notification.alert) {
        // If native notifications installed
        navigator.notification.alert(notification.message);
      } else {
        // Use regular notification
        alert(notification.message);
      }

    } else {
      // dont show alerts when in background
    }

    // Vibrate if possible
    if (navigator.notification && navigator.notification.vibrate) {
      // If vibrate installed
      if (navigator.notification.vibrate) navigator.notification.vibrate(500);
    }
  });
};


Push.init = function(options) {
  var self = this;

  // Clean up options, make sure the projectNumber
  if (options.gcm && !options.gcm.projectNumber)
    throw new Error('Push.initPush gcm got no projectNumber');

  // Client-side security warnings
  checkClientSecurity(options);

  // Set default options - these are needed for apn?
  options = _.extend({
    badge: (options.badge !== false),
    sound: (options.sound !== false),
    alert: (options.alert !== false)
  }, options);

  // Rig default event listeners for badge/sound/alert
  rigDefaultEventListeners(options);

  // Add debug info
  if (Push.debug) console.log('Push.init', options);

  // Start token updates
  initPushUpdates(options.appName);

    // Initialize on ready
  Meteor.startup(function() {

    var pushNotification = window.plugins.pushNotification;

    if (device.platform == 'android' || device.platform == 'Android') {
      try {

        if (options.gcm && options.gcm.projectNumber) {
          pushNotification.register(function(result) {
            // Emit registered
            self.emit('register', result);
          }, function(error) {
            // Emit error
            self.emit('error', { type: 'gcm.cordova', error: error });
          }, {
            'senderID': ''+options.gcm.projectNumber,
            'ecb': 'onNotificationGCM'
          });
        } else {
          // throw new Error('senderID not set in options, required on android');
          console.warn('WARNING: Push.init, No gcm.projectNumber set on android');
        }

      } catch(err) {
        // console.log('There was an error starting up push');
        // console.log('Error description: ' + err.message);
        self.emit('error', { type: 'gcm.cordova', error: err.message });
      }
    } else {

      try {

        pushNotification.register(function(token) {
          // Got apn / ios token
          self.emit('token', { apn: token });
        }, function(error) {
          // Emit error
          self.emit('error', { type: 'apn.cordova', error: error });
        }, {
          'badge': ''+options.badge,
          'sound': ''+options.sound,
          'alert': ''+options.alert,
          'ecb': 'onNotificationAPN'
        }); // required!
      } catch(err) {
        // console.log('There was an error starting up push');
        // console.log('Error description: ' + err.message);
        self.emit('error', { type: 'apn.cordova', error: err.message });
      }
    }

  }, true);

}; // EO Push
