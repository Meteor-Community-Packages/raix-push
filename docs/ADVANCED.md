More advanced details
=====================

## API Details

Common:
```js
    // The Push object is an EventEmitter
    Push.addListener();
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
    coldstart, // True if the app havent been resumed
    background, // If message recieved while app was in background
    foreground, // If message recieved while app was in foreground
    open, // Flag marking if the note triggered the app to open
    payload // Custom object
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
Please note that `Push.Configure` is called automatically when using the `config.push.json` file. `Push.Configure` may only be called once otherwise it throws an error - this is intended behaviour.

```js
    Push.Configure({
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
    Push.Configure({
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

### Internal server API

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

### Send API

You can send push notifications from the client or the server using Push.send(). If sending from the client you are required to use [allow/deny](ADVANCED.md#client-security)) rules.

There are 4 required parameters that must be passed to `Push.send`. They are:
* `from` : reserved for future use. intended to be internally used by gcm to generate a collapse key. this can be any random string at the moment
* `title` : the bold title text that is displayed in the notification
* `text` : the normal sub-text that is displayed in the notification
* a selection query from below

The 4th parameter is a selection query for determining who the message should be sent to. This query can be one of the three following items:
* `query` : {} or {userId : 'XXXXX'} or {id : 'XXXXX'} 
* `token` : {gcm : 'XXXXXX'} or {apn : 'XXXXX'}
* `tokens` : [{gcm : 'XXXXX0'},{gcm : 'XXXXX1'}, {apn : 'XXXXX0'}]

`query` can be left empty in which case the notification will be sent to all devices that have registered a token. `query` can also be one or more ids obtained from clients via `Push.id()` or one or more userIds associated with the accounts-base package and Meteor.userId().

`token` is an apn or gcm token registered by the device in the form:
```js
{ apn: String } or { gcm: String }
```

`tokens` is simply and array of tokens from the previous example

`delayUntil` is an optional Date. If set, sending will be delayed until then.

The query selector is used against a Mongo Collection created by the push packahe called `Push.appCollection`. This collection stores the userIds, pushIds, and tokens of all devices that register with the server. With a desired selection query chosen a minimal `Push.send` takes the following form (using one of the queries). 

```js
Push.send({
  from: 'Test',
  title: 'Hello',
  text: 'World',
  query: {}
  token: {}
  tokens: [{},{}]
  delayUntil: new Date()
});
```

### Client Security
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

