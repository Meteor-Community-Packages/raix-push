var coldstart = true;

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

_stripPayload = function(payload) {
  // Strip data already used in message
  return _.omit(payload, 'title', 'sound', 'badge', 'alert', 'message', 'msgcnt', 'foreground', 'messageFrom');
};

onNotification = function(notification) {
  // alert(JSON.stringify(notification));

  // Emit alert event - this requires the app to be in forground
  if (notification.message && notification.foreground)
    Push.emit('alert', notification);

  // Emit sound event
  if (notification.sound) Push.emit('sound', notification);

  // Emit badge event
  if (notification.badge) Push.emit('badge', notification);

  // If within thres
  if (notification.background) {
    Push.emit('startup', notification);
  } else {
    Push.emit('message', notification);
  }
};

// handle APNS notifications for iOS
onNotificationAPN = function(e) {
  // alert(JSON.stringify(e));

  var sound = e.sound;

  // Only prefix sound if actual text found
  if (sound && sound.length) sound = 'application/' + sound;

  // XXX: Investigate if we need more defaults
  var unifiedMessage = {
    message: e.alert,
    sound: sound,
    badge: e.badge,
    coldstart: coldstart,
    background: !e.foreground,
    foreground: !!e.foreground,
    type: 'apn.cordova',
    payload: _stripPayload(e)
  };

  // Trigger notification
  onNotification(unifiedMessage);
};

// handle GCM notifications for Android and Fire OS
onNotificationGCM = function(e) {
  // alert(JSON.stringify(e));

  switch( e.event ) {
    case 'registered':
      if ( e.regid.length > 0 ) {
        Push.emit('token', { gcm: ''+e.regid } );
      }
    break;

    case 'message':

      var sound = e.soundname || e.payload.sound;

      // Only prefix sound if actual text found
      if (sound && sound.length) sound = '/android_asset/www/application/' + sound;

      // XXX: Investigate if we need more defaults
      var unifiedMessage = {
        message: e.payload.message || e.msg || '',
        sound: sound,
        badge: e.payload.msgcnt,
        coldstart: e.coldstart,
        background: !e.foreground,
        foreground: !!e.foreground,
        type: 'gcm.cordova',
        payload: _stripPayload(e.payload)
      };

      // Trigger notification
      onNotification(unifiedMessage);
    break;

    case 'error':
      // e.msg
      Push.emit('error', { type: 'gcm.cordova', error: e });
    break;
  }
};

var rigDefaultEventListeners = function(options) {
  // Set default badge behaviour
  if (options.badge === true) Push.addListener('badge', function(notification) {
    Push.setBadge(notification.badge);
  });

  // Set default sound behaviour
  if (options.sound === true) Push.addListener('sound', function(notification) {
    if (notification.sound && notification.sound.length) {
      var snd = new Media(notification.sound);
      snd.play();
    }
  });

  // Set default alert behaviour
  if (options.alert === true) Push.addListener('alert', function(notification) {

    if (navigator && navigator.notification && navigator.notification.alert) {
      // If native notifications installed
      navigator.notification.alert(notification.message);
    } else {
      // Use regular notification
      alert(notification.message);
    }
  });

  // We add a vibrate listener
  if (options.vibrate === true) Push.addListener('message', function(notification) {
    // Vibrate if possible
    if (navigator && navigator.notification && navigator.notification.vibrate) {
      // If vibrate installed
      navigator.notification.vibrate(500);
    }
  });
};

var isConfigured = false;

Push.Configure = function(options) {
  var self = this;

  // Block multiple calls
  if (isConfigured)
    throw new Error('Push.Configure should not be called more than once!');

  isConfigured = true;

  // Clean up options, make sure the projectNumber
  if (options.gcm && !options.gcm.projectNumber)
    throw new Error('Push.Configure gcm got no projectNumber');

  // Client-side security warnings
  checkClientSecurity(options);

  // Set default options - these are needed for apn?
  options = _.extend({
    badge: (options.badge === true),
    sound: (options.sound === true),
    alert: (options.alert === true),
    vibrate: (options.vibrate === true)
  }, options);

  // Rig default event listeners for badge/sound/alert/vibrate
  rigDefaultEventListeners(options);

  // Add debug info
  if (Push.debug) console.log('Push.Configure', options);

  // Start token updates
  initPushUpdates(options.appName);

    // Initialize on ready
  Meteor.startup(function() {

    // Update flag if app coldstart
    document.addEventListener("pause", function() {
      coldstart = false;
    }, false);

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
