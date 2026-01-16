const { config } = require('./wdio.shared.conf')

// =====================
// BrowserStack creds
// =====================
config.user =
  process.env.BROWSERSTACK_USERNAME ||
  process.env.BROWSERSTACK_USER

config.key =
  process.env.BROWSERSTACK_ACCESS_KEY ||
  process.env.BROWSERSTACK_KEY

if (!config.user || !config.key) {
  throw new Error(
    'Missing BrowserStack creds. Set BROWSERSTACK_USERNAME/BROWSERSTACK_ACCESS_KEY (or BROWSERSTACK_USER/BROWSERSTACK_KEY).',
  )
}

// =====================
// Specs
// =====================
config.specs = ['../test/specs/ios/edit-location-name.spec.js']

// =====================
// Services
// =====================
config.services = ['browserstack']

// =====================
// Capabilities
// =====================
// IMPORTANT:
// - Use "appium:app" (W3C/Appium-valid) so WebdriverIO doesn't reject it.
// - Keep BrowserStack specific settings inside "bstack:options".
const BS_APP = 'bs://ed546ccc6341c5a9f50b3715e9d6ad8ce84a8815'

config.capabilities = [
  {
    platformName: 'iOS',
    'appium:automationName': 'XCUITest',

    // ✅ W3C/Appium-valid "app" capability
    'appium:app': BS_APP, // Appium capability (BrowserStack accepts bs:// app URLs)

    'appium:newCommandTimeout': 600,
    'appium:noReset': true,
    'appium:shouldTerminateApp': true,

    // iOS permission popups
'appium:autoAcceptAlerts': true,

    'bstack:options': {
      projectName: 'AutomatePulse',
      buildName: 'iOS - edit-location-name',
      sessionName: 'edit-location-name',

      // logs
      debug: true,
      networkLogs: true,
      consoleLogs: 'info',



      // device selection (must exist on BrowserStack)
      deviceName: 'iPhone 15',
      platformVersion: '17',

      idleTimeout: 120,

      // optional build identifier (CI)
      buildIdentifier: process.env.GITHUB_RUN_NUMBER
        ? `#${process.env.GITHUB_RUN_NUMBER}`
        : undefined,

      // Local tunnel (only if hitting internal env)
      // browserstackLocal: true,
    },
  },
]

// Mocha options - override timeout for iOS BrowserStack tests
config.mochaOpts = { ui: 'bdd', timeout: 240000 }

exports.config = config
