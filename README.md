# NativeScript-Vue Push Notification Test

> A native application built with NativeScript-Vue to test the push notification in iOS

## Install

``` bash
# Install NativeScript globally
npm install -g nativescript

# Test if NativeScript installed OK
tns doctor

# Install dependencies for project
npm install

# Run application from project root
tns run ios --bundle
```

### Setup

To test the push notification, we need a valid certificate from Apple.

Suppose you have already a certificate `VoIP.pem`, to send the notification to device, install the houston commandline from [here](https://github.com/nomad/houston).

To send a push notification with houston apn, use the commandline below:

```
apn push "<VoIP-pushToken>" -c VOIP.pem -m "Test message!!!!"
```

### Test

To test the push notification, change the tns version in `package.json`. Currently, the tns version using is `5.0.0` which the notification can be received & displayed OK.

Change the tns version to `5.2.0` or `5.3.1` or any version `>5.1.0`, the push notification is not received in the application.