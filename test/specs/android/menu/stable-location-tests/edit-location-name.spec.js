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
 * NOTE:
 * - On your current build, hamburger is a resource-id (Inspector shows "id=sharedHeader.menuButton.button"),
 *   not a content-desc. So we use id/resourceId selectors.
 * - Home readiness marker is resource-id "home.location.icon".
 */
const SELECTORS = {
  // ✅ Home readiness marker (resource-id)
  homeReadyCandidates: [
    'id=home.location.icon',
    'android=new UiSelector().resourceId("home.location.icon")',
  ],

  // ✅ Hamburger (resource-id)
  hamburgerCandidates: [
    'id=sharedHeader.menuButton.button',
    'android=new UiSelector().resourceId("sharedHeader.menuButton.button")',
  ],

  // Current location (card in drawer) — use resource-id (not accessibility id)
  currentLocationCandidates: [
    'id=sidebar.activeLocationName.text',
    'android=new UiSelector().resourceId("sidebar.activeLocationName.text")',
    // Fallback to description in case resource-id changes in future builds
    'android=new UiSelector().description("sidebar.locationCard.button")',
    '~sidebar.locationCard.button',
  ],

  // Edit pencil on Location Name screen
  editNameCandidates: ['~Edit name'],

  // Location name input
  locationNameInputCandidates: [
    '~locationDetails.locationName.input',
    'android=new UiSelector().resourceId("locationDetails.locationName.input")',
    'android=new UiSelector().resourceIdMatches(".*location.*name.*")',
    'android=new UiSelector().className("android.widget.EditText")',
  ],

  // Confirm (tick) on edit screen
  saveNameCandidates: ['~Save changes'],

  // Back to drawer/menu — use resource-id (not accessibility id)
  inAppBackCandidates: [
    'id=locationDetails.backButton.button',
    'android=new UiSelector().resourceId("locationDetails.backButton.button")',
    // Fallback to accessibility id in case resource-id changes in future builds
    '~locationDetails.backButton.button',
  ],

  // Menu title to confirm we returned
  menuTitle: 'android=new UiSelector().text("MENU")',
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

    // Tap pencil to edit Location Name
    await clickFirstReady(SELECTORS.editNameCandidates, 25000)

    // Edit name and confirm
    const nameInput = await findFirstDisplayed(
      SELECTORS.locationNameInputCandidates,
      25000,
    )

    const newName = `My Home ${Date.now()}` // avoids clashes if name persists between runs
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
