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
    if (Push.debug) {
      console.log('Push: Got push token from app:', options);
    }

    check(options, {
      id: Match.Optional(String),
      token: _matchToken,
      appName: String,
      userId: Match.OneOf(String, null),
      metadata: Match.Optional(Object)
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

    // No doc was found - we check the database to see if
    // we can find a match for the app via token and appName
    if (!doc) {
      doc = Push.appCollection.findOne({
        $and: [
          { token: options.token },     // Match token
          { appName: options.appName }, // Match appName
          { token: { $exists: true } }  // Make sure token exists
        ]
      });
    }

    // if we could not find the id or token then create it
    if (!doc) {
      // Rig default doc
      doc = {
        token: options.token,
        appName: options.appName,
        userId: options.userId,
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      if (options.id) {
        // XXX: We might want to check the id - Why isnt there a match for id
        // in the Meteor check... Normal length 17 (could be larger), and
        // numbers+letters are used in Random.id() with exception of 0 and 1
        doc._id = options.id;
        // The user wanted us to use a specific id, we didn't find this while
        // searching. The client could depend on the id eg. as reference so
        // we respect this and try to create a document with the selected id;
        Push.appCollection._collection.insert(doc);
      } else {
        // Get the id from insert
        doc._id = Push.appCollection.insert(doc);
      }
    } else {
      // We found the app so update the updatedAt and set the token
      Push.appCollection.update({ _id: doc._id }, {
        $set: {
          updatedAt: new Date(),
          token: options.token
        }
      });
    }

    if (doc) {
      // xxx: Hack
      // Clean up mech making sure tokens are uniq - android sometimes generate
      // new tokens resulting in duplicates
      var removed = Push.appCollection.remove({
        $and: [
          { _id: { $ne: doc._id } },
          { token: doc.token },     // Match token
          { appName: doc.appName }, // Match appName
          { token: { $exists: true } }  // Make sure token exists
        ]
      });

      if (removed && Push.debug) {
        console.log('Push: Removed ' + removed + ' existing app items');
      }
    }

    if (doc && Push.debug) {
      console.log('Push: updated', doc);
    }

    if (!doc) {
      throw new Meteor.Error(500, 'setPushToken could not create record');
    }
    // Return the doc we want to use
    return doc;
  },
  'raix:push-setuser': function(id) {
    check(id, String);

    if (Push.debug) {
      console.log('Push: Settings userId "' + this.userId + '" for app:', id);
    }
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
  'raix:push-enable': function(data) {
    check(data, {
      id: String,
      enabled: Boolean
    });

    if (Push.debug) {
      console.log('Push: Setting enabled to "' + data.enabled + '" for app:', data.id);
    }

    var found = Push.appCollection.update({ _id: data.id }, { $set: { enabled: data.enabled } });

    return !!found;
  }
});

