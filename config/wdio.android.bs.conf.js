const {config} = require('./wdio.shared.conf')

// ============
  // Browser Stack Credentials
  // ============

config.user = 'jalalkhan_vhXeGd'
config.key = 'J17nbQ8YYwmyV7x5GABt'

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
      'platformName': 'Android',
   'appium:platformVersion': '13.0',

       // ✅ make sure this really points to Jalalemulator
    //   // run: adb devices -l  → copy the UDID for Jalalemulator
      // 'appium:udid': 'emulator-5554', // e.g. emulator-5556

    //   // (optional) also name the AVD so WDIO boots the right one
      //'appium:avd': 'Pixel_XL',

       'appium:deviceName': 'Google Pixel 7', // just a label
       'appium:automationName': 'UIAutomator2',
       'appium:autoGrantPermissions': true,

    //   // install + launch
       'appium:app': 'bs://13688d13bdb23e4253b996728d64e6cc18053888',
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

  // Test runner services
  // Services take over a specific job you don't want to take care of. They enhance
  // your test setup with almost no effort. Unlike plugins, they don't add new
  // commands. Instead, they hook themselves up into the test process.
  config.services = ['browserstack'];

  exports.config = config;