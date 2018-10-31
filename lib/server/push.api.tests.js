// eslint-disable-next-line import/no-unresolved
import {assert} from 'meteor/practicalmeteor:chai';
import sinon from 'sinon';
import '../common/main.js';
import '../common/notifications.js';
import './push.api.js';
import './server.js';

const mockRequire = require('mock-require');

const APP_IDENTIFIER = 'APP_IDENTIFIER';
const FIREBASE_PROJECT_ID = 'FIREBASE_PROJECT_ID';
const FIREBASE_EMAIL = 'FIREBASE_EMAIL';
const FIREBASE_PRIVATE_KEY = 'FIREBASE_PRIVATE_KEY';


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

const defaultVet = {
  _id: 'VET_ID',
  firebaseCredentials: {
    projectId: FIREBASE_PROJECT_ID,
    clientEmail: FIREBASE_EMAIL,
    privateKey: FIREBASE_PRIVATE_KEY
  },
  appIdentifier: APP_IDENTIFIER
};

const IOS_TOKEN_0 = {
  '_id': 'IOS_TOKEN_0',
  'token': {
    'apn': 'APN_TOKEN'
  },
  'fcmToken': 'FCM_TOKEN_IOS_0',
  'appName': APP_IDENTIFIER,
  'userId': 'TEST_USER_0_ID',
  'enabled': true
};

const IOS_TOKEN_1 = {
  '_id': 'IOS_TOKEN_1',
  'token': {
    'apn': 'APN_TOKEN'
  },
  'fcmToken': 'FCM_TOKEN_IOS_1',
  'appName': APP_IDENTIFIER,
  'userId': 'TEST_USER_1_ID',
  'enabled': true
};

const ANDROID_TOKEN_0 = {
  '_id': 'ANDROID_TOKEN_0',
  'token': {
    'gcm': 'GCM_TOKEN'
  },
  'fcmToken': 'FCM_TOKEN_AND_0',
  'appName': APP_IDENTIFIER,
  'userId': 'TEST_USER_2_ID',
  'enabled': true
};

const ANDROID_TOKEN_1 = {
  '_id': 'ANDROID_TOKEN_1',
  'token': {
    'gcm': 'GCM_TOKEN'
  },
  'fcmToken': 'FCM_TOKEN_AND_1',
  'appName': APP_IDENTIFIER,
  'userId': 'TEST_USER_3_ID',
  'enabled': true
};


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
            return [defaultVet];
          }
        };
      },
      findOne: () => {
        return defaultVet;
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
    Push.appTokens.insert(ANDROID_TOKEN_0);
    Push.appTokens.insert(ANDROID_TOKEN_1);

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
    Push.configured = false;
    firebaseAdminInitializeAppSpy.reset();
    firebaseAdminCertSpy.reset();
    firebaseAdminSendSpy.reset();
  });

  it('Initializes FCM admin with correct data', function () {

    Push.Configure({});

    assert.equal(firebaseAdminInitializeAppSpy.callCount, 1);
    assert.equal(firebaseAdminInitializeAppSpy.getCall(0).args[0].credential, 'mock-cert');
    assert.ok(firebaseAdminInitializeAppSpy.getCall(0).args[1].startsWith('APP_IDENTIFIER__'));

    assert.equal(firebaseAdminCertSpy.callCount, 1);

    let serviceAccountConfig = firebaseAdminCertSpy.getCall(0).args[0];
    assert.isNotNull(serviceAccountConfig);
    assert.equal(serviceAccountConfig.projectId, FIREBASE_PROJECT_ID);
    assert.equal(serviceAccountConfig.clientEmail, FIREBASE_EMAIL);
    assert.equal(serviceAccountConfig.privateKey, FIREBASE_PRIVATE_KEY);
  });

  it('Sends notification to all', function (done) {
    Push.Configure({sendInterval: 10});

    console.log('#### Count before', Push.notifications.find({}).count());
    Push.send({
      from: APP_IDENTIFIER,
      title: 'Test message title 01',
      text: 'Test message text 01',
      badge: 1,
      payload: {testPayload: 'PAYLOAD'},
      appIdentifier: APP_IDENTIFIER,
      apn: {
        sound: 'APN_SOUND'
      },
      gcm: {
        sound: 'GCM_SOUND'
      },
      query: {}
    });

    setTimeout(function () {

      // console.log('#### Count after', Push.notifications.find({}).count());
      assert.equal(firebaseAdminSendSpy.callCount, 4);

      let sentToTokens = {
        FCM_TOKEN_IOS_0: false,
        FCM_TOKEN_IOS_1: false,
        FCM_TOKEN_AND_0: false,
        FCM_TOKEN_AND_1: false
      };

      for (let i = 0; i < 4; i++) {
        let args = firebaseAdminSendSpy.getCall(i).args;
        assert.equal(args.length, 1);

        let fcmMessage = args[0];

        assert.isNotNull(fcmMessage);

        assert.isNotNull(fcmMessage.notification);
        assert.equal(fcmMessage.notification.title, 'Test message title 01');
        assert.equal(fcmMessage.notification.body, 'Test message text 01');

        assert.isNotNull(fcmMessage.data);
        assert.equal(fcmMessage.data.testPayload, 'PAYLOAD');

        assert.isNotNull(fcmMessage.android);
        assert.isNotNull(fcmMessage.android.notification);
        assert.equal(fcmMessage.android.notification.sound, 'GCM_SOUND');

        assert.isNotNull(fcmMessage.apns);
        assert.isNotNull(fcmMessage.apns.headers);
        assert.ok(fcmMessage.apns.headers['apns-expiration'].match(/^[\d]{10}$/) !== null);
        assert.ok(Number.parseInt(fcmMessage.apns.headers['apns-expiration'], 10) > moment.utc().add(29, 'days').unix().toString());
        assert.isNotNull(fcmMessage.apns.payload);
        assert.isNotNull(fcmMessage.apns.payload.aps);
        assert.equal(fcmMessage.apns.payload.aps.sound, 'APN_SOUND');
        assert.equal(fcmMessage.apns.payload.aps.badge, 1);

        assert.isNotNull(fcmMessage.token);

        sentToTokens[fcmMessage.token] = true;
      }

      assert.equal(sentToTokens.FCM_TOKEN_IOS_0, true);
      assert.equal(sentToTokens.FCM_TOKEN_IOS_1, true);
      assert.equal(sentToTokens.FCM_TOKEN_AND_0, true);
      assert.equal(sentToTokens.FCM_TOKEN_AND_1, true);

      done();
    }, 100);
  });
});

