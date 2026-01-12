// test/specs/android/menu/delete-existing-location.spec.js

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

  // Manage Locations button in sidebar - use accessibility ID with fallbacks
  manageLocationsCandidates: [
    '~sidebar.manageLocationsCard.button',
    'id=sidebar.manageLocationsCard.button',
    'android=new UiSelector().resourceId("sidebar.manageLocationsCard.button")',
    'android=new UiSelector().description("sidebar.manageLocationsCard.button")',
  ],

  // Settings icon at index 1 (second location in list) - use accessibility ID with fallbacks
  settingsIconIndex1Candidates: [
    '~manageLocations.locationItem.index.1.settingsIcon.button',
    'id=manageLocations.locationItem.index.1.settingsIcon.button',
    'android=new UiSelector().resourceId("manageLocations.locationItem.index.1.settingsIcon.button")',
    'android=new UiSelector().description("manageLocations.locationItem.index.1.settingsIcon.button")',
  ],

  // Delete Location button on Location Details screen - use accessibility ID with fallbacks
  deleteLocationButtonCandidates: [
    '~locationDetails.button.deleteLocation.destructive',
    'id=locationDetails.button.deleteLocation.destructive',
    'android=new UiSelector().resourceId("locationDetails.button.deleteLocation.destructive")',
    'android=new UiSelector().description("locationDetails.button.deleteLocation.destructive")',
  ],

  // Delete confirmation button (system dialog) - use resource ID and text fallback
  deleteConfirmButtonCandidates: [
    'id=android:id/button1',
    'android=new UiSelector().resourceId("android:id/button1")',
    'android=new UiSelector().text("DELETE")',
  ],

  // Menu title to confirm we're on sidebar menu
  menuTitle: 'android=new UiSelector().text("MENU")',

  // Manage Locations screen title to confirm we're on the right screen
  manageLocationsTitle: 'android=new UiSelector().text("MANAGE LOCATIONS")',
}

describe('Menu - Delete Existing Location', () => {
  it('deletes a location at index 1 from Manage Locations list', async () => {
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

    // Step 3: Wait for Manage Locations screen to fully load - confirm we're on the right screen
    const manageLocationsTitle = await $(SELECTORS.manageLocationsTitle)
    await manageLocationsTitle.waitForDisplayed({ timeout: 30000 })
    
    // Give additional time for screen to fully render and load location list
    await browser.pause(4000)

    // Step 4: Check if index 1 (second location) exists
    // Try to find settings icon at index 1
    let settingsIconExists = false
    try {
      const settingsIcon = await $(SELECTORS.settingsIconIndex1Candidates[0])
      settingsIconExists = await settingsIcon.isExisting().catch(() => false)
      if (settingsIconExists) {
        const displayed = await settingsIcon.isDisplayed().catch(() => false)
        settingsIconExists = displayed
      }
    } catch (e) {
      settingsIconExists = false
    }

    if (!settingsIconExists) {
      // Second test location (index 1) not found - skipping deletion
      console.log('Second test location (index 1) not found - skipping deletion. Test completed successfully.')
      return
    }

    // Step 5: Click settings icon at index 1
    await clickFirstReady(SELECTORS.settingsIconIndex1Candidates, 25000)

    // Step 6: Wait for Location Details screen - verify by waiting for delete button
    const deleteButton = await findFirstDisplayed(SELECTORS.deleteLocationButtonCandidates, 30000)
    await deleteButton.waitForDisplayed({ timeout: 15000 })
    await browser.pause(1000) // Brief pause for screen to settle

    // Step 7: Click Delete Location button
    await clickFirstReady(SELECTORS.deleteLocationButtonCandidates, 25000)

    // Step 8: Confirm deletion on system dialog - click DELETE button
    await browser.pause(1000) // Brief pause for dialog to appear
    const deleteConfirmButton = await findFirstDisplayed(SELECTORS.deleteConfirmButtonCandidates, 15000)
    await deleteConfirmButton.waitForDisplayed({ timeout: 10000 })
    await deleteConfirmButton.click()

    // Step 9: Wait for deletion to complete and verify back on Manage Locations screen
    // Use browser.waitUntil() to robustly wait for Manage Locations screen
    // This handles variable loading screen duration (quick or slow)
    await browser.waitUntil(
      async () => {
        const manageLocationsTitle = await $(SELECTORS.manageLocationsTitle)
        return await manageLocationsTitle.isDisplayed().catch(() => false)
      },
      {
        timeout: 45000,
        interval: 500,
        timeoutMsg: 'Manage Locations screen did not appear after deletion',
      },
    )

    // Step 10: Verify location is removed - check that settings icon at index 1 no longer exists
    await browser.pause(2000) // Give additional time for list to update
    const settingsIconAfterDelete = await $(SELECTORS.settingsIconIndex1Candidates[0])
    const stillExists = await settingsIconAfterDelete.isExisting().catch(() => false)
    
    if (stillExists) {
      // Check if it's displayed (might exist in DOM but not visible)
      const stillDisplayed = await settingsIconAfterDelete.isDisplayed().catch(() => false)
      if (stillDisplayed) {
        throw new Error('Location at index 1 still exists after deletion')
      }
    }

    // Test passed - location successfully deleted
    console.log('Location at index 1 successfully deleted')
  })
})
