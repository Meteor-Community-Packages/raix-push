// The push object is an event emitter
Push = new EventEmitter();

// This is the match pattern for tokens
_matchToken = Match.OneOf({ apn: String }, { gcm: String });
