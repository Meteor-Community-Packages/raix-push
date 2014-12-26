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
* [Android](ANDROID.md)
* [iOS](IOS.md)

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
    });

    // Security
    // Push.allow
    // Push.deny
```
*The client send features is WIP in `devel` branch. Adding allow/deny rules in order to allow the user to send push messages to other users directly from the client*

## Server api

```js
    Push.init({
        gcm: {
            apiKey: 'xxxxxxxxxxxxx'
        },
        apn: {
            // setting this on client throws security error
            passphrase: 'xxx',
            // pem files are placed in the app private folder
            certData: Assets.getText('apnProdCert.pem'),
            keyData: Assets.getText('apnProdKey.pem'),
        },
        production: true, // use production server or sandbox
    });  
```

## Client api
```js
    // Common client api
    Push.init({
        gcm: {
            // Required for Android and Chrome OS
            projectNumber: 'xxxxxxxxxxxxxxxxxx'
        },
        apn: {
            // Only required if using safari web push, not required
            // for iOS / cordova
            websitePushId: 'com.push.server'
            webServiceUrl: 'http://some.server.com'
        },
        bagde: true,
        sound: true,
        alert: true
    });

    Push.id(); // Unified id - not a token

    Push.setBadge(count); // ios specific - ignored everywhere else
```


For more internal or advanced features read [ADVANCED.md](ADVANCED.md)

Kind regards

Morten (aka RaiX)
