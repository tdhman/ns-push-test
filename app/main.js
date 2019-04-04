import * as platform from 'tns-core-modules/platform';
import * as dialogs from 'tns-core-modules/ui/dialogs';
import * as application from 'tns-core-modules/application';
import * as applicationSettings from 'tns-core-modules/application-settings';

import Vue from 'nativescript-vue';
import App from './components/App';

// Import app css
import './app.scss';

// Uncommment the following to see NativeScript-Vue output logs
// Vue.config.silent = false;
// Vue.config.silent = (TNS_ENV === 'production')

var SecureStorage = require("nativescript-secure-storage").SecureStorage;
var secureStorage = new SecureStorage();

var LoadingIndicator = require("nativescript-loading-indicator").LoadingIndicator;
var loader = new LoadingIndicator();

var connectivityModule = require("tns-core-modules/connectivity");

if (platform.isAndroid) {
  // TODO
}
else if (platform.isIOS) {
  // use as dispatch_async on main thread
  const invokeOnRunLoop = (() => {
    const runloop = CFRunLoopGetMain();
    return func => {
      CFRunLoopPerformBlock(runloop, kCFRunLoopDefaultMode, func);
      CFRunLoopWakeUp(runloop);
    };
  })();

  const _dictToJson = (data) => {
    if (!data || typeof data === 'undefined') return;
    // if (!(data instanceof NSDictionary)) return;

    var errorRef = new interop.Reference();
    let jsonData = NSJSONSerialization.dataWithJSONObjectOptionsError(data, NSJSONWritingOptions.PrettyPrinted, errorRef)
    if (errorRef.value) console.log("JSONERROR", errorRef.value);
    try {
      let json = JSON.parse(NSString.alloc().initWithDataEncoding(jsonData, NSUTF8StringEncoding));
      return json;
    } catch (error) {
      console.log("JSONERROR", error);
    }
  }

  const _processNotification = (payload) => {
    // Convert native ios dict to javascript json
    let json = _dictToJson(payload);  
    try {
      if (json) {
        // Get push message
        let obj = json["aps"];
        let message = "No alert message!";
        if (obj) message = "Alert message: "+JSON.stringify(obj["alert"]);

        // Get payload except for aps
        let payload = {};
        for (var key in json) {
          if (key !== 'aps') {
            payload[key] = json[key];
          }
        }
        message += '\nwith payload: ' + JSON.stringify(payload);
        
        //present a local notifcation to visually see when we are recieving a VoIP Notification if application is in background
        if (UIApplication.sharedApplication.applicationState == UIApplicationState.Background) {
          let localNotification = UILocalNotification.new();
          localNotification.alertBody = message;
          localNotification.applicationIconBadgeNumber = 1;
          localNotification.soundName = UILocalNotificationDefaultSoundName;
          UIApplication.sharedApplication.presentLocalNotificationNow(localNotification);
        } else {
          // otherwise, just show an alert dialog
          invokeOnRunLoop(() => {
            dialogs.alert({
              title: "Push VoIP Notification",
              message: message,
              okButtonText: "OK",
            });
          });
        }
      }
    } catch (error) {
      console.log('Error while processing notification', error);
      dialogs.alert({
        title: 'Push VoIP Error',
        message: ''+error,
        okButtonText: 'OK',
      });
    }
  }
  
  // Implementation of PKPushRegistryDelegate
  const PKPushRegistryDelegateImpl = NSObject.extend({    
  
    pushRegistryDidInvalidatePushTokenForType(registry, type) {
      // TODO
      console.log("VoIP token invalidated");
    },
    pushRegistryDidReceiveIncomingPushWithPayloadForType(registry, payload, type) {
      // TODO
      console.log("pushRegistryDidReceiveIncomingPushWithPayloadForType", _dictToJsonN(payload.dictionaryPayload));
      _processNotification(payload.dictionaryPayload);
    },
    pushRegistryDidReceiveIncomingPushWithPayloadForTypeWithCompletionHandler(registry, payload, type, completionHandler) {
      // TODO
      console.log("pushRegistryDidReceiveIncomingPushWithPayloadForTypeWithCompletionHandler", _dictToJson(payload.dictionaryPayload));
      _processNotification(payload.dictionaryPayload);
      if (completionHandler) completionHandler();
    },
    pushRegistryDidUpdatePushCredentialsForType(registry, pushCredentials, type) {
      // TODO
      let token = pushCredentials.token.toString().replace(/[<\s>]/g, "");
      console.log("VoIP token",token);
      applicationSettings.setString('$$VoIPToken$$', token);
    }
  }, {
    name: "PKPushRegistryDelegateImpl",
    protocols: [PKPushRegistryDelegate] // implements the delegation protocol
  });
  
  // Customize application delegate to register notifications
  const MyAppDelegate = UIResponder.extend({
    applicationDidFinishLaunchingWithOptions(application, launchOptions) {
      console.log("applicationWillFinishLaunchingWithOptions: " + launchOptions);

      const notificationTypes = UIUserNotificationType.Alert | UIUserNotificationType.Badge | UIUserNotificationType.Sound | UIUserNotificationActivationMode.Background;
      const notificationSettings = UIUserNotificationSettings.settingsForTypesCategories(notificationTypes, null);
      application.registerUserNotificationSettings(notificationSettings);
      application.registerForRemoteNotifications();
      application.cancelAllLocalNotifications();
      application.applicationIconBadgeNumber = 0;

      if (launchOptions) {
        let dictionary = launchOptions.objectForKey(UIApplicationLaunchOptionsRemoteNotificationKey);
        if (dictionary != null) {
          console.log("Launched from push notification: " + dictionary.toString());
          // TODO
        }
      }
      return true;
    },
    applicationDidBecomeActive(application) {
      console.log("applicationDidBecomeActive: " + application);
    },
    applicationDidRegisterForRemoteNotificationsWithDeviceToken(application, deviceToken) {
      let token = deviceToken.toString().replace(/[<\s>]/g, "");
      console.log("application registered for pushed notification with device token ", token);
      applicationSettings.setString('$$deviceToken$$', token);
    },
    applicationDidFailToRegisterForRemoteNotificationsWithError(application, error) {
      console.error("failed to register push", error.localizedDescription);
    },
    applicationDidReceiveRemoteNotification(application, userInfo) {
      console.log("applicationDidReceiveRemoteNotification:" + JSON.stringify(userInfo));
    },
    applicationDidReceiveRemoteNotificationFetchCompletionHandler(application, userInfo, completionHandler) {
      console.log("applicationDidReceiveRemoteNotificationFetchCompletionHandler:" + JSON.stringify(userInfo));
      _processNotification(userInfo);
      completionHandler && completionHandler(UIBackgroundFetchResult.NewData);
    },
    applicationDidRegisterUserNotificationSettings(application, notificationSettings) {
      console.log("applicationDidRegisterUserNotificationSettings: ", notificationSettings);
      let voipRegistry = new PKPushRegistry({queue: dispatch_get_current_queue()});
      let types = NSArray.arrayWithObject(PKPushTypeVoIP);
      voipRegistry.desiredPushTypes = NSSet.setWithArray(types);
      let pkPushRegistryDelegate = new PKPushRegistryDelegateImpl();
      voipRegistry.delegate = pkPushRegistryDelegate;
    },
    applicationDidEnterBackground(application) {
      console.log("APP_ENTER_IN_BACKGROUND");
    },
    applicationWillEnterForeground(application) {
      console.log("APP_ENTER_IN_FOREGROUND");
      application.applicationIconBadgeNumber = 0;
    },
    applicationDidReceiveMemoryWarning(application) {
      console.log("APP_RECEIVE_MEMORY_WARNINGS");
    },
    userNotificationCenterDidReceiveNotificationResponseWithCompletionHandler(center, response, completionHandler) {
      //let application = UIApplication.sharedApplication;
      let content = response.notification.request.content;
      console.log("DID_RECEIVE_NOTIFICATION_RESPONSE", JSON.stringify(content.userInfo));
    },
    userNotificationCenterWillPresentNotificationWithCompletionHandler(center, notification, completionHandler) {
      // let application = UIApplication.sharedApplication;
      let content = notification.request.content;
      console.log("WILL_PRESENT_NOTIFICATION", JSON.stringify(content.userInfo));
    }
  }, {
    // The name for the registered Objective-C class.
    name: "MyAppDelegate",
    // Declare that the native Objective-C class will implement the UIApplicationDelegate Objective-C protocol.
    protocols: [UIApplicationDelegate]
  });
  application.ios.delegate = MyAppDelegate;
}
Vue.registerElement("Orientation", () => require("nativescript-orientation").Orientation);

Vue.prototype.$connectivityModule = connectivityModule;
Vue.prototype.$loader = loader;
Vue.prototype.$secureStorage = secureStorage;
Vue.prototype.$loaderOptions = {
  message: 'Loading...',
  progress: 0.65,
  android: {
      indeterminate: true,
      max: 100,
      progressNumberFormat: "%1d/%2d",
      progressPercentFormat: 0.53,
      progressStyle: 1,
      secondaryProgress: 1
  },
  ios: {
      margin: 20,
      dimBackground: true,
      // background box around indicator
      // hideBezel will override this if true
    }
};

new Vue({
  render: h => {
    return h('frame', [h(App)]);
  }
}).$start()
