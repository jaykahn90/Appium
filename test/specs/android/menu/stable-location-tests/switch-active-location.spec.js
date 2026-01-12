// test/specs/android/menu/stable-location-tests/switch-active-location.spec.js

const { ensureLoggedIn } = require('../../../../helpers/app/ensureLoggedIn')

/**
 * Platform detection helper
 * Checks environment variable to determine platform
 */
async function isIOS() {
  // Check environment variable (can be set in test config)
  // Default to false (Android) if not explicitly set
  return process.env.PLATFORM === 'ios' || process.env.PLATFORM_NAME === 'ios'
}

/**
 * Get element text with fallback to child elements (platform-agnostic)
 */
async function getElementTextWithFallback(element) {
  // Try direct text first
  let text = await element.getText().catch(() => '')
  if (text && text.trim().length > 2) {
    return text.trim()
  }

  // Try child elements - platform agnostic
  try {
    const ios = await isIOS()
    const childSelector = ios ? 'XCUIElementTypeStaticText' : 'android.widget.TextView'
    const childTextViews = await element.$$(childSelector)
    const childCount = await childTextViews.length

    for (let j = 0; j < childCount; j++) {
      const childText = await childTextViews[j].getText().catch(() => '')
      if (childText && childText.trim().length > 2) {
        return childText.trim()
      }
    }
  } catch (e) {
    // Continue without child text
  }

  return null
}

/**
 * Check if element is index.0 (current location) - platform-agnostic
 */
async function isIndex0(element) {
  try {
    const ios = await isIOS()
    // iOS uses 'name' attribute for accessibility IDs, Android uses 'content-desc'
    const descAttr = ios ? 'name' : 'content-desc'
    const idAttr = ios ? 'name' : 'resource-id'
    
    const desc = await element.getAttribute(descAttr).catch(() => '')
    const resourceId = await element.getAttribute(idAttr).catch(() => '')

    return (
      (desc && desc.includes('home.location.dropdownItem.index.0.button')) ||
      (resourceId && resourceId.includes('home.location.dropdownItem.index.0.button'))
    )
  } catch (e) {
    return false
  }
}

/**
 * Get XPath for location dropdown items (platform-agnostic)
 */
async function getLocationItemsXPath() {
  const ios = await isIOS()
  // iOS uses @name for accessibility IDs, Android uses @content-desc
  if (ios) {
    return '//*[starts-with(@name, "home.location.dropdownItem.index.") and contains(@name, ".button")]'
  }
  return '//*[starts-with(@content-desc, "home.location.dropdownItem.index.") and contains(@content-desc, ".button")]'
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
  // Priority: accessibility ID → resource-id → description
  hamburgerCandidates: [
    '~sharedHeader.menuButton.button',
    'id=sharedHeader.menuButton.button',
    'android=new UiSelector().resourceId("sharedHeader.menuButton.button")',
    'android=new UiSelector().description("sharedHeader.menuButton.button")',
  ],

  // Current location name on home screen - use accessibility ID with fallbacks
  // Priority: accessibility ID → resource-id → description
  // Used to get current active location name and verify after switch
  currentLocationNameCandidates: [
    '~home.location.name.text',
    'id=home.location.name.text',
    'android=new UiSelector().resourceId("home.location.name.text")',
    'android=new UiSelector().description("home.location.name.text")',
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
}

describe('Menu - Switch Active Location', () => {
  it('switches to a different location and verifies it becomes active on home screen', async () => {
    await ensureLoggedIn()
    await driver.switchContext('NATIVE_APP')

    // ✅ Wait until home is truly ready (stable marker)
    await findFirstDisplayed(SELECTORS.homeReadyCandidates, 60000)

    // Let app finish background loading (hub scan etc.) - similar to other working tests
    await browser.pause(7000)

    // Step 1: Open location dropdown (same pattern as create-new-location.spec.js line 309-310)
    // We open dropdown first - clicking on locationDropdownCandidates will open it
    // even if we can't read the location name text directly
    await clickFirstReady(SELECTORS.locationDropdownCandidates, 30000)

    // Wait for dropdown to appear and locations to load
    await browser.pause(2000) // Give dropdown time to fully render

    // Step 2: Try to get current active location name from home screen (after dropdown opened)
    // The element might be more accessible now, or we can determine it from dropdown
    let currentLocationName = null
    try {
      const currentLocationElement = await findFirstDisplayed(
        SELECTORS.currentLocationNameCandidates,
        5000,
      )
      currentLocationName = await currentLocationElement.getText()
    } catch (e) {
      // If still can't get it, we'll find it in dropdown or just select any different location
      console.log('Could not get current location name, will infer from dropdown')
    }

    // Step 3: Find and select a different location from the dropdown
    // Location dropdown items use index-based pattern: home.location.dropdownItem.index.{index}.button
    // We'll find all dropdown items using XPath pattern matching, then get their text and select one
    
    let selectedLocationName = null
    let locationFound = false
    const maxAttempts = 10
    let attempt = 0

    // Wait for dropdown items to be available and find a different location
    while (!locationFound && attempt < maxAttempts) {
      try {
        // Find all location dropdown items using XPath pattern matching (platform-agnostic)
        const xpathForLocationItems = await getLocationItemsXPath()
        let locationItems = await $$(xpathForLocationItems)
        let itemsCount = await locationItems.length

        // Fallback: If no items found by accessibility ID attribute, try by resource-id (Android only)
        if (itemsCount === 0) {
          const ios = await isIOS()
          if (!ios) {
            // Android fallback: try resource-id
            locationItems = await $$(
              '//*[starts-with(@resource-id, "home.location.dropdownItem.index.") and contains(@resource-id, ".button")]',
            )
            itemsCount = await locationItems.length
          }
        }

        // Process location items found via XPath
        if (itemsCount > 0) {
          for (let i = 0; i < itemsCount; i++) {
            try {
              const element = locationItems[i]
              const isDisplayed = await element.isDisplayed().catch(() => false)
              if (!isDisplayed) continue

              // Get text from element (with fallback to child elements)
              let trimmedText = await getElementTextWithFallback(element)

              // If still no text, check if this is index.0 (current location) and skip it
              if (!trimmedText || trimmedText.length <= 2) {
                // Check if this is index.0 (current location) - skip it
                if (await isIndex0(element)) {
                  continue // Skip current location (index.0)
                }

                // If we don't have text and it's not index.0, try using index number as fallback
                const ios = await isIOS()
                const descAttr = ios ? 'name' : 'content-desc'
                const idAttr = ios ? 'name' : 'resource-id'
                const desc = await element.getAttribute(descAttr).catch(() => '')
                const resourceId = await element.getAttribute(idAttr).catch(() => '')

                // Extract index number from accessibility ID
                const indexMatch = (desc || resourceId || '').match(/index\.(\d+)/)
                if (indexMatch && indexMatch[1] !== '0') {
                  // This is a different location (not index.0), use it
                  trimmedText = `Location ${indexMatch[1]}`
                } else {
                  continue // Skip if we can't identify it
                }
              }

              // Skip if same as current location (if we know it)
              if (currentLocationName && trimmedText === currentLocationName.trim()) {
                continue
              }

              // Skip index.0 if we still don't have current location name (index.0 is current)
              if (!currentLocationName && (await isIndex0(element))) {
                continue // Skip current location (index.0)
              }

              // Found a different location - click it
              await element.waitForDisplayed({ timeout: 5000 })
              await browser.pause(300) // Small pause before clicking
              await element.click()
              selectedLocationName = trimmedText
              locationFound = true
              break
            } catch (e) {
              // Continue to next element
              continue
            }
          }
        } else {
          // Fallback: Try finding buttons and filter by pattern (platform-agnostic)
          const ios = await isIOS()
          const buttonSelector = ios ? 'XCUIElementTypeButton' : 'android.widget.Button'
          const allButtons = await $$(buttonSelector)
          const buttonsCount = await allButtons.length

          for (let i = 0; i < buttonsCount; i++) {
            try {
              const button = allButtons[i]
              const descAttr = ios ? 'name' : 'content-desc'
              const idAttr = ios ? 'name' : 'resource-id'
              const desc = await button.getAttribute(descAttr).catch(() => '')
              const resourceId = await button.getAttribute(idAttr).catch(() => '')

              // Check if this button matches the location dropdown item pattern
              if (
                (desc && desc.includes('home.location.dropdownItem.index.') && desc.includes('.button')) ||
                (resourceId && resourceId.includes('home.location.dropdownItem.index.') && resourceId.includes('.button'))
              ) {
                // Skip index.0 (current location)
                if (await isIndex0(button)) {
                  continue // Skip current location (index.0)
                }

                const isDisplayed = await button.isDisplayed().catch(() => false)
                if (!isDisplayed) continue

                // Get text from button (with fallback to child elements)
                let trimmedText = await getElementTextWithFallback(button)

                // Skip if same as current location (if we know it)
                if (currentLocationName && trimmedText && trimmedText === currentLocationName.trim()) {
                  continue
                }

                // Found a different location - click it (even if we don't have text, we know it's not index.0)
                await button.waitForDisplayed({ timeout: 5000 })
                await browser.pause(300)
                await button.click()
                selectedLocationName = trimmedText || 'Different Location'
                locationFound = true
                break
              }
            } catch (e) {
              continue
            }
          }
        }
      } catch (e) {
        // Continue trying
      }

      if (!locationFound) {
        // If not found, wait a bit and try again
        await browser.pause(500)
        attempt++
      }
    }

    // Verify we found a different location
    if (!locationFound || !selectedLocationName) {
      throw new Error(
        `Could not find a different location in dropdown. Current location: "${currentLocationName || 'unknown'}"`,
      )
    }

    // Verify the selected location is different from current (if we know current)
    if (currentLocationName && selectedLocationName === currentLocationName.trim()) {
      throw new Error(
        `Selected location "${selectedLocationName}" is the same as current location "${currentLocationName}"`,
      )
    }

    // Step 4: Wait for dropdown to close and home screen to update
    await browser.pause(3000) // Give time for location switch and dropdown to close

    // Step 5: Verify home screen shows the newly selected location
    await findFirstDisplayed(SELECTORS.hamburgerCandidates, 30000) // Wait for hamburger menu

    // Verify the location name on home screen matches the selected location
    const updatedLocationElement = await findFirstDisplayed(
      SELECTORS.currentLocationNameCandidates,
      30000,
    )
    const updatedLocationName = await updatedLocationElement.getText()

    // Assert the location has changed to the selected one
    expect(updatedLocationName.trim()).toBe(selectedLocationName)
    // Verify it's different from original (if we knew the original)
    if (currentLocationName) {
      expect(updatedLocationName.trim()).not.toBe(currentLocationName.trim())
    }

    // Additional verification: location should be displayed (platform-agnostic)
    const ios = await isIOS()
    const textSelector = ios
      ? `-ios predicate string:name == "${selectedLocationName}"`
      : `android=new UiSelector().text("${selectedLocationName}")`
    await expectDisplayed(textSelector, 30000)
  })
})
