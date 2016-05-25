/* global chrome: false */
var onNotification = function(notification) {
  // alert('onNotification' + JSON.stringify(notification));

  // Emit alert event - this requires the app to be in forground
  if (notification.message && notification.foreground) {
    Push.emit('alert', notification);
  }

  // Emit sound event
  if (notification.sound) {
    Push.emit('sound', notification);
  }

  // Emit badge event
  if (notification.badge) {
    Push.emit('badge', notification);
  }

  // If within thres
  if (notification.open) {
    Push.emit('startup', notification);
  } else {
    Push.emit('message', notification);
  }
};

Push.setBadge = function(/* count */) {
  // XXX: Not implemented
};

var isConfigured = false;

Push.Configure = function(options) {
  var self = this;

  options = options || {};

  // check(options, {
  //   gcm: Match.Optional(Match.ObjectIncluding({
  //     projectNumber: String
  //   })),
  //   apn: Match.Optional(Match.ObjectIncluding({
  //     webServiceUrl: String,
  //     websitePushId: String
  //   })),
  // });

  // Block multiple calls
  if (isConfigured) {
    throw new Error('Push.Configure should not be called more than once!');
  }

  isConfigured = true;

  // Add debug info
  if (Push.debug) {
    console.log('Push.Configure', options);
  }

  // Client-side security warnings
  checkClientSecurity(options);

  // Start token updates
  initPushUpdates(options.appName);

  Meteor.startup(function() {
    if (Notification.permission === 'denied') {  
      console.warn('The user has blocked notifications.');  
      return;  
    }
    if (!('showNotification' in ServiceWorkerRegistration.prototype)) {  
      console.warn('Notifications aren\'t supported.');  
      return;  
    }
        // Check if push messaging is supported  
    if (!('PushManager' in window)) {  
      console.warn('Push messaging isn\'t supported.');  
      return;  
    }
    Push.browserInit();
  });
}

Push.browserInit = function(){
  $("body").append('<link rel="manifest" href="/push-manifest.json">');
  navigator.serviceWorker.register('/packages/raix_push/browser/service-worker.js').then(initialiseState);
}

Push.browserUnsubscribe = function() {  
  navigator.serviceWorker.ready.then(function(serviceWorkerRegistration) {  
    serviceWorkerRegistration.pushManager.getSubscription().then(  
      function(pushSubscription) {  
        if (!pushSubscription) {  
          isPushEnabled = false;  
          return;  
        }  

        var subscriptionId = pushSubscription.subscriptionId;  
        pushSubscription.unsubscribe().then(function(successful) {  
          isPushEnabled = false;  
        }).catch(function(e) {  
          console.log('Unsubscription error: ', e);  
        });  
      }).catch(function(e) {  
        console.error('Error thrown while unsubscribing from push messaging.', e);  
      });  
  });  
}

Push.browserSubscribe = function() {  
  navigator.serviceWorker.ready.then(function(serviceWorkerRegistration) {  
    serviceWorkerRegistration.pushManager.subscribe({userVisibleOnly: true})  
      .then(function(subscription) {         
        return sendSubscriptionToServer(subscription);  
      })  
      .catch(function(e) {  
        if (Notification.permission === 'denied') {  
          console.warn('Permission for Notifications was denied');  
        } else {  
          console.error('Unable to subscribe to push.', e);  
        }  
      });  
  });  
}

function sendSubscriptionToServer(subscription){
  Push.emit('startup', subscription);
  /*Push.emitState('token', {
    SimplePush: {
      channel: "push",
      endPoint: subscription.endpoint
    }
  });*/
}

function initialiseState() {
  navigator.serviceWorker.ready.then(function(serviceWorkerRegistration) {   
    serviceWorkerRegistration.pushManager.getSubscription()  
      .then(function(subscription) {  
        if (subscription) {  
          sendSubscriptionToServer(subscription);
        }        
      })  
      .catch(function(err) {  
        console.warn('Error during getSubscription()', err);  
      });  
  });  
}