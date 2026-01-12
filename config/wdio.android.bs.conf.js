require('dotenv').config()
const { config } = require('./wdio.shared.conf')

// ============
// BrowserStack Credentials
// ============
config.user = process.env.BROWSERSTACK_USER
config.key = process.env.BROWSERSTACK_KEY

// ============
// Specs
// ============
// Keep generic so suites control execution
config.specs = config.suites.support_smoke


// ============
// Suites
// ============
config.suites = {
  support_smoke: [
    // '../test/specs/android/menu/contact-support-inapp.spec.js',
    // '../test/specs/android/menu/knowledge-base-links.spec.js',
    // '../test/specs/android/menu/KnowledgeBase-Help-URL-Links.spec.js',
    // '../test/specs/android/menu/support-center.spec.js',
    '../test/specs/android/menu/stable-location-tests/delete-existing-location.spec.js',
  ],
}

// ============
// BrowserStack Build Naming
// ============
const buildName =
  process.env.BS_BUILD_NAME ||
  `Support Smoke – Holiday Testing Project (${new Date().toISOString().slice(0, 10)})`

// ============
// Capabilities
// ============
config.capabilities = [
  {
    platformName: 'Android',
    'appium:platformVersion': '13.0',
    'appium:deviceName': 'Google Pixel 7',
    'appium:automationName': 'UIAutomator2',
    'appium:autoGrantPermissions': true,

    // BrowserStack uploaded app
    'appium:app': 'bs://e03ecaf012f9c7233c2ed179e02da4a74f1d3c01',

    // BrowserStack metadata (fixes "Untitled Build Run")
    'bstack:options': {
      projectName: 'Automate Pulse',
      buildName,
      sessionName: 'Support Smoke Suite',
      debug: true,
      networkLogs: true,
    },
  },
]

// ============
// Services
// ============
config.services = ['browserstack']

module.exports.config = config
