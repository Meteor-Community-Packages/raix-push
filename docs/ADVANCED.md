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
        if (err.type == 'apn.cordova') {
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

NOTE: `config.push.json` is being deprecated and might not work in Meteor 1.3

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
  // "vibrate": true,
  // "sendInterval": 15000,  Configurable interval between sending notifications
  // "sendBatchSize": 1  Configurable number of notifications to send per batch
}
```

### Server api
Please note that `Push.Configure` is called automatically when using the `config.push.json` file. `Push.Configure` may only be called once otherwise it throws an error - this is intended behaviour.

If you want to use the Push.Configure on the client use the options described [here](https://github.com/phonegap/phonegap-plugin-push#pushnotificationinitoptions)
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
  delayUntil: new Date(),
  notId: numberId
});
```
#### Display multiple notifications on Android
 * `notId` : a unique identifier for a GCM message

'notId' supplies a unique id to Cordova Push plugin for 'tag' field in GCM (Android) allowing a per message id, this can be used to replace unread message on both server and client. It differs from collapseKey which only collapses undelivered messages server side. Defaults to a value of zero, must be 32 bit Integer
If `notId` is not set then the Push plugin defaults to a value of 0 causing each message to overwrite the previous and only ever display a single notification.

#### Overwriting platform specific values
If needed it's possible to specify values pr. platform `apn`/`gcm` in the send.
Eg.:
```js
Push.send({
  from: 'Test',
  title: 'Hello',
  text: 'World',
  apn: {
    // apn specific overwrites
    title: 'sent via apn'
  },
  gcm: {
    // gcm specific overwrites
    title: 'sent via gcm'
  },
  query: {}
  token: {}
  tokens: [{},{}]
  delayUntil: new Date()
});
```
*You can overwrite keys: 'from','title','text','badge','sound' and 'notId'*

### Android image in notifications

```js
Push.send({
  from: 'Test',
  title: 'Large icon',
  text: 'Remotely loaded',
  gcm: {
    // gcm specific overwrites
    image: 'https://c1.staticflickr.com/9/8079/8391224056_96da82499d_n.jpg'
  }
});
```

Produces the following result:
![2015-07-24 02 17 55](https://cloud.githubusercontent.com/assets/353180/8866900/2df0ab06-3190-11e5-9a81-fdb85bb0f5a4.png)

### Android styles

#### Inbox style

First notification:

```js
Push.send({
  from: 'Test',
  title: 'My Title',
  text: 'My first message',
  gcm: {
    style: 'inbox',
    summaryText: 'There are %n% notifications'
  }
});
```

Produces the following result:
![first message](https://cloud.githubusercontent.com/assets/353180/9468840/c9c5d43a-4b11-11e5-814f-8dc995f47830.png)

Second notification:

```js
Push.send({
  from: 'Test',
  title: 'My Title',
  text: 'My second message',
  gcm: {
    style: 'inbox',
    summaryText: 'There are %n% notifications'
  }
});
```

Produces the following result:
![second message](https://cloud.githubusercontent.com/assets/353180/9468727/2d658bee-4b11-11e5-90fa-248d54c8f3f6.png)

#### Picture Messages

To include a large picture in the notification:

```js
Push.send({
  from: 'Test',
  title: 'Big Picture',
  text: 'This is my big picture message',
  gcm: {
    style: 'picture',
    picture: 'http://36.media.tumblr.com/c066cc2238103856c9ac506faa6f3bc2/tumblr_nmstmqtuo81tssmyno1_1280.jpg',
    summaryText: 'The internet is built on cat pictures'
  }
});
```

Produces the following result:
![picture message](https://cloud.githubusercontent.com/assets/353180/9472260/3655fa7a-4b22-11e5-8d87-20528112de16.png)

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

## Action Buttons

Your notification can include a maximum of three action buttons. You register the event callback name for each of your actions, then when a user clicks on one of notification's buttons, the event corresponding to that button is fired and the listener you have registered is invoked. For instance, here is a setup with two actions `emailGuests` and `snooze`.

```javascript
const push = PushNotification.init({
  android: {}
});

// data contains the push payload just like a notification event
push.on('emailGuests', data => {
  console.log('I should email my guests');
});

push.on('snooze', data => {
  console.log('Remind me later');
});
```

If you wish to include an icon along with the button name, they must be placed in the `res/drawable` directory of your Android project. Then you can send the following JSON from FCM:

```json
{
  "registration_ids": ["my device id"],
  "data": {
    "title": "AUX Scrum",
    "message": "Scrum: Daily touchbase @ 10am Please be on time so we can cover everything on the agenda.",
    "actions": [
      {
        "icon": "emailGuests",
        "title": "EMAIL GUESTS",
        "callback": "emailGuests",
        "foreground": true
      },
      {
        "icon": "snooze",
        "title": "SNOOZE",
        "callback": "snooze",
        "foreground": false
      }
    ]
  }
}

This will produce the following notification in your tray:

![action_combo](https://cloud.githubusercontent.com/assets/353180/9313435/02554d2a-44f1-11e5-8cd9-0aadd1e02b18.png)

If your user clicks on the main body of the notification, then your app will be opened. However, if they click on either of the action buttons the app will open (or start) and the specified event will be triggered with the callback name. In this case it is `emailGuests` and `snooze`, respectively. If you set the `foreground` property to `true`, the app will be brought to the front, if `foreground` is `false` then the callback is run without the app being brought to the foreground.

#### Actionable Notification for IOS

You must setup the possible actions when you initialize the plugin:
```javascript
var categories = {
  "snoozeRule": {
    "yes": {
      "callback": "Notification.snoozeAction6Hour",
      "title": "6 Hours",
      "foreground": false,
      "destructive": false
    },
    "no": {
      "callback": "Notification.snoozeAction1Day",
      "title": "1 Day",
      "foreground": false,
      "destructive": false
    },
    "maybe": {
      "callback": "Notification.closeAlert",
      "title": "Cancel",
      "foreground": false,
      "destructive": false
    }
  },
  "delete": {
    "yes": {
      "callback": "Notification.delete",
      "title": "Delete",
      "foreground": true,
      "destructive": false
    },
    "no": {
      "callback": "Notification.closeAlert",
      "title": "Cancel",
      "foreground": true,
      "destructive": false
    }
  }
};

Push.Configure({
    ios: {
      alert: true,
      badge: true,
      sound: true,
      clearBadge: true,
      categories: categories
    }
  });
```

Each category is a named object, snoozeRule and delete in this case. These names will need to match the ones you send via your payload to APNS if you want the action buttons to be displayed. Each category can have up to three buttons which must be labeled yes, no and maybe (This is strict, it will not work if you label them anything other than this). In turn each of these buttons has four properties, callback the javascript function you want to call, title the label for the button, foreground whether or not to bring your app to the foreground and destructive which doesn’t actually do anything destructive, it just colors the button red as a warning to the user that the action may be destructive.
