# Changelog

## vCurrent
## [v2.1.0] (https://github.com/raix/push/tree/v2.1.0)
#### 26/12/14 by Morten Henriksen
- Correct documentation

- Add allow and deny rules to documentation

- Ignore setBadge on the server for now

- Add the throttled send

- Add secure client send push notification

- Refactor appId to appName

- add more credits

- fix docs

- Add more documentation - all for free

- Correct details about client send

- move setBadge to client code for now

## [v2.0.11] (https://github.com/raix/push/tree/v2.0.11)
#### 26/12/14 by Morten Henriksen
- Clean up docs and hide more advanced features

- pushId in options is now deprecated - use gcm.projectNumber, gcm.apiKey, websitePushId instead - Breaking change!

- have a general production option for Push.init

- We init apn feedback pr. default

- add more debug verbosity

- Add security warnings about exposing keys/certificates or passphrase on client

## [v2.0.10] (https://github.com/raix/push/tree/v2.0.10)
#### 26/12/14 by Morten Henriksen
- 2.0.10 - Added userId and metadata to the appCollection

- Actually set and check the userId

- For now send will return array of app id's that was sent to - This will likely change back to a simple counter in the future

- Comment on meteor startup

- refactor and added the store user id feature

- use the stored scope

- Store data in the stored scope

- use a general save to storage function

- use a general load from storage function

- Add additional checks

- The server can register what user is using the app

- namespace methods to the package raix:push-method

- Detect if the user installed accounts package

- Fix missing ios7 badge updates

- clean up code

- we don't need namescpacing in localstorage

- Add Push scope to common code

## [v2.0.9] (https://github.com/raix/push/tree/v2.0.9)
#### 23/12/14 by Morten Henriksen
- Add details about apn initFeedback

- Implement the update and invalidation of tokens - use the Push.initFeedback()

- Change priority - id first then token, then create

- Actually update the token

## [v2.0.8] (https://github.com/raix/push/tree/v2.0.8)
#### 23/12/14 by Morten Henriksen
- Fix by @adamgins - data wiped on update #2

## [v2.0.7] (https://github.com/raix/push/tree/v2.0.7)
#### 20/12/14 by Morten Henriksen
- Bump to version 2.0.7

- Add example of send

- Added createdAt and updatedAt to the app collection

- Created new api for the send method it now takes options instead of positioned arguments

- remove wip

- fix typo

- have send return send status object { apn: 0, gcm: 0 }

## [v2.0.6] (https://github.com/raix/push/tree/v2.0.6)
#### 17/12/14 by Morten Henriksen
- Bump to version 2.0.6

- mbr update, remove versions.json

## [v2.0.5] (https://github.com/raix/push/tree/v2.0.5)
#### 17/12/14 by Morten Henriksen
## [v2.0.4] (https://github.com/raix/push/tree/v2.0.4)
#### 17/12/14 by Morten Henriksen
- mbr update versions and fix warnings

## [v2.0.3] (https://github.com/raix/push/tree/v2.0.3)
#### 16/12/14 by Morten Henriksen
- have the value be null instead of undefined

## [v2.0.2] (https://github.com/raix/push/tree/v2.0.2)
#### 16/12/14 by Morten Henriksen
- Fix options extend

- warn about missing pushId on android

- make sure options.gcm is set

- add github page

## [v2.0.1] (https://github.com/raix/push/tree/v2.0.1)
#### 15/12/14 by Morten Henriksen
- add setBadge

- remove console

- add docs

- working on apn and cgm

- initial commit - WIP

