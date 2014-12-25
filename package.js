Package.describe({
  name: 'raix:push',
  version: '2.0.9',
  summary: 'Push notifications',
  git: 'https://github.com/raix/push.git'
});

// Server-side push deps
Npm.depends({
  'apn' : '1.6.2', // 1.3.8, 1.4.2
  //'debug': '0.7.3', // DEBUG
  'node-gcm' : '0.9.6' // 0.9.6
});

Cordova.depends({
  // Fix issue 365 ios 7 missing badge updates
  'com.phonegap.plugins.PushPlugin': 'https://github.com/raix/PushPlugin/tarball/ff4ade868488ef0fcb014da652681011cd95d8ea'
  // 'com.clone.phonegap.plugins.pushplugin': '2.4.1' //with #354 fixed OK
  //'com.phonegap.plugins.PushPlugin': 'http://github.com/rossmartin/PushPlugin/tarball/6cf2e1a107310e859839fb7a0dc2618a7a199430'
});


Package.onUse(function(api) {
  api.versionsFrom('1.0');

  api.use([
    'tracker', // Push.id() is reactive
    'random'   // The push it is created with Random.id()
  ], 'client');

  api.use(['raix:eventemitter@0.1.1', 'check'], ['client', 'server']);

  api.use('mongo', 'server');

  // Common api
  api.addFiles('common.js', ['client', 'server']);

  // API's
  api.addFiles('browser.js', 'web.browser');
  api.addFiles('cordova.js', 'web.cordova');
  api.addFiles('push.server.js', 'server');

  // Unified api
  api.addFiles('client.js', 'client');
  api.addFiles('server.js', 'server');

  api.export('Push');
  api.export('onNotificationAPN', 'web.cordova');
  api.export('onNotificationGCM', 'web.cordova');

});
