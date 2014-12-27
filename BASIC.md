Basic example
=============

This is an example of how `raix:push` works at a minimal level.

Depending on the platforms you want to work with you will need some credentials or certificates.
* [Android](ANDROID.md)
* [iOS](IOS.md)

## Code
`client/client.js`
```js
// Fire up push asap
Push.init({
  gcm: {
    projectNumber: 'xxxxxxxxxxxx'
  }
});
```

`server/server.js`
```js
var optionsProduction = {
  gcm: {
    apiKey: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
  },
  apn: {    
    'passphrase': 'xxxxxxx',
    // Place the certificate files in /private
    'certData': Assets.getText('apnProdCert.pem'),
    'keyData': Assets.getText('apnProdKey.pem'),
  },
  production: true
};

// Fire up the push notification server
Push.init(optionsProduction);
```

If you remove the `insecure` package from Meteor you have to explicitly allow users to send push notifications from client-side.
`common.js`
```js
  Push.allow({
    send: function(userId, notification) {
      // Allow all users to send to everybody - For test only!
      return true;
    }
  });
```

## Test
You can send push notifications to all users from client and server - Use browser console or Meteor shell:

```js
Push.send({
  from: 'Test',
  title: 'Hello',
  text: 'World',
  count: 12,
  query: {}
});
```

## More
Try adding the Meteor `accounts-password` package and let users login. Try sending a push notification to a user:

```js
Push.send({
  from: 'Test',
  title: 'Hello',
  text: 'World',
  count: 12,
  query: {
    userId: 'xxxxxxxxxxxx'
  }
});
```

## Debug
Help me fix bugs - you can enable debugging by setting `Push.debug = true;` - This will log details about whats going on in the system.

Kind regards

Morten (aka RaiX)