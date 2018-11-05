Push.appTokens = new Mongo.Collection('_raix_push_app_tokens');
let firebaseAdmin;

Push.addListener('token', function (currentToken, value) {
  if (value) {
    // Update the token for app
    let setModifier = {
      token: value,
      fcmToken: value.fcm || value.gcm || undefined
    };
    Push.appTokens.update({token: currentToken}, {$set: setModifier}, {multi: true});
  } else if (value === null) {
    // Remove the token for app
    Push.appTokens.update({token: currentToken}, {$unset: {token: true, fcmToken: true}}, {multi: true});
  }
});

Meteor.methods({
  'raix:push-update': function (options) {
    if (Push.debug) {
      console.log('Push: Got push token from app:', options);
    }

    options.id = normalizeOptionId(options.id);

    check(options, {
      id: Match.Optional(String),
      token: _matchToken,
      platform: Match.Optional(String),
      appName: String,
      userId: Match.OneOf(String, null),
      metadata: Match.Optional(Object)
    });

    // The if user id is set then user id should match on client and connection
    if (options.userId && options.userId !== this.userId) {
      throw new Meteor.Error(403, 'Forbidden access');
    }

    options.fcmToken = options.token.fcm || options.token.gcm || undefined;

    let doc;

    // lookup app by id if one was included
    if (options.id) {
      doc = Push.appTokens.findOne({_id: options.id});
    }

    // No doc was found - we check the database to see if
    // we can find a match for the app via token and appName
    if (!doc) {
      if (options.fcmToken) {
        doc = Push.appTokens.findOne({fcmToken: options.fcmToken, appName: options.appName});
      } else {
        doc = Push.appTokens.findOne({
          $and: [
            {token: options.token}, // Match token
            {appName: options.appName}, // Match appName
            {token: {$exists: true}} // Make sure token exists
          ]
        });
      }
    }

    // if we could not find the id or token then create it
    if (!doc) {
      // Rig default doc
      doc = {
        token: options.token,
        fcmToken: options.fcmToken,
        platform: options.platform,
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
        Push.appTokens.insert(doc);
      } else {
        // Get the id from insert
        doc._id = Push.appTokens.insert(doc);
      }
    } else {
      // We found the app so update the updatedAt and set the token
      Push.appTokens.update({_id: doc._id}, {
        $set: {
          updatedAt: new Date(),
          token: options.token,
          fcmToken: options.fcmToken,
          platform: options.platform,
          appName: options.appName
        }
      });
    }

    if (doc) {
      // xxx: Hack
      // Clean up mech making sure tokens are uniq - android sometimes generate
      // new tokens resulting in duplicates
      let removed;
      if (options.fcmToken) {
        removed = Push.appTokens.remove({
          _id: {$ne: doc._id},
          fcmToken: doc.fcmToken,
          appName: doc.appName
        });
      } else {
        removed = Push.appTokens.remove({
          $and: [
            {_id: {$ne: doc._id}},
            {token: doc.token},
            {appName: doc.appName},
            {token: {$exists: true}}
          ]
        });
      }

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

    if (!options.fcmToken) {
      convertApnToFcmToken(options.appName, options.token);
    } else {
      // on this event we can subscribe user to topics
      Push.emitState('raix:server:new-fcm-token', {fcmToken: options.fcmToken, appName: options.appName});
    }

    // Return the doc we want to use
    return doc;
  },
  'raix:push-setuser': function (id) {
    check(id, Match.OneOf(String, Object));
    // eslint-disable-next-line no-param-reassign
    id = normalizeOptionId(id);

    if (Push.debug) {
      console.log('Push: Settings userId "' + this.userId + '" for app:', id);
    }
    // We update the appCollection id setting the Meteor.userId
    const found = Push.appTokens.update({_id: id}, {$set: {userId: this.userId}});

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
  'raix:push-metadata': function (data) {
    check(data, {
      id: String,
      metadata: Object
    });

    // Set the metadata
    const found = Push.appTokens.update({_id: data.id}, {$set: {metadata: data.metadata}});

    return !!found;
  },
  'raix:push-enable': function (data) {
    check(data, {
      id: String,
      enabled: Boolean
    });

    if (Push.debug) {
      console.log('Push: Setting enabled to "' + data.enabled + '" for app:', data.id);
    }

    const found = Push.appTokens.update({_id: data.id}, {$set: {enabled: data.enabled}});

    return !!found;
  },
  'raix:configure-push-connections': (vetId) => {
    check(vetId, String);
    const vet = GlobalVets.findOne({_id: vetId, $or: [{disabled: false}, {disabled: {$exists: false}}]});
    if (!vet || !vet.firebaseCredentials) {
      console.log(`Error while configuring Firebase Admin SDK for vetId: ${vetId}. No vet or firebaseCredentials.`);
      return;
    }

    const key = vet.appIdentifier;
    console.log('Configuring Firebase Admin SDK for: ', key);
    if (process.env.NODE_ENV === 'production') {

      Push.FirebaseApps[key] = getFirebaseAdmin().initializeApp(
        {
          credential: getFirebaseAdmin().credential.cert({
            projectId: vet.firebaseCredentials.projectId,
            clientEmail: vet.firebaseCredentials.clientEmail,
            privateKey: vet.firebaseCredentials.privateKey
          })
        },
        `${key}__${moment.utc().valueOf()}`
      );
    }
  }
});

function normalizeOptionId(optionId) {
  let resultId = optionId;
  if (optionId && typeof optionId !== 'string') {
    console.log(`### Unexpected id type ${typeof optionId}. Options: ${JSON.stringify(optionId)}`);
    resultId = optionId._id;
  }
  return resultId;
}

function getFirebaseAdmin() {
  if (!firebaseAdmin) {
    firebaseAdmin = Npm.require('firebase-admin');
  }

  return firebaseAdmin;
}

function convertApnToFcmToken(appName, tokenObject) {
  let apnToken = tokenObject.apn;
  const vet = GlobalVets.findOne({appIdentifier: appName});
  if (!vet || !vet.gcm || !vet.gcm.apiKey) {
    throw new Meteor.Error('Could not find vet or gcm.apiKey is missing!');
  }
  /**
   *  Note: The list of APNs tokens in each request cannot exceed 100.
   */
  HTTP.post('https://iid.googleapis.com/iid/v1:batchImport', {
    headers: {
      Authorization: `key=${vet.gcm.apiKey}`
    },
    data: {
      'application': appName,
      'sandbox': false,
      'apns_tokens': [apnToken]
    }
  }, function (error, response) {
    if (response.statusCode !== 200) {
      throw new Meteor.Error('Could not convert apn token to fcm token, status not 200!');
    }
    let responseBody = response.data;
    if (!(responseBody && responseBody.results && responseBody.results.length && responseBody.results[0].status === 'OK')) {
      throw new Meteor.Error('Could not convert apn token to fcm token!');
    }

    let convertResult = responseBody.results[0];
    if (convertResult.apns_token === apnToken) {
      let fcmToken = convertResult.registration_token;
      Push.appTokens.update(
        {appName: appName, token: tokenObject},
        {$set: {fcmToken: fcmToken}}
      );
      // on this event we can subscribe user to topics
      Push.emitState('raix:server:new-fcm-token', {fcmToken, appName});
    }
  });
}
