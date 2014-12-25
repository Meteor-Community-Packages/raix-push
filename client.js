// Reactive id
var id = null;
var idDep = new Tracker.Dependency();

// Version of the push client
var version = '0.0.1';
var appId = 'main';

// Namespaced storage key
var localStorageKey = '_raix:push_token';

// If we are using the accounts system then add the userId to appCollection
// and monitor for logout
var addUserId = !!Package['accounts-base'];

/*
  1. Check if id is already set in localstorage
  2. If not then create an app id
  3. Refresh the apn/gcm push token for this app
*/

var stored;

var loadLocalstorage = function() {
  var data = {};

  try {
    // Get the stored object from local storage
    data = JSON.parse(localStorage.getItem(localStorageKey));

  } catch(err) {
    // XXX: Error using the local storage
  }

  return {
    // Use a new id if not set
    id: data && data.id || Random.id(),
    // Set empty metadata object if nothing loaded
    metadata: data && data.metadata || {},
    // Set default token
    token: null
  };
};

var saveLocalstorage = function(data) {
  try {
    // Try setting the id
    localStorage.setItem(localStorageKey, JSON.stringify(data));
  } catch(err) {
    // XXX: storage error
  }
};

// Use a new id if not set
if (!id) id = Random.id();

// Its either set by localStorage or random
idDep.changed();

// Start listening for tokens
Push.addListener('token', function(token) {
  // Make sure we are ready for this
  Meteor.startup(function() {

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
            localStorage.setItem(localStorageKey, JSON.stringify({ id: id, token: token }));
          } catch(err) {
            // XXX: storage error
          }
          // The id has changed.
          idDep.changed();
        }
      }
    });

  });
});

Push.id = function() {
  idDep.depend();
  return id;
};

// We dont use the apn/gcm tokens
// Send idArray, title, text, priority, callback
Push.send = function(options, callback) {
  // Check that options are as expected
  // check(options, {
  //   idArray: [],
  //   title: String,
  //   text: String,
  //   priority: Match.Optional(Number),
  // });

  // Check if callback is set
  // check(callback, Match.Optional(Function));

  // Send message
  Meteor.call('sendPushNotification', options, callback);
}; // Send a push notification to one or more users
