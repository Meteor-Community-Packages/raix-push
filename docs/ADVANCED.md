More advanced details
=====================

## API Details

Common:
```js
    // The Push object is an EventEmitter
    Push.addListener();
```

Server:
```js
    // Internal events
    Push.addListener('token', function(currentToken, newToken) {
        // Token is { apn: 'xxxx' } or { gcm: 'xxxx' } or null
        // if newToken is null then the currentToken is invalid
        // if newToken is set then this should replace the currentToken
    });

    // Direct access to the send functions
    Push.sendAPN(userToken, options);
    Push.sendGCM(userTokens, options)
```

Client:
```js
    // Internal events
    Push.addListener('token', function(token) {
        // Token is { apn: 'xxxx' } or { gcm: 'xxxx' }
    });

    Push.addListener('error', function(err) {
        if (error.type == 'apn.cordova') {
            console.log(err.error);
        }
    });

    Push.addListener('register', function(evt) {
        // Platform specific event - not really used
    });

    Push.addListener('startup', function(evt) {
        // For now the evt is platform specific but we
        // should really have one unified object returned here
        // eg.:
        // evt.message
        // evt.sound
        // evt.badge
        // evt.coldstart?
    });

    Push.addListener('badge', function(count) {
        // Message wants to set badge count
    });
```

Event types:
* `apn.cordova`
* `gcm.cordova`
* `apn.browser`
* `gcm.browser`
* `cordova.browser`

## Setting credentials / certificates

This can be done via:
* In `config.push.json` file
* In client/server code

### Config
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

### Server api

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

### Client api
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

    Push.id(); // Unified application id - not a token
    Push.setBadge(count); // ios specific - ignored everywhere else
```