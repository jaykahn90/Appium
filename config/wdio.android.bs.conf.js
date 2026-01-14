require('dotenv').config()
const { config } = require('./wdio.shared.conf')

// ============
// BrowserStack Credentials
// ============
config.user = process.env.BROWSERSTACK_USER
config.key = process.env.BROWSERSTACK_KEY

if (!config.user || !config.key) {
  throw new Error(
    'Missing BrowserStack creds. Set BROWSERSTACK_USER and BROWSERSTACK_KEY (env or GitHub secrets).',
  )
}

// ============
// Suites
// ============
config.suites = {
  support_smoke: [
    // '../test/specs/android/menu/contact-support-inapp.spec.js',
    // '../test/specs/android/menu/knowledge-base-links.spec.js',
    // '../test/specs/android/menu/KnowledgeBase-Help-URL-Links.spec.js',
    // '../test/specs/android/menu/support-center.spec.js',
    '../test/specs/android/menu/stable-location-tests/edit-location-name.spec.js',
    '../test/specs/android/menu/stable-location-tests/create-new-location.spec.js',
    '../test/specs/android/menu/stable-location-tests/switch-active-location.spec.js',
  ],
}

// ============
// Default specs (fallback only)
// IMPORTANT: If you run without --suite/--spec, this will run.
// Keep it broad OR narrow it if you want a safe default.
// ============
config.specs = ['../test/specs/**/*.spec.js']
// If you want "safe default" instead, use this:
// config.specs = config.suites.support_smoke

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
    'appium:app': process.env.BS_APP_ID || 'bs://a634d4063c8589783ef723e1ad553e81100cb608',

    // BrowserStack metadata
    'bstack:options': {
      projectName: 'Automate Pulse',
      buildName,
      sessionName: 'Android – Support Smoke',
      debug: true,
      networkLogs: true
      // video: true, // optional
      // deviceLogs: true, // optional
    },
  },
]

// ============
// Services
// ============
config.services = ['browserstack']

module.exports.config = config
