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
      id: Match.Optional(String),
      token: _matchToken,
      appName: String,
      userId: Match.OneOf(String, null)
    });

    // The if user id is set then user id should match on client and connection
    if (options.userId && options.userId !== this.userId) {
      throw new Meteor.Error(403, 'Forbidden access');
    }

    var doc;

    // lookup app by id if one was included
    if (options.id) {
      doc = Push.appCollection.findOne({ _id: options.id });
    }

    // No id was sent by the client - we check the database to see if
    // we can find a match for the app via token and appName
    if (!doc) doc = Push.appCollection.findOne({
      $and: [
        { token: options.token },
        { appName: options.appName }
      ]
    });

    // if we could not find the id or token then create it
    if (!doc) {
      // Rig default doc
      doc = {
        token: options.token,
        appName: options.appName,
        userId: options.userId,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Get the id from insert
      doc._id = Push.appCollection.insert(doc);
    } else {
      // We found the app so update the updatedAt and set the token
      Push.appCollection.update({ _id: doc._id }, {
        $set: {
          updatedAt: new Date(),
          token: options.token
        }
      });
    }

    if (doc && Push.debug) {
      console.log('Push: updated', doc);
    }

    if (!doc) {
      throw new Meteor.Error(500, 'setPushToken could not create record');
    }
    // Return the id we want to use
    return doc._id;
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

