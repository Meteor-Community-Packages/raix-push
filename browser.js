Push.setBadge = function(count) {
  // XXX: Not implemented
};

Push.init = function(options) {
  var self = this;

  options = options || {};

  // options.senderID - this is for android...
  // options.apn.webServiceUrl = 'https://domain.example.com'

  // check(options, {
  //   gcm: Match.Optional(Match.ObjectIncluding({
  //     pushId: String
  //   })),
  //   apn: Match.Optional(Match.ObjectIncluding({
  //     webServiceUrl: String,
  //     pushId: String
  //   })),
  // });


  // XXX: Warn if apn certificates are added here on client...
  if (options.apn && (options.apn.certData || options.apn.keyData))
    throw new Error('Push.initPush Dont add your certificate or key in client code!');

  // Add support for the raix:iframe push solution Deprecate this at some
  // point mid aug 2015
  if (options.iframe) {
    // Rig iframe event listeners
    options.iframe.addEventListener('deviceready', function() {

      options.iframe.addEventListener('pushLaunch', function(evt) {
        // Reformat into new event
        self.emit('startup', evt);
      });

      options.iframe.addEventListener('pushSuccess', function(evt) {
        // Reformat into new event
        self.emit('register', evt.success);
      });

      options.iframe.addEventListener('pushToken', function(evt) {
        if (evt.androidToken) {
          // Format the android token
          Push.emit('token', { gcm: evt.androidToken });     
        } else if (evt.iosToken) {
          // Format the ios token
          Push.emit('token', { apn: evt.iosToken });    
        }
      }); 

      options.iframe.addEventListener('pushError', function(evt) {
        Push.emit('error', { type: 'cordova.browser', error: evt.error || evt });
      });    
      
    });
  } // EO options iframe

  if (typeof chrome !== 'undefined' && chrome.gcm) {
    // chrome.gcm api is supported!
    // https://developer.chrome.com/extensions/gcm

    // Set max message size
    // chrome.gcm.MAX_MESSAGE_SIZE = 4096;

    if (options.gcm.pushId)
      chrome.gcm.register(options.gcm.pushId, function(token) {
        if (token) {
          self.emit('token', { gcm: token });
        } else {
          // Error
          self.emit('error', { type: 'gcm.browser', error: 'Access denied' });
        }
      });

  } else if ('safari' in window && 'pushNotification' in window.safari) {
    // https://developer.apple.com/library/mac/documentation/NetworkingInternet/Conceptual/NotificationProgrammingGuideForWebsites/PushNotifications/PushNotifications.html#//apple_ref/doc/uid/TP40013225-CH3-SW1

    if (options.apn) {

      Meteor.startup(function() {
        // Ensure that the user can receive Safari Push Notifications.
        var permissionData = window.safari.pushNotification.permission(options.apn.pushId);
        checkRemotePermission(permissionData);
      });
       
      var checkRemotePermission = function (permissionData) {
          if (permissionData.permission === 'default') {
              // This is a new web service URL and its validity is unknown.
              window.safari.pushNotification.requestPermission(
                  options.apn.webServiceUrl, // The web service URL.
                  options.apn.pushId,     // The Website Push ID.
                  {}, // Data that you choose to send to your server to help you identify the user.
                  checkRemotePermission         // The callback function.
              );
          }
          else if (permissionData.permission === 'denied') {
              // alert('denied');
              // The user said no.
              self.emit('error', { type: 'apn.browser', error: 'Access denied' });
          }
          else if (permissionData.permission === 'granted') {
              // alert('granted');
              // The web service URL is a valid push provider, and the user said yes.
              // permissionData.deviceToken is now available to use.
              self.emit('token', { apn: permissionData.deviceToken });
          }
      };
      
    }


  } else if (navigator && navigator.push && navigator.push.register && navigator.mozSetMessageHandler) {
    // check navigator.mozPush should be enough?
    // https://wiki.mozilla.org/WebAPI/SimplePush

    var channel = 'push';

    // Store the pushEndpoint
    var pushEndpoint;

    Meteor.startup(function() {
      setupAppRegistrations();
    });

    function setupAppRegistrations() {
      // Issue a register() call
      // to register to listen for a notification,
      // you simply call push.register
      // Here, we'll register a channel for "email" updates.
      // Channels can be for anything the app would like to get notifications for.
      var requestAccess = navigator.push.register();

      requestAccess.onsuccess = function(e) {
        // Store the endpoint
        pushEndpoint = e.target.result;

        self.emit('token', {
          SimplePush: {
            channel: channel,
            endPoint: pushEndpoint
          }
        });
      }

    }

    // Once we've registered, the AppServer can send version pings to the EndPoint.
    // This will trigger a 'push' message to be sent to this handler.
    navigator.mozSetMessageHandler('push', function(message) {
        if (message.pushEndpoint == pushEndpoint) {
          // Did we launch or were we already running?
          self.emit('startup', message);
        }
      });

    // // to unregister, you simply call..
    // AppFramework.addEventListener('user-logout', function() {
    //   navigator.push.unregister(pushEndpoint);
    // });

    // error recovery mechanism
    // will be called very rarely, but application
    // should register again when it is called
    navigator.mozSetMessageHandler('register', function(e) {
      setupAppRegistrations();
    });



  }
};

/*
TODO:

add event listener api

*/