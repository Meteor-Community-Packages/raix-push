
export class RaixPushError {
  constructor(errorInfo, message, fcmMessage) {
    this.errorInfo = errorInfo;
    this.message = message;
    this.fcmMessage = fcmMessage;
  }
}
