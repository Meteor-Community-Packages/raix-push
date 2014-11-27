var onNotificationAPN = function(e) {
};

var onNotificationGCM = function(e) {
};


PushApi = {};


var eventEmitter = new EventEmitter();

// initPush({ senderID: '00000000000000' });

PushApi.initPush = function(options) {
  var self = this;
  self._options = {
    senderID: (options.senderID)?''+options.senderID: '',
    badge: (options.badge === false)?'false': 'true',
    sound: (options.sound === false)?'false': 'true',
    alert: (options.alert === false)?'false': 'true'
  };

  self.tokenHandler = function(result) {
    //console.log('GOT IOS TOKEN: '+result);
    if (self.triggerEvent) {            
      self.triggerEvent('pushToken', { iosToken: result });
      eventEmitter.emit('pushToken', { apn: result });
    }
  };

  self.successHandler = function(result) {
    if (self.triggerEvent) {            
      self.triggerEvent('pushSuccess', { success: result });
      eventEmitter.emit('pushSuccess', { success: result });
    } 
  };

  self.errorHandler = function(error) {
    if (self.triggerEvent) {            
      self.triggerEvent('pushError', { error: error });
      eventEmitter.emit('pushError', { error: error });
    } 
  };

  // handle APNS notifications for iOS
  onNotificationAPN = function(e) {
    var pushNotification = window.plugins.pushNotification;
    //console.log('onNotificationAPN Called');

    if (e.alert) {
        // navigator.notification.vibrate(500);
      //   navigator.notification.alert(e.alert);
    }
        
    if (e.sound) {
        // var snd = new Media(e.sound);
        // snd.play();
    }
    
    if (e.badge) {
        pushNotification.setApplicationIconBadgeNumber(self.successHandler, e.badge);
    }

    if (self.triggerEvent) {            
      self.triggerEvent('pushLaunch', e);//e.alert });
      eventEmitter.emit('pushLaunch', e);
    }
  };

  // handle GCM notifications for Android
  onNotificationGCM = function(e) {
    var pushNotification = window.plugins.pushNotification;
    switch( e.event ) {
      case 'registered':
        if ( e.regid.length > 0 ) {
          eventEmitter.emit('pushToken', { 'gcm': ''+e.regid } );
          if (self.triggerEvent) {            
            self.triggerEvent('pushToken', { 'androidToken': ''+e.regid } ); //regID??
          }
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
      //    navigator.notification.vibrate(500);
          // navigator.notification.alert(e.payload.message);     
        }

        if (self.triggerEvent) {            
          self.triggerEvent('pushLaunch', e ); // e.foreground, e.foreground, Coldstart or background
          eventEmitter.emit('pushLaunch', e);
        }
        // e.payload.message, e.payload.msgcnt, e.msg, e.soundname
      break;

      case 'error':
        if (self.triggerEvent) {            
          self.triggerEvent('pushError', e ); // e.msg
          eventEmitter.emit('pushError', e);
        }
      break;
    }
  };

    // Initialize on ready
  document.addEventListener('deviceready', function() {
    var pushNotification = window.plugins.pushNotification;
      // console.log('Push Registration');
      // onNotificationAPN = self.onNotificationAPN;
      // onNotificationGCM = self.onNotificationGCM;

      try {
        if (device.platform == 'android' || device.platform == 'Android') {

          if (self._options.senderID) {
            pushNotification.register(self.successHandler, self.errorHandler, {
              'senderID': self._options.senderID,
              'ecb': 'onNotificationGCM'
            });
          } else {
            throw new Error('senderID not set in options, required on android');
          }

        } else {
          pushNotification.register(self.tokenHandler, self.errorHandler, {
            'badge': self._options.badge,
            'sound': self._options.sound,
            'alert': self._options.alert,
            'ecb': 'onNotificationAPN'
          }); // required!
        }
      } catch(err) {
        // console.log('There was an error starting up push');
        // console.log('Error description: ' + err.message);
        if (self.triggerEvent) {            
          self.triggerEvent('pushError', { error: err });
          eventEmitter.emit('pushError', { error: err });          
        }     
      }

  }, true);

}; // EO Push