<img alt="Gi-SoftWare" src="https://raw.githubusercontent.com/raix/push/master/docs/logo.png" width="30%" height="30%">
raix:push Push notifications
=========

Push notifications for cordova (ios, android) browser (Chrome, Safari, Firefox) - One unified api on client and server.

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
  "production": true,
  // "badge": true,
  // "sound": true,
  // "alert": true,
  // "vibrate": true
}
```

## Common api
```js
    // Push.debug = true; // Add verbosity

    Push.send({
        from: 'push',
        title: 'Hello',
        text: 'world',
        query: {
            // Ex. send to a specific user if using accounts:
            userId: 'xxxxxxxxx'
        } // Query the appCollection
        // token: appId or token eg. "{ apn: token }"
        // tokens: array of appId's or tokens
        // payload: user data
    });
```
*When in secure mode the client send features require adding allow/deny rules in order to allow the user to send push messages to other users directly from the client - Read more below*

## Client api
```js
    Push.id(); // Unified application id - not a token
    Push.setBadge(count); // ios specific - ignored everywhere else
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

For more internal or advanced features read [ADVANCED.md](docs/ADVANCED.md)

Kind regards

Morten (aka RaiX)
