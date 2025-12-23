// test/helpers/app/ensureLoggedIn.js

async function ensureLoggedIn() {
    await driver.switchContext('NATIVE_APP')
    await browser.pause(1000)
  
    // ✅ Reliable "I'm logged in" marker (menu button)
    const hamburgerSelector =
      'android=new UiSelector().description("sharedHeader.menuButton.button")'
    const hamburgerButton = await $(hamburgerSelector)
  
    // ✅ Reliable "I'm NOT logged in" marker (Splash)
    const loginBtn = await $('android=new UiSelector().text("LOG IN")')
  
    // Wait until either Login screen OR Main screen shows up
    await browser.waitUntil(
      async () => {
        const onMain = await hamburgerButton.isDisplayed().catch(() => false)
        const onLogin = await loginBtn.isDisplayed().catch(() => false)
        return onMain || onLogin
      },
      {
        timeout: 15000,
        interval: 300,
        timeoutMsg: 'Neither LOG IN nor hamburger menu became visible',
      },
    )
  
    // If already on main screen, we are done
    if (await hamburgerButton.isDisplayed().catch(() => false)) {
      return
    }
  
    // If LOG IN is visible, perform Auth0 login flow
    if (await loginBtn.isDisplayed().catch(() => false)) {
      await loginBtn.click()
  
      // ✅ FAST EXIT: sometimes session is reused and we land in app immediately
      const landedQuickly = await browser
        .waitUntil(
          async () => (await $(hamburgerSelector).isDisplayed().catch(() => false)),
          { timeout: 5000, interval: 250 },
        )
        .then(() => true)
        .catch(() => false)
  
      if (landedQuickly) {
        return
      }
  
      // WAIT FOR CHROME (still native)
      await driver.switchContext('NATIVE_APP')
      await browser.waitUntil(
        async () => (await driver.getCurrentPackage()) === 'com.android.chrome',
        {
          timeout: 20000,
          interval: 300,
          timeoutMsg: 'Chrome did not launch after pressing LOG IN',
        },
      )
  
      // Dismiss Chrome first-run screens (native)
      try {
        const accept = await $('id=com.android.chrome:id/terms_accept')
        if (await accept.isDisplayed()) await accept.click()
      } catch {}
  
      try {
        const noThanks =
          (await $('id=com.android.chrome:id/negative_button')) ||
          (await $(`android=new UiSelector().textMatches("(?i)no\\s*thanks")`))
        if (await noThanks.isDisplayed()) await noThanks.click()
      } catch {}
  
      // Wait for a WEBVIEW to appear and switch
      const webviewCtx = await browser.waitUntil(
        async () => {
          const ctxs = await driver.getContexts()
          return ctxs.find((c) => c.startsWith('WEBVIEW')) || false
        },
        {
          timeout: 8000,
          interval: 300,
          timeoutMsg: 'No WEBVIEW context after dismissing Chrome welcome',
        },
      )
      await driver.switchContext(webviewCtx)
  
      // Page title sanity check
      await browser.waitUntil(async () => (await browser.getTitle()).length > 0, {
        timeout: 8000,
        interval: 200,
      })
  
      // --- QUICK LOGIN TILE or FULL FORM ---
      const emailToUse = process.env.TEST_EMAIL || 'j.k90@hotmail.com'
  
      const emailTextDiv = await $(
        `//div[contains(@class,"auth0-lock-social-button-text") and normalize-space(.)="${emailToUse}"]`,
      )
      const tileExists = await emailTextDiv
        .waitForExist({ timeout: 3000 })
        .catch(() => false)
  
      if (tileExists) {
        // ✅ IMPORTANT: NO element-chaining (avoids stale/invalid element id)
        const savedAccountBtn = await $(
          `//div[contains(@class,"auth0-lock-social-button-text") and normalize-space(.)="${emailToUse}"]` +
            `/ancestor::*[self::button or self::a or @role="button"][1]`,
        )
  
        const canClickBtn = await savedAccountBtn.isExisting().catch(() => false)
        if (canClickBtn) {
          await savedAccountBtn.click().catch(async () => {
            // Retry once with a fresh query
            const retryBtn = await $(
              `//div[contains(@class,"auth0-lock-social-button-text") and normalize-space(.)="${emailToUse}"]` +
                `/ancestor::*[self::button or self::a or @role="button"][1]`,
            )
            await retryBtn.click()
          })
        } else {
          // Fallback: click the div itself
          await emailTextDiv.click().catch(async () => {
            const retryDiv = await $(
              `//div[contains(@class,"auth0-lock-social-button-text") and normalize-space(.)="${emailToUse}"]`,
            )
            await retryDiv.click()
          })
        }
      } else {
        const emailInput = await $('[id="1-email"]')
        await emailInput.waitForDisplayed({ timeout: 10000 })
        await emailInput.setValue(emailToUse)
  
        const passwordInput = await $('input[name="password"]')
        await passwordInput.setValue(process.env.TEST_PASSWORD || 'Zipscreen')
  
        const submitCandidates = await $$('button[type="submit"]')
        const submitBtn = submitCandidates[0] || (await $('.auth0-label-submit'))
        await submitBtn.waitForClickable({ timeout: 10000 })
  
        await submitBtn.click().catch(async () => {
          const refreshedCandidates = await $$('button[type="submit"]')
          const refreshedSubmit =
            refreshedCandidates[0] || (await $('.auth0-label-submit'))
          await refreshedSubmit.waitForClickable({ timeout: 8000 })
          await refreshedSubmit.click()
        })
      }
  
      // ✅ Immediately wait to return to native (Auth0 can close fast)
      await browser.waitUntil(
        async () => {
          const ctxs = await driver.getContexts().catch(() => [])
          return ctxs.length === 1 && ctxs[0] === 'NATIVE_APP'
        },
        { timeout: 20000, interval: 500, timeoutMsg: 'No return to native after login' },
      )
      await driver.switchContext('NATIVE_APP')
    }
  
    // Final assert: hamburger must be visible (we are on main screen)
    const finalHamburger = await $(hamburgerSelector)
    await finalHamburger.waitForDisplayed({ timeout: 20000 })
    await expect(finalHamburger).toBeDisplayed()
  }
  
  module.exports = { ensureLoggedIn }
  