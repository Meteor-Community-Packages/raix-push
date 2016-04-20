<img alt="Gi-SoftWare" src="https://raw.githubusercontent.com/raix/push/master/docs/logo.png" width="30%" height="30%">
raix:push Push notifications
=========

> Push notifications for cordova (ios, android) browser (Chrome, Safari, Firefox) - One unified api on client and server.

Status:
* [x] APN iOS
* [x] GCM Android
* [x] APN Safari web push (partially implemented)
* [x] GCM Chrome OS (partially implemented)
* [x] Firefox OS (partially implemented)
* [ ] BPS Blackberry 10
* [ ] MPNS Windows phone 8
* [ ] MPNS Windows 8
* [ ] ADM Amazon Fire OS
* [ ] Meteor in app notifications

## Getting started
Depending on the platforms you want to work with you will need some credentials or certificates.
* [Android](docs/ANDROID.md)
* [iOS](docs/IOS.md)

Have a look at the [Basic example](docs/BASIC.md)

Read the [raix:push Newbie Manual](http://stached.io/standalone/fBLmRhsAuPSxKBSgM) by [@harryward](https://github.com/harryward)

Or check out the [DEMO](https://github.com/elvismercado/meteor-raix-push-demo) by [@elvismercado](https://github.com/elvismercado)

Note:
Version 3 uses the cordova npm plugin [phonegap-plugin-push](https://github.com/phonegap/phonegap-plugin-push#pushnotificationinitoptions)

## Config
Use the `Push.Configure` function on client and server.

On the client
```js
Push.Configure({
  android: {
    senderID: 12341234,
    alert: true,
    badge: true,
    sound: true,
    vibrate: true,
    clearNotifications: true
    // icon: '',
    // iconColor: ''
  },
  ios: {
    alert: true,
    badge: true,
    sound: true
  }
});
```

Server:
```js
Push.Configure({
  apn: {
    certData: Assets.getText('apnDevCert.pem'),
    keyData: Assets.getText('apnDevKey.pem'),
    passphrase: 'xxxxxxxxx',
    production: true,
    //gateway: 'gateway.push.apple.com',
  },
  gcm: {
    apiKey: 'xxxxxxx',
  }
  // production: true,
  // 'sound' true,
  // 'badge' true,
  // 'alert' true,
  // 'vibrate' true,
  // 'sendInterval': 15000, Configurable interval between sending
  // 'sendBatchSize': 1, Configurable number of notifications to send per batch
  // 'keepNotifications': false,
// 
});
```
*Note: `config.push.json` is deprecating*

## Common api
```js
    // Push.debug = true; // Add verbosity

    Push.send({
        from: 'push',
        title: 'Hello',
        text: 'world',
        badge: 1, //optional, use it to set badge count of the receiver when the app is in background.
        query: {
            // Ex. send to a specific user if using accounts:
            userId: 'xxxxxxxxx'
        } // Query the appCollection
        // token: appId or token eg. "{ apn: token }"
        // tokens: array of appId's or tokens
        // payload: user data
        // delayUntil: Date
    });
```
*When in secure mode the client send features require adding allow/deny rules in order to allow the user to send push messages to other users directly from the client - Read more below*

## Client api
```js
    Push.id(); // Unified application id - not a token
    Push.setBadge(count); // ios specific - ignored everywhere else
    Push.enabled(); // Return true or false
    Push.enabled(false); // Will disable notifications
    Push.enabled(true); // Will enable notifications (requires a token...)
```

## Security allow/deny send
This package allows you to send notifications from the server and client. To restrict the client or allowing the client to send use `allow` or `deny` rules.

When a client calls send on Push, the Push's allow and deny callbacks are called on the server to determine if the send should be allowed. If at least one allow callback allows the send, and no deny callbacks deny the send, then the send is allowed to proceed.

```js
    Push.allow({
        send: function(userId, notification) {
            return true; // Allow all users to send
        }
    });

    // Or...
    Push.deny({
        send: function(userId, notification) {
            return false; // Allow all users to send
        }
    });
```

## Meteor Methods

### raix:push-update

Stores a token associated with an application and optionally, a userId.

**Parameters**:

*options* - An object containing the necessary data to store a token. Fields:
* `id` - String (optional) - a record id for the Application/Token document to update. If this does not exist, will return 404.
* `token` - Object - `{ apn: 'TOKEN' }` or `{ gcm: 'TOKEN' }`
* `appName` - String - the name of the application to associate the token with
* `userId` - String (optional) - the user id so associate with the token and application. If none is included no user will be associated. Use `raix:push-setuser` to later associate a userId with a token.

**Returns**:

*recordId* - The id of the stored document associating appName, token, and optionally user in an object of the form:

```
{
  result: 'recordId'
}
```

### raix:push-setuser

Associates the current users ID with an Application/Token record based on the given id.

**Parameters**:

*id* - String - The ID of the Application/Token record

### raix:push-metadata

Adds metadata to a particular Application/Token record.

**Parameters**

*data* - Object containing the following fields:
* `id` - String - the ID of the Application/Token record to update
* `metadata` - Object - The metadata object to add to the Application/Token document

## More Info


For more internal or advanced features read [ADVANCED.md](docs/ADVANCED.md)

Kind regards

Morten (aka RaiX)
