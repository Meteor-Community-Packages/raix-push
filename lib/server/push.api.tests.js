// eslint-disable-next-line import/no-unresolved
import {assert} from 'meteor/practicalmeteor:chai';
import {FirebaseMessagingError} from 'firebase-admin/lib/utils/error';
import sinon from 'sinon';
import '../common/main.js';
import '../common/notifications.js';
import './push.api.js';
import './server.js';
import {RaixPushError} from '../common/pushError';

const mockRequire = require('mock-require');

const APP_IDENTIFIER_1 = 'APP_IDENTIFIER_1';
const FIREBASE_PROJECT_ID_1 = 'FIREBASE_PROJECT_ID_1';
const FIREBASE_EMAIL_1 = 'FIREBASE_EMAIL_1';
const FIREBASE_PRIVATE_KEY_1 = 'FIREBASE_PRIVATE_KEY_1';

const APP_IDENTIFIER_2 = 'APP_IDENTIFIER_2';
const FIREBASE_PROJECT_ID_2 = 'FIREBASE_PROJECT_ID_2';
const FIREBASE_EMAIL_2 = 'FIREBASE_EMAIL_2';
const FIREBASE_PRIVATE_KEY_2 = 'FIREBASE_PRIVATE_KEY_2';

// Unconfigured app
const APP_IDENTIFIER_3 = 'APP_IDENTIFIER_3';

let originals = {
  GlobalVets: global.GlobalVets,
  nodeEnvs: {
    PUSH_NOTIFICATIONS_DISABLED: process.env.PUSH_NOTIFICATIONS_DISABLED,
    NODE_ENV: process.env.NODE_ENV
  }
};

if (!global.GlobalVets) {
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

let isPushConfigured = false;

const USER_0_ID = 'TEST_USER_0_ID';
const USER_1_ID = 'TEST_USER_1_ID';
const USER_2_ID = 'TEST_USER_2_ID';
const USER_3_ID = 'TEST_USER_3_ID';
const USER_4_ID = 'TEST_USER_4_ID';
const USER_5_ID = 'TEST_USER_5_ID';
const USER_6_ID = 'TEST_USER_6_ID';
const USER_7_ID = 'TEST_USER_7_ID';
const USER_8_ID = 'TEST_USER_8_ID';
const USER_9_ID = 'TEST_USER_9_ID';
const USER_10_ID = 'TEST_USER_10_ID';

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

const IOS_TOKEN_INVALID_0 = {
  '_id': 'IOS_TOKEN_INVALID_0',
  'token': {
    'apn': 'APN_TOKEN_1'
  },
  'appName': APP_IDENTIFIER_1,
  'userId': USER_6_ID,
  'enabled': true
};

const ANDROID_TOKEN_INVALID_0 = {
  '_id': 'ANDROID_TOKEN_INVALID_0',
  'token': {
    'gcm': 'GCM_TOKEN'
  },
  'appName': APP_IDENTIFIER_1,
  'userId': USER_7_ID,
  'enabled': true
};

// token fo unconfigured app
const IOS_TOKEN_INVALID_1 = {
  '_id': 'IOS_TOKEN_INVALID_1',
  'token': {
    'apn': 'APN_TOKEN_1'
  },
  'fcmToken': 'FCM_TOKEN_IOS_4',
  'appName': APP_IDENTIFIER_3,
  'userId': USER_8_ID,
  'enabled': true
};

// tokens that fail
const IOS_TOKEN_TO_FAIL_0 = {
  '_id': 'IOS_TOKEN_TO_FAIL_0',
  'token': {
    'apn': 'APN_TOKEN_2'
  },
  'fcmToken': 'FCM_TOKEN_IOS_FAIL_0',
  'appName': APP_IDENTIFIER_1,
  'userId': USER_9_ID,
  'enabled': true
};

const ANDROID_TOKEN_TO_FAIL_0 = {
  '_id': 'ANDROID_TOKEN_TO_FAIL_0',
  'token': {
    'gcm': 'GCM_TOKEN'
  },
  'fcmToken': 'FCM_TOKEN_AND_FAIL_0',
  'appName': APP_IDENTIFIER_1,
  'userId': USER_10_ID,
  'enabled': true
};

function verifyFcmMessage(fcmMessage, {expectedTitle, expectedBody, expectedPayload, expectedGcmSound, expectedApnSound, expectedBadge}) {
  assert.isNotNull(fcmMessage);

  assert.isNotNull(fcmMessage.notification);

  assert.equal(fcmMessage.notification.title, expectedTitle);
  assert.equal(fcmMessage.notification.body, expectedBody);

  assert.deepEqual(fcmMessage.data, expectedPayload);

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

function verifyPushNotification(notification, {expectedAppIdentifier, expectedFrom, expectedTitle, expectedText, expectedPayload, expectedBadge, expectedTopics, expectedToken, expectedTokens}) {
  assert.equal(notification.from, expectedFrom);
  assert.equal(notification.title, expectedTitle);
  assert.equal(notification.text, expectedText);
  assert.deepEqual(notification.payload, expectedPayload);
  assert.equal(notification.badge, expectedBadge);
  assert.equal(notification.topics, expectedTopics);
  assert.equal(notification.token, expectedToken);
  assert.equal(notification.tokens, expectedTokens);
  assert.equal(notification.appIdentifier, expectedAppIdentifier);
}

describe('Testing push API', function () {

  let firebaseAdminMocks = {};

  firebaseAdminMocks.messagingMock = {
    send: function (...args) {
      console.log('Spies, open you eyes! firebaseAdmin.messaging().send', JSON.stringify(args));

      if (args[0] && (args[0].token === IOS_TOKEN_TO_FAIL_0.fcmToken || args[0].token === ANDROID_TOKEN_TO_FAIL_0.fcmToken)) {
        return new Promise((resolve, reject) => {
          reject(FirebaseMessagingError.fromServerError('RESOURCE_EXHAUSTED', 'SERVER_ERROR_MESSAGE', {raw: 'RAW ERROR'}));
        });
      }

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
  let pushEmitSpy;

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
    pushEmitSpy = sinon.spy(Push, 'emit');

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

  });

  after(function () {
    global.GlobalVets = originals.GlobalVets;

    process.env.PUSH_NOTIFICATIONS_DISABLED = originals.nodeEnvs.PUSH_NOTIFICATIONS_DISABLED;
    process.env.NODE_ENV = originals.nodeEnvs.NODE_ENV;

    firebaseAdminInitializeAppSpy.restore();
    firebaseAdminCertSpy.restore();
    firebaseAdminSendSpy.restore();
    pushEmitSpy.restore();
    mockRequire.stop('firebase-admin');

  });

  beforeEach(function () {
    Push.appTokens.insert(IOS_TOKEN_0);
    Push.appTokens.insert(IOS_TOKEN_1);
    Push.appTokens.insert(IOS_TOKEN_2);
    Push.appTokens.insert(ANDROID_TOKEN_0);
    Push.appTokens.insert(ANDROID_TOKEN_1);
    Push.appTokens.insert(ANDROID_TOKEN_2);

    Push.appTokens.insert(IOS_TOKEN_INVALID_0);
    Push.appTokens.insert(ANDROID_TOKEN_INVALID_0);
    Push.appTokens.insert(IOS_TOKEN_INVALID_1);
  });

  afterEach(function () {
    Push.notifications.remove({});
    Push.appTokens.remove({});

    firebaseAdminInitializeAppSpy.reset();
    firebaseAdminCertSpy.reset();
    firebaseAdminSendSpy.reset();
    pushEmitSpy.reset();
  });

  it('Initializes FCM admin with correct data', function () {

    configurePushIfNotConfigured();

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
    configurePushIfNotConfigured();

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

        verifyFcmMessage(
          fcmMessage,
          {
            expectedTitle: 'Test message title 01',
            expectedBody: 'Test message text 01',
            expectedPayload: {testPayload: 'PAYLOAD'},
            expectedGcmSound: 'GCM_SOUND',
            expectedApnSound: 'APN_SOUND',
            expectedBadge: 1
          }
        );

        assert.isNotNull(fcmMessage.token);
        assert.ok(fcmMessage.topic === null || fcmMessage.topic === undefined);

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
    configurePushIfNotConfigured();

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

      verifyFcmMessage(
        fcmMessage,
        {
          expectedTitle: 'Test message title 01',
          expectedBody: 'Test message text 01',
          expectedPayload: {testPayload: 'PAYLOAD'},
          expectedGcmSound: 'GCM_SOUND',
          expectedApnSound: 'APN_SOUND',
          expectedBadge: 1
        }
      );

      assert.equal(fcmMessage.token, IOS_TOKEN_1.fcmToken);
      assert.ok(fcmMessage.topic === null || fcmMessage.topic === undefined);
      sentToTokens[fcmMessage.token] = true;

      args = firebaseAdminSendSpy.getCall(1).args;
      assert.equal(args.length, 1);

      fcmMessage = args[0];

      verifyFcmMessage(
        fcmMessage,
        {
          fcmMessage: fcmMessage,
          expectedTitle: 'Test message title 02',
          expectedBody: 'Test message text 02',
          expectedPayload: {testPayload: 'PAYLOAD'},
          expectedGcmSound: 'GCM_SOUND',
          expectedApnSound: 'APN_SOUND',
          expectedBadge: 1
        }
      );

      assert.equal(fcmMessage.token, ANDROID_TOKEN_0.fcmToken);
      assert.ok(fcmMessage.topic === null || fcmMessage.topic === undefined);
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

  it('Sends notification to topic', function (done) {
    configurePushIfNotConfigured();

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
      topics: ['TOPIC_0', 'TOPIC_1']
    });

    Meteor.setTimeout(function () {

      assert.equal(firebaseAdminSendSpy.callCount, 2);

      let args = firebaseAdminSendSpy.getCall(0).args;
      assert.equal(args.length, 1);

      let fcmMessage = args[0];

      verifyFcmMessage(
        fcmMessage,
        {
          fcmMessage: fcmMessage,
          expectedTitle: 'Test message title 01',
          expectedBody: 'Test message text 01',
          expectedPayload: {testPayload: 'PAYLOAD'},
          expectedGcmSound: 'GCM_SOUND',
          expectedApnSound: 'APN_SOUND',
          expectedBadge: 1
        }
      );

      assert.equal(fcmMessage.topic, 'TOPIC_0');
      assert.ok(fcmMessage.token === null || fcmMessage.token === undefined);

      args = firebaseAdminSendSpy.getCall(1).args;
      assert.equal(args.length, 1);

      fcmMessage = args[0];

      verifyFcmMessage(
        fcmMessage,
        {
          fcmMessage: fcmMessage,
          expectedTitle: 'Test message title 01',
          expectedBody: 'Test message text 01',
          expectedPayload: {testPayload: 'PAYLOAD'},
          expectedGcmSound: 'GCM_SOUND',
          expectedApnSound: 'APN_SOUND',
          expectedBadge: 1
        }
      );

      assert.equal(fcmMessage.topic, 'TOPIC_1');
      assert.ok(fcmMessage.token === null || fcmMessage.token === undefined);

      assert.equal(Push.notifications.find().count(), 0);

      done();
    }, 100);
  });

  it('Sends notification to token', function (done) {
    configurePushIfNotConfigured();

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
      token: IOS_TOKEN_0.fcmToken
    });

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
      token: ANDROID_TOKEN_0.fcmToken
    });

    Meteor.setTimeout(function () {

      assert.equal(firebaseAdminSendSpy.callCount, 2);

      let args = firebaseAdminSendSpy.getCall(0).args;
      assert.equal(args.length, 1);

      let fcmMessage = args[0];

      verifyFcmMessage(
        fcmMessage,
        {
          fcmMessage: fcmMessage,
          expectedTitle: 'Test message title 01',
          expectedBody: 'Test message text 01',
          expectedPayload: {testPayload: 'PAYLOAD'},
          expectedGcmSound: 'GCM_SOUND',
          expectedApnSound: 'APN_SOUND',
          expectedBadge: 1
        }
      );

      assert.equal(fcmMessage.token, IOS_TOKEN_0.fcmToken);
      assert.ok(fcmMessage.topic === null || fcmMessage.topic === undefined);

      args = firebaseAdminSendSpy.getCall(1).args;
      assert.equal(args.length, 1);

      fcmMessage = args[0];

      verifyFcmMessage(
        fcmMessage,
        {
          fcmMessage: fcmMessage,
          expectedTitle: 'Test message title 02',
          expectedBody: 'Test message text 02',
          expectedPayload: {testPayload: 'PAYLOAD'},
          expectedGcmSound: 'GCM_SOUND',
          expectedApnSound: 'APN_SOUND',
          expectedBadge: 1
        }
      );

      assert.equal(fcmMessage.token, ANDROID_TOKEN_0.fcmToken);
      assert.ok(fcmMessage.topic === null || fcmMessage.topic === undefined);

      assert.equal(Push.notifications.find().count(), 0);

      done();
    }, 100);
  });

  it('Sends notification to tokens', function (done) {
    configurePushIfNotConfigured();

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
      tokens: [IOS_TOKEN_0.fcmToken, ANDROID_TOKEN_0.fcmToken]
    });

    Meteor.setTimeout(function () {

      assert.equal(firebaseAdminSendSpy.callCount, 2);

      let args = firebaseAdminSendSpy.getCall(0).args;
      assert.equal(args.length, 1);

      let fcmMessage = args[0];

      verifyFcmMessage(
        fcmMessage,
        {
          fcmMessage: fcmMessage,
          expectedTitle: 'Test message title 01',
          expectedBody: 'Test message text 01',
          expectedPayload: {testPayload: 'PAYLOAD'},
          expectedGcmSound: 'GCM_SOUND',
          expectedApnSound: 'APN_SOUND',
          expectedBadge: 1
        }
      );

      assert.equal(fcmMessage.token, IOS_TOKEN_0.fcmToken);
      assert.ok(fcmMessage.topic === null || fcmMessage.topic === undefined);

      args = firebaseAdminSendSpy.getCall(1).args;
      assert.equal(args.length, 1);

      fcmMessage = args[0];

      verifyFcmMessage(
        fcmMessage,
        {
          fcmMessage: fcmMessage,
          expectedTitle: 'Test message title 01',
          expectedBody: 'Test message text 01',
          expectedPayload: {testPayload: 'PAYLOAD'},
          expectedGcmSound: 'GCM_SOUND',
          expectedApnSound: 'APN_SOUND',
          expectedBadge: 1
        }
      );

      assert.equal(fcmMessage.token, ANDROID_TOKEN_0.fcmToken);
      assert.ok(fcmMessage.topic === null || fcmMessage.topic === undefined);

      assert.equal(Push.notifications.find().count(), 0);

      done();
    }, 100);
  });

  it('Fails to send notification to invalid token - missing fcmToken', function (done) {
    configurePushIfNotConfigured();

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
      query: {userId: USER_6_ID}
    });

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
      query: {userId: USER_7_ID}
    });

    Meteor.setTimeout(function () {

      assert.equal(firebaseAdminSendSpy.callCount, 0);

      assert.ok(pushEmitSpy.callCount > 0);

      let emittedErrors = [];
      for (let i = 0; i < pushEmitSpy.callCount; i++) {
        let callArgs = pushEmitSpy.getCall(i).args;

        if (callArgs[0] === 'errorSendingNotification') {
          emittedErrors.push(callArgs[1]);
        }
      }

      assert.equal(emittedErrors.length, 2);

      let notification = emittedErrors[0].notification;

      verifyPushNotification(notification, {
        expectedAppIdentifier: APP_IDENTIFIER_1,
        expectedFrom: APP_IDENTIFIER_1,
        expectedBadge: 1,
        expectedPayload: {testPayload: 'PAYLOAD'},
        expectedTitle: 'Test message title 01',
        expectedText: 'Test message text 01',
        expectedToken: undefined,
        expectedTokens: undefined,
        expectedTopics: undefined
      });

      let error = emittedErrors[0].error;

      assert.isNotNull(error);
      assert.ok(error instanceof RaixPushError);
      assert.isNotNull(error.errorInfo);
      assert.equal(error.errorInfo.code, 'push/no-fcm-token');

      notification = emittedErrors[1].notification;

      verifyPushNotification(notification, {
        expectedAppIdentifier: APP_IDENTIFIER_1,
        expectedFrom: APP_IDENTIFIER_1,
        expectedBadge: 1,
        expectedPayload: {testPayload: 'PAYLOAD'},
        expectedTitle: 'Test message title 02',
        expectedText: 'Test message text 02',
        expectedToken: undefined,
        expectedTokens: undefined,
        expectedTopics: undefined
      });

      error = emittedErrors[1].error;

      assert.isNotNull(error);
      assert.ok(error instanceof RaixPushError);
      assert.isNotNull(error.errorInfo);
      assert.equal(error.errorInfo.code, 'push/no-fcm-token');

      assert.equal(Push.notifications.find().count(), 0);

      done();
    }, 200);
  });

  it('Fails to send notification to invalid notification - app not found', function (done) {
    configurePushIfNotConfigured();

    Push.send({
      from: APP_IDENTIFIER_3,
      title: 'Test message title 01',
      text: 'Test message text 01',
      badge: 1,
      payload: {testPayload: 'PAYLOAD'},
      appIdentifier: APP_IDENTIFIER_3,
      apn: {
        sound: 'APN_SOUND'
      },
      gcm: {
        sound: 'GCM_SOUND'
      },
      query: {userId: USER_8_ID}
    });

    Meteor.setTimeout(function () {

      assert.equal(firebaseAdminSendSpy.callCount, 0);

      assert.ok(pushEmitSpy.callCount > 0);

      let emittedErrors = [];
      for (let i = 0; i < pushEmitSpy.callCount; i++) {
        let callArgs = pushEmitSpy.getCall(i).args;

        if (callArgs[0] === 'errorSendingNotification') {
          emittedErrors.push(callArgs[1]);
        }
      }

      assert.equal(emittedErrors.length, 1);

      let notification = emittedErrors[0].notification;

      verifyPushNotification(notification, {
        expectedAppIdentifier: APP_IDENTIFIER_3,
        expectedFrom: APP_IDENTIFIER_3,
        expectedBadge: 1,
        expectedPayload: {testPayload: 'PAYLOAD'},
        expectedTitle: 'Test message title 01',
        expectedText: 'Test message text 01',
        expectedToken: undefined,
        expectedTokens: undefined,
        expectedTopics: undefined
      });

      let error = emittedErrors[0].error;

      assert.isNotNull(error);
      assert.ok(error instanceof RaixPushError);
      assert.isNotNull(error.errorInfo);
      assert.equal(error.errorInfo.code, 'push/no-firebase-app-found');

      assert.equal(Push.notifications.find().count(), 0);

      done();
    }, 100);
  });

  it('Sends to tokens partially, and resends failed ones', function (done) {
    Push.appTokens.insert(IOS_TOKEN_TO_FAIL_0);
    Push.appTokens.insert(ANDROID_TOKEN_TO_FAIL_0);

    configurePushIfNotConfigured();

    Push.notifications.insert({
      from: APP_IDENTIFIER_1,
      title: 'Test message title 01',
      text: 'Test message text 01',
      appIdentifier: APP_IDENTIFIER_1,
      badge: 1,
      apn: {
        sound: 'APN_SOUND'
      },
      gcm: {
        sound: 'GCM_SOUND'
      },
      tokens: [IOS_TOKEN_0.fcmToken, IOS_TOKEN_TO_FAIL_0.fcmToken, IOS_TOKEN_1.fcmToken, ANDROID_TOKEN_TO_FAIL_0.fcmToken],
      payload: {testPayload: 'PAYLOAD'},
      createdAt: new Date()
    });

    Meteor.setTimeout(function () {

      assert.equal(firebaseAdminSendSpy.callCount, 4);

      let emittedErrors = [];
      for (let i = 0; i < pushEmitSpy.callCount; i++) {
        let callArgs = pushEmitSpy.getCall(i).args;

        if (callArgs[0] === 'errorSendingNotification') {
          emittedErrors.push(callArgs[1]);
        }
      }

      assert.equal(emittedErrors.length, 0);

      assert.equal(Push.notifications.find().count(), 2);

      let failedTokens = [];
      Push.notifications.find().fetch().forEach(raixNotification => {
        failedTokens.push(raixNotification.token);

        verifyPushNotification(raixNotification, {
          expectedAppIdentifier: APP_IDENTIFIER_1,
          expectedFrom: APP_IDENTIFIER_1,
          expectedBadge: 1,
          expectedPayload: {testPayload: 'PAYLOAD'},
          expectedTitle: 'Test message title 01',
          expectedText: 'Test message text 01',
          expectedToken: raixNotification.token,
          expectedTokens: undefined,
          expectedTopics: undefined
        });

        assert.ok(raixNotification.delayUntil instanceof Date);
        assert.ok(moment.utc(raixNotification.delayUntil).isAfter(moment.utc()));

      });

      assert.equal(failedTokens.length, 2);

      assert.ok(failedTokens.includes(IOS_TOKEN_TO_FAIL_0.fcmToken));
      assert.ok(failedTokens.includes(ANDROID_TOKEN_TO_FAIL_0.fcmToken));

      done();
    }, 200);
  });
});

function configurePushIfNotConfigured() {
  if (!isPushConfigured) {
    isPushConfigured = true;
    Push.Configure({sendInterval: 10});
  }
}

function waitABit(timeout, callback) {
  setTimeout(function () {
    callback(null, {});
  }, timeout);
}
