// Version of the push client
var id = null;
var idDep = new Tracker.Dependency();

var appId = 'main';
var version = '0.0.1';
var localStorageKey = '_raix:push_token';

// Namespaced storage key

/*
  1. Check if id is already set in localstorage
  2. If not then create an app id
  3. Refresh the apn/gcm push token for this app
*/

var stored;

try {
  // Get the stored object from local storage
  stored = JSON.parse(localStorage.getItem(localStorageKey));
  // If stored then set id
  if (stored && stored.id) id = stored.id;

} catch(err) {
  // XXX: Error using the local storage
}

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
