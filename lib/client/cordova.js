var epoke = new Date();
var startupThreshold = 5000; // ms from epoke is startup messages
var startupFired = false;
var inBackground = false;
var haveBeenPaused = false;

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

onNotification = function(notification) {
  // Emit alert event
  if (notification.alert) Push.emit('alert', notification);

  // Emit sound event
  if (notification.sound) Push.emit('sound', notification);

  // Emit badge event
  if (notification.badge) Push.emit('badge', notification);

  // If within thres
  if (epoke - new Date() < startupThreshold && !startupFired) {
    startupFired = true;
    // e.sound, e.badge, e.alert
    Push.emit('startup', unifiedMessage);
  } else {
    Push.emit('message', unifiedMessage);
  }
};

// handle APNS notifications for iOS
onNotificationAPN = function(e) {

  // XXX: Investigate if we need more defaults
  var unifiedMessage = {
    message: e.alert,
    sound: e.sound,
    badge: e.badge,
    coldstart: !haveBeenPaused,
    background: inBackground,
    foreground: !inBackground
  };

  // Trigger notification
  onNotification(unifiedMessage);
};

// handle GCM notifications for Android and Fire OS
onNotificationGCM = function(e) {

  switch( e.event ) {
    case 'registered':
      if ( e.regid.length > 0 ) {
        Push.emit('token', { gcm: ''+e.regid } );
      }
    break;

    case 'message':

      var sound = e.soundname || e.payload.sound;

      // XXX: Investigate if we need more defaults
      var unifiedMessage = {
        message: e.payload.message || e.msg || '',
        sound: sound && ('/android_asset/www/' + sound),
        badge: e.payload.msgcnt,
        coldstart: e.coldstart,
        background: !e.foreground,
        foreground: e.foreground
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
    // Set epoke from
    epoke = new Date();

    // Update flag if app is inBackground
    document.addEventListener("pause", function() {
      inBackground = true;
      haveBeenPaused = true;
    }, false);

    // Update flag when app is resumed
    document.addEventListener("resume", function() {
      inBackground = false;
      // Allow for startup messages
      startupFired = false;
      // Set new epoke
      epoke = new Date();
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
