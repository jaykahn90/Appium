// test/specs/android/menu/create-new-location.spec.js

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
 * Scroll element into view using UiScrollable
 * Useful for elements that are below the fold
 */
async function scrollToElement(selectors, timeout = 15000) {
  const start = Date.now()
  while (Date.now() - start < timeout) {
    for (const sel of selectors) {
      try {
        // Try to find element first
        const el = await $(sel)
        const exists = await el.isExisting().catch(() => false)
        if (exists) {
          const displayed = await el.isDisplayed().catch(() => false)
          if (displayed) {
            return el // Element is already visible
          }
        }

        // If element exists but not displayed, try scrolling to it
        if (exists) {
          // Use UiScrollable to scroll to element by resource-id or description
          const resourceId = sel.includes('resourceId')
            ? sel.match(/resourceId\("([^"]+)"/)?.[1]
            : sel.includes('id=')
            ? sel.replace('id=', '')
            : null

          if (resourceId) {
            const scrollable = await $(
              `android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().resourceId("${resourceId}"))`,
            )
            await scrollable.waitForExist({ timeout: 5000 }).catch(() => {})
          }
        }
      } catch (e) {
        // Continue trying other selectors
      }
    }
    await browser.pause(300)
  }
  throw new Error(
    `Could not scroll element into view within ${timeout}ms:\n${selectors.join('\n')}`,
  )
}

/**
 * App selectors - Optimized for Android with iOS compatibility in mind
 * Priority order:
 * 1. Accessibility ID (~...) - works on both Android and iOS (primary)
 * 2. Resource ID (id=, resourceId) - Android fallback
 * 3. Description (description) - Android fallback
 * 4. Text-based selectors - Last resort (works on both platforms)
 * 
 * NOTE: For iOS migration, remove Android-specific fallbacks (id=, resourceId, description)
 * and keep only accessibility IDs and text-based selectors.
 */
const SELECTORS = {
  // Home readiness marker - use accessibility ID with fallbacks
  // Priority: accessibility ID → resource-id → description
  homeReadyCandidates: [
    '~home.location.icon',
    'id=home.location.icon',
    'android=new UiSelector().resourceId("home.location.icon")',
    'android=new UiSelector().description("home.location.icon")',
  ],

  // Hamburger menu button - use accessibility ID with fallbacks
  // Priority: accessibility ID → resource-id → description
  hamburgerCandidates: [
    '~sharedHeader.menuButton.button',
    'id=sharedHeader.menuButton.button',
    'android=new UiSelector().resourceId("sharedHeader.menuButton.button")',
    'android=new UiSelector().description("sharedHeader.menuButton.button")',
  ],

  // Manage Locations button in sidebar - use accessibility ID with fallbacks
  // Priority: accessibility ID → resource-id → description
  manageLocationsCandidates: [
    '~sidebar.manageLocationsCard.button',
    'id=sidebar.manageLocationsCard.button',
    'android=new UiSelector().resourceId("sidebar.manageLocationsCard.button")',
    'android=new UiSelector().description("sidebar.manageLocationsCard.button")',
  ],

  // New Location button on Manage Locations screen - use accessibility ID with fallbacks
  // Priority: accessibility ID → resource-id → description → text (last resort)
  newLocationButtonCandidates: [
    '~manageLocations.newLocationButton.button',
    'id=manageLocations.newLocationButton.button',
    'android=new UiSelector().resourceId("manageLocations.newLocationButton.button")',
    'android=new UiSelector().description("manageLocations.newLocationButton.button")',
    // Text-based (last resort)
    'android=new UiSelector().text("New Location")',
    'android=new UiSelector().textContains("New Location")',
  ],

  // Location name input field in create modal - use accessibility ID with fallbacks
  // Priority: accessibility ID → resource-id → description → class → text (last resort)
  createLocationNameInputCandidates: [
    '~createLocationModal.locationName.input',
    'id=createLocationModal.locationName.input',
    'android=new UiSelector().resourceId("createLocationModal.locationName.input")',
    'android=new UiSelector().description("createLocationModal.locationName.input")',
    // Class-based fallback
    'android=new UiSelector().className("android.widget.EditText")',
    // Text-based (last resort)
    'android=new UiSelector().text("Location Name")',
    'android=new UiSelector().textContains("Location Name")',
  ],

  // Save button in create location modal - use accessibility ID with fallbacks
  // Priority: accessibility ID → resource-id → description → text (last resort)
  saveLocationButtonCandidates: [
    '~createLocationModal.saveButton.button',
    'id=createLocationModal.saveButton.button',
    'android=new UiSelector().resourceId("createLocationModal.saveButton.button")',
    'android=new UiSelector().description("createLocationModal.saveButton.button")',
    // Text-based (last resort)
    'android=new UiSelector().text("Save")',
    'android=new UiSelector().textContains("Save")',
  ],

  // Back button from Manage Locations screen - use accessibility ID with fallbacks
  // Note: The back button uses sharedHeader.backButton.button (not manageLocations.backButton.button)
  // Priority: accessibility ID → resource-id → description → text (last resort)
  manageLocationsBackCandidates: [
    '~sharedHeader.backButton.button',
    'id=sharedHeader.backButton.button',
    'android=new UiSelector().resourceId("sharedHeader.backButton.button")',
    'android=new UiSelector().description("sharedHeader.backButton.button")',
    // Text-based (last resort)
    'android=new UiSelector().text("Back")',
    'android=new UiSelector().textContains("Back")',
  ],

  // Close sidebar button (X icon) - use accessibility ID with fallbacks
  // Priority: accessibility ID → resource-id → description
  closeSidebarCandidates: [
    '~sidebar.closeIcon.button',
    'id=sidebar.closeIcon.button',
    'android=new UiSelector().resourceId("sidebar.closeIcon.button")',
    'android=new UiSelector().description("sidebar.closeIcon.button")',
  ],

  // Location dropdown button on home screen - use accessibility ID with fallbacks
  // Priority: accessibility ID → resource-id → description → alternative elements
  // Note: The location name text or icon might open the dropdown if dropdown button doesn't exist
  locationDropdownCandidates: [
    // Primary: dropdown button
    '~home.location.dropdownButton.button',
    'id=home.location.dropdownButton.button',
    'android=new UiSelector().resourceId("home.location.dropdownButton.button")',
    'android=new UiSelector().description("home.location.dropdownButton.button")',
    // Alternative: location name text (opens dropdown)
    '~home.location.name.text',
    'id=home.location.name.text',
    'android=new UiSelector().resourceId("home.location.name.text")',
    'android=new UiSelector().description("home.location.name.text")',
    // Alternative: location icon (opens dropdown)
    '~home.location.icon',
    'id=home.location.icon',
    'android=new UiSelector().resourceId("home.location.icon")',
  ],

  // Menu title to confirm we're on sidebar menu
  menuTitle: 'android=new UiSelector().text("MENU")',

  // Manage Locations screen title to confirm we're on the right screen
  manageLocationsTitle: 'android=new UiSelector().text("MANAGE LOCATIONS")',
}

describe('Menu - Create New Location', () => {
  it('creates a new location and verifies it appears in Manage Locations and dropdown', async () => {
    await ensureLoggedIn()
    await driver.switchContext('NATIVE_APP')

    // ✅ Wait until home is truly ready (stable marker)
    await findFirstDisplayed(SELECTORS.homeReadyCandidates, 60000)

    // Let app finish background loading (hub scan etc.) - similar to other working tests
    await browser.pause(7000)

    // Step 1: Open sidebar menu
    await clickFirstReady(SELECTORS.hamburgerCandidates, 35000)

    // Step 2: Tap Manage Locations
    await clickFirstReady(SELECTORS.manageLocationsCandidates, 25000)

    // Wait for Manage Locations screen to fully load - confirm we're on the right screen
    // First, wait for the screen title to appear
    const manageLocationsTitle = await $(SELECTORS.manageLocationsTitle)
    await manageLocationsTitle.waitForDisplayed({ timeout: 30000 })
    
    // Give additional time for screen to fully render and load location list
    // This is important as the location list and buttons may load asynchronously
    await browser.pause(4000)

    // Step 3: Wait for New Location button to be available
    // The button should be visible, but we need to wait for it to be in the DOM and rendered
    // Use findFirstDisplayed which already has robust retry logic with longer timeout
    await findFirstDisplayed(SELECTORS.newLocationButtonCandidates, 40000)

    // Now tap the New Location button
    await clickFirstReady(SELECTORS.newLocationButtonCandidates, 10000)

    // Wait for the create location modal to fully appear
    // The keyboard appearing is a good indicator, but we should also wait for the input field
    await browser.pause(2000) // Give modal time to fully render

    // Step 4: Enter location name
    // Wait for input field with longer timeout since modal needs to fully load
    const nameInput = await findFirstDisplayed(
      SELECTORS.createLocationNameInputCandidates,
      30000,
    )

    // Generate a simple number between 100-999 to keep name format short: "Test location 123"
    const randomNum = Math.floor(Math.random() * 900) + 100 // Random number between 100-999
    const newLocationName = `Test location ${randomNum}` // Format: "Test location 123"
    await setInputValue(nameInput, newLocationName)

    // Step 5: Tap Save button
    await clickFirstReady(SELECTORS.saveLocationButtonCandidates, 25000)

    // Step 6: Wait for new location to appear in Manage Locations list
    // After save, user is returned to Manage Locations screen
    // Wait for the screen to fully load again
    await browser.pause(3000) // Give time for screen transition and location to appear in list

    // Verify we're back on Manage Locations screen by checking for the title
    const manageLocationsTitleAfterSave = await $(SELECTORS.manageLocationsTitle)
    await manageLocationsTitleAfterSave.waitForDisplayed({ timeout: 30000 })

    // Verify new location appears in Manage Locations list
    const locationInList = await $(
      `android=new UiSelector().text("${newLocationName}")`,
    )
    await locationInList.waitForDisplayed({ timeout: 30000 })
    await expect(locationInList).toBeDisplayed()

    // Step 7: Navigate back to sidebar menu
    // Wait for screen to fully load after save
    await browser.pause(2000)
    
    // Use Android system back button directly - more reliable than finding app back button
    // The app back button may not be immediately available after screen transitions
    await driver.pressKeyCode(4) // Android BACK key code
    await browser.pause(1500) // Give time for navigation back to menu

    // Confirm we are back on menu
    await expectDisplayed(SELECTORS.menuTitle, 25000)

    // Step 8: Close sidebar to return to home screen
    await clickFirstReady(SELECTORS.closeSidebarCandidates, 25000)

    // Wait for home screen to be fully ready after closing sidebar
    await browser.pause(2000) // Give time for sidebar close animation and screen to settle
    await findFirstDisplayed(SELECTORS.homeReadyCandidates, 30000) // Wait for home location icon

    // Step 9: Open location dropdown
    await clickFirstReady(SELECTORS.locationDropdownCandidates, 30000)

    // Step 10: Verify new location appears in dropdown list
    const locationInDropdown = await $(
      `android=new UiSelector().text("${newLocationName}")`,
    )
    await locationInDropdown.waitForDisplayed({ timeout: 30000 })
    await expect(locationInDropdown).toBeDisplayed()
  })
})
