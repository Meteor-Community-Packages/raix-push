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

    Push.addListener('alert', function(notification) {
        // Called when message got a message in forground
    });

    Push.addListener('sound', function(notification) {
        // Called when message got a sound
    });

    Push.addListener('badge', function(notification) {
        // Called when message got a badge
    });

    Push.addListener('startup', function(notification) {
        // Called when message recieved on startup (cold+warm)
    });

    Push.addListener('message', function(notification) {
        // Called on every message
    });
```

The returned `notification` object from events:
```js
var notification = {    
    message,
    sound, // Relative to the platform
    badge,
    coldstart,
    background,
    foreground,
    payload
};
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