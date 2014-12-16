// The pushApi is just an Event emitter
Push = new EventEmitter();

Push.setBadge = function(count) {
  // Helper
  var pushNotification = window.plugins.pushNotification;

  // If the set application badge is available
  if (typeof pushNotification.setApplicationIconBadgeNumber == 'function') {
    // Set the badge
    pushNotification.setApplicationIconBadgeNumber(function(result) {
      // Success callback
      Push.emit('badge', result);
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
  var pushNotification = window.plugins.pushNotification;
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


Push.init = function(options) {
  var self = this;

  // Clean up options, make sure the pushId
  if (options.gcm && !options.gcm.pushId)
    throw new Error('Push.initPush gcm got no pushId');

  // Set default options - these are needed for apn?
  options = {
    badge: (options.badge !== false),
    sound: (options.sound !== false),
    alert: (options.alert !== false)
  };

    // Initialize on ready
  document.addEventListener('deviceready', function() {

    var pushNotification = window.plugins.pushNotification;

    if (device.platform == 'android' || device.platform == 'Android') {
      try {

        if (options.gcm && options.gcm.pushId) {
          pushNotification.register(function(result) {
            // Emit registered
            self.emit('register', result);
          }, function(error) {
            // Emit error
            self.emit('error', { type: 'gcm.cordova', error: error });
          }, {
            'senderID': ''+options.gcm.pushId,
            'ecb': 'onNotificationGCM'
          });
        } else {
          // throw new Error('senderID not set in options, required on android');
          console.warn('WARNING: Push.init, No gcm.pushId set on android');
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