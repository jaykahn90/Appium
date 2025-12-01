const path = require('path');
const {config} = require('./wdio.shared.conf')

// ====================
  // Runner Configuration
  // ====================
  runner =  'local',
  chostname = '127.0.0.1',
config.port =  4723,

// ============
  // Specs
  // ============

config.specs = [
    // ToDo: define location for spec files here
    '../test/specs/android/add-note.spec*.js',
  ]

  // ============
  // Capabilities
  // ============

  config.capabilities = [
 {
      'appium:platformName': 'Android',
   'appium:platformVersion': '12.0',

       // ✅ make sure this really points to Jalalemulator
    //   // run: adb devices -l  → copy the UDID for Jalalemulator
      'appium:udid': 'emulator-5554', // e.g. emulator-5556

    //   // (optional) also name the AVD so WDIO boots the right one
      //'appium:avd': 'Pixel_XL',

       'appium:deviceName': 'Pixel XL', // just a label
       'appium:automationName': 'UIAutomator2',
       'appium:autoGrantPermissions': true,

    //   // install + launch
       'appium:app': path.join(process.cwd(), 'app/android/ColorNote+Notepad.apk'),
    //   'appium:appPackage': 'com.rolleaseacmeda.automatepulse',
    //   'appium:appActivity': 'com.rolleaseacmeda.automatepulse.MainActivity',

    //   // accept the fast jump from Splash → Main
    //   'appium:appWaitActivity':
    //     'com.rolleaseacmeda.automatepulse.SplashActivity,com.rolleaseacmeda.automatepulse.MainActivity,com.rolleaseacmeda.automatepulse.*',
    //   'appium:appWaitForLaunch': false,
    //   'appium:appWaitDuration': 15000,

    //   // WebView / Chrome bits 👇
    //   'appium:chromedriverAutodownload': true, // <-- IMPORTANT
    //   'appium:noReset': true, // keeps Chrome onboarding dismissed
    //   'appium:ensureWebviewsHavePages': true, // helps detect WEBVIEW
    },
    
  ]

  exports.config = config;