// Notifications collection
Push.notifications = new Mongo.Collection('_raix_push_notifications');

// This is a general function to validate that the data added to notifications
// is in the correct format. If not this function will throw errors
var _validateDocument = function(notification) {

  // Check the general notification
  check(notification, {
    from: String,
    title: String,
    text: String,
    badge: Match.Optional(Number),
    sound: Match.Optional(String),
    query: Match.Optional(Object),
    token: Match.Optional(_matchToken),
    tokens: Match.Optional([_matchToken]),
    createdAt: Date,
    createdBy: Match.OneOf(String, null)
  });

  // Make sure a token selector or query have been set
  if (!notification.token && !notification.tokens && !notification.query)
    throw new Error('No token selector or query found');

  // If tokens array is set it should not be empty
  if (notification.tokens && !notification.tokens.length)
    throw new Error('No tokens in array');
};

Push.send = function(options) {
  // If on the client we set the user id - on the server we need an option
  // set or we default to "<SERVER>" as the creator of the notification
  // If current user not set see if we can set it to the logged in user
  // this will only run on the client if Meteor.userId is available
  var currentUser = Meteor.userId && Meteor.userId() ||
          Meteor.isServer && (options.createdBy || '<SERVER>') || null;

  // Rig the notification object
  var notification = {
    from: options.from,
    title: options.title,
    text: options.text,
    createdAt: new Date(),
    createdBy: currentUser
  };

  // Add extra
  if (typeof options.badge !== 'undefined') notification.badge = options.badge;
  if (typeof options.sound !== 'undefined') notification.sound = options.sound;

  // Set one token selector, this can be token, array of tokens or query
  if (options.query) {
    // Set query
    notification.query = options.query;
  } else if (options.token) {
    // Set token
    notification.token = options.token;
  } else if (options.tokens) {
    // Set tokens
    notification.tokens = options.tokens;
  }

  // Validate the notification
  _validateDocument(notification);

  // Try to add the notification to send, we return an id to keep track
  return Push.notifications.insert(notification);
};

Push.allow = function(rules) {
  if (rules.send) {
    Push.notifications.allow({
      'insert': function(userId, notification) {
        // Validate the notification
        _validateDocument(notification);
        // Set the user defined "send" rules
        return rules.send.apply(this, [userId, notification]);
      }
    });
  }
};

Push.deny = function(rules) {
  if (rules.send) {
    Push.notifications.deny({
      'insert': function(userId, notification) {
        // Validate the notification
        _validateDocument(notification);
        // Set the user defined "send" rules
        return rules.send.apply(this, [userId, notification]);
      }
    });
  }
};
