const path = require('path');
const {config} = require('./wdio.shared.conf')

// ====================
  // Runner Configuration
  // ====================
config.port =  4723,

// ============
  // Specs
  // ============

config.specs = [
    // ToDo: define location for spec files here
    '../test/specs/ios/edit-location-name.spec.js',
  ]

  // ============
  // Capabilities
  // ============

config.capabilities = [{
  platformName: 'iOS',
  'appium:automationName': 'XCUITest',
  'appium:udid': '00008130-000E1C9221C0001C',
  'appium:deviceName': 'Jay-iPhone',
  'appium:platformVersion': '26.2',
  'appium:bundleId': 'com.RolleaseAcmeda.Automate2',
  'appium:xcodeOrgId': '9B6M2X2XA7',
  'appium:xcodeSigningId': 'Apple Development',
  'appium:wdaLaunchTimeout': 120000,
  'appium:wdaConnectionTimeout': 120000,
  'appium:newCommandTimeout': 300,
  'appium:showXcodeLog': true,
  'appium:includeSafariInWebviews': true,
  'appium:connectHardwareKeyboard': true,
  'appium:shouldTerminateApp': true,
  'appium:forceAppLaunch': true,
  'appium:autoAcceptAlerts': true
}]

  // Test runner services
  // Services take over a specific job you don't want to take care of. They enhance
  // your test setup with almost no effort. Unlike plugins, they don't add new
  // commands. Instead, they hook themselves up into the test process.
  config.services = ['appium'];

  // Mocha options - override timeout for iOS tests
  config.mochaOpts = { ui: 'bdd', timeout: 240000 };

  exports.config = config;



