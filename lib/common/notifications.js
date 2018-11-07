// This is the match pattern for tokens
_matchToken = Match.OneOf({apn: String}, {gcm: String}, {fcm: String});

// Notifications collection
Push.notifications = new Mongo.Collection('_raix_push_notifications');

// This is a general function to validate that the data added to notifications
// is in the correct format. If not this function will throw errors
let _validateDocument = function (notification) {
  // Check the general notification
  check(notification, {
    from: String,
    title: String,
    text: String,
    appIdentifier: String,
    badge: Match.Optional(Match.Integer),
    sound: Match.Optional(String),
    notId: Match.Optional(Match.Integer),
    contentAvailable: Match.Optional(Match.Integer),
    apn: Match.Optional({
      from: Match.Optional(String),
      title: Match.Optional(String),
      text: Match.Optional(String),
      badge: Match.Optional(Match.Integer),
      sound: Match.Optional(String),
      notId: Match.Optional(Match.Integer)
    }),
    gcm: Match.Optional({
      from: Match.Optional(String),
      title: Match.Optional(String),
      text: Match.Optional(String),
      image: Match.Optional(String),
      badge: Match.Optional(Match.Integer),
      sound: Match.Optional(String),
      notId: Match.Optional(Match.Integer)
    }),
    query: Match.Optional(String),
    topics: Match.Optional(Array),
    token: Match.Optional(String),
    tokens: Match.Optional([String]),
    payload: Match.Optional(Object),
    delayUntil: Match.Optional(Date),
    createdAt: Date,
    createdBy: Match.OneOf(String, null)
  });

  // Make sure a token selector or query have been set
  if (!notification.token && !notification.tokens && !notification.query && !notification.topics) {
    throw new Error('No token selector, topics or query found');
  }

  // If tokens array is set it should not be empty
  if (notification.tokens && !notification.tokens.length) {
    throw new Error('No tokens in array');
  }

  // If topics array is set it should not be empty
  if (notification.topics && !notification.topics.length) {
    throw new Error('No topics in array');
  }
};

Push.send = function (options) {
  // If on the client we set the user id - on the server we need an option
  // set or we default to "<SERVER>" as the creator of the notification
  // If current user not set see if we can set it to the logged in user
  // this will only run on the client if Meteor.userId is available
  let currentUser = Meteor.isClient && Meteor.userId && Meteor.userId() ||
    Meteor.isServer && (options.createdBy || '<SERVER>') || null;

  // Rig the notification object
  let notification = _.extend({
    createdAt: new Date(),
    createdBy: currentUser
  }, _.pick(options, 'from', 'title', 'text', 'payload', 'badge', 'sound', 'notId', 'delayUntil', 'topics'));

  if (Match.test(options.apn, Object)) {
    notification.apn = _.pick(options.apn, 'from', 'title', 'text', 'badge', 'sound', 'notId');
  }

  if (Match.test(options.gcm, Object)) {
    notification.gcm = _.pick(options.gcm, 'image', 'from', 'title', 'text', 'badge', 'sound', 'notId');
  }

  // Set one token selector, this can be token, array of tokens or query
  if (options.query) {
    // Set query to the json string version fixing #43 and #39
    notification.query = JSON.stringify(options.query);
  } else if (options.token) {
    // Set token
    notification.token = options.token;
  } else if (options.tokens) {
    // Set tokens
    notification.tokens = options.tokens;
  }
  // console.log(options);
  if (typeof options.contentAvailable !== 'undefined') {
    notification.contentAvailable = options.contentAvailable;
  }

  if (Match.test(options.appIdentifier, String)) {
    notification.appIdentifier = options.appIdentifier;
  } else {
    console.error('ERROR: Push.send - no app identifier provided');
  }

  // Validate the notification
  _validateDocument(notification);

  // Try to add the notification to send, we return an id to keep track
  return Push.notifications.insert(notification);
};

Push.allow = function (rules) {
  if (rules.send) {
    Push.notifications.allow({
      'insert': function (userId, notification) {
        // Validate the notification
        _validateDocument(notification);
        // Set the user defined "send" rules
        return rules.send.apply(this, [userId, notification]);
      }
    });
  }
};

Push.deny = function (rules) {
  if (rules.send) {
    Push.notifications.deny({
      'insert': function (userId, notification) {
        // Validate the notification
        _validateDocument(notification);
        // Set the user defined "send" rules
        return rules.send.apply(this, [userId, notification]);
      }
    });
  }
};
