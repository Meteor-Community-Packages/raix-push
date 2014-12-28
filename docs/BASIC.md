Basic example
=============

This is an example of how `raix:push` works at a minimal level.

Depending on the platforms you want to work with you will need some credentials or certificates.
* [Android](ANDROID.md)
* [iOS](IOS.md)

## Config
Add a `config.push.json` file in your project and configure credentials / keys / certificates:

```js
{
  "apn": {
    "passphrase": "xxxxxxxxx",  
    "key": "apnProdKey.pem",
    "cert": "apnProdCert.pem"
  },
  "gcm": {
    "apiKey": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    "projectNumber": xxxxxxxxxxxx
  },
  "production": true
}
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

## Security
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