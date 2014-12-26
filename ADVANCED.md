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
    Push.sendAPN(from, userToken, title, text, count, priority);
    Push.sendGCM = function(from, userTokens, title, text, count, priority)
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