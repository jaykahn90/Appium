// test/helpers/app/ensureLoggedIn.ios.js

const fs = require('fs')
const { loginIOSBrowserStack } = require('../login/login.ios.browserstack')
const APP_BUNDLE_ID = 'com.RolleaseAcmeda.Automate2'
const SAFARI_BUNDLE_ID = 'com.apple.mobilesafari'

/**
 * Helper: Handle iOS alert if present (try to accept with preferred buttons)
 * @param {string} tag - Tag to identify where this log is from
 */
async function logIOSAlertButtons(tag) {
  // Detect alert existence using getAlertText
  try {
    await driver.getAlertText()
    // Alert exists, try to accept with preferred buttons directly
    const preferredButtons = ['Allow', 'OK', 'Allow While Using App', 'Always Allow', 'Allow Once', 'Continue']
    let accepted = false
    for (const preferred of preferredButtons) {
      try {
        await driver.execute('mobile: alert', { action: 'accept', buttonLabel: preferred })
        console.log(`[${tag}] Successfully accepted button: "${preferred}"`)
        accepted = true
        break
      } catch (e) {
        // This button doesn't exist, try next one
        continue
      }
    }
    // If no preferred button worked, try generic accept
    if (!accepted) {
      try {
        await driver.execute('mobile: alert', { action: 'accept' })
        console.log(`[${tag}] Successfully accepted using generic accept`)
      } catch (e) {
        console.log(`[${tag}] Failed to accept alert:`, e?.message || e)
      }
    }
    return accepted
  } catch (e) {
    // No alert present, return immediately
    return false
  }
}

/**
 * Helper: Bulletproof iOS post-login permission handler for BrowserStack
 * Phase A: Handles system alerts
 * Phase B: Falls back to checklist/settings if home marker not visible
 */
async function handlePostLoginPermissionsIOS() {
  if (!driver.isIOS) return

  // Flag to suppress alert polling after activating AUT app
  let suppressAlertPolling = false

  // Helper to normalize apostrophes for comparison (case-insensitive)
  const normalizeLabel = (label) => {
    return label
      .replace(/'/g, "'") // Normalize curly apostrophe to straight
      .replace(/'/g, "'") // Normalize curly apostrophe to straight
      .toLowerCase()
  }

  // Preferred button priority order (case-insensitive)
  const preferredButtons = [
    'Allow',
    'OK',
    'Allow While Using App',
    'Always Allow',
    'Allow Once',
    'Continue',
  ]

  // Buttons to ignore
  const ignoredButtons = ["Don't Allow", "Don't Allow", "Precise: On"]

  // ========== PHASE A: Alerts Loop ==========
  console.log('[post-login-permissions] Phase A: Starting alerts loop')
  let lastAlertTime = null
  const STABLE_NO_ALERT_WINDOW = 2000 // 2 seconds
  const POLL_INTERVAL = 500 // ms

  for (let i = 0; i < 12; i++) {
    // Check if alert polling should be suppressed
    if (suppressAlertPolling) {
      console.log('[post-login-permissions] Phase A: Alert polling suppressed after activateApp')
      break
    }

    // Check if home marker is visible - if so, we're done with alerts
    try {
      const hamburger = await $('~sharedHeader.menuButton.button')
      if (await hamburger.isDisplayed().catch(() => false)) {
        console.log('[post-login-permissions] Phase A: Home marker visible; skipping alert polling')
        break
      }
    } catch (e) {
      // Home marker not found, continue with alert polling
    }

    // Check if alert is present using getAlertText (W3C standard)
    let alertPresent = false
    try {
      await driver.getAlertText()
      alertPresent = true
    } catch (e) {
      // No alert present - check if we've had stable no-alert window
      const errorMsg = e?.message || String(e)
      if (
        errorMsg.includes('no such alert') ||
        errorMsg.includes('not open') ||
        errorMsg.includes('modal dialog not open') ||
        errorMsg.includes('An attempt was made to operate on a modal dialog when one was not open')
      ) {
        const now = Date.now()
        if (lastAlertTime && now - lastAlertTime >= STABLE_NO_ALERT_WINDOW) {
          console.log(
            `[post-login-permissions] Phase A: No alerts detected for ${STABLE_NO_ALERT_WINDOW}ms, exiting loop`,
          )
          break
        }
        // Still in transition, pause and retry
        await driver.pause(300)
        continue
      }
      // Other errors, treat as no alert
      alertPresent = false
    }

    // If no alert present, continue checking
    if (!alertPresent) {
      const now = Date.now()
      if (lastAlertTime && now - lastAlertTime >= STABLE_NO_ALERT_WINDOW) {
        console.log(
          `[post-login-permissions] Phase A: No alerts detected for ${STABLE_NO_ALERT_WINDOW}ms, exiting loop`,
        )
        break
      }
      await driver.pause(300)
      continue
    }

    // Alert is present - try to accept with preferred buttons in priority order
    lastAlertTime = Date.now() // Reset timer when we see an alert
    
    // Try accepting with preferred buttons in priority order
    let accepted = false
    for (const preferred of preferredButtons) {
      try {
        await driver.execute('mobile: alert', { action: 'accept', buttonLabel: preferred })
        console.log(`[post-login-permissions] Phase A: Successfully accepted button: "${preferred}"`)
        accepted = true
        await driver.pause(POLL_INTERVAL)
        break
      } catch (e) {
        // This button doesn't exist, try next one
        continue
      }
    }

    // If no preferred button worked, try generic accept
    if (!accepted) {
      try {
        await driver.execute('mobile: alert', { action: 'accept' })
        console.log(`[post-login-permissions] Phase A: Successfully accepted using generic accept`)
        await driver.pause(POLL_INTERVAL)
      } catch (e) {
        console.log(`[post-login-permissions] Phase A: Failed to accept alert:`, e?.message || e)
        await driver.pause(POLL_INTERVAL)
        continue
      }
    }
  }

  // ========== PHASE B: Checklist / Settings Fallback ==========
  console.log('[post-login-permissions] Phase B: Checking for home marker...')

  // Check if home marker is visible
  let homeMarkerVisible = false
  try {
    const hamburger = await $('~sharedHeader.menuButton.button')
    homeMarkerVisible = await hamburger.isDisplayed().catch(() => false)
  } catch (e) {
    // Home marker not found
  }

  if (homeMarkerVisible) {
    console.log('[post-login-permissions] Phase B: Home marker visible, skipping checklist/settings')
    return
  }

  console.log('[post-login-permissions] Phase B: Home marker not visible, checking for checklist...')

  // Check if checklist screen is visible
  let checklistVisible = false
  try {
    // Check for checklist text or Settings button
    const checklistText = await $(
      '-ios predicate string:name CONTAINS[c] "If not already ensure the following permissions are enabled" OR label CONTAINS[c] "If not already ensure the following permissions are enabled"',
    )
    if (await checklistText.isDisplayed().catch(() => false)) {
      checklistVisible = true
    }
  } catch (e) {
    // Checklist text not found, try Settings button
  }

  if (!checklistVisible) {
    try {
      // Settings button is XCUIElementTypeOther, not Button
      const settingsButtonSelectors = [
        '-ios class chain:**/XCUIElementTypeOther[`name == "Settings"`][2]',
        '//XCUIElementTypeOther[@name="Settings"][2]',
        '-ios predicate string:type == "XCUIElementTypeOther" AND (name == "Settings" OR label == "Settings")',
      ]
      for (const selector of settingsButtonSelectors) {
        try {
          const settingsButton = await $(selector)
          if (await settingsButton.isDisplayed().catch(() => false)) {
            checklistVisible = true
            break
          }
        } catch (e) {
          // Continue to next selector
        }
      }
    } catch (e) {
      // Settings button not found
    }
  }

  if (!checklistVisible) {
    console.log('[post-login-permissions] Phase B: Checklist not visible, waiting for home marker...')
    // Wait for home marker as fallback
    try {
      const hamburger = await $('~sharedHeader.menuButton.button')
      await hamburger.waitForExist({ timeout: 30000 })
      await hamburger.waitForDisplayed({ timeout: 30000 })
      console.log('[post-login-permissions] Phase B: Home screen marker found')
    } catch (e) {
      console.log('[post-login-permissions] Phase B: Home screen marker not found after 30s:', e?.message || e)
    }
    return
  }

  console.log('[post-login-permissions] Phase B: Checklist visible, tapping Settings button...')

  // Tap Settings button to open iOS Settings (XCUIElementTypeOther, not Button)
  try {
    const settingsButtonSelectors = [
      '-ios class chain:**/XCUIElementTypeOther[`name == "Settings"`][2]',
      '//XCUIElementTypeOther[@name="Settings"][2]',
      '-ios predicate string:type == "XCUIElementTypeOther" AND (name == "Settings" OR label == "Settings")',
    ]
    let settingsButton = null
    for (const selector of settingsButtonSelectors) {
      try {
        const btn = await $(selector)
        if (await btn.isDisplayed().catch(() => false)) {
          settingsButton = btn
          break
        }
      } catch (e) {
        // Continue to next selector
      }
    }
    
    if (!settingsButton) {
      console.log('[post-login-permissions] Phase B: Settings button not found with any selector')
      return
    }
    
    await settingsButton.waitForDisplayed({ timeout: 10000 })
    await settingsButton.click()
    console.log('[post-login-permissions] Phase B: Settings button tapped')
    
    // Short pause to let iOS transition
    await driver.pause(1250) // 1000-1500ms range
    
    // Wait for Automate settings screen
    console.log('[post-login-permissions] Phase B: Waiting for AUTOMATE settings screen...')
    try {
      await driver.waitUntil(
        async () => {
          try {
            // Check navigation bar
            const navBar = await $('-ios predicate string:type == "XCUIElementTypeNavigationBar" AND name CONTAINS[c] "AUTOMATE"')
            if (await navBar.isDisplayed().catch(() => false)) {
              return true
            }
            // Check header text
            const header = await $('-ios predicate string:type == "XCUIElementTypeStaticText" AND (name CONTAINS[c] "ALLOW AUTOMATE TO ACCESS" OR label CONTAINS[c] "ALLOW AUTOMATE TO ACCESS")')
            if (await header.isDisplayed().catch(() => false)) {
              return true
            }
            return false
          } catch (e) {
            return false
          }
        },
        {
          timeout: 30000,
          interval: 500,
          timeoutMsg: 'AUTOMATE settings screen did not appear',
        },
      )
      console.log('[post-login-permissions] Phase B: AUTOMATE settings screen detected')
      
      // Immediately switch back to AUT app
      console.log('[post-login-permissions] Phase B: Activating AUT app...')
      await driver.activateApp('com.RolleaseAcmeda.Automate2')
      console.log('[post-login-permissions] Phase B: Activated AUT app')
      suppressAlertPolling = true // Stop all alert polling after activating app
    } catch (e) {
      console.log('[post-login-permissions] Phase B: Failed to detect AUTOMATE settings screen:', e?.message || e)
      return
    }
  } catch (e) {
    console.log('[post-login-permissions] Phase B: Failed to tap Settings button:', e?.message || e)
    return
  }

  // Wait for home marker after returning from Settings
  console.log('[post-login-permissions] Phase B: Waiting for home marker after Settings...')
  try {
    const hamburger = await $('~sharedHeader.menuButton.button')
    await hamburger.waitForExist({ timeout: 30000 })
    await hamburger.waitForDisplayed({ timeout: 30000 })
    console.log('[post-login-permissions] Phase B: Home screen marker found')
  } catch (e) {
    console.log('[post-login-permissions] Phase B: Home screen marker not found after 30s:', e?.message || e)
  }
}

/**
 * Helper: Handle iOS system alerts after login
 * @param {string} tag - Tag to identify where this log is from
 */
async function handleIOSSystemAlerts(tag) {
  if (!driver.isIOS) return

  const MAX_LOOP_DURATION = 15000 // 15 seconds total
  const STABLE_NO_ALERT_WINDOW = 2000 // 2 seconds
  const POLL_INTERVAL = 500 // ms between polling attempts

  // Helper to normalize apostrophes for comparison (case-insensitive)
  const normalizeLabel = (label) => {
    return label
      .replace(/'/g, "'") // Normalize curly apostrophe to straight
      .replace(/'/g, "'") // Normalize curly apostrophe to straight
      .toLowerCase()
  }

  // Preferred button priority order (case-insensitive)
  const preferredButtons = [
    'Allow While Using App',
    'Allow',
    'OK',
    'Continue',
    'Allow Once',
  ]

  // Buttons to never click
  const forbiddenButtons = ['Don\'t Allow', 'Don\'t Allow', 'Not Now', 'Cancel']

  const loopStartTime = Date.now()
  let lastAlertSeenAt = null
  let iteration = 0
  const POLL_MS = 250 // Poll every ~250ms

  while (Date.now() - loopStartTime < MAX_LOOP_DURATION) {
    iteration++

    // Check if alert is present using getAlertText (W3C standard)
    let alertPresent = false
    try {
      await driver.getAlertText()
      alertPresent = true
    } catch (e) {
      // No alert present - check if we've had stable no-alert window
      const errorMsg = e?.message || String(e)
      if (
        errorMsg.includes('no such alert') ||
        errorMsg.includes('not open') ||
        errorMsg.includes('modal dialog not open') ||
        errorMsg.includes('An attempt was made to operate on a modal dialog when one was not open')
      ) {
        const now = Date.now()
        if (lastAlertSeenAt && now - lastAlertSeenAt >= STABLE_NO_ALERT_WINDOW) {
          console.log(`[${tag}] No alerts detected for ${STABLE_NO_ALERT_WINDOW}ms, exiting loop`)
          break
        }
        // Still in transition, pause and retry
        await driver.pause(POLL_MS)
        continue
      }
      // Other errors, treat as no alert
      alertPresent = false
    }

    // If no alert present, continue checking
    if (!alertPresent) {
      const now = Date.now()
      if (lastAlertSeenAt && now - lastAlertSeenAt >= STABLE_NO_ALERT_WINDOW) {
        console.log(`[${tag}] No alerts detected for ${STABLE_NO_ALERT_WINDOW}ms, exiting loop`)
        break
      }
      await driver.pause(POLL_MS)
      continue
    }

    // Alert is present - try to accept with preferred buttons in priority order
    lastAlertSeenAt = Date.now() // Reset timer when we see an alert
    
    // Try accepting with preferred buttons in priority order
    let accepted = false
    for (const preferred of preferredButtons) {
      try {
        await driver.execute('mobile: alert', { action: 'accept', buttonLabel: preferred })
        console.log(`[${tag}] Successfully accepted button: "${preferred}"`)
        accepted = true
        await driver.pause(500) // Settle pause after accepting
        break
      } catch (e) {
        // This button doesn't exist, try next one
        continue
      }
    }

    // If no preferred button worked, try generic accept
    if (!accepted) {
      try {
        await driver.execute('mobile: alert', { action: 'accept' })
        console.log(`[${tag}] Successfully accepted using generic accept`)
        await driver.pause(500) // Settle pause after accepting
      } catch (e) {
        console.log(`[${tag}] Failed to accept alert:`, e?.message || e)
        await driver.pause(POLL_MS)
        continue
      }
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

const SELECTORS = {
  // Hamburger menu button - use accessibility ID for cross-platform uniformity
  // Fallbacks for backwards compatibility during transition
  hamburgerCandidates: [
    '~sharedHeader.menuButton.button',
    'id=sharedHeader.menuButton.button',
    // iOS-specific fallbacks
    '-ios predicate string:name == "sharedHeader.menuButton.button"',
    '//XCUIElementTypeButton[@name="sharedHeader.menuButton.button"]',
  ],

  // More flexible login marker - iOS version
  // Note: Real Splash login accessibility ID first, then text-based fallbacks as last resort
  loginBtnCandidates: [
    '~authScreen.loginButton.button',
    '-ios predicate string:name == "authScreen.loginButton.button"',
    '//XCUIElementTypeButton[@name="authScreen.loginButton.button"]',
    // keep text fallbacks last
    '-ios predicate string:type == "XCUIElementTypeButton" AND (name CONTAINS[c] "log in" OR label CONTAINS[c] "log in" OR name CONTAINS[c] "sign in" OR label CONTAINS[c] "sign in")',
    `//XCUIElementTypeButton[contains(@name,'Log In') or contains(@label,'Log In') or contains(@name,'Sign In') or contains(@label,'Sign In')]`,
  ],

  // Optional: another home marker that sometimes shows even if hamburger is delayed
  // Use accessibility ID with fallbacks for reliability
  homeMarkerCandidates: [
    '~sharedHeader.rightButton.button',
    'id=sharedHeader.rightButton.button',
    // iOS-specific fallbacks
    '-ios predicate string:name == "sharedHeader.rightButton.button"',
    '//XCUIElementTypeButton[@name="sharedHeader.rightButton.button"]',
  ],
}

/**
 * Helper: find first displayed element from candidate selectors
 */
async function findFirstDisplayed(selectors, timeout = 20000, pollMs = 300) {
  const start = Date.now()

  while (Date.now() - start < timeout) {
    for (const sel of selectors) {
      const el = await $(sel)
      const displayed = await el.isDisplayed().catch(() => false)
      if (displayed) return el
    }
    await browser.pause(pollMs)
  }

  throw new Error(
    `None of these selectors became visible within ${timeout}ms:\n${selectors.join('\n')}`,
  )
}

/**
 * Helper: find first tappable element from candidate selectors
 * Checks isDisplayed and isEnabled only
 */
async function findFirstTappable(selectors, timeout = 20000, pollMs = 300) {
  const start = Date.now()

  while (Date.now() - start < timeout) {
    for (const sel of selectors) {
      try {
        const el = await $(sel)
        const displayed = await el.isDisplayed().catch(() => false)
        if (!displayed) continue

        const enabled = await el.isEnabled().catch(() => false)
        if (!enabled) continue

        return el
      } catch {
        // Element not found or error, continue to next candidate
        continue
      }
    }
    await browser.pause(pollMs)
  }

  // Debugging on timeout
  try {
    const context = await driver.getCurrentContext()
    console.log('findFirstTappable timeout - Current context:', context)

    // Ensure .artifacts directory exists
    if (!fs.existsSync('./.artifacts')) {
      fs.mkdirSync('./.artifacts', { recursive: true })
    }

    await browser.saveScreenshot('./.artifacts/ios_splash_timeout.png')
    const pageSource = await driver.getPageSource()
    fs.writeFileSync('./.artifacts/ios_splash_timeout.xml', pageSource)
    console.log('Debug artifacts saved to ./.artifacts/')
  } catch (debugError) {
    console.log('Failed to save debug artifacts:', debugError.message)
  }

  throw new Error(
    `None of these selectors became tappable within ${timeout}ms:\n${selectors.join('\n')}`,
  )
}

/**
 * Helper: tap an element with fallback to coordinate tap
 * Tries click() first, falls back to coordinate tap using getRect() + performActions
 */
async function tapElement(el) {
  // Try normal click first
  try {
    await el.click()
    return
  } catch (e) {
    // Fallback: tap center by coordinates
    const rect = await el.getRect()
    const x = Math.round(rect.x + rect.width / 2)
    const y = Math.round(rect.y + rect.height / 2)

    await driver.performActions([
      {
        type: 'pointer',
        id: 'finger1',
        parameters: { pointerType: 'touch' },
        actions: [
          { type: 'pointerMove', duration: 0, x, y },
          { type: 'pointerDown', button: 0 },
          { type: 'pointerUp', button: 0 },
        ],
      },
    ])
    await driver.releaseActions()
  }
}

/**
 * Helper: click first visible button from a list of button text candidates
 * Used for native iOS alerts/sheets (e.g., Auth0 trust dialog)
 */
async function clickFirstVisible(buttonTexts, timeout = 10000) {
  const start = Date.now()

  while (Date.now() - start < timeout) {
    for (const text of buttonTexts) {
      // Try predicate string first
      const predicateSelector = `-ios predicate string:type == "XCUIElementTypeButton" AND (name == "${text}" OR label == "${text}")`
      try {
        const el = await $(predicateSelector)
        if (await el.isDisplayed().catch(() => false)) {
          await el.click()
          return
        }
      } catch {
        // Continue to next candidate
      }

      // Try XPath as fallback
      try {
        const xpathSelector = `//XCUIElementTypeButton[@name="${text}" or @label="${text}"]`
        const el = await $(xpathSelector)
        if (await el.isDisplayed().catch(() => false)) {
          await el.click()
          return
        }
      } catch {
        // Continue to next candidate
      }
    }
    await browser.pause(300)
  }

  throw new Error(
    `None of these buttons became visible within ${timeout}ms:\n${buttonTexts.join(', ')}`,
  )
}

async function ensureAppForegroundOnce() {
  await driver.switchContext('NATIVE_APP')

  // iOS doesn't have getCurrentPackage, use activateApp to ensure app is in foreground
  // For iOS, we can check if app is active by trying to find app elements
  try {
    // Try to activate the app (safe to call even if already active)
    await driver.activateApp(APP_BUNDLE_ID)
    await browser.pause(800)
  } catch (error) {
    // If activation fails, app might already be active or not installed
    console.log('App activation note:', error.message)
  }
}

async function ensureLoggedIn() {
  await driver.switchContext('NATIVE_APP')
  await browser.pause(500)

  // 🔑 Phase 0: bring app to foreground ONCE (no terminate loops)
  await ensureAppForegroundOnce()

  // Phase 1: wait until we see either Login or Home (hamburger/marker)
  await browser.waitUntil(
    async () => {
      // Try to activate app if needed (iOS doesn't have package detection like Android)
      try {
        await driver.activateApp(APP_BUNDLE_ID)
        await browser.pause(600)
      } catch {
        // App might already be active
      }

      // Try to find hamburger using candidates
      let hamburgerVisible = false
      for (const sel of SELECTORS.hamburgerCandidates) {
        const el = await $(sel)
        if (await el.isDisplayed().catch(() => false)) {
          hamburgerVisible = true
          break
        }
      }

      // Try to find home marker using candidates
      let homeMarkerVisible = false
      for (const sel of SELECTORS.homeMarkerCandidates) {
        const el = await $(sel)
        if (await el.isDisplayed().catch(() => false)) {
          homeMarkerVisible = true
          break
        }
      }

      const onHome = hamburgerVisible || homeMarkerVisible

      // Check for login button using candidates
      let onLogin = false
      for (const sel of SELECTORS.loginBtnCandidates) {
        const el = await $(sel)
        if (await el.isDisplayed().catch(() => false)) {
          onLogin = true
          break
        }
      }

      return onHome || onLogin
    },
    {
      timeout: 60000,
      interval: 500,
      timeoutMsg:
        'Neither login screen nor home markers became visible (hamburger/homeMarker/loginBtn)',
    },
  )

  // If already on Home, we're done
  let alreadyHome = false
  for (const sel of SELECTORS.hamburgerCandidates) {
    const el = await $(sel)
    if (await el.isDisplayed().catch(() => false)) {
      alreadyHome = true
      break
    }
  }
  if (!alreadyHome) {
    for (const sel of SELECTORS.homeMarkerCandidates) {
      const el = await $(sel)
      if (await el.isDisplayed().catch(() => false)) {
        alreadyHome = true
        break
      }
    }
  }

  if (alreadyHome) {
    // Wait for hamburger to be fully ready
    await findFirstDisplayed(SELECTORS.hamburgerCandidates, 20000).catch(() => {})
    return
  }

  // Phase 2: Login path - tap splash LOG IN button
  const loginBtn = await findFirstTappable(SELECTORS.loginBtnCandidates, 60000)
  await tapElement(loginBtn)

  // Phase 3: Handle Auth0 trust dialog (native alert/sheet)
  // This appears when Auth0 opens in SFSafariViewController
  try {
    await clickFirstVisible(['Continue', 'Allow', 'OK'], 10000)
    await browser.pause(1000) // Brief pause after dismissing dialog
  } catch (error) {
    // Trust dialog might not appear, continue anyway
    console.log('Auth0 trust dialog not found or already dismissed:', error.message)
  }

  // Phase 3.5: Check for saved account screen ("Last time you logged in with <email>")
  const emailToUse = process.env.TEST_EMAIL || 'j.k90@hotmail.com'
  const savedAccountCandidates = [
    `-ios predicate string:type == "XCUIElementTypeOther" AND (name CONTAINS "${emailToUse}" OR label CONTAINS "${emailToUse}")`,
    `-ios predicate string:type == "XCUIElementTypeStaticText" AND (name CONTAINS "${emailToUse}" OR label CONTAINS "${emailToUse}")`,
    `//*[contains(@name,"${emailToUse}") or contains(@label,"${emailToUse}")]`,
  ]

  let savedAccountFound = false
  try {
    const savedAccount = await findFirstDisplayed(savedAccountCandidates, 8000).catch(() => null)
    if (savedAccount) {
      await tapElement(savedAccount)
      savedAccountFound = true
      console.log('Saved account found and tapped, skipping email/password entry')
    }
  } catch {
    // Saved account not found, continue with email/password flow
  }

  // If saved account was tapped, skip to Phase 5 (wait for Safari view to close)
  if (savedAccountFound) {
    // Phase 5: Wait until Auth0 Safari view closes
    // Do NOT call activateApp immediately - wait ~10 seconds first, then retry every ~5 seconds
    await browser.pause(10000) // Wait 10 seconds before first activate attempt

    // Check for hamburger or home marker visible (indicates we're back in the app)
    let lastActivateAttempt = Date.now()
    const ACTIVATE_RETRY_INTERVAL = 5000 // 5 seconds

    await browser.waitUntil(
      async () => {
        // Only retry activate every ~5 seconds
        const now = Date.now()
        if (now - lastActivateAttempt >= ACTIVATE_RETRY_INTERVAL) {
          try {
            await driver.activateApp(APP_BUNDLE_ID)
            await browser.pause(600)
            lastActivateAttempt = now
          } catch {
            // App might already be active
          }
        }

        // Try to find hamburger using candidates
        let hamburgerVisible = false
        for (const sel of SELECTORS.hamburgerCandidates) {
          const el = await $(sel)
          if (await el.isDisplayed().catch(() => false)) {
            hamburgerVisible = true
            break
          }
        }

        // Try to find home marker using candidates
        let homeMarkerVisible = false
        for (const sel of SELECTORS.homeMarkerCandidates) {
          const el = await $(sel)
          if (await el.isDisplayed().catch(() => false)) {
            homeMarkerVisible = true
            break
          }
        }

        const onHome = hamburgerVisible || homeMarkerVisible

        return onHome
      },
      {
        timeout: 90000, // 90s timeout as specified
        interval: 500,
        timeoutMsg: 'Auth0 Safari view did not close - home markers not visible after login',
      },
    )

    // Wait for hamburger to be fully ready using candidate selectors
    await findFirstDisplayed(SELECTORS.hamburgerCandidates, 30000)
    return
  }

  // Phase 4: Auth0 login in NATIVE_APP (SFSafariViewController)
  const passToUse = process.env.TEST_PASSWORD || 'Zipscreen'

  // Wait until Auth0 is present (native button exists)
  const auth0LoginBtnMarker = await $(
    '-ios predicate string:type == "XCUIElementTypeButton" AND name == "Log In"'
  )
  await auth0LoginBtnMarker.waitForExist({ timeout: 30000 })

  // BrowserStack-only branch: use loginIOSBrowserStack if BROWSERSTACK or BROWSERSTACK_USER is set
  if (process.env.BROWSERSTACK || process.env.BROWSERSTACK_USER) {
    // Wait for Auth0 webview to load (textfield appears)
    await $('-ios predicate string:type == "XCUIElementTypeTextField" AND visible == 1')
      .waitForDisplayed({ timeout: 30000 })
    
    const creds = { email: emailToUse, pass: passToUse }
    await loginIOSBrowserStack(creds.email, creds.pass)
    
    // Handle iOS system alerts immediately after Auth0 login
    await handlePostLoginPermissionsIOS()
    
    // Skip the rest of Phase 4 local login logic and go to Phase 5
    // Phase 5: Wait until Auth0 Safari view closes
    // Do NOT call activateApp immediately - wait ~10 seconds first, then retry every ~5 seconds
    await browser.pause(10000) // Wait 10 seconds before first activate attempt

    // Check for hamburger or home marker visible (indicates we're back in the app)
    let lastActivateAttempt = Date.now()
    const ACTIVATE_RETRY_INTERVAL = 5000 // 5 seconds

    await browser.waitUntil(
      async () => {
        // Only retry activate every ~5 seconds
        const now = Date.now()
        if (now - lastActivateAttempt >= ACTIVATE_RETRY_INTERVAL) {
          try {
            await driver.activateApp(APP_BUNDLE_ID)
            await browser.pause(600)
            lastActivateAttempt = now
          } catch {
            // App might already be active
          }
        }

        // Try to find hamburger using candidates
        let hamburgerVisible = false
        for (const sel of SELECTORS.hamburgerCandidates) {
          const el = await $(sel)
          if (await el.isDisplayed().catch(() => false)) {
            hamburgerVisible = true
            break
          }
        }

        // Try to find home marker using candidates
        let homeMarkerVisible = false
        for (const sel of SELECTORS.homeMarkerCandidates) {
          const el = await $(sel)
          if (await el.isDisplayed().catch(() => false)) {
            homeMarkerVisible = true
            break
          }
        }

        const onHome = hamburgerVisible || homeMarkerVisible

        return onHome
      },
      {
        timeout: 90000, // 90s timeout as specified
        interval: 500,
        timeoutMsg: 'Auth0 Safari view did not close - home markers not visible after login',
      },
    )

    // Wait for hamburger to be fully ready using candidate selectors
    await findFirstDisplayed(SELECTORS.hamburgerCandidates, 30000)
    return
  }

  // Email field: first visible textfield
  const emailFieldCandidates = [
    '-ios predicate string:type == "XCUIElementTypeTextField" AND visible == 1',
    '//XCUIElementTypeTextField',
  ]
  const emailField = await findFirstTappable(emailFieldCandidates, 30000)
  try {
    await emailField.clearValue()
  } catch {
    // clearValue may fail, continue anyway
  }
  await emailField.setValue(emailToUse)

  // Password field: first visible secure textfield
  const passwordFieldCandidates = [
    '-ios predicate string:type == "XCUIElementTypeSecureTextField" AND visible == 1',
    '//XCUIElementTypeSecureTextField',
  ]
  const passwordField = await findFirstTappable(passwordFieldCandidates, 30000)
  try {
    await passwordField.clearValue()
  } catch {
    // clearValue may fail, continue anyway
  }
  await passwordField.setValue(passToUse)

  // Ensure keyboard is dismissed before tapping Auth0 "Log In" button (best effort, never throws)
  try {
    // Try 1: tap "Done" button if present
    try {
      const doneButton = await $('-ios predicate string:type == "XCUIElementTypeButton" AND name == "Done"')
      if (await doneButton.isDisplayed().catch(() => false)) {
        await doneButton.click()
        await browser.pause(500)
      }
    } catch {
      // Done button not present, try next method
    }

    // Try 2: driver.hideKeyboard() if keyboard still visible
    try {
      await driver.hideKeyboard()
      await browser.pause(500)
    } catch {
      // hideKeyboard failed, try next method
    }

    // Try 3: tap a safe non-input element (e.g. "Don't remember your password?" static text) if present
    try {
      const safeElementCandidates = [
        '-ios predicate string:type == "XCUIElementTypeStaticText" AND (name CONTAINS[c] "remember" OR name CONTAINS[c] "password")',
        '//XCUIElementTypeStaticText[contains(translate(@name, "ABCDEFGHIJKLMNOPQRSTUVWXYZ", "abcdefghijklmnopqrstuvwxyz"), "remember") or contains(translate(@name, "ABCDEFGHIJKLMNOPQRSTUVWXYZ", "abcdefghijklmnopqrstuvwxyz"), "password")]',
      ]
      const safeElement = await findFirstDisplayed(safeElementCandidates, 3000).catch(() => null)
      if (safeElement) {
        await safeElement.click()
        await browser.pause(500)
      }
    } catch {
      // Safe element not found, continue anyway
    }
  } catch {
    // Keyboard dismissal failed entirely, continue anyway (best effort)
  }

  // Auth0 "Log In" button - use findFirstTappable with fallback coordinate tap
  const loginButtonCandidates = [
    '-ios predicate string:type == "XCUIElementTypeButton" AND name == "Log In"',
    '-ios predicate string:type == "XCUIElementTypeButton" AND (name == "Log In" OR label == "Log In")',
    '//XCUIElementTypeButton[@name="Log In"]',
  ]

  const auth0LoginBtn = await findFirstTappable(loginButtonCandidates, 30000)

  // Try normal click
  try {
    await auth0LoginBtn.click()
  } catch (e) {
    // Fallback: tap center by coordinates
    const rect = await auth0LoginBtn.getRect()
    const x = Math.round(rect.x + rect.width / 2)
    const y = Math.round(rect.y + rect.height / 2)

    await driver.performActions([
      {
        type: 'pointer',
        id: 'finger1',
        parameters: { pointerType: 'touch' },
        actions: [
          { type: 'pointerMove', duration: 0, x, y },
          { type: 'pointerDown', button: 0 },
          { type: 'pointerUp', button: 0 },
        ],
      },
    ])
    await driver.releaseActions()
  }

  // Phase 5: Wait until Auth0 Safari view closes
  // Do NOT call activateApp immediately - wait ~10 seconds first, then retry every ~5 seconds
  await browser.pause(10000) // Wait 10 seconds before first activate attempt

  // Check for hamburger or home marker visible (indicates we're back in the app)
  let lastActivateAttempt = Date.now()
  const ACTIVATE_RETRY_INTERVAL = 5000 // 5 seconds

  await browser.waitUntil(
    async () => {
      // Only retry activate every ~5 seconds
      const now = Date.now()
      if (now - lastActivateAttempt >= ACTIVATE_RETRY_INTERVAL) {
        try {
          await driver.activateApp(APP_BUNDLE_ID)
          await browser.pause(600)
          lastActivateAttempt = now
        } catch {
          // App might already be active
        }
      }

      // Try to find hamburger using candidates
      let hamburgerVisible = false
      for (const sel of SELECTORS.hamburgerCandidates) {
        const el = await $(sel)
        if (await el.isDisplayed().catch(() => false)) {
          hamburgerVisible = true
          break
        }
      }

      // Try to find home marker using candidates
      let homeMarkerVisible = false
      for (const sel of SELECTORS.homeMarkerCandidates) {
        const el = await $(sel)
        if (await el.isDisplayed().catch(() => false)) {
          homeMarkerVisible = true
          break
        }
      }

      const onHome = hamburgerVisible || homeMarkerVisible

      return onHome
    },
    {
      timeout: 90000, // 90s timeout as specified
      interval: 500,
      timeoutMsg: 'Auth0 Safari view did not close - home markers not visible after login',
    },
  )

  // Wait for hamburger to be fully ready using candidate selectors
  await findFirstDisplayed(SELECTORS.hamburgerCandidates, 30000)
}

module.exports = { ensureLoggedIn }
