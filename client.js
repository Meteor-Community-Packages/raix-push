Push = {};

// Version of the push client
var version = '0.0.1';
var appId = 'main';
var stored;

/*
  @method Push
  @param options {Object} Settings
  @param options.gcm {String} Allowed gcm server
*/
Push = function(options) {
  // Check options
  check(options, {
    gcm: Match.Optional(String),
    appId: String
  });

  var id = null;
  var idDep = new Tracker.Dependency();

  // The appId is the application identifier eg. 'com.push.app'
  appId = options.appId || 'main';

  // Namespaced storage key
  var localStorageKey = '_raix:push_' + appId;

  /*
    1. Check if id is already set in localstorage
    2. If not then create an app id
    3. Refresh the apn/gcm push token for this app
  */

  try {
    // Get the stored object from local storage
    stored = JSON.parse(localStorage.getItem(localStorageKey));
    // If stored then set id
    if (stored) id = stored.id;
    
  } catch(err) {
    // XXX: Error using the local storage
  }  

  // Use a new id if not set
  if (!id) id = Random.id();

  // Its either set by localStorage or random
  idDep.changed();

  PushApi.getToken(function(token) {
    // token.gcm or token.apn
    Meteor.call('setPushToken', {
      id: id,
      token: token,
      appId: appId
    }, function(err, result) {
      if (err) {
        // XXX: Got an error, retry?
      } else {
        // The result is the id - The server may update this if it finds a
        // match for an old install
        if (id !== result) {
          // The server did match the push token for this device        
          id = result;
          try {
            // Try setting the id
            localStorage.setItem(localStorageKey, JSON.stringify({ id: id, token: token });
          } catch(err) {
            // XXX: storage error
          }
          // The id has changed.
          idDep.changed();
        }
      }
    });
  });

  return {
    id: function() {
      idDep.depend();
      return id;
    }, // We dont use the apn/gcm tokens
    // Send idArray, title, text, priority, callback
    send: function(options, callback) {
      // Check that options are as expected
      check(options, {
        idArray: [],
        title: String,
        text: String,
        priority: Match.Optional(Number),
      });

      // Check if callback is set
      check(callback, Match.Optional(Function));

      // Send message
      Meteor.call('sendPushNotification', options, callback);
    } // Send a push notification to one or more users
  };
};