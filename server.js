Push.appCollection = new Mongo.Collection('_raix_push_app_tokens');

Push.addListener('token', function(currentToken, value) {
  if (value) {
    // Update the token for app
    // XXX: Todo
  } else if (value === null) {
    // Remove the token for app
    // XXX: Todo
  }
});

Meteor.methods({
  'setPushToken': function(options) {
    if (Push.debug) console.log('Push: Got push token from app:', options);
    // check(options, {
    //   id: String,
    //   token: String,
    //   appId: String
    // });

    // find the app via token
    var app = Push.appCollection.findOne({
      $and: [
        { token: options.token },
        { appId: options.appId }
      ]
    });

    // If the id for the token isnt the same as options then make sure
    // the options provided document is removed - the client will get the
    // app id via token instead
    if (app && app._id !== options.id) Push.appCollection.remove({ _id: options.id });


    // if we could not find the token then lookup id
    if (!app) app = Push.appCollection.findOne({ _id: options.id });

    // if we could not find the token then create it
    if (!app) {

      // Rig default doc
      var doc = {
        _id: options.id,
        token: options.token,
        appId: options.appId
      };

      // Get the id from insert
      var id = Push.appCollection.insert(doc);

      // This should be true
      if (id == doc._id) app = doc;
        if (Push.debug) console.log('Push: Inserted token in app collection');

    }

    if (app && Push.debug) console.log('Push: Using', app);

    if (!app) {
      throw new Meteor.Error(500, 'setPushToken could not create record');
    }

    // console.log('App got token', app);

    // Return the id we want to use
    return app._id;
  },
  'sendPushNotification': function(options) {
    // Have some allow/deny rules?
    // check(options, {
    //   idArray: [],
    //   title: String,
    //   text: String,
    //   priority: Match.Optional(Number),
    // });
    console.log('Client-side send notification', options);
    console.warn('Not implemented yet');

    // return notificationId;
  },
});

