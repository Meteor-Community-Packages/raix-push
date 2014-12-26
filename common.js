// The push object is an event emitter
Push = new EventEmitter();

// This is the match pattern for tokens
_matchToken = Match.OneOf({ apn: String }, { gcm: String });


// Client-side security warnings, used to check options
checkClientSecurity = function(options) {

  // Warn if certificates or keys are added here on client. We dont allow the
  // user to do this for security reasons.
  if (options.apn && options.apn.certData)
    throw new Error('Push.init: Dont add your APN certificate in client code!');

  if (options.apn && options.apn.keyData)
    throw new Error('Push.init: Dont add your APN key in client code!');

  if (options.apn && options.apn.passphrase)
    throw new Error('Push.init: Dont add your APN passphrase in client code!');

  if (options.gcm && options.gcm.apiKey)
    throw new Error('Push.init: Dont add your GCM api key in client code!');
};
