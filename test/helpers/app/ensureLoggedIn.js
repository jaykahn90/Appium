// test/helpers/app/ensureLoggedIn.js

const APP_PKG = 'com.rolleaseacmeda.automatepulse'
const CHROME_PKG = 'com.android.chrome'

const SELECTORS = {
  hamburger:
    'android=new UiSelector().description("sharedHeader.menuButton.button")',

  // More flexible login marker
  loginBtn:
    'android=new UiSelector().textMatches("(?i)log\\s?in|sign\\s?in")',

  // Optional: another home marker that sometimes shows even if hamburger is delayed
  homeMarker:
    'android=new UiSelector().description("sharedHeader.rightButton.button")',
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

  const hamburger = await $(SELECTORS.hamburger)
  const loginBtn = await $(SELECTORS.loginBtn)
  const homeMarker = await $(SELECTORS.homeMarker)

  // Phase 1: wait until we see either Login or Home (hamburger/marker)
  await browser.waitUntil(
    async () => {
      // small nudge only if we’re clearly not in app
      const pkg = await driver.getCurrentPackage().catch(() => null)
      if (pkg && pkg !== APP_PKG && pkg !== CHROME_PKG) {
        await driver.activateApp(APP_PKG)
        await browser.pause(600)
      }

      const onHome =
        (await hamburger.isDisplayed().catch(() => false)) ||
        (await homeMarker.isDisplayed().catch(() => false))

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

  // If already on Home, we’re done
  const alreadyHome =
    (await hamburger.isDisplayed().catch(() => false)) ||
    (await homeMarker.isDisplayed().catch(() => false))

  if (alreadyHome) {
    await hamburger.waitForDisplayed({ timeout: 20000 }).catch(() => {})
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

  // Wait for page to be ready
  await browser.waitUntil(async () => (await browser.getTitle()).length > 0, {
    timeout: 20000,
    interval: 500,
    timeoutMsg: 'Auth0 page title not ready',
  })

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
    // Normal email/password login
    const emailInput = await $('[id="1-email"]')
    await emailInput.waitForDisplayed({ timeout: 30000 })
    await emailInput.setValue(emailToUse)

    const passwordInput = await $('input[name="password"]')
    await passwordInput.waitForDisplayed({ timeout: 30000 })
    await passwordInput.setValue(passToUse)

    const submit = (await $$('button[type="submit"]'))[0] || (await $('.auth0-label-submit'))
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

      const onHome =
        (await $(SELECTORS.hamburger).isDisplayed().catch(() => false)) ||
        (await $(SELECTORS.homeMarker).isDisplayed().catch(() => false))

      return onHome
    },
    {
      timeout: 60000,
      interval: 500,
      timeoutMsg: 'Home did not appear after login (hamburger/homeMarker)',
    },
  )

  const finalHamburger = await $(SELECTORS.hamburger)
  await finalHamburger.waitForDisplayed({ timeout: 30000 })
}

module.exports = { ensureLoggedIn }
