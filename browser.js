PushApi = {};

var eventEmitter = new EventEmitter();

PushApi.initPush = function(options) {
  var self = this;
  // options.senderID - this is for android...
  // options.apn.webServiceUrl = 'https://domain.example.com'

  check(options, {
    gcm: Match.Optional(Match.ObjectIncluding({
      pushId: String
    })),
    apn: Match.Optional(Match.ObjectIncluding({
      webServiceUrl: String,
      pushId: String
    })),
  });


  if (typeof chrome !== 'undefined' && chrome.gcm) {
    // chrome.gcm api is supported!
    // https://developer.chrome.com/extensions/gcm

    // Set max message size
    // chrome.gcm.MAX_MESSAGE_SIZE = 4096;

    if (options.senderID)
      chrome.gcm.register(options.senderID, function(token) {
        if (token) {
          eventEmitter.emit('token', { gcm: token });
        } else {
          // Error
          eventEmitter.emit('error', { gcm: true, error: 'Access denied' });
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
              // The user said no.
              eventEmitter.emit('error', { apn: true, error: 'Access denied' });
          }
          else if (permissionData.permission === 'granted') {
              // The web service URL is a valid push provider, and the user said yes.
              // permissionData.deviceToken is now available to use.
               eventEmitter.emit('token', { apn: permissionData.deviceToken });
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

        eventEmitter.emit('token', {
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
          eventEmitter.emit('pushLaunch', message);
        }
      });

    // // to unregister, you simply call..
    // AppFramework.addEventListener('user-logout', function() {
    //   navigator.push.unregister(pushEndpoint);
    // });

    // error recovery mechanism
    // will be called very rarely, but application
    // should register again when it is called
    navigator.mozSetMessageHandler('push-register', function(e) {
      setupAppRegistrations();
    });



  }
};

/*
TODO:

add event listener api

*/