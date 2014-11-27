Meteor.methods({
  'setPushToken': function(options) {
    check(options, {
      id: String,
      token: String,
      appId: String
    });

    return options.id;
  },
  'sendPushNotification': function(options) {
    // Have some allow/deny rules?
    check(options, {
      idArray: [],
      title: String,
      text: String,
      priority: Match.Optional(Number),
    });

    // return notificationId;
  },
});