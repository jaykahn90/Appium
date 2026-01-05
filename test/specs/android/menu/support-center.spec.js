// This test covers where user opens up the sidebar and then tap on support centre and it opens up drag down menu which shows supoport chat, contact support and knowledge base.
//to test CI pipeline
const { ensureLoggedIn } = require('../../../helpers/app/ensureLoggedIn')

describe('Menu – Support Center', () => {
  beforeEach(async () => {
    await ensureLoggedIn()
  })

  it('opens menu, expands Support Center, and shows Support options', async () => {
    await driver.switchContext('NATIVE_APP')
    await browser.pause(800)

    // 1) Open sidebar menu
    const hamburgerButton = await $(
      'android=new UiSelector().description("sharedHeader.menuButton.button")',
    )
    await hamburgerButton.waitForDisplayed({ timeout: 10000 })
    await hamburgerButton.click()

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
