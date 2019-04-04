import * as dialogsModule from "tns-core-modules/ui/dialogs";

export const ALERT_CONFIRM = 'confirm';
export const ALERT_PROMPT = 'confirm';
export const ALERT_ACTION = 'action';
export const ALERT_DEFAULT = 'default';

export const showAlert = ({type, message, inputType, actionList}) => {
  switch (type) {
    case ALERT_CONFIRM:
      return dialogsModule.confirm({
        title: "Title",
        okButtonText: "OK",
        cancelButtonText: "Cancel",
        message: message
      });
    case ALERT_PROMPT:
      return dialogsModule.prompt({
        title: "Title",
        message: message,
        okButtonText: "Your button text",
        cancelButtonText: "Cancel text",
        inputType: inputType || dialogsModule.inputType.text
      });
    case ALERT_ACTION:
      dialogs.action({
        title: "Title",
        message: message,
        cancelButtonText: "Cancel",
        actions: actionList || []
      });
    default:
      return dialogsModule.alert({
        title: "Title",
        okButtonText: "OK",
        message: message
      });
  }
}