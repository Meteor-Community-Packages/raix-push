Push.appCollection = new Mongo.Collection('_raix_push_app_tokens');

Push.addListener('token', function(currentToken, value) {
  if (value) {
    // Update the token for app
    Push.appCollection.update({ token: currentToken }, { $set: { token: value } }, { multi: true });
  } else if (value === null) {
    // Remove the token for app
    Push.appCollection.update({ token: currentToken }, { $unset: { token: true } }, { multi: true });
  }
});

Meteor.methods({
  'raix:push-update': function(options) {
    if (Push.debug) console.log('Push: Got push token from app:', options);

    check(options, {
      id: String,
      token: _matchToken,
      appId: String
    });

    // if we could not find the token then lookup id
    var app = Push.appCollection.findOne({ _id: options.id });

    // The id is newly created by the client - we check the database to see if
    // we can find an older match for the app via token
    if (!app) app = Push.appCollection.findOne({
      $and: [
        { token: options.token },
        { appId: options.appId }
      ]
    });

    // if we could not find the id or token then create it
    if (!app) {

      // Rig default doc
      var doc = {
        _id: options.id,
        token: options.token,
        appId: options.appId,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Get the id from insert
      var id = Push.appCollection._collection.insert(doc);

      // This should be true
      if (id == doc._id) {
        app = doc;

        if (Push.debug) console.log('Push: Inserted token in app collection');
      }

    } else {
      // We found the app so update the updatedAt and set the token
      Push.appCollection.update({ _id: app._id }, {
        $set: {
          updatedAt: new Date(),
          token: options.token
        }
      });
    }

    if (app && Push.debug) console.log('Push: Using', app);

    if (!app) {
      throw new Meteor.Error(500, 'setPushToken could not create record');
    }

    // Return the id we want to use
    return app._id;
  },
  'raix:push-setuser': function(id) {
    check(id, String);
    // We update the appCollection id setting the Meteor.userId
    var found = Push.appCollection.update({ _id: id }, { $set: { userId: this.userId } });

    // Note that the app id might not exist because no token is set yet.
    // We do create the new app id for the user since we might store additional
    // metadata for the app / user

    // If id not found then create it?
    // We dont, its better to wait until the user wants to
    // store metadata or token - We could end up with unused data in the
    // collection at every app re-install / update
    //
    // The user could store some metadata in appCollectin but only if they
    // have created the app and provided a token.
    // If not the metadata should be set via ground:db

    return !!found;
  },
  'raix:push-metadata': function(data) {
    check(data, {
      id: String,
      metadata: Object
    });

    // Set the metadata
    var found = Push.appCollection.update({ _id: data.id }, { $set: { metadata: data.metadata } });

    return !!found;
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

