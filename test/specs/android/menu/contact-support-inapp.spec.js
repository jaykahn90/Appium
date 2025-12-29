//this test covers opening sidebar menu > Then tap on Support centre> then tap on contact support which will take to inapp contact support screen. 

const { ensureLoggedIn } = require('../../../helpers/app/ensureLoggedIn')

describe('Menu – Contact Support (Web)', () => {
  beforeEach(async () => {
    await ensureLoggedIn()
    await driver.switchContext('NATIVE_APP')
  })

  it('opens Contact Support and validates the Contact Support screen', async () => {
    const APP_PKG = 'com.rolleaseacmeda.automatepulse'
    const CHROME_PKG = 'com.android.chrome'

    // If Chrome is foreground, bring app back (safe guard)
    if ((await driver.getCurrentPackage()) === CHROME_PKG) {
      await driver.activateApp(APP_PKG)
      await browser.pause(1000)
    }

    // ---------- WAIT FOR HOME TO SETTLE ----------
    const homeHeaderMarker = await $(
      'android=new UiSelector().description("sharedHeader.rightButton.button")',
    )
    await homeHeaderMarker.waitForDisplayed({
      timeout: 20000,
      timeoutMsg: 'Home header marker not visible after login',
    })

    await browser.pause(7000)

    // ---------- OPEN DRAWER (ONCE) ----------
    const hamburgerButton = await $(
      'android=new UiSelector().description("sharedHeader.menuButton.button")',
    )
    await hamburgerButton.waitForDisplayed({
      timeout: 15000,
      timeoutMsg: 'Hamburger button not visible on main screen',
    })
    await hamburgerButton.click()

    await browser.waitUntil(
      async () => {
        const supportCenterExists = await $(
          'android=new UiSelector().description("sidebar.supportCenterCard.button")',
        )
          .isDisplayed()
          .catch(() => false)

        const knowledgeBaseExists = await $(
          'android=new UiSelector().description("sidebar.knowledgeBaseCard.button")',
        )
          .isDisplayed()
          .catch(() => false)

        return supportCenterExists || knowledgeBaseExists
      },
      {
        timeout: 15000,
        interval: 400,
        timeoutMsg: 'Drawer opened but content not ready',
      },
    )

    // ---------- OPEN SUPPORT CENTER ----------
    const supportCenterBtn = await $(
      'android=new UiScrollable(new UiSelector().scrollable(true))' +
        '.scrollIntoView(new UiSelector().description("sidebar.supportCenterCard.button"))',
    )
    await supportCenterBtn.waitForDisplayed({
      timeout: 10000,
      timeoutMsg: 'Support Center not visible in drawer',
    })
    await supportCenterBtn.click()

    // ✅ WAIT FOR SUPPORT CENTER CONTENT TO FINISH RENDERING
    const supportChatBtn = await $(
      'android=new UiSelector().description("sidebar.supportChatCard.button")',
    )
    await supportChatBtn.waitForDisplayed({
      timeout: 10000,
      timeoutMsg: 'Support Center expanded but content not ready',
    })

    // ---------- NOW SAFE TO ACCESS CONTACT SUPPORT ----------
    const contactSupportBtn = await $(
      'android=new UiSelector().description("sidebar.contactSupportCard.button")',
    )
    await contactSupportBtn.waitForDisplayed({
      timeout: 10000,
      timeoutMsg: 'Contact Support not visible after Support Center expanded',
    })
    await contactSupportBtn.click()

    // ---------- ASSERT CONTACT SUPPORT SCREEN (IN-APP) ----------
    const heading = await $('android=new UiSelector().text("How can we help?")')
    await heading.waitForDisplayed({
      timeout: 15000,
      timeoutMsg: '"How can we help?" not visible on Contact Support screen',
    })
    await expect(heading).toBeDisplayed()

    const bodyText = await $(
      'android=new UiSelector().text("Whether you have questions about a product, need technical support or anything else, our team is ready to support you.")',
    )
    await bodyText.waitForDisplayed({
      timeout: 15000,
      timeoutMsg: 'Expected description text not visible on Contact Support screen',
    })
    await expect(bodyText).toBeDisplayed()

    // ---------- GO BACK TO HOME ----------
    const backBtn = await $(
      'android=new UiSelector().description("sharedHeader.backButton.button")',
    )
    await backBtn.waitForDisplayed({ timeout: 15000 })
    await backBtn.click()

    // ---------- FINAL SANITY ----------
    const hamburgerAgain = await $(
      'android=new UiSelector().description("sharedHeader.menuButton.button")',
    )
    await hamburgerAgain.waitForDisplayed({
      timeout: 15000,
      timeoutMsg: 'Returned to home but hamburger not visible',
    })
    await expect(hamburgerAgain).toBeDisplayed()
  })
})
