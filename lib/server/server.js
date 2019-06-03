
const PLATFORMS = {
  ANDROID: 'Android',
  IOS: 'iOS'
};

Push.appTokens = new Mongo.Collection('_raix_push_app_tokens');
let firebaseAdmin;

const DeletedAppTokens = new Mongo.Collection('deletedAppTokens');

Push.firebaseManagement = {
  configureAndroidApp: (vetId) => {
    return configureApp(vetId, PLATFORMS.ANDROID);
  },
  configureIOSApp: (vetId) => {
    return configureApp(vetId, PLATFORMS.IOS);
  }
};

Push.addListener('token', function (currentToken, value) {
  if (value) {
    // Update the token for app
    let setModifier = {
      token: value
    };
    if (value.fcm || value.gcm) {
      setModifier.fcmToken = value.fcm || value.gcm;
    }
    Push.appTokens.update({token: currentToken}, {$set: setModifier}, {multi: true});
  } else if (value === null) {
    // Remove the token for app
    let token = Push.appTokens.findOne({token: currentToken});
    DeletedAppTokens.rawCollection().insert(token);
    Push.appTokens.remove({token: currentToken});
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

    if (options.token.fcm || options.token.gcm) {
      options.fcmToken = options.token.fcm || options.token.gcm;
    }

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
        platform: options.platform,
        appName: options.appName,
        userId: options.userId,
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      if (options.fcmToken) {
        doc.fcmToken = options.fcmToken;
      }

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
      let setModifier = {
        updatedAt: new Date(),
        token: options.token,
        platform: options.platform,
        appName: options.appName
      };
      if (options.fcmToken) {
        setModifier.fcmToken = options.fcmToken;
      }
      Push.appTokens.update({_id: doc._id}, {$set: setModifier});
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

    initializeFirebaseApp(vetId);
  }
});

function initializeFirebaseApp(vetId) {
  const vet = GlobalVets.findOne({_id: vetId, $or: [{disabled: false}, {disabled: {$exists: false}}]});
  if (!vet || !vet.firebaseConfig || !vet.firebaseConfig.adminSdkCredentials) {
    console.log(`Error while configuring Firebase Admin SDK for vetId: ${vetId}. No vet, firebaseConfig or adminSdkCredentials.`);
    return;
  }

  const key = vet.appIdentifier;
  console.log('Push: Configuring Firebase Admin SDK for: ', key);
  if (process.env.NODE_ENV === 'production') {

    Push.FirebaseApps[key] = getFirebaseAdmin().initializeApp(
      {
        credential: getFirebaseAdmin().credential.cert({
          projectId: vet.firebaseConfig.adminSdkCredentials.projectId,
          clientEmail: vet.firebaseConfig.adminSdkCredentials.clientEmail,
          privateKey: vet.firebaseConfig.adminSdkCredentials.privateKey
        })
      },
      `${key}__${moment.utc().valueOf()}`
    );
  }
}

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

  if (vet && !vet.useFirebaseForMessaging) {
    return;
  }

  if (!vet || !vet.firebaseConfig || !vet.firebaseConfig.cloudMessaging || !vet.firebaseConfig.cloudMessaging.serverKey) {
    throw new Meteor.Error('Could not find vet or "firebaseConfig.cloudMessaging.serverKey" is missing!');
  }
  /**
   *  Note: The list of APNs tokens in each request cannot exceed 100.
   */
  HTTP.post('https://iid.googleapis.com/iid/v1:batchImport', {
    headers: {
      Authorization: `key=${vet.firebaseConfig.cloudMessaging.serverKey}`
    },
    data: {
      'application': GlobalVets.VetUtils.getIosBundleId(vet),
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
      if (!fcmToken) {
        throw new Meteor.Error(`Converted token ${convertResult.apns_token} to fcm token, but received fcm token is null`);
      }

      Push.appTokens.update(
        {appName: appName, token: tokenObject},
        {$set: {fcmToken: fcmToken}}
      );
      // on this event we can subscribe user to topics
      Push.emitState('raix:server:new-fcm-token', {fcmToken, appName});
    }
  });
}

function listApps(projectManagement, platform) {
  switch (platform) {
    case PLATFORMS.ANDROID: {
      return projectManagement.listAndroidApps();
    }
    case PLATFORMS.IOS: {
      return projectManagement.listIosApps();
    }
    default: {
      throw new Error(`Invalid platform: ${platform}`);
    }
  }
}

function createApp(projectManagement, vet, platform) {
  switch (platform) {
    case PLATFORMS.ANDROID: {
      return projectManagement.createAndroidApp(GlobalVets.VetUtils.getAndroidPackageName(vet));
    }
    case PLATFORMS.IOS: {
      return projectManagement.createIosApp(GlobalVets.VetUtils.getIosBundleId(vet));
    }
    default: {
      throw new Error(`Invalid platform: ${platform}`);
    }
  }
}

function configureApp(vetId, platform) {
  return new Promise((resolve, reject) => {
    if (!vetId) {
      reject(new Error('Vet ID is required.'));
      return;
    }

    const vet = GlobalVets.findOne({_id: vetId, $or: [{disabled: false}, {disabled: {$exists: false}}]});

    if (!vet) {
      reject(new Error(`Couldn't find vet for id ${vetId}`));
      return;
    }

    if (!Push.FirebaseApps[vet.appIdentifier]) {
      initializeFirebaseApp(vetId);

      if (!Push.FirebaseApps[vet.appIdentifier]) {
        reject(new Error(`Firebase sdk for ${vetId} is not initialized.`));
        return;
      }
    }

    const projectManagement = Push.FirebaseApps[vet.appIdentifier].projectManagement();

    if (!projectManagement) {
      reject(new Error(`Could not initialize FirebaseAdmin.projectManagement for ${vetId}.`));
      return;
    }

    listApps(projectManagement, platform).then(apps => {

      if (!apps || apps.length === 0) {
        createApp(projectManagement, vet, platform)
          .then(app => {
            if (!app) {
              reject(new Error(`Error creating ${platform} app for ${vetId}`));
              return;
            }

            app.getConfig()
              .then(response => {
                resolve(response);
              })
              .catch(error => {
                reject(error);
              });
          })
          .catch(error => {
            reject(error);
          });
      } else if (apps.length === 1) {
        apps[0].getConfig()
          .then(response => {
            resolve(response);
          })
          .catch(error => {
            reject(error);
          });
      } else {
        console.log(`PUSH: Multiple ${platform} apps found`, apps);
        reject(new Error(`Found more than one app for ${vetId}`));
      }

    }).catch(error => {
      console.log('Android apps error', error);
    });

  });
}

