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
    '../test/specs/ios/ios-counteroperation-screen.spec.js',
  ]

  // ============
  // Capabilities
  // ============

  config.capabilities = [
    {
        'appium:platformName': 'ios',
        'appium:platformVersion': '26.1',          // set to your actual sim version
        'appium:deviceName': 'iPhone 17',          // or provide 'appium:udid': '<sim-udid>'
        // 'appium:udid': '13BDF56E-5011-42A6-99EF-9D774275162B',
        'appium:automationName': 'XCUITest',
        'appium:app': path.join(process.cwd(), 'app/ios/TestApp.app'),
      
      }
  ]

  exports.config = config;