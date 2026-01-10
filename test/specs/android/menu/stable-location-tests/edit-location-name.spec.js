// test/specs/android/menu/edit-location-name.spec.js

const { ensureLoggedIn } = require('../../../../helpers/app/ensureLoggedIn')

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

/**
 * App selectors
 * NOTE: All selectors now use accessibility IDs for cross-platform uniformity (Android & iOS)
 * Accessibility IDs are uniform across both platforms:
 * - Android: accessibilityLabel → content-desc → Appium shows as "accessibility id"
 * - iOS: testID → accessibilityIdentifier → Appium shows as "accessibility id"
 * Fallbacks included for backwards compatibility during transition period
 */
const SELECTORS = {
  // Home readiness marker - use accessibility ID with fallbacks
  // Priority: hamburger menu (appears first/straightaway) → location name/text → icon
  homeReadyCandidates: [
    // Primary: hamburger menu (appears first/straightaway after login)
    '~sharedHeader.menuButton.button',
    'id=sharedHeader.menuButton.button',
    'android=new UiSelector().resourceId("sharedHeader.menuButton.button")',
    'android=new UiSelector().description("sharedHeader.menuButton.button")',
    // Fallback: location name text (appears later, but good fallback)
    '~home.location.name.text',
    'id=home.location.name.text',
    'android=new UiSelector().resourceId("home.location.name.text")',
    // Fallback: location icon (appears later, but good fallback)
    '~home.location.icon',
    'id=home.location.icon',
    'android=new UiSelector().resourceId("home.location.icon")',
    'android=new UiSelector().description("home.location.icon")',
  ],

  // Hamburger menu button - use accessibility ID with fallbacks
  hamburgerCandidates: [
    '~sharedHeader.menuButton.button',
    'id=sharedHeader.menuButton.button',
    'android=new UiSelector().resourceId("sharedHeader.menuButton.button")',
    'android=new UiSelector().description("sharedHeader.menuButton.button")',
  ],

  // Current location name in drawer - use accessibility ID with fallbacks
  currentLocationCandidates: [
    '~sidebar.activeLocationName.text',
    'id=sidebar.activeLocationName.text',
    'android=new UiSelector().resourceId("sidebar.activeLocationName.text")',
    // Fallback to location card button if name element not found
    '~sidebar.locationCard.button',
    'android=new UiSelector().description("sidebar.locationCard.button")',
  ],

  // Location name display field on Location Details screen (before edit mode)
  // This is the EditText that shows the current location name (e.g., "My home 588")
  locationNameDisplayCandidates: [
      '~locationDetails.locationName.input',
      'id=locationDetails.locationName.input',
      'android=new UiSelector().resourceId("locationDetails.locationName.input")',
      'android=new UiSelector().className("android.widget.EditText")',
  ],

  // Edit pencil icon on Location Name screen - use accessibility ID with fallback
  // Note: content-desc and resource-id are both "locationDetails.locationName.pencillcon.button"
  editNameCandidates: [
    '~locationDetails.locationName.pencillcon.button',
    'id=locationDetails.locationName.pencillcon.button',
    'android=new UiSelector().description("locationDetails.locationName.pencillcon.button")',
    'android=new UiSelector().resourceId("locationDetails.locationName.pencillcon.button")',
  ],
  


  // Location name input field - use accessibility ID with fallbacks
  locationNameInputCandidates: [
    '~locationDetails.locationName.input',
    'id=locationDetails.locationName.input',
    'android=new UiSelector().resourceId("locationDetails.locationName.input")',
  ],

  // Confirm/save check icon on edit screen - use accessibility ID with fallbacks (note: capital I in checkIcon)
  saveNameCandidates: [
    '~locationDetails.locationName.checkIcon.button',
    'id=locationDetails.locationName.checkIcon.button',
    'android=new UiSelector().description("locationDetails.locationName.checkIcon.button")',
    'android=new UiSelector().resourceId("locationDetails.locationName.checkIcon.button")',
    // Fallback to text-based selector
    '~Save changes',
  ],

  // Back button to return to drawer/menu - use accessibility ID with fallbacks
  inAppBackCandidates: [
    '~locationDetails.backButton.button',
    'id=locationDetails.backButton.button',
    'android=new UiSelector().resourceId("locationDetails.backButton.button")',
  ],

  // Menu title to confirm we returned - using text selector as accessibility ID may not be available
  menuTitle: 'android=new UiSelector().text("MENU")',

  // Location Settings screen title - to confirm we're on the right screen
  locationSettingsTitle: 'android=new UiSelector().text("LOCATION SETTINGS")',
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
      const title = await $(SELECTORS.locationSettingsTitle)
      await title.waitForDisplayed({ timeout: 30000 })
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

    // Edit name and confirm
    const nameInput = await findFirstDisplayed(
      SELECTORS.locationNameInputCandidates,
      25000,
    )

    // Generate a simple number between 100-999 to keep name format short: "My home 123"
    const randomNum = Math.floor(Math.random() * 900) + 100 // Random number between 100-999
    const newName = `My home ${randomNum}` // Format: "My home 123" (lowercase 'h' in home)
    await setInputValue(nameInput, newName)
    await clickFirstReady(SELECTORS.saveNameCandidates, 25000)

    // Navigate back
    await clickFirstReady(SELECTORS.inAppBackCandidates, 25000)

    // Confirm we are back on menu
    await expectDisplayed(SELECTORS.menuTitle, 25000)

    // Verify side menu shows updated location name
    const updatedName = await $(`android=new UiSelector().text("${newName}")`)
    await updatedName.waitForDisplayed({ timeout: 30000 })
    await expect(updatedName).toBeDisplayed()
  })
})
