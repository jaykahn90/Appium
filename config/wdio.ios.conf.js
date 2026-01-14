const path = require('path');
const { config } = require('./wdio.shared.conf');

config.port = 4723;

config.specs = [
  '../test/specs/android/menu/stable-location-tests/edit-location-name.spec.js',
];


config.capabilities = [
  {
    platformName: 'iOS',
    'appium:automationName': 'XCUITest',

    // 🔹 REAL DEVICE
    'appium:deviceName': 'Jay-iPhone',                    // from Xcode / device
    'appium:platformVersion': '26.2',                     // shown in Xcode (23C55)
    'appium:udid': '00008130-000E1C9221C0001C',           // from Xcode Devices

    // 🔹 USE INSTALLED APP (no .app file needed)
    'appium:bundleId': 'com.RolleaseAcmeda.Automate2',

    // 🔹 SIGNING (so Appium can build & run WebDriverAgent)
    'appium:xcodeOrgId': '9B6M2X2XA7',                    // Team ID
    'appium:xcodeSigningId': 'Apple Development',

    // 🔹 TIMEOUTS
    'appium:wdaLaunchTimeout': 120000,
    'appium:wdaConnectionTimeout': 120000,
    'appium:newCommandTimeout': 300,
    'appium:showXcodeLog': true,   
  },
];

config.services = ['appium'];

exports.config = config;
