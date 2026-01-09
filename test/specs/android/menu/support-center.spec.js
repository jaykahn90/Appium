// This test covers where user opens up the sidebar and then tap on support centre and it opens up drag down menu which shows supoport chat, contact support and knowledge base.
//to test CI pipeline
const { ensureLoggedIn } = require('../../../helpers/app/ensureLoggedIn')

describe('Menu – Support Center', () => {
  beforeEach(async () => {
    await ensureLoggedIn()
  })

  it('opens menu, expands Support Center, and shows Support options', async () => {
    await driver.switchContext('NATIVE_APP')

    // Wait for home screen to fully settle (similar to other working tests)
    const homeReadySelectors = [
      'id=home.location.icon',
      'android=new UiSelector().resourceId("home.location.icon")',
    ]
    let homeMarker = null
    for (const selector of homeReadySelectors) {
      const el = await $(selector)
      if (await el.isDisplayed().catch(() => false)) {
        homeMarker = el
        break
      }
    }
    if (homeMarker) {
      await homeMarker.waitForDisplayed({ timeout: 60000 })
    }

    // Let app finish background loading (hub scan etc.) - similar to other working tests
    await browser.pause(7000)

    // 1) Open sidebar menu (use resource-id as primary)
    const hamburgerSelectors = [
      'id=sharedHeader.menuButton.button',
      'android=new UiSelector().resourceId("sharedHeader.menuButton.button")',
      'android=new UiSelector().description("sharedHeader.menuButton.button")', // fallback
    ]
    let hamburger = null
    for (const selector of hamburgerSelectors) {
      const el = await $(selector)
      if (await el.isDisplayed().catch(() => false)) {
        hamburger = el
        break
      }
    }
    if (!hamburger) {
      throw new Error('Hamburger button not found with any selector')
    }
    await hamburger.waitForDisplayed({ timeout: 10000 })
    await hamburger.click()

    // Wait for drawer to open and content to be ready (similar to contact-support-inapp.spec.js)
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

    // 2) Expand Support Center dropdown
    const supportCenterBtn = await $(
      'android=new UiSelector().description("sidebar.supportCenterCard.button")',
    )
    await supportCenterBtn.waitForDisplayed({ timeout: 10000 })
    await supportCenterBtn.click()

    // 3) Assert dropdown options are visible
    const supportChat = await $(
      'android=new UiSelector().description("sidebar.supportChatCard.button")',
    )
    const contactSupport = await $(
      'android=new UiSelector().description("sidebar.contactSupportCard.button")',
    )
    const knowledgeBase = await $(
      'android=new UiSelector().description("sidebar.knowledgeBaseCard.button")',
    )

    await expect(supportChat).toBeDisplayed()
    await expect(contactSupport).toBeDisplayed()
    await expect(knowledgeBase).toBeDisplayed()
  })
})
