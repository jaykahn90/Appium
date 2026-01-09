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
      'appium:udid': 'emulator-5556',
      'appium:deviceName': 'Pixel 6 Pro API 31',
      'appium:automationName': 'UIAutomator2',
  
      'appium:autoGrantPermissions': true,
      'appium:disableWindowAnimation': true,
  
      // install + launch
      'appium:app': path.join(process.cwd(), 'app/android/app-release-ios-android.apk'),
      'appium:appPackage': 'com.rolleaseacmeda.automatepulse',
      'appium:appActivity': 'com.rolleaseacmeda.automatepulse.MainActivity',
  
      'appium:appWaitActivity':
        'com.rolleaseacmeda.automatepulse.SplashActivity,' +
        'com.rolleaseacmeda.automatepulse.MainActivity,' +
        'com.rolleaseacmeda.automatepulse.*',
  
      'appium:appWaitForLaunch': true,
      'appium:appWaitDuration': 60000,
  
      // ✅ IMPORTANT for stability (prevents “stuck in launcher / weird task”)
      'appium:forceAppLaunch': true,
  
      // ✅ Strategy B
      'appium:noReset': false,     // clear app data each session (logged out)
      'appium:fullReset': false,   // don’t uninstall/reinstall each time (faster & less flaky)
  
      // WebView / Chrome bits
      'appium:chromedriverExecutable': path.join(process.cwd(), 'drivers/chromedriver'),
      'appium:chromedriverAutodownload': true,
      'appium:ensureWebviewsHavePages': true,
    },
  ]
  
// Test runner services
  // Services take over a specific job you don't want to take care of. They enhance
  // your test setup with almost no effort. Unlike plugins, they don't add new
  // commands. Instead, they hook themselves up into the test process.
  config.services = ['appium'];

  exports.config = config;