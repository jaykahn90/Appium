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
    '../test/specs/ios/ios-counteroperation-screen.spec.js',
  ]
  // ============
  // Capabilities
  // ============

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
        'appium:app': 'bs://13688d13bdb23e4253b996728d64e6cc18053888',
      
      }
  ]

  // Test runner services
  // Services take over a specific job you don't want to take care of. They enhance
  // your test setup with almost no effort. Unlike plugins, they don't add new
  // commands. Instead, they hook themselves up into the test process.
  config.services = ['browserstack'];

  exports.config = config;