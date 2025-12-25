// test/helpers/app/ensureLoggedIn.js

async function ensureLoggedIn() {
  await driver.switchContext('NATIVE_APP')
  await browser.pause(1000)

  const hamburgerSelector =
    'android=new UiSelector().description("sharedHeader.menuButton.button")'
  const hamburgerButton = await $(hamburgerSelector)

  // more flexible login marker
  const loginBtn = await $(
    'android=new UiSelector().textMatches("(?i)log\\s?in|sign\\s?in")'
  )

  await browser.waitUntil(
    async () => {
      const onMain = await hamburgerButton.isDisplayed().catch(() => false)
      const onLogin = await loginBtn.isDisplayed().catch(() => false)
      return onMain || onLogin
    },
    {
      timeout: 20000,
      interval: 300,
      timeoutMsg: 'Neither login screen nor hamburger menu became visible',
    }
  )

  if (await hamburgerButton.isDisplayed().catch(() => false)) {
    // wait for app to settle before returning
    let stableCount = 0
    await browser.waitUntil(
      async () => {
        const visible = await hamburgerButton.isDisplayed().catch(() => false)
        if (visible) stableCount++
        else stableCount = 0
        return stableCount >= 3
      },
      {
        timeout: 30000,
        interval: 500,
        timeoutMsg: 'Hamburger did not become stable after login',
      }
    )
    return
  }

  if (await loginBtn.isDisplayed().catch(() => false)) {
    await loginBtn.click()

    const landedQuickly = await browser
      .waitUntil(
        async () => (await $(hamburgerSelector).isDisplayed().catch(() => false)),
        { timeout: 8000, interval: 250 }
      )
      .then(() => true)
      .catch(() => false)

    if (landedQuickly) {
      // wait for settle
      const hb = await $(hamburgerSelector)
      let stableCount = 0
      await browser.waitUntil(
        async () => {
          const visible = await hb.isDisplayed().catch(() => false)
          if (visible) stableCount++
          else stableCount = 0
          return stableCount >= 3
        },
        {
          timeout: 30000,
          interval: 500,
          timeoutMsg: 'Hamburger did not become stable after quick login',
        }
      )
      return
    }

    await driver.switchContext('NATIVE_APP')
    await browser.waitUntil(
      async () => (await driver.getCurrentPackage()) === 'com.android.chrome',
      {
        timeout: 20000,
        interval: 300,
        timeoutMsg: 'Chrome did not launch after pressing login',
      }
    )

    try {
      const accept = await $('id=com.android.chrome:id/terms_accept')
      if (await accept.isDisplayed()) await accept.click()
    } catch {}

    try {
      const noThanks = await $('id=com.android.chrome:id/negative_button')
      if (await noThanks.isDisplayed()) await noThanks.click()
    } catch {}

    const webviewCtx = await browser.waitUntil(
      async () => {
        const ctxs = await driver.getContexts()
        return ctxs.find((c) => c.startsWith('WEBVIEW')) || false
      },
      {
        timeout: 10000,
        interval: 300,
        timeoutMsg: 'No WEBVIEW context after dismissing Chrome welcome',
      }
    )
    await driver.switchContext(webviewCtx)

    await browser.waitUntil(async () => (await browser.getTitle()).length > 0, {
      timeout: 10000,
      interval: 200,
    })

    const emailToUse = process.env.TEST_EMAIL || 'j.k90@hotmail.com'

    const emailTextDiv = await $(
      `//div[contains(@class,"auth0-lock-social-button-text") and normalize-space(.)="${emailToUse}"]`
    )
    const tileExists = await emailTextDiv
      .waitForExist({ timeout: 3000 })
      .catch(() => false)

    if (tileExists) {
      const savedAccountBtn = await $(
        `//div[contains(@class,"auth0-lock-social-button-text") and normalize-space(.)="${emailToUse}"]` +
          `/ancestor::*[self::button or self::a or @role="button"][1]`
      )

      const canClickBtn = await savedAccountBtn.isExisting().catch(() => false)
      if (canClickBtn) {
        await savedAccountBtn.click().catch(async () => {
          const retryBtn = await $(
            `//div[contains(@class,"auth0-lock-social-button-text") and normalize-space(.)="${emailToUse}"]` +
              `/ancestor::*[self::button or self::a or @role="button"][1]`
          )
          await retryBtn.click()
        })
      } else {
        await emailTextDiv.click().catch(async () => {
          const retryDiv = await $(
            `//div[contains(@class,"auth0-lock-social-button-text") and normalize-space(.)="${emailToUse}"]`
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

    await browser.waitUntil(
      async () => {
        const ctxs = await driver.getContexts().catch(() => [])
        return ctxs.length === 1 && ctxs[0] === 'NATIVE_APP'
      },
      {
        timeout: 20000,
        interval: 500,
        timeoutMsg: 'No return to native after login',
      }
    )
    await driver.switchContext('NATIVE_APP')
  }

  // Final assert: hamburger must be visible and stable
  const finalHamburger = await $(hamburgerSelector)
  await finalHamburger.waitForDisplayed({ timeout: 20000 })

  let stableCount = 0
  await browser.waitUntil(
    async () => {
      const visible = await finalHamburger.isDisplayed().catch(() => false)
      if (visible) stableCount++
      else stableCount = 0
      return stableCount >= 3
    },
    {
      timeout: 30000,
      interval: 500,
      timeoutMsg: 'Hamburger did not become stable after login',
    }
  )

  await expect(finalHamburger).toBeDisplayed()
}

module.exports = { ensureLoggedIn }
