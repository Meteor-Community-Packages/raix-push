// eslint-disable-next-line import/no-unresolved
import {assert} from 'meteor/practicalmeteor:chai';
import sinon from 'sinon';
import '../common/main.js';
import '../common/notifications.js';
import './push.api.js';
import './server.js';

const mockRequire = require('mock-require');

const APP_IDENTIFIER = 'APP_IDENTIFIER';
const FIREBASE_CREDENTIALS = 'FIREBASE_CREDENTIALS';
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
    firebaseCredentials: FIREBASE_CREDENTIALS,
    projectId: FIREBASE_EMAIL,
    privateKey: FIREBASE_PRIVATE_KEY
  },
  appIdentifier: APP_IDENTIFIER
};

describe('Testing push API', function () {

  let messagingMock = sinon.mock({
    send: function (fcmMessage) {
      console.log(`Sending message ${JSON.stringify(fcmMessage)}`);
    }
  });

  let firebaseMock = sinon.mock({
    messaging: function () {
      return messagingMock;
    }
  });

  let firebaseAdminMocks = {
    initializeApp: function (...args) {
      console.log('Spies, open you eyes! firebaseAdmin.initializeApp', JSON.stringify(args));
      return firebaseMock;
    },
    cert: function (...args) {
      console.log('Spies, open you eyes! firebaseAdmin.credential.cert', JSON.stringify(args));
      return 'mock-cert';
    }
  };

  let firebaseAdminInitializeAppSpy;

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
    mockRequire.stop('firebase-admin');

  });

  afterEach(function () {
    firebaseAdminInitializeAppSpy.reset();
  });

  it('Initialized FCM admin with correct data', function () {

    Push.Configure({});

    assert.equal(firebaseAdminInitializeAppSpy.callCount, 1);
    assert.equal(firebaseAdminInitializeAppSpy.getCall(0).args[0].credential, 'mock-cert');
    assert.ok(firebaseAdminInitializeAppSpy.getCall(0).args[1].startsWith('APP_IDENTIFIER__'));
  });
});
