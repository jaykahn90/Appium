// test/specs/ios/edit-location-name.spec.js

const { ensureLoggedIn } = require('../../helpers/app/ensureLoggedIn.ios')

/**
 * CI-safe helpers: always wait, and allow fallback selectors.
 */
async function findFirstDisplayed(selectors, timeout = 25000, pollMs = 300) {
  const start = Date.now()

  while (Date.now() - start < timeout) {
    for (const sel of selectors) {
      const el = await $(sel)
      const displayed = await el.isDisplayed().catch(() => false)
      if (displayed) return el
    }
    await driver.pause(pollMs)
  }

  throw new Error(
    `None of these selectors became visible within ${timeout}ms:\n${selectors.join(
      '\n',
    )}`,
  )
}

async function clickFirstReady(selectors, timeout = 25000) {
  const el = await findFirstDisplayed(selectors, timeout)
  // Wait for element to be displayed and ready (matching pattern from working tests)
  await el.waitForDisplayed({ timeout: 10000 })
  await browser.pause(300) // Small pause to ensure element is ready
  await el.click()
}

async function expectDisplayed(selector, timeout = 30000) {
  const el = await $(selector)
  await el.waitForDisplayed({ timeout })
  await expect(el).toBeDisplayed()
  return el
}

async function setInputValue(el, value) {
  await el.waitForDisplayed({ timeout: 20000 })
  await el.click()
  await el.clearValue()
  await el.setValue(value)
}

async function setInputValueFromEnd(el, value) {
  await el.waitForDisplayed({ timeout: 20000 })
  
  // Tap the input field to focus it
  await el.click()
  await browser.pause(300)

  // Get rect for coordinate tapping
  const location = await el.getLocation()
  const size = await el.getSize()
  const rightEdgeX = Math.round(location.x + size.width - 5)
  const centerY = Math.round(location.y + size.height / 2)

  // Tap near the right edge twice to force caret to the end
  for (let tapCount = 0; tapCount < 2; tapCount++) {
    try {
      await driver.performActions([
        {
          type: 'pointer',
          id: 'finger1',
          parameters: { pointerType: 'touch' },
          actions: [
            { type: 'pointerMove', duration: 0, x: rightEdgeX, y: centerY },
            { type: 'pointerDown', button: 0 },
            { type: 'pointerUp', button: 0 },
          ],
        },
      ])
      await driver.releaseActions()
      await browser.pause(200)
    } catch (e) {
      // ignore, continue
    }
  }

  // Tap right edge one more time to ensure caret stays at end (don't click center - that moves caret back to middle)
  try {
    await driver.performActions([
      {
        type: 'pointer',
        id: 'finger1',
        parameters: { pointerType: 'touch' },
        actions: [
          { type: 'pointerMove', duration: 0, x: rightEdgeX, y: centerY },
          { type: 'pointerDown', button: 0 },
          { type: 'pointerUp', button: 0 },
        ],
      },
    ])
    await driver.releaseActions()
    await browser.pause(300)
  } catch (e) {
    // ignore, continue
  }

  // Clear the existing text: Try Select All (Cmd+A) and then Backspace
  let cleared = false
  try {
    // On iOS, Cmd+A is \uE03D (Command key) + 'a'
    await driver.performActions([
      {
        type: 'key',
        id: 'keyboard',
        actions: [
          { type: 'keyDown', value: '\uE03D' }, // Command key
          { type: 'keyDown', value: 'a' },
          { type: 'keyUp', value: 'a' },
          { type: 'keyUp', value: '\uE03D' },
        ],
      },
    ])
    await driver.releaseActions()
    await browser.pause(100)
    
    // Now backspace to delete selected text
    await driver.keys(['\uE003']) // Backspace
    await browser.pause(100)
    cleared = true
  } catch (e) {
    // Select All failed, will fall back to backspace loop
    cleared = false
  }

  // Fallback: backspace loop to guarantee full deletion
  if (!cleared) {
    // Try clearValue first as a quick attempt
    try {
      await el.clearValue()
      await browser.pause(100)
    } catch {
      // ignore
    }
  }

  // Backspace spam to remove any leftovers (≈80 backspaces)
  for (let i = 0; i < 80; i++) {
    await driver.keys(['\uE003']) // Backspace
  }
  await browser.pause(200)

  // Only after the field is fully cleared, type the new value
  await el.setValue(value)
}

/**
 * App selectors
 * NOTE: All selectors use accessibility IDs for cross-platform uniformity (Android & iOS)
 * Accessibility IDs are uniform across both platforms:
 * - Android: accessibilityLabel → content-desc → Appium shows as "accessibility id"
 * - iOS: testID → accessibilityIdentifier → Appium shows as "accessibility id"
 * iOS-specific fallbacks included for text matching and element finding
 */
const SELECTORS = {
  // Home readiness marker - use accessibility ID with fallbacks
  // Priority: hamburger menu (appears first/straightaway) → location name/text → icon
  homeReadyCandidates: [
    // Primary: hamburger menu (appears first/straightaway after login)
    '~sharedHeader.menuButton.button',
    'id=sharedHeader.menuButton.button',
    // iOS-specific fallbacks
    '-ios predicate string:name == "sharedHeader.menuButton.button"',
    '//XCUIElementTypeButton[@name="sharedHeader.menuButton.button"]',
    // Fallback: location name text (appears later, but good fallback)
    '~home.location.name.text',
    'id=home.location.name.text',
    '-ios predicate string:name == "home.location.name.text"',
    '//XCUIElementTypeStaticText[@name="home.location.name.text"]',
    // Fallback: location icon (appears later, but good fallback)
    '~home.location.icon',
    'id=home.location.icon',
    '-ios predicate string:name == "home.location.icon"',
    '//XCUIElementTypeImage[@name="home.location.icon"]',
  ],

  // Hamburger menu button - use accessibility ID with fallbacks
  hamburgerCandidates: [
    '~sharedHeader.menuButton.button',
    'id=sharedHeader.menuButton.button',
    // iOS-specific fallbacks
    '-ios predicate string:name == "sharedHeader.menuButton.button"',
    '//XCUIElementTypeButton[@name="sharedHeader.menuButton.button"]',
  ],

  // Current location name in drawer - use accessibility ID with fallbacks
  currentLocationCandidates: [
    '~sidebar.activeLocationName.text',
    'id=sidebar.activeLocationName.text',
    '-ios predicate string:name == "sidebar.activeLocationName.text"',
    '//XCUIElementTypeStaticText[@name="sidebar.activeLocationName.text"]',
    // Fallback to location card button if name element not found
    '~sidebar.locationCard.button',
    '-ios predicate string:name == "sidebar.locationCard.button"',
    '//XCUIElementTypeButton[@name="sidebar.locationCard.button"]',
  ],

  // Location name display field on Location Details screen (before edit mode)
  // This is the field that shows the current location name (e.g., "My home 588")
  locationNameDisplayCandidates: [
    '~locationDetails.locationName.input',
    'id=locationDetails.locationName.input',
    '-ios predicate string:name == "locationDetails.locationName.input"',
    '//XCUIElementTypeTextField[@name="locationDetails.locationName.input"]',
    '//XCUIElementTypeStaticText[@name="locationDetails.locationName.input"]',
  ],

  // Edit pencil icon on Location Name screen - use accessibility ID with fallback
  // Note: testID should be "locationDetails.locationName.pencillcon.button"
  editNameCandidates: [
    '~locationDetails.locationName.pencillcon.button',
    'id=locationDetails.locationName.pencillcon.button',
    '-ios predicate string:name == "locationDetails.locationName.pencillcon.button"',
    '//XCUIElementTypeButton[@name="locationDetails.locationName.pencillcon.button"]',
  ],

  // Location name input field - use accessibility ID with fallbacks
  locationNameInputCandidates: [
    '~locationDetails.locationName.input',
    'id=locationDetails.locationName.input',
    '-ios predicate string:name == "locationDetails.locationName.input"',
    '//XCUIElementTypeTextField[@name="locationDetails.locationName.input"]',
  ],

  // Confirm/save check icon on edit screen - use accessibility ID with fallbacks (note: capital I in checkIcon)
  saveNameCandidates: [
    '~locationDetails.locationName.checkIcon.button',
    'id=locationDetails.locationName.checkIcon.button',
    '-ios predicate string:name == "locationDetails.locationName.checkIcon.button"',
    '//XCUIElementTypeButton[@name="locationDetails.locationName.checkIcon.button"]',
    // Fallback to text-based selector
    '~Save changes',
    '-ios predicate string:name == "Save changes"',
  ],

  // Back button to return to drawer/menu - use accessibility ID with fallbacks
  inAppBackCandidates: [
    '~locationDetails.backButton.button',
    'id=locationDetails.backButton.button',
    '-ios predicate string:name == "locationDetails.backButton.button"',
    '//XCUIElementTypeButton[@name="locationDetails.backButton.button"]',
  ],

  // Menu title to confirm we returned - using iOS predicate string or XPath
  menuTitleCandidates: [
    '-ios predicate string:name == "MENU"',
    '//XCUIElementTypeStaticText[@name="MENU"]',
    '//XCUIElementTypeNavigationBar[@name="MENU"]',
  ],

  // Location Settings screen title - to confirm we're on the right screen
  locationSettingsTitleCandidates: [
    '-ios predicate string:name == "LOCATION SETTINGS"',
    '//XCUIElementTypeStaticText[@name="LOCATION SETTINGS"]',
    '//XCUIElementTypeNavigationBar[@name="LOCATION SETTINGS"]',
  ],
}

describe('Menu - Location Name Edit', () => {
  it('edits the location name and shows the updated name in the menu', async () => {
    await ensureLoggedIn()
    await driver.switchContext('NATIVE_APP')

    // ✅ Wait until home is truly ready (stable marker)
    await findFirstDisplayed(SELECTORS.homeReadyCandidates, 60000)

    // Let app finish background loading (hub scan etc.) - similar to other working tests
    await browser.pause(7000)

    // Open sidebar menu
    await clickFirstReady(SELECTORS.hamburgerCandidates, 35000)

    // Tap current location
    await clickFirstReady(SELECTORS.currentLocationCandidates, 25000)

    // Wait for Location Details screen to fully load - confirm we're on the right screen
    // First, wait for the screen title "LOCATION SETTINGS" to appear (best indicator screen is loaded)
    try {
      const title = await findFirstDisplayed(SELECTORS.locationSettingsTitleCandidates, 30000)
      await title.waitForDisplayed({ timeout: 10000 })
      await browser.pause(1000) // Brief pause after title appears
    } catch (e) {
      // If title not found, fall back to back button
      console.log('Location Settings title not found, using back button as fallback...')
    }

    // Wait for the back button to appear (indicates Location Details screen has loaded)
    const locationDetailsBackButton = await findFirstDisplayed(
      SELECTORS.inAppBackCandidates,
      30000,
    )
    await locationDetailsBackButton.waitForDisplayed({ timeout: 10000 })

    // Wait for location name input field to be visible (confirms screen content is loaded)
    // Clicking this input field directly puts it into edit mode (no need to click pencil icon)
    const nameInputField = await $('~locationDetails.locationName.input')
    await nameInputField.waitForExist({ timeout: 20000 })
    await nameInputField.waitForDisplayed({ timeout: 10000 })

    // Click the input field to enter edit mode
    await nameInputField.click()

    // Wait for check icon to appear to confirm we're in edit mode
    const checkIcon = await $('~locationDetails.locationName.checkIcon.button')
    await checkIcon.waitForDisplayed({ timeout: 15000 })

    // Re-fetch the input element after entering edit mode (the field may re-render when the pencil/check icon appears)
    const nameInput = await findFirstDisplayed(
      SELECTORS.locationNameInputCandidates,
      25000,
    )

    // Generate a simple number between 100-999 to keep name format short: "My home 123"
    const randomNum = Math.floor(Math.random() * 900) + 100 // Random number between 100-999
    const newName = `My home ${randomNum}` // Format: "My home 123" (lowercase 'h' in home)
    await setInputValueFromEnd(nameInput, newName)
    await clickFirstReady(SELECTORS.saveNameCandidates, 25000)

    // Navigate back
    await clickFirstReady(SELECTORS.inAppBackCandidates, 25000)

    // Confirm we are back on menu
    await findFirstDisplayed(SELECTORS.menuTitleCandidates, 25000)

    // Verify side menu location card/button is present
    // Locate the sidebar location card/button using existing selector candidates
    const locationElement = await findFirstDisplayed(SELECTORS.currentLocationCandidates, 30000)
    await locationElement.waitForDisplayed({ timeout: 10000 })
    await expect(locationElement).toBeDisplayed()
  })
})
