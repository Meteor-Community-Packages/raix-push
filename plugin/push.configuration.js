// Check the config and log errors
var checkConfig = function(config) {
  check(config, {
    apn: Match.Optional({
      passphrase: String,
      cert: String,
      key: String,
      // Web site config is optional
      webServiceUrl: Match.Optional(String),
      websitePushId: Match.Optional(String),
      // Production is optional, defaults to development
      production: Match.Optional(Boolean),
      gateway: Match.Optional(String),
    }),
    gcm: Match.Optional({
      apiKey: String,
      projectNumber: String
    }),
    // Allow optional production
    production: Match.Optional(Boolean),
    // Allow optional sound, badge, alert, vibrate
    sound: Match.Optional(Boolean),
    badge: Match.Optional(Boolean),
    alert: Match.Optional(Boolean),
    vibrate: Match.Optional(Boolean),
    // Support the old iframe Meteor cordova integration
    iframe: Match.Optional(String),
    useRootJSONPayload: Match.Optional(Boolean)
  });

  // Make sure at least one service is configured?
  if (!config.apn && !config.gcm)
    console.warn('Push configuration: No push services configured');

  // If apn webServiceUrl or websitePushId then make sure both are set
  if (config.apn && (config.apn.webServiceUrl || config.apn.websitePushId) && !(config.apn.webServiceUrl && config.apn.websitePushId))
    throw new Error('Push configuration: Both "apn.webServiceUrl" and "apn.websitePushId" must be set');
};

var clone = function(name, config, result) {
  if (typeof config[name] !== 'undefined')
    result[name] = config[name];
};

var cloneCommon = function(config, result) {
  clone('production', config, result);
  clone('sound', config, result);
  clone('badge', config, result);
  clone('alert', config, result);
  clone('vibrate', config, result);
  clone('useRootJSONPayload', config, result);
};

var archConfig = {
  'web.browser': function(config) {
    var result = {};
    if (config.apn && config.apn.webServiceUrl) {
      // Make sure apn is set
      result.apn = {
        // Set apn web service
        webServiceUrl: config.apn.webServiceUrl,
        websitePushId: config.apn.websitePushId
      };
    }

    if (config.iframe) {
      // Set iframe
      result.iframe = config.iframe;
    }

    if (result) cloneCommon(config, result);

    return result;
  },
  'web.cordova': function(config) {
    var result = {};
    if (config.gcm) {
      // Make sure gcm is set
      result.gcm = {
        // Set gcm web service
        projectNumber: config.gcm.projectNumber
      };
    }

    if (result) cloneCommon(config, result);

    return result;
  },
  'os': function(config) {
    var result = {};
    if (config.apn) {
      // Make sure apn is set
      result.apn = {
        // Set apn web service
        key: config.apn.key,
        cert: config.apn.cert,
        passphrase: config.apn.passphrase
      };
    }

    if (config.gcm) {
      // Make sure gcm is set
      result.gcm = {
        // Set gcm web service
        apiKey: config.gcm.apiKey
      };
    }

    if (result) cloneCommon(config, result);

    return result;
  }
};

var configStringify = function(config) {
  var str = JSON.stringify(config, null, '\t');
  // We need to do some extra work for apn on the server - since we would
  // load certificates from the app private folder
  if (config.apn && config.apn.key && config.apn.cert) {
    str = str.replace('"key": "' + config.apn.key + '"', '"keyData": Assets.getText(\'' + config.apn.key + '\')');
    str = str.replace('"cert": "' + config.apn.cert + '"', '"certData": Assets.getText(\'' + config.apn.cert + '\')');
  }

  if (config.iframe)
    str = str.replace('"iframe": "' + config.iframe + '"', 'iframe: ' + config.iframe);

  return 'Push.Configure(' + str + ');'
};


Plugin.registerSourceHandler('push.json', function(compileStep) {
  // Read the configuration
  var configString = compileStep.read().toString('utf8');

  try {
    // Try parsing the json
    var config = JSON.parse(configString);

    // Clone the relevant config
    var cloneConfig = archConfig[compileStep.arch];

    var cloned = cloneConfig(config);

    if (cloned) {

      // Serve the configuration
      compileStep.addJavaScript({
        path: 'push.config.' + compileStep.arch + '.js',
        sourcePath: 'push.config.' + compileStep.arch + '.js',
        data: configStringify(cloned),
        bare: /^web/.test(compileStep.arch)
      });

      // console.log(compileStep.arch, configStringify(cloned));

    } else {
      // No configuration for architecture
    }

  } catch(err) {
    console.error('Push configuration, Error:', err.message, err.stack);
  }
  // compileStep.arch
});
