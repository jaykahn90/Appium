// test/specs/android/menu/KnowledgeBase-Help-URL-Links.spec.js

const { ensureLoggedIn } = require('../../../helpers/app/ensureLoggedIn')

describe('Menu – Knowledge Base – Help – External URL links (Chrome)', () => {
  const APP_PKG = 'com.rolleaseacmeda.automatepulse'
  const CHROME_PKG = 'com.android.chrome'

  const ui = {
    // Home marker + menu
    homeHeaderMarker:
      'android=new UiSelector().description("sharedHeader.rightButton.button")',
    hamburger:
      'android=new UiSelector().description("sharedHeader.menuButton.button")',

    // Drawer cards
    supportCenterCard:
      'android=new UiSelector().description("sidebar.supportCenterCard.button")',
    knowledgeBaseCard:
      'android=new UiSelector().description("sidebar.knowledgeBaseCard.button")',

    // Help cards on Knowledge Base screen
    hubPairingCard:
      'android=new UiSelector().description("sidebar.help.hubPairingCard.button")',

    // Hub Pairing Assist screen
    hubPairingAssistTitle: 'android=new UiSelector().text("HUB PAIRING ASSIST")',
    contactLocalSupportLink:
      'android=new UiSelector().text("Contact Local Support if Necessary")',
    moreInfoLink: 'android=new UiSelector().text("More Info")',

    // Chrome
    chromeUrlBar: 'android=new UiSelector().resourceId("com.android.chrome:id/url_bar")',

    // Cookie banner
    cookieAccept: 'android=new UiSelector().textContains("ACCEPT")',
  }

  async function clickIfExists(selector, timeout = 1500) {
    const el = await $(selector)
    if (await el.isExisting()) {
      try {
        await el.waitForDisplayed({ timeout })
        await el.click()
        return true
      } catch (_) {
        // ignore
      }
    }
    return false
  }

  async function ensureAppForeground() {
    if ((await driver.getCurrentPackage()) === CHROME_PKG) {
      await driver.activateApp(APP_PKG)
      await browser.pause(1000)
    }
  }

  async function waitForHomeToSettle() {
    const marker = await $(ui.homeHeaderMarker)
    await marker.waitForDisplayed({
      timeout: 20000,
      timeoutMsg: 'Home header marker not visible after login',
    })
    // keep this pause because it’s working in your suite
    await browser.pause(7000)
  }

  async function openDrawer() {
    const hamburger = await $(ui.hamburger)
    await hamburger.waitForDisplayed({
      timeout: 15000,
      timeoutMsg: 'Hamburger button not visible on main screen',
    })
    await hamburger.click()

    // Wait until drawer content is ready (reuse your proven pattern)
    await browser.waitUntil(
      async () => {
        const supportExists = await $(ui.supportCenterCard)
          .isDisplayed()
          .catch(() => false)
        const kbExists = await $(ui.knowledgeBaseCard)
          .isDisplayed()
          .catch(() => false)
        return supportExists || kbExists
      },
      {
        timeout: 15000,
        interval: 400,
        timeoutMsg: 'Drawer opened but content not ready',
      },
    )
  }

  async function openSupportCenter() {
    const supportCenterBtn = await $(
      'android=new UiScrollable(new UiSelector().scrollable(true))' +
        '.scrollIntoView(new UiSelector().description("sidebar.supportCenterCard.button"))',
    )
    await supportCenterBtn.waitForDisplayed({
      timeout: 10000,
      timeoutMsg: 'Support Center not visible in drawer',
    })
    await supportCenterBtn.click()

    // Wait for expansion rendering by checking any known child exists
    const supportChatCard = await $(
      'android=new UiSelector().description("sidebar.supportChatCard.button")',
    )
    await supportChatCard.waitForDisplayed({
      timeout: 10000,
      timeoutMsg: 'Support Center expanded but content not ready',
    })
  }

  async function openKnowledgeBase() {
    const kbBtn = await $(
      'android=new UiScrollable(new UiSelector().scrollable(true))' +
        '.scrollIntoView(new UiSelector().description("sidebar.knowledgeBaseCard.button"))',
    )
    await kbBtn.waitForDisplayed({
      timeout: 10000,
      timeoutMsg: 'Knowledge Base not visible in drawer (after Support Center expanded)',
    })
    await kbBtn.click()
  }

  async function openHubPairingAssist() {
    const hubPairing = await $(ui.hubPairingCard)
    await hubPairing.waitForDisplayed({
      timeout: 15000,
      timeoutMsg: 'Hub Pairing Assistance card not visible on Knowledge Base screen',
    })
    await hubPairing.click()

    const title = await $(ui.hubPairingAssistTitle)
    await title.waitForDisplayed({
      timeout: 15000,
      timeoutMsg: 'HUB PAIRING ASSIST title not visible',
    })
  }

  async function scrollToBottomLinks() {
    // "More Info" is lowest, so use it as bottom anchor.
    await $(
      'android=new UiScrollable(new UiSelector().scrollable(true))' +
        '.scrollIntoView(new UiSelector().text("More Info"))',
    ).waitForDisplayed({
      timeout: 15000,
      timeoutMsg: '"More Info" link not reachable via scroll',
    })
  }

  async function waitForChrome() {
    await driver.waitUntil(
      async () => (await driver.getCurrentPackage()) === CHROME_PKG,
      {
        timeout: 15000,
        interval: 500,
        timeoutMsg: 'Chrome did not open (package never switched to com.android.chrome).',
      },
    )
  }

  async function acceptCookiesIfPresent() {
    await clickIfExists(ui.cookieAccept, 3000)
  }

  async function assertChromeUrlContains(expected) {
    const urlBar = await $(ui.chromeUrlBar)
    await urlBar.waitForDisplayed({ timeout: 15000 })
    const url = await urlBar.getText()
    await expect(url).toContain(expected)
  }

  async function returnToApp() {
    for (let i = 0; i < 6; i++) {
      if ((await driver.getCurrentPackage()) === APP_PKG) return
      await driver.back()
      await browser.pause(600)
    }
    throw new Error('Could not return from Chrome back to the app within 6 back presses.')
  }

  beforeEach(async () => {
    await ensureLoggedIn()
    await driver.switchContext('NATIVE_APP')
  })

  it('opens both external help links in Chrome and validates URLs', async () => {
    await ensureAppForeground()

    await waitForHomeToSettle()
    await openDrawer()
    await openSupportCenter()
    await openKnowledgeBase()
    await openHubPairingAssist()
    await scrollToBottomLinks()

    // 1) Contact Local Support if Necessary -> Chrome -> assert contact URL -> back
    const contactLink = await $(ui.contactLocalSupportLink)
    await contactLink.waitForDisplayed({
      timeout: 10000,
      timeoutMsg: '"Contact Local Support if Necessary" not visible',
    })
    await contactLink.click()

    await waitForChrome()
    await acceptCookiesIfPresent()
    await assertChromeUrlContains('automateshades.com/contact')
    await returnToApp()

    // Ensure we’re back on Hub Pairing Assist screen before next click
    await $(ui.hubPairingAssistTitle).waitForDisplayed({ timeout: 15000 })
    await scrollToBottomLinks()

    // 2) More Info -> Chrome -> assert support URL -> back
    const moreInfo = await $(ui.moreInfoLink)
    await moreInfo.waitForDisplayed({
      timeout: 10000,
      timeoutMsg: '"More Info" not visible',
    })
    await moreInfo.click()

    await waitForChrome()
    await acceptCookiesIfPresent()
    await assertChromeUrlContains('automateshades.com/support')
    await assertChromeUrlContains('hub-pairing-assistant')
    await returnToApp()
  })
})
