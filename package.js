Package.describe({
  name: 'raix:push',
  version: '0.0.0',
  summary: 'Push notifications'
});

// Server-side push deps 
Npm.depends({
  'apn' : '1.4.2', // 1.3.8
  //'debug': '0.7.3', // DEBUG
  'node-gcm' : '0.9.6' // 0.9.6
});

Cordova.depends({
  "com.phonegap.plugins.PushPlugin": /* 2.4.0 */
    "https://github.com/phonegap-build/PushPlugin/tarball/1979d972b6ab37e28cf2077bc7ebfe706cc4dacd"
});

Package.onUse(function(api) {
  api.versionsFrom('1.0');

  api.use([
    'tracker', // Push.id() is reactive
    'random'   // The push it is created with Random.id()
  ], 'client');

  api.use('raix:eventemitter@0.0.2', ['client', 'server']);

  // API's
  api.addFiles('browser.js', 'web.browser');
  api.addFiles('cordova.js', 'web.cordova');
  api.addFiles('push.server.js', 'server');

  // Unified api
  api.addFiles('client.js', 'client');
  api.addFiles('server.js', 'server');

});