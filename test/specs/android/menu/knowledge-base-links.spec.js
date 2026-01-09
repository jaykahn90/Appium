//This covers test where user will open sidebar menu and then tap on support centre> then tap on knowledge base and open each section one by one. 

const { ensureLoggedIn } = require('../../../helpers/app/ensureLoggedIn')

describe('Menu – Knowledge Base links', () => {
  it('opens Knowledge Base and validates help screens open', async () => {
    await driver.switchContext('NATIVE_APP')

    // 1) Ensure logged in
    await ensureLoggedIn()

    // 2) Wait for home screen to fully settle
    // Using header right button as stable home marker
    const homeHeaderMarker = await $(
      'android=new UiSelector().description("sharedHeader.rightButton.button")',
    )
    await homeHeaderMarker.waitForDisplayed({
      timeout: 20000,
      timeoutMsg: 'Home header marker not visible after login',
    })

    // Let app finish background loading (hub scan etc.)
    await browser.pause(7000)

    // 3) Open menu (ONCE) - use resource-id as primary
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

    // 4) Expand Support Center (scroll-safe)
    const supportCenterBtn = await $(
      'android=new UiScrollable(new UiSelector().scrollable(true))' +
        '.scrollIntoView(new UiSelector().description("sidebar.supportCenterCard.button"))',
    )
    await supportCenterBtn.waitForDisplayed({ timeout: 10000 })
    await supportCenterBtn.click()

    // 5) Open Knowledge Base
    const knowledgeBaseBtn = await $(
      'android=new UiSelector().description("sidebar.knowledgeBaseCard.button")',
    )
    await knowledgeBaseBtn.waitForDisplayed({ timeout: 10000 })
    await knowledgeBaseBtn.click()

    // 6) Help cards (presence check)
    const hubPairingCard = await $(
      'android=new UiSelector().description("sidebar.help.hubPairingCard.button")',
    )
    const hubOfflineCard = await $(
      'android=new UiSelector().description("sidebar.help.hubOfflineCard.button")',
    )
    const shadeIssuesCard = await $(
      'android=new UiSelector().description("sidebar.help.shadeIssuesCard.button")',
    )
    const simpleControlCard = await $(
      'android=new UiSelector().description("sidebar.help.simpleControlCard.button")',
    )
    const contactSupportCard = await $(
      'android=new UiSelector().description("sidebar.help.contactSupportCard.button")',
    )

    await expect(hubPairingCard).toBeDisplayed()
    await expect(hubOfflineCard).toBeDisplayed()
    await expect(shadeIssuesCard).toBeDisplayed()
    await expect(simpleControlCard).toBeDisplayed()
    await expect(contactSupportCard).toBeDisplayed() // present only

    // Back button
    const backBtn = await $(
      'android=new UiSelector().description("sharedHeader.backButton.button")',
    )

    // Helper: open native help screen, assert title, go back
    const openAndAssert = async (cardEl, titleText) => {
      await cardEl.waitForDisplayed({ timeout: 10000 })
      await cardEl.click()

      const title = await $(`android=new UiSelector().text("${titleText}")`)
      await title.waitForDisplayed({
        timeout: 10000,
        timeoutMsg: `Expected title not visible: ${titleText}`,
      })
      await expect(title).toBeDisplayed()

      await backBtn.waitForDisplayed({ timeout: 10000 })
      await backBtn.click()

      // Ensure we are back on the HELP list
      await hubPairingCard.waitForDisplayed({ timeout: 10000 })
    }

    // 7) Validate each native help screen
    await openAndAssert(hubPairingCard, 'HUB PAIRING ASSIST')
    await openAndAssert(hubOfflineCard, 'HUB OFFLINE')
    await openAndAssert(shadeIssuesCard, 'SHADE ISSUES')
    await openAndAssert(simpleControlCard, 'SIMPLE CONTROL HELP')
  })
})
