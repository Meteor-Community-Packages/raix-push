raix:push Push notifications
=========

Push notifications for cordova (ios, android) browser (Chrome, Safari, Firefox) - One unified api on client and server.

WIP - Not for use yet

## Server api

```js
    Push.init({
        gcm: {
            pushId: 'xxxxxxxxxxxxx'
        },
        apn: { // setting this on client throws security error
            'passphrase': 'xxx',
            'certData': Assets.getText('apnProdCert.pem'),
            'keyData': Assets.getText('apnProdKey.pem'),
            'gateway': 'gateway.push.apple.com',
        }
    });
```

## Client api
```js
    // Common client api
    Push.init({
        gcm: {
            pushId: 'xxxxxxxxxxxxxxxxxx'
        },
        apn: {
            pushId: 'com.push.server'
            webServiceUrl: 'http://some.server.com'
        },
        bagde: true,
        sound: true,
        alert: true
    });

    Push.id();
```

## Common api
```js
    Push.send();
    Push.addListener(); 

    // Security
    // Push.allow
    // Push.deny
```

Kind regards

Morten (aka RaiX)