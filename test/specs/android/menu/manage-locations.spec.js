// working on this one to test manage location that when user presses it, it will tkae user to manage locations screen. 

const { ensureLoggedIn } = require('../../../helpers/app/ensureLoggedIn')

/**
 * CI-safe helpers: always wait, and allow fallback selectors
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
 * App selectors (keep these together)
 */
const SELECTORS = {
  // Menu hamburger - use resource-id as primary (not accessibility-id or description)
  hamburgerCandidates: [
    'id=sharedHeader.menuButton.button',
    'android=new UiSelector().resourceId("sharedHeader.menuButton.button")',
    // Fallback to accessibility-id and description in case resource-id changes
    '~sidebar.menu.button',
    'android=new UiSelector().description("sharedHeader.menuButton.button")',
  ],

  manageLocations: '~sidebar.manageLocationsCard.button',

  // Manage Locations screen text anchors
  heading: 'android=new UiSelector().text("MANAGE LOCATIONS")',
  chooseActive: 'android=new UiSelector().text("Choose your active location")',
  orCreate: 'android=new UiSelector().text("Or create a new location")',
  newLocationBtn: 'android=new UiSelector().text("New Location")',
  deleteLocationBtn: 'android=new UiSelector().text("Delete Location")',

  // Back (keep as you have it for now; if it fails, we’ll add a fallback too)
  // If you know the real one, replace this with that.
  inAppBackCandidates: [
    '~navigation.back',
    'android=new UiSelector().description("Back")',
    'android=new UiSelector().descriptionContains("Back")',
  ],

  // Menu title to confirm we returned
  menuTitle: 'android=new UiSelector().text("MENU")',
}

describe('Menu – Manage Locations', () => {
  it('opens Manage Locations, verifies UI, and returns back', async () => {
    await ensureLoggedIn()

    // Open sidebar menu (CI-safe: fallback selectors)
    await clickFirstReady(SELECTORS.hamburgerCandidates, 35000)

    // Tap Manage Locations
    await clickFirstReady([SELECTORS.manageLocations], 25000)

    // Assertions
    await expectDisplayed(SELECTORS.heading, 40000)
    await expectDisplayed(SELECTORS.chooseActive, 30000)
    await expectDisplayed(SELECTORS.orCreate, 30000)
    await expectDisplayed(SELECTORS.newLocationBtn, 30000)
    await expectDisplayed(SELECTORS.deleteLocationBtn, 30000)

    // Back (CI-safe: try in-app back candidates)
    await clickFirstReady(SELECTORS.inAppBackCandidates, 25000)

    // Confirm we’re back on Menu
    await expectDisplayed(SELECTORS.menuTitle, 25000)
  })
})
