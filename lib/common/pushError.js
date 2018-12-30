function RaixPushError(errorInfo, message, fcmMessage) {
  // restore prototype chain
  // fixes babel issue with instanceof https://stackoverflow.com/questions/33870684/why-doesnt-instanceof-work-on-instances-of-error-subclasses-under-babel-node/33877501#33877501
  this.name = 'RaixPushError';

  this.errorInfo = errorInfo;
  this.message = message;
  this.fcmMessage = fcmMessage;

  this.stack = (new Error()).stack;
}

RaixPushError.prototype = Object.create(Error.prototype);
RaixPushError.prototype.constructor = RaixPushError;

export {RaixPushError};
