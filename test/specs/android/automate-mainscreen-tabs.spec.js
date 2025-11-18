describe('Automate Pulse – Splash', () => {
  it('is on Splash or Main activity', async () => {
    // Get the current activity after app launch
    const activity = await driver.getCurrentActivity()
    console.log('Current activity:', activity)

    // Assert it is either SplashActivity or MainActivity
    expect(activity).toMatch(/SplashActivity|MainActivity/)
  })

  it('shows LOG IN on splash', async () => {
    // Use UiSelector by text (faster + cleaner than long XPath)
    const loginBtn = await $('android=new UiSelector().text("LOG IN")')

    // Wait until visible and then assert
    await loginBtn.waitForDisplayed({ timeout: 5000 })
    await expect(loginBtn).toBeDisplayed()
  })
  it('logs in via Auth0 webview and returns to the app', async () => {
    // 1) Tap LOG IN (native)
    const loginBtn = await $('android=new UiSelector().text("LOG IN")')
    await loginBtn.waitForDisplayed({ timeout: 8000 })
    await loginBtn.click()

    // 2) WAIT FOR CHROME (still native)
    await driver.switchContext('NATIVE_APP')
    await browser.waitUntil(
      async () => (await driver.getCurrentPackage()) === 'com.android.chrome',
      {
        timeout: 20000,
        interval: 300,
        timeoutMsg: 'Chrome did not launch after pressing LOG IN',
      },
    )

    // 3) Dismiss Chrome first-run screens (native)
    try {
      // "Accept & continue"
      const accept = await $('id=com.android.chrome:id/terms_accept')
      if (await accept.isDisplayed()) await accept.click()
    } catch {}

    try {
      // Optional: “No thanks” for sign-in/sync prompt
      const noThanks =
        (await $('id=com.android.chrome:id/negative_button')) ||
        (await $(`android=new UiSelector().textMatches("(?i)no\\s*thanks")`))
      if (await noThanks.isDisplayed()) await noThanks.click()
    } catch {}

    // 4) NOW wait for a WEBVIEW to appear and switch
    const webviewCtx = await browser.waitUntil(
      async () => {
        const ctxs = await driver.getContexts()
        return ctxs.find((c) => c.startsWith('WEBVIEW')) || false
      },
      {
        timeout: 5000,
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

    // --- QUICK LOGIN TILE or FULL FORM (your existing logic) ---
    const emailToUse = process.env.TEST_EMAIL || 'j.k90@hotmail.com'

    const emailTextDiv = await $(
      `//div[contains(@class,"auth0-lock-social-button-text") and normalize-space(.)="${emailToUse}"]`,
    )
    const tileExists = await emailTextDiv
      .waitForExist({ timeout: 3000 })
      .catch(() => false)

    if (tileExists) {
      const clickableAncestor = await emailTextDiv.$(
        './ancestor::*[self::button or self::a or @role="button"][1]',
      )
      if (await clickableAncestor.isExisting()) {
        try {
          await clickableAncestor.click()
        } catch (err) {
          // Retry once: re-query and click (handles stale/invalid element id)
          const retryAncestor = await emailTextDiv.$(
            './ancestor::*[self::button or self::a or @role="button"][1]',
          )
          await retryAncestor.click()
        }
      } else {
        try {
          await emailTextDiv.click()
        } catch (err) {
          const retryDiv = await $(
            `//div[contains(@class,"auth0-lock-social-button-text") and normalize-space(.)="${emailToUse}"]`,
          )
          await retryDiv.click()
        }
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
      try {
        await submitBtn.click()
      } catch (err) {
        // Retry: re-query and click to avoid stale/invalid element id
        const refreshedCandidates = await $$('button[type="submit"]')
        const refreshedSubmit =
          refreshedCandidates[0] || (await $('.auth0-label-submit'))
        await refreshedSubmit.waitForClickable({ timeout: 8000 })
        await refreshedSubmit.click()
      }
    }

    // 5) Wait to return to native and assert
    await browser.waitUntil(
      async () => {
        const ctxs = await driver.getContexts()
        return ctxs.length === 1 && ctxs[0] === 'NATIVE_APP'
      },
      { timeout: 20000, interval: 500, timeoutMsg: 'No return to native' },
    )
    await driver.switchContext('NATIVE_APP')

    // Any descendant ImageView under the action bar root
    const headerLogo = await $(
      '//*[@resource-id="com.rolleaseacmeda.automatepulse:id/action_bar_root"]//android.widget.ImageView',
    )

    await headerLogo.waitForDisplayed({ timeout: 10000 })
    await expect(headerLogo).toBeDisplayed()

  })

  it('opens the sidebar via edge swipe and shows MENU', async () => {
    // Ensure we are in native context and on main screen
    await driver.switchContext('NATIVE_APP')
    await browser.pause(300)

    const { width, height } = await driver.getWindowSize()
    const startX = Math.max(1, Math.floor(width * 0.01))
    const endX = Math.floor(width * 0.9)
    const yPositions = [0.2, 0.5, 0.8].map((p) => Math.floor(height * p))

    const menuLabel = await $(
      'android=new UiSelector().className("android.widget.TextView").text("MENU")',
    )
    const menuLabelXpath = await $(
      '//android.widget.TextView[@text="MENU"]',
    )
    const closeIcon = await $('~Close navigation drawer')

    const doSwipeAtY = async (y) => {
      await driver.performActions([
        {
          type: 'pointer',
          id: 'finger1',
          parameters: { pointerType: 'touch' },
          actions: [
            { type: 'pointerMove', duration: 0, x: startX, y },
            { type: 'pointerDown', button: 0 },
            { type: 'pause', duration: 180 },
            { type: 'pointerMove', duration: 900, x: endX, y },
            { type: 'pointerUp', button: 0 },
          ],
        },
      ])
      await browser.pause(700)
    }

    const isDrawerOpen = async () =>
      (await closeIcon.isDisplayed().catch(() => false)) ||
      (await menuLabel.isDisplayed().catch(() => false)) ||
      (await menuLabelXpath.isDisplayed().catch(() => false))

    let opened = await isDrawerOpen()
    let attempt = 0
    while (!opened && attempt < 3) {
      await doSwipeAtY(yPositions[attempt] || yPositions[1])
      opened = await browser
        .waitUntil(async () => await isDrawerOpen(), {
          timeout: 4000,
          interval: 250,
        })
        .catch(() => false)
      attempt += 1
    }

    // Final assertion using either locator
    const visible =
      (await menuLabel.waitForDisplayed({ timeout: 6000 }).catch(() => false)) ||
      (await menuLabelXpath
        .waitForDisplayed({ timeout: 6000 })
        .catch(() => false))
    if (!visible) {
      throw new Error('MENU not visible after opening the drawer')
    }
    await expect(menuLabel).toBeDisplayed()
  })

  
})
