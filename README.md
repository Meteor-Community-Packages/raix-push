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
            passphrase: 'xxx',
            // pem files are placed in the app private folder
            certData: Assets.getText('apnProdCert.pem'),
            keyData: Assets.getText('apnProdKey.pem'),
            production: true, // or...
            gateway: 'gateway.push.apple.com',
        }
    });
    
    // Send to one token - please try out the common send
    Push.sendAPN = function(from, userToken, title, text, count, priority);
    // Send to array of tokens - Please try out the common send
    Push.sendGCM = function(from, userTokens, title, text, count, priority)

    // Internal events
    Push.addListener('token', function(currentToken, newToken) {
        // Token is { apn: 'xxxx' } or { gcm: 'xxxx' } or undefined
        // if newToken is undefined then the currentToken is invalid
        // if newToken is set then this should replace the currentToken
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

    Push.id(); // Unified id - not a token

    // Internal events
    Push.addListener('token', function(token) {
        // Token is { apn: 'xxxx' } or { gcm: 'xxxx' }
    });

    /*
    error { type: 'gcm', error: error }
    register
    startup
    badge
    */
```

## Common api
```js
    Push.send = function(from, appIds, title, text, count, priority);
    Push.addListener(); 

    // Security
    // Push.allow
    // Push.deny
```

Kind regards

Morten (aka RaiX)
