// eslint-disable-next-line import/no-unresolved
import {assert} from 'meteor/practicalmeteor:chai';
import sinon from 'sinon';
import '../common/main.js';
import '../common/notifications.js';
import './push.api.js';
import './server.js';

const mockRequire = require('mock-require');

const APP_IDENTIFIER_1 = 'APP_IDENTIFIER_1';
const FIREBASE_PROJECT_ID_1 = 'FIREBASE_PROJECT_ID_1';
const FIREBASE_EMAIL_1 = 'FIREBASE_EMAIL_1';
const FIREBASE_PRIVATE_KEY_1 = 'FIREBASE_PRIVATE_KEY_1';

const APP_IDENTIFIER_2 = 'APP_IDENTIFIER_2';
const FIREBASE_PROJECT_ID_2 = 'FIREBASE_PROJECT_ID_2';
const FIREBASE_EMAIL_2 = 'FIREBASE_EMAIL_2';
const FIREBASE_PRIVATE_KEY_2 = 'FIREBASE_PRIVATE_KEY_2';

let originals = {
  GlobalVets: global.GlobalVets,
  nodeEnvs: {
    PUSH_NOTIFICATIONS_DISABLED: process.env.PUSH_NOTIFICATIONS_DISABLED,
    NODE_ENV: process.env.NODE_ENV
  }
};

if (!global.GlobalVets) {
  console.log('######## Init GlobalVets ######');
  global.GlobalVets = {};
}

const vet1 = {
  _id: 'VET_ID_1',
  firebaseCredentials: {
    projectId: FIREBASE_PROJECT_ID_1,
    clientEmail: FIREBASE_EMAIL_1,
    privateKey: FIREBASE_PRIVATE_KEY_1
  },
  appIdentifier: APP_IDENTIFIER_1
};

const vet2 = {
  _id: 'VET_ID_2',
  firebaseCredentials: {
    projectId: FIREBASE_PROJECT_ID_2,
    clientEmail: FIREBASE_EMAIL_2,
    privateKey: FIREBASE_PRIVATE_KEY_2
  },
  appIdentifier: APP_IDENTIFIER_2
};

const USER_0_ID = 'TEST_USER_0_ID';
const USER_1_ID = 'TEST_USER_1_ID';
const USER_2_ID = 'TEST_USER_2_ID';
const USER_3_ID = 'TEST_USER_3_ID';
const USER_4_ID = 'TEST_USER_4_ID';
const USER_5_ID = 'TEST_USER_5_ID';

const IOS_TOKEN_0 = {
  '_id': 'IOS_TOKEN_0',
  'token': {
    'apn': 'APN_TOKEN_0'
  },
  'fcmToken': 'FCM_TOKEN_IOS_0',
  'appName': APP_IDENTIFIER_1,
  'userId': USER_0_ID,
  'enabled': true
};

const IOS_TOKEN_1 = {
  '_id': 'IOS_TOKEN_1',
  'token': {
    'apn': 'APN_TOKEN_1'
  },
  'fcmToken': 'FCM_TOKEN_IOS_1',
  'appName': APP_IDENTIFIER_1,
  'userId': USER_1_ID,
  'enabled': true
};

const IOS_TOKEN_2 = {
  '_id': 'IOS_TOKEN_2',
  'token': {
    'apn': 'APN_TOKEN_2'
  },
  'fcmToken': 'FCM_TOKEN_IOS_2',
  'appName': APP_IDENTIFIER_2,
  'userId': USER_4_ID,
  'enabled': true
};

const ANDROID_TOKEN_0 = {
  '_id': 'ANDROID_TOKEN_0',
  'token': {
    'gcm': 'GCM_TOKEN'
  },
  'fcmToken': 'FCM_TOKEN_AND_0',
  'appName': APP_IDENTIFIER_1,
  'userId': USER_2_ID,
  'enabled': true
};

const ANDROID_TOKEN_1 = {
  '_id': 'ANDROID_TOKEN_1',
  'token': {
    'gcm': 'GCM_TOKEN'
  },
  'fcmToken': 'FCM_TOKEN_AND_1',
  'appName': APP_IDENTIFIER_1,
  'userId': USER_3_ID,
  'enabled': true
};

const ANDROID_TOKEN_2 = {
  '_id': 'ANDROID_TOKEN_2',
  'token': {
    'gcm': 'GCM_TOKEN'
  },
  'fcmToken': 'FCM_TOKEN_AND_2',
  'appName': APP_IDENTIFIER_2,
  'userId': USER_5_ID,
  'enabled': true
};


function verifyFcmMessage(fcmMessage, expectedTitle, expectedBody, expectedPayload, expectedGcmSound, expectedApnSound, expectedBadge) {
  assert.isNotNull(fcmMessage);

  assert.isNotNull(fcmMessage.notification);

  assert.equal(fcmMessage.notification.title, expectedTitle);
  assert.equal(fcmMessage.notification.body, expectedBody);

  assert.isNotNull(fcmMessage.data);
  assert.equal(fcmMessage.data.testPayload, expectedPayload);

  assert.isNotNull(fcmMessage.android);
  assert.isNotNull(fcmMessage.android.notification);
  assert.equal(fcmMessage.android.notification.sound, expectedGcmSound);

  assert.isNotNull(fcmMessage.apns);
  assert.isNotNull(fcmMessage.apns.headers);
  assert.ok(fcmMessage.apns.headers['apns-expiration'].match(/^[\d]{10}$/) !== null);
  assert.ok(Number.parseInt(fcmMessage.apns.headers['apns-expiration'], 10) > moment.utc().add(29, 'days').unix().toString());
  assert.isNotNull(fcmMessage.apns.payload);
  assert.isNotNull(fcmMessage.apns.payload.aps);
  assert.equal(fcmMessage.apns.payload.aps.sound, expectedApnSound);
  assert.equal(fcmMessage.apns.payload.aps.badge, expectedBadge);
}

describe('Testing push API', function () {

  let firebaseAdminMocks = {};

  firebaseAdminMocks.messagingMock = {
    send: function (...args) {
      console.log('Spies, open you eyes! firebaseAdmin.messaging().send', JSON.stringify(args));
      return new Promise((resolve) => {
        resolve({});
      });
    }
  };

  firebaseAdminMocks.firebaseAdminMock = {
    messaging: function () {
      return firebaseAdminMocks.messagingMock;
    }
  };

  firebaseAdminMocks.initializeApp = function (...args) {
    console.log('Spies, open you eyes! firebaseAdmin.initializeApp', JSON.stringify(args));
    return firebaseAdminMocks.firebaseAdminMock;
  };

  firebaseAdminMocks.cert = function (...args) {
    console.log('Spies, open you eyes! firebaseAdmin.credential.cert', JSON.stringify(args));
    return 'mock-cert';
  };

  let firebaseAdminInitializeAppSpy;
  let firebaseAdminCertSpy;
  let firebaseAdminSendSpy;

  before(function () {
    global.GlobalVets = {
      find: () => {
        return {
          fetch: () => {
            return [vet1, vet2];
          }
        };
      },
      findOne: ({_id: vetId}) => {
        switch (vetId) {
          case vet1._id: {
            return vet1;
          }
          case vet2._id: {
            return vet2;
          }
          default:
            return null;
        }
      }
    };

    process.env.PUSH_NOTIFICATIONS_DISABLED = false;
    process.env.NODE_ENV = 'production';

    firebaseAdminInitializeAppSpy = sinon.spy(firebaseAdminMocks, 'initializeApp');
    firebaseAdminCertSpy = sinon.spy(firebaseAdminMocks, 'cert');
    firebaseAdminSendSpy = sinon.spy(firebaseAdminMocks.messagingMock, 'send');

    mockRequire('firebase-admin', {
      initializeApp: firebaseAdminMocks.initializeApp,
      credential: {
        cert: firebaseAdminMocks.cert
      }
    });

    mockRequire.reRequire('firebase-admin');

    Meteor.methods({
      'checkCertificate': function (vetId) {
        check(vetId, String);

        return 365;
      }
    });

    Push.appTokens.insert(IOS_TOKEN_0);
    Push.appTokens.insert(IOS_TOKEN_1);
    Push.appTokens.insert(IOS_TOKEN_2);
    Push.appTokens.insert(ANDROID_TOKEN_0);
    Push.appTokens.insert(ANDROID_TOKEN_1);
    Push.appTokens.insert(ANDROID_TOKEN_2);

  });

  after(function () {
    global.GlobalVets = originals.GlobalVets;

    process.env.PUSH_NOTIFICATIONS_DISABLED = originals.nodeEnvs.PUSH_NOTIFICATIONS_DISABLED;
    process.env.NODE_ENV = originals.nodeEnvs.NODE_ENV;

    firebaseAdminInitializeAppSpy.restore();
    firebaseAdminCertSpy.restore();
    mockRequire.stop('firebase-admin');

  });

  afterEach(function () {
    Push.isConfigured = false;
    firebaseAdminInitializeAppSpy.reset();
    firebaseAdminCertSpy.reset();
    firebaseAdminSendSpy.reset();
  });

  it('Initializes FCM admin with correct data', function () {

    Push.Configure({});

    assert.equal(firebaseAdminInitializeAppSpy.callCount, 2);
    assert.equal(firebaseAdminInitializeAppSpy.getCall(0).args[0].credential, 'mock-cert');
    assert.ok(firebaseAdminInitializeAppSpy.getCall(0).args[1].startsWith('APP_IDENTIFIER_1__'));

    assert.equal(firebaseAdminInitializeAppSpy.getCall(1).args[0].credential, 'mock-cert');
    assert.ok(firebaseAdminInitializeAppSpy.getCall(1).args[1].startsWith('APP_IDENTIFIER_2__'));

    assert.equal(firebaseAdminCertSpy.callCount, 2);

    let serviceAccountConfig = firebaseAdminCertSpy.getCall(0).args[0];
    assert.isNotNull(serviceAccountConfig);
    assert.equal(serviceAccountConfig.projectId, FIREBASE_PROJECT_ID_1);
    assert.equal(serviceAccountConfig.clientEmail, FIREBASE_EMAIL_1);
    assert.equal(serviceAccountConfig.privateKey, FIREBASE_PRIVATE_KEY_1);

    serviceAccountConfig = firebaseAdminCertSpy.getCall(1).args[0];
    assert.isNotNull(serviceAccountConfig);
    assert.equal(serviceAccountConfig.projectId, FIREBASE_PROJECT_ID_2);
    assert.equal(serviceAccountConfig.clientEmail, FIREBASE_EMAIL_2);
    assert.equal(serviceAccountConfig.privateKey, FIREBASE_PRIVATE_KEY_2);
  });

  it('Sends notification to all', function (done) {
    Push.Configure({sendInterval: 10});

    console.log('#### Count before', Push.notifications.find({}).count());
    Push.send({
      from: APP_IDENTIFIER_1,
      title: 'Test message title 01',
      text: 'Test message text 01',
      badge: 1,
      payload: {testPayload: 'PAYLOAD'},
      appIdentifier: APP_IDENTIFIER_1,
      apn: {
        sound: 'APN_SOUND'
      },
      gcm: {
        sound: 'GCM_SOUND'
      },
      query: {}
    });

    Meteor.setTimeout(function () {

      console.log('#### Count after', Push.notifications.find({}).count());
      assert.equal(firebaseAdminSendSpy.callCount, 4);

      let sentToTokens = {
        FCM_TOKEN_IOS_0: false,
        FCM_TOKEN_IOS_1: false,
        FCM_TOKEN_IOS_2: false,
        FCM_TOKEN_AND_0: false,
        FCM_TOKEN_AND_1: false,
        FCM_TOKEN_AND_2: false
      };

      for (let i = 0; i < 4; i++) {
        let args = firebaseAdminSendSpy.getCall(i).args;
        assert.equal(args.length, 1);

        let fcmMessage = args[0];

        verifyFcmMessage(fcmMessage, 'Test message title 01', 'Test message text 01', 'PAYLOAD', 'GCM_SOUND', 'APN_SOUND', 1);

        assert.isNotNull(fcmMessage.token);

        sentToTokens[fcmMessage.token] = true;
      }

      assert.equal(sentToTokens.FCM_TOKEN_IOS_0, true);
      assert.equal(sentToTokens.FCM_TOKEN_IOS_1, true);
      assert.equal(sentToTokens.FCM_TOKEN_AND_0, true);
      assert.equal(sentToTokens.FCM_TOKEN_AND_1, true);

      assert.equal(sentToTokens.FCM_TOKEN_IOS_2, false);
      assert.equal(sentToTokens.FCM_TOKEN_AND_2, false);

      assert.equal(Push.notifications.find().count(), 0);

      done();
    }, 100);
  });

  it('Sends notification to specific user', function (done) {
    Push.Configure({sendInterval: 10});

    console.log('#### Count before', Push.notifications.find({}).count());
    Push.send({
      from: APP_IDENTIFIER_1,
      title: 'Test message title 01',
      text: 'Test message text 01',
      badge: 1,
      payload: {testPayload: 'PAYLOAD'},
      appIdentifier: APP_IDENTIFIER_1,
      apn: {
        sound: 'APN_SOUND'
      },
      gcm: {
        sound: 'GCM_SOUND'
      },
      query: {userId: USER_1_ID}
    });

    // make sure createdAt is at least 1ms later
    Meteor.wrapAsync(waitABit)(1);

    Push.send({
      from: APP_IDENTIFIER_1,
      title: 'Test message title 02',
      text: 'Test message text 02',
      badge: 1,
      payload: {testPayload: 'PAYLOAD'},
      appIdentifier: APP_IDENTIFIER_1,
      apn: {
        sound: 'APN_SOUND'
      },
      gcm: {
        sound: 'GCM_SOUND'
      },
      query: {userId: USER_2_ID}
    });

    Meteor.setTimeout(function () {

      console.log('#### Count after', Push.notifications.find({}).count());
      assert.equal(firebaseAdminSendSpy.callCount, 2);

      let sentToTokens = {
        FCM_TOKEN_IOS_0: false,
        FCM_TOKEN_IOS_1: false,
        FCM_TOKEN_IOS_2: false,
        FCM_TOKEN_AND_0: false,
        FCM_TOKEN_AND_1: false,
        FCM_TOKEN_AND_2: false
      };

      let args = firebaseAdminSendSpy.getCall(0).args;
      assert.equal(args.length, 1);

      let fcmMessage = args[0];

      verifyFcmMessage(fcmMessage, 'Test message title 01', 'Test message text 01', 'PAYLOAD', 'GCM_SOUND', 'APN_SOUND', 1);
      assert.equal(fcmMessage.token, IOS_TOKEN_1.fcmToken);
      sentToTokens[fcmMessage.token] = true;

      args = firebaseAdminSendSpy.getCall(1).args;
      assert.equal(args.length, 1);

      fcmMessage = args[0];

      verifyFcmMessage(fcmMessage, 'Test message title 02', 'Test message text 02', 'PAYLOAD', 'GCM_SOUND', 'APN_SOUND', 1);
      assert.equal(fcmMessage.token, ANDROID_TOKEN_0.fcmToken);
      sentToTokens[fcmMessage.token] = true;

      assert.equal(sentToTokens.FCM_TOKEN_IOS_1, true);
      assert.equal(sentToTokens.FCM_TOKEN_AND_0, true);

      assert.equal(sentToTokens.FCM_TOKEN_IOS_0, false);
      assert.equal(sentToTokens.FCM_TOKEN_IOS_2, false);
      assert.equal(sentToTokens.FCM_TOKEN_AND_1, false);
      assert.equal(sentToTokens.FCM_TOKEN_AND_2, false);

      assert.equal(Push.notifications.find().count(), 0);

      done();
    }, 100);
  });
});


function waitABit(timeout, callback) {
  setTimeout(function () {
    callback(null, {});
  }, timeout);
}
