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
    '../test/specs/android/automate-mainscreen-tabs.spec.js',
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
       'appium:app': path.join(process.cwd(), 'app/android/appium-fix.apk'),
      'appium:appPackage': 'com.rolleaseacmeda.automatepulse',
      'appium:appActivity': 'com.rolleaseacmeda.automatepulse.MainActivity',

      // accept the fast jump from Splash → Main
      'appium:appWaitActivity':
        'com.rolleaseacmeda.automatepulse.SplashActivity,com.rolleaseacmeda.automatepulse.MainActivity,com.rolleaseacmeda.automatepulse.*',
      'appium:appWaitForLaunch': false,
      'appium:appWaitDuration': 15000,

      // WebView / Chrome bits 👇
      'appium:chromedriverAutodownload': true, // <-- IMPORTANT
      'appium:noReset': true, // keeps Chrome onboarding dismissed
      'appium:ensureWebviewsHavePages': true, // helps detect WEBVIEW
    },
    
  ]
  
// Test runner services
  // Services take over a specific job you don't want to take care of. They enhance
  // your test setup with almost no effort. Unlike plugins, they don't add new
  // commands. Instead, they hook themselves up into the test process.
  config.services = ['appium'];

  exports.config = config;