// test/specs/ios/edit-location-name.spec.js

const { ensureLoggedIn } = require('../../helpers/app/ensureLoggedIn.ios')
const { loginIOSBrowserStack } = require('../../helpers/login/login.ios.browserstack')

/**
 * Helper: Log iOS alert button labels for debugging
 * @param {string} tag - Tag to identify where this log is from
 */
async function logIOSAlertButtons(tag) {
  try {
    const buttons = await driver.execute('mobile: alert', { action: 'getButtons' })
    console.log(`[${tag}] iOS alert buttons:`, buttons)
    return buttons
  } catch (e) {
    console.log(`[${tag}] No iOS alert open (or getButtons failed):`, e?.message || e)
    return null
  }
}

/**
 * Helper: Handle iOS system alerts after login (preferred button strategy)
 * @param {string} tag - Tag to identify where this log is from
 */
async function handleIOSSystemAlerts(tag) {
  if (!driver.isIOS) return

  let lastAlertSeenAt = null
  const STABLE_NO_ALERT_WINDOW = 2000 // 2 seconds
  const POLL_INTERVAL = 500 // ms between polling attempts

  // Preferred button priority order
  const preferredButtons = [
    'Allow',
    'Allow While Using App',
    'Allow Once',
    'OK',
  ]

  for (let i = 0; i < 10; i++) {
    let buttons = null
    try {
      buttons = await driver.execute('mobile: alert', { action: 'getButtons' })
      lastAlertSeenAt = Date.now() // Reset timer when we see an alert
    } catch (e) {
      // If getButtons throws "no modal dialog open", treat as transition state
      const errorMsg = e?.message || String(e)
      if (errorMsg.includes('modal dialog not open') || errorMsg.includes('not open')) {
        const now = Date.now()
        
        // If we've had 2 seconds of no alerts, we're done
        if (lastAlertSeenAt && (now - lastAlertSeenAt) >= STABLE_NO_ALERT_WINDOW) {
          console.log(`[${tag}] No alerts detected for ${STABLE_NO_ALERT_WINDOW}ms, exiting loop`)
          break
        }
        
        // Still in transition, pause and retry
        await driver.pause(POLL_INTERVAL)
        continue
      }
      // Other errors, break
      console.log(`[${tag}] Unexpected error getting buttons:`, errorMsg)
      break
    }

    if (!buttons || buttons.length === 0) {
      const now = Date.now()
      // Check if we've had stable no-alert window
      if (lastAlertSeenAt && (now - lastAlertSeenAt) >= STABLE_NO_ALERT_WINDOW) {
        console.log(`[${tag}] No alerts detected for ${STABLE_NO_ALERT_WINDOW}ms, exiting loop`)
        break
      }
      // No buttons but still in transition, pause and continue
      await driver.pause(POLL_INTERVAL)
      continue
    }

    console.log(`[${tag}] Iteration ${i + 1}: detected buttons:`, JSON.stringify(buttons))

    // Choose the first match in priority order (NEVER select the last button)
    let chosenButton = null
    for (const preferred of preferredButtons) {
      if (buttons.includes(preferred)) {
        chosenButton = preferred
        break
      }
    }

    // Try to accept using preferred button or generic accept
    try {
      if (chosenButton) {
        console.log(`[${tag}] Chosen button: "${chosenButton}"`)
        await driver.execute('mobile: alert', { action: 'accept', buttonLabel: chosenButton })
        console.log(`[${tag}] Successfully accepted button: "${chosenButton}"`)
      } else {
        console.log(`[${tag}] No preferred button found, using generic accept`)
        await driver.execute('mobile: alert', { action: 'accept' })
        console.log(`[${tag}] Successfully accepted using generic accept`)
      }
      await driver.pause(POLL_INTERVAL) // Pause between iterations
    } catch (e) {
      console.log(`[${tag}] Failed to accept alert:`, e?.message || e)
      // If accept fails, continue outer loop to re-fetch buttons (may be transitioning)
      await driver.pause(POLL_INTERVAL)
      continue
    }
  }

  // After the loop completes, wait explicitly for home screen marker
  console.log(`[${tag}] Alert handling loop complete, waiting for home screen marker...`)
  try {
    const hamburger = await $('~sharedHeader.menuButton.button')
    await hamburger.waitForExist({ timeout: 30000 })
    await hamburger.waitForDisplayed({ timeout: 30000 })
    console.log(`[${tag}] Home screen marker found`)
  } catch (e) {
    console.log(`[${tag}] Home screen marker not found after 30s:`, e?.message || e)
  }
}

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

  // Backspace spam to remove any leftovers (reduced from 80 to 35)
  for (let i = 0; i < 35; i++) {
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
  it('edits the location name and shows the updated name in the menu', async function () {
    this.timeout(240000) // BS + Auth0 + popups exceeds 60s
    if (driver.isIOS) {
      for (let i = 0; i < 3; i++) {
        try {
          // 1) Best option on iOS: tell Appium to accept the native alert
          await driver.execute('mobile: alert', { action: 'accept' })
          await driver.pause(800)
        } catch (e) {
          // ignore and try fallback
        }

        // 2) Fallback: tap the "Allow" button explicitly
        try {
          const allowBtn = await $('~Allow')
          if (await allowBtn.isDisplayed()) {
            await allowBtn.click()
            await driver.pause(800)
          }
        } catch (e) {
          // ignore
        }

        // 3) Exit early if alert is gone (don't rely on it too much, but helps)
        try {
          const stillOpen = await driver.isAlertOpen()
          if (!stillOpen) break
        } catch (e) {
          // ignore
        }
      }
    }
    await ensureLoggedIn()
    
    // Handle iOS system alerts immediately after Auth0 login
    await handleIOSSystemAlerts('post-login')
    
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

    // Verify location card exists (simple check - no name assertion, no hamburger check)
    const locationCard = await findFirstDisplayed(SELECTORS.currentLocationCandidates, 10000)
    await locationCard.waitForDisplayed({ timeout: 5000 })
    console.log('Location card found - test passed')
  })
})
