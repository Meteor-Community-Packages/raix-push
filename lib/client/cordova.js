var coldstart = true;
var startupTime = new Date();
var startupThreshold = 1000; // ms
var paused = false;
var waitingMessage = null;

var _atStartup = function() {
  // If we were triggered before resume then its a startup
  if (paused) return true;

  // If startup time is less than startupThreshold ago then lets say this is
  // at startup.
  return (new Date() - startupTime < startupThreshold);
};

Push.setBadge = function(count) {
  document.addEventListener('deviceready', function() {
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
  });
};

_parsePayload = function(value) {
  // Android actually parses payload into an object - this is not the case with
  // iOS (here is it just a string)
  if (value !== ''+value) value = JSON.stringify(value);

  // Run the string through ejson
  try {
    return EJSON.parse(value);
  } catch(err) {
    return { error: err };
  }
};

var onNotification = function(notification) {
  Meteor.startup(function() {

    // alert('onNotification' + JSON.stringify(notification));

    // Emit alert event - this requires the app to be in forground
    if (notification.message && notification.foreground)
      Push.emit('alert', notification);

    // Emit sound event
    if (notification.sound) Push.emit('sound', notification);

    // Emit badge event
    if (notification.badge) Push.emit('badge', notification);

    // If within thres
    if (notification.open) {
      Push.emitState('startup', notification);
    } else {
      Push.emit('message', notification);
    }

  });
};

// handle APNS notifications for iOS
onNotificationAPN = function(e) {
  // alert('onNotificationAPN ' + JSON.stringify(e));

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
    open: _atStartup(),
    type: 'apn.cordova'
  };

  // E.ejson should be a string - we send it directly to payload
  if (e.ejson) unifiedMessage.payload = _parsePayload(e.ejson);

  if (paused) {
    waitingMessage = unifiedMessage;
  } else {
    // Trigger notification
    onNotification(unifiedMessage);
  }
};

// handle GCM notifications for Android and Fire OS
onNotificationGCM = function(e) {
  // alert('onNotificationGCM ' + JSON.stringify(e));

  switch( e.event ) {
    case 'registered':
      if ( e.regid.length > 0 ) {
        Push.emitState('token', { gcm: ''+e.regid } );
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
        // Coldstart on android is a bit inconsistent - its only set when the
        // notification opens the app
        coldstart: (e.coldstart === !!e.coldstart) ? e.coldstart : coldstart,
        background: !e.foreground,
        foreground: !!e.foreground,
        // open: _atStartup(),  // This is the iOS implementation
        open: (e.coldstart === !!e.coldstart), // If set true / false its an open event
        type: 'gcm.cordova'
      };

      // If payload.ejson this is an object - we hand it over to parsePayload,
      // parsePayload will do the convertion for us
      if (e.payload.ejson) unifiedMessage.payload = _parsePayload(e.payload.ejson);

      if (paused) {
        waitingMessage = unifiedMessage;
      } else {
        // Trigger notification
        onNotification(unifiedMessage);
      }
    break;

    case 'error':
      // e.msg
      Push.emit('error', { type: 'gcm.cordova', error: e });
    break;
  }
};

// Make sure is a global
window.onNotificationAPN = onNotificationAPN;
window.onNotificationGCM = onNotificationGCM;

var rigDefaultEventListeners = function(options) {
  // alert('RIG: ' + JSON.stringify(options));

  // Set default badge behaviour
  if (options.badge === true) Push.addListener('badge', function(notification) {
    Push.setBadge(notification.badge);
  });

  // Set default sound behaviour
  if (options.sound === true) Push.addListener('sound', function(notification) {
    if (notification.sound && notification.sound.length) {
      if(typeof Media != 'undefined'){
        var snd = new Media(notification.sound);
        snd.play();
      } else if(typeof Audio != 'undefined'){
        var snd = new Audio(notification.sound);
        snd.play();
      }
    }
  });

  // Set default alert behaviour
  if (options.alert === true) Push.addListener('alert', function(notification) {

    // if (navigator && navigator.notification && navigator.notification.alert) {
    //   // If native notifications installed
    //   navigator.notification.alert(notification.message);
    // } else {
    //   // Use regular notification
    //   alert(notification.message);
    // }
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

    document.addEventListener('deviceready', function() {

      // At initial startup set startup time
      startupTime = new Date();

      // Update flag if app coldstart
      document.addEventListener("pause", function() {
        paused = true;
        coldstart = false;
      }, false);

      document.addEventListener('resume', function() {
        paused = false;
        // Reset startup time at resume
        startupTime = new Date();

        if (waitingMessage) {
          // Trigger notification
          onNotification(waitingMessage);

          // Reset waiting message
          waitingMessage = null;
        }
      });

      var pushNotification = window.plugins.pushNotification;

      if (device.platform == 'android' || device.platform == 'Android') {
        // alert('Rig GCM');
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
        // alert('Rig APN');

        try {

          pushNotification.register(function(token) {
            // Got apn / ios token
            self.emitState('token', { apn: token });
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

    }, false);


  });

}; // EO Push
