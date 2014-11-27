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
        apn: {
            'passphrase': 'xxx',
            'certData': Assets.getText('apnProdCert.pem'),
            'keyData': Assets.getText('apnProdKey.pem'),
            'gateway': 'gateway.push.apple.com',
        }
    });
```

## Client api
```js
    Push.init({
        gcm: {
            pushId: 'xxxxxxxxxxxxxxxxxx'
        }, apn: {
            pushId: 'com.push.server'
            webServiceUrl: 'http://some.server.com'
        }
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