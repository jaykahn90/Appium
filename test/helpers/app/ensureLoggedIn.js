// test/helpers/app/ensureLoggedIn.js

const APP_PKG = 'com.rolleaseacmeda.automatepulse'
const CHROME_PKG = 'com.android.chrome'

const SELECTORS = {
  // Hamburger menu button - use accessibility ID for cross-platform uniformity
  // Fallbacks for backwards compatibility during transition
  hamburgerCandidates: [
    '~sharedHeader.menuButton.button',
    'id=sharedHeader.menuButton.button',
    'android=new UiSelector().resourceId("sharedHeader.menuButton.button")',
    'android=new UiSelector().description("sharedHeader.menuButton.button")',
  ],

  // More flexible login marker
  // Note: Login button may not have accessibility ID, using text match as fallback
  loginBtn:
    'android=new UiSelector().textMatches("(?i)log\\s?in|sign\\s?in")',

  // Optional: another home marker that sometimes shows even if hamburger is delayed
  // Use accessibility ID with fallbacks for reliability
  homeMarkerCandidates: [
    '~sharedHeader.rightButton.button',
    'id=sharedHeader.rightButton.button',
    'android=new UiSelector().resourceId("sharedHeader.rightButton.button")',
    'android=new UiSelector().description("sharedHeader.rightButton.button")',
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

async function ensureAppForegroundOnce() {
  await driver.switchContext('NATIVE_APP')

  const current = await driver.getCurrentPackage().catch(() => null)

  // If Chrome is in front, bring AUT forward
  if (current === CHROME_PKG) {
    await driver.activateApp(APP_PKG)
    await browser.pause(800)
    return
  }

  // If anything else is in front (launcher, settings, etc), bring AUT forward
  if (current && current !== APP_PKG) {
    await driver.activateApp(APP_PKG)
    await browser.pause(800)
  }
}

async function ensureLoggedIn() {
  await driver.switchContext('NATIVE_APP')
  await browser.pause(500)

  // 🔑 Phase 0: bring app to foreground ONCE (no terminate loops)
  await ensureAppForegroundOnce()

  const loginBtn = await $(SELECTORS.loginBtn)

  // Phase 1: wait until we see either Login or Home (hamburger/marker)
  await browser.waitUntil(
    async () => {
      // small nudge only if we're clearly not in app
      const pkg = await driver.getCurrentPackage().catch(() => null)
      if (pkg && pkg !== APP_PKG && pkg !== CHROME_PKG) {
        await driver.activateApp(APP_PKG)
        await browser.pause(600)
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

      const onLogin = await loginBtn.isDisplayed().catch(() => false)

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

  // Phase 2: Login path (Strategy B expects this usually)
  await loginBtn.waitForDisplayed({ timeout: 30000 })
  await loginBtn.click()

  // Now Chrome Custom Tab / Auth0 should appear
  await browser.waitUntil(
    async () => (await driver.getCurrentPackage().catch(() => null)) === CHROME_PKG,
    {
      timeout: 30000,
      interval: 500,
      timeoutMsg: 'Chrome did not come to foreground after tapping login',
    },
  )

  // Handle Chrome first-run prompts (safe)
  try {
    const accept = await $('id=com.android.chrome:id/terms_accept')
    if (await accept.isDisplayed().catch(() => false)) await accept.click()
  } catch {}

  try {
    const noThanks = await $('id=com.android.chrome:id/negative_button')
    if (await noThanks.isDisplayed().catch(() => false)) await noThanks.click()
  } catch {}

  // Switch into WEBVIEW context (Auth0 page)
  const webviewCtx = await browser.waitUntil(
    async () => {
      const ctxs = await driver.getContexts().catch(() => [])
      return ctxs.find((c) => c.startsWith('WEBVIEW')) || false
    },
    {
      timeout: 20000,
      interval: 500,
      timeoutMsg: 'No WEBVIEW context found for Auth0 login page',
    },
  )
  await driver.switchContext(webviewCtx)

  // Wait for page to be ready - check multiple conditions for better reliability
  await browser.waitUntil(
    async () => {
      try {
        const title = await browser.getTitle().catch(() => '')
        // Also check if document is ready and has content
        const readyState = await browser.execute(() => document.readyState).catch(() => '')
        return title.length > 0 && (readyState === 'complete' || readyState === 'interactive')
      } catch {
        return false
      }
    },
    {
      timeout: 30000,
      interval: 500,
      timeoutMsg: 'Auth0 page not ready (title or document state)',
    },
  )

  // Give additional time for Auth0 page to fully render and load all elements
  await browser.pause(2000)

  const emailToUse = process.env.TEST_EMAIL || 'j.k90@hotmail.com'
  const passToUse = process.env.TEST_PASSWORD || 'Zipscreen'

  // Saved account tile path (if present)
  const emailTileText = await $(
    `//div[contains(@class,"auth0-lock-social-button-text") and normalize-space(.)="${emailToUse}"]`,
  )

  const tileExists = await emailTileText.isExisting().catch(() => false)

  if (tileExists) {
    const tileBtn = await $(
      `//div[contains(@class,"auth0-lock-social-button-text") and normalize-space(.)="${emailToUse}"]` +
        `/ancestor::*[self::button or self::a or @role="button"][1]`,
    )
    await tileBtn.click()
  } else {
    // Normal email/password login - use multiple candidate selectors for email field
    // Auth0 may use different IDs or the element may take time to appear
    const emailInputCandidates = [
      '[id="1-email"]',
      '#1-email',
      'input[id="1-email"]',
      'input[type="email"]',
      'input[name="email"]',
      'input[placeholder*="email" i]',
      'input[placeholder*="Email" i]',
      '.auth0-lock-input-email input',
      'input.auth0-lock-input',
      'input[autocomplete="email"]',
    ]

    let emailInput = null
    for (const selector of emailInputCandidates) {
      try {
        const el = await $(selector)
        if (await el.isDisplayed().catch(() => false)) {
          emailInput = el
          break
        }
      } catch {
        continue
      }
    }

    // If still not found, wait with polling for any of the candidates to appear
    if (!emailInput) {
      const start = Date.now()
      const timeout = 30000
      while (Date.now() - start < timeout && !emailInput) {
        for (const selector of emailInputCandidates) {
          try {
            const el = await $(selector)
            if (await el.isDisplayed().catch(() => false)) {
              emailInput = el
              break
            }
          } catch {
            continue
          }
        }
        if (!emailInput) {
          await browser.pause(500)
        }
      }
    }

    if (!emailInput) {
      throw new Error(
        `Email input field not found within ${30000}ms. Tried selectors:\n${emailInputCandidates.join('\n')}`,
      )
    }

    // Wait for email input to be ready for interaction
    await emailInput.waitForDisplayed({ timeout: 10000 })
    await emailInput.waitForClickable({ timeout: 10000 })
    await emailInput.setValue(emailToUse)

    // Password field with fallbacks
    const passwordInputCandidates = [
      'input[name="password"]',
      'input[type="password"]',
      'input[placeholder*="password" i]',
      'input[placeholder*="Password" i]',
      '.auth0-lock-input-password input',
      'input[autocomplete="current-password"]',
    ]

    let passwordInput = null
    for (const selector of passwordInputCandidates) {
      try {
        const el = await $(selector)
        if (await el.isDisplayed().catch(() => false)) {
          passwordInput = el
          break
        }
      } catch {
        continue
      }
    }

    if (!passwordInput) {
      const start = Date.now()
      const timeout = 30000
      while (Date.now() - start < timeout && !passwordInput) {
        for (const selector of passwordInputCandidates) {
          try {
            const el = await $(selector)
            if (await el.isDisplayed().catch(() => false)) {
              passwordInput = el
              break
            }
          } catch {
            continue
          }
        }
        if (!passwordInput) {
          await browser.pause(500)
        }
      }
    }

    if (!passwordInput) {
      throw new Error(
        `Password input field not found within ${30000}ms. Tried selectors:\n${passwordInputCandidates.join('\n')}`,
      )
    }

    await passwordInput.waitForDisplayed({ timeout: 10000 })
    await passwordInput.waitForClickable({ timeout: 10000 })
    await passwordInput.setValue(passToUse)

    // Submit button with fallbacks
    const submitCandidates = [
      'button[type="submit"]',
      'button.auth0-label-submit',
      '.auth0-label-submit',
      'button:contains("Log in")',
      'button:contains("Continue")',
      'button:contains("Sign in")',
      '[type="submit"]',
    ]

    // Submit button - try primary selector first, then fallbacks
    let submit = null
    try {
      const submitButtons = await $$('button[type="submit"]')
      submit = submitButtons[0] || (await $('.auth0-label-submit'))
    } catch {
      // Try other candidates
      for (const selector of submitCandidates) {
        try {
          const el = await $(selector)
          if (await el.isDisplayed().catch(() => false)) {
            submit = el
            break
          }
        } catch {
          continue
        }
      }
    }

    if (!submit) {
      throw new Error(
        `Submit button not found. Tried selectors:\n${submitCandidates.join('\n')}`,
      )
    }

    await submit.waitForClickable({ timeout: 30000 })
    await submit.click()
  }

  // Phase 3: wait for app to return to NATIVE
  await browser.waitUntil(
    async () => {
      const ctxs = await driver.getContexts().catch(() => [])
      return ctxs.length === 1 && ctxs[0] === 'NATIVE_APP'
    },
    {
      timeout: 60000,
      interval: 500,
      timeoutMsg: 'Did not return to NATIVE_APP after login',
    },
  )

  await driver.switchContext('NATIVE_APP')

  // Final: wait for Home markers (hamburger)
  await browser.waitUntil(
    async () => {
      const pkg = await driver.getCurrentPackage().catch(() => null)
      if (pkg && pkg !== APP_PKG) {
        await driver.activateApp(APP_PKG)
        await browser.pause(600)
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
      timeout: 60000,
      interval: 500,
      timeoutMsg: 'Home did not appear after login (hamburger/homeMarker)',
    },
  )

  // Wait for hamburger to be fully ready using candidate selectors
  await findFirstDisplayed(SELECTORS.hamburgerCandidates, 30000)
}

module.exports = { ensureLoggedIn }
