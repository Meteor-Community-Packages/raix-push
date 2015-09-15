Package.describe({
  name: 'raix:push',
  version: '2.6.13-rc.1',
  summary: 'Isomorphic Push notifications for APN and GCM',
  git: 'https://github.com/raix/push.git'
});

// Server-side push deps
Npm.depends({
  'apn' : '1.7.4', // 1.6.2
  'node-gcm' : '0.12.0' // 0.9.6
});

Cordova.depends({
  'phonegap-plugin-push': '1.2.3'
});


Package.onUse(function(api) {
  api.versionsFrom('1.0');

  api.use([
    'tracker', // Push.id() is reactive
    'random'   // The push it is created with Random.id()
  ], 'client');

  // Keep track of users in the appCollection
  api.use('accounts-base', ['client', 'server'], { weak: true });

  api.use('raix:cordova@0.2.3', 'client', { weak: true });

  api.use(['raix:eventstate@0.0.2', 'check', 'mongo'], ['client', 'server']);

  api.use('mongo', 'server');

  // Common api
  api.addFiles([
    'lib/common/main.js',
    'lib/common/notifications.js'
  ], ['client', 'server']);

  // API's
  api.addFiles('lib/client/browser.js', 'web.browser');
  api.addFiles('lib/client/cordova.js', 'web.cordova');
  api.addFiles('lib/server/push.api.js', 'server');

  // Unified api
  api.addFiles('lib/client/client.js', 'client');
  api.addFiles('lib/server/server.js', 'server');

  api.export('Push');

});
