// test/specs/android/menu/knowledge-base-links.spec.js

const { ensureLoggedIn } = require('../../../helpers/app/ensureLoggedIn')

describe('Menu – Knowledge Base', () => {
  it('opens Knowledge Base and shows help items', async () => {
    await driver.switchContext('NATIVE_APP')

    // 1) Make sure we are logged in and on main screen
    await ensureLoggedIn()

    // 2) Open hamburger menu
    const hamburgerButton = await $(
      'android=new UiSelector().description("sharedHeader.menuButton.button")',
    )
    await hamburgerButton.waitForDisplayed({
      timeout: 10000,
      timeoutMsg: 'Hamburger button not visible',
    })
    await hamburgerButton.click()

    // 3) Expand Support Center dropdown
    const supportCenterBtn = await $(
      'android=new UiSelector().description("sidebar.supportCenterCard.button")',
    )
    await supportCenterBtn.waitForDisplayed({
      timeout: 10000,
      timeoutMsg: 'Support Center not visible in drawer',
    })
    await supportCenterBtn.click()

    // 4) Click Knowledge Base
    const knowledgeBaseBtn = await $(
      'android=new UiSelector().description("sidebar.knowledgeBaseCard.button")',
    )
    await knowledgeBaseBtn.waitForDisplayed({
      timeout: 10000,
      timeoutMsg: 'Knowledge Base not visible under Support Center',
    })
    await knowledgeBaseBtn.click()

    // 5) Assert HELP items are visible
    const hubPairing = await $(
      'android=new UiSelector().description("sidebar.help.hubPairingCard.button")',
    )
    const hubOffline = await $(
      'android=new UiSelector().description("sidebar.help.hubOfflineCard.button")',
    )
    const shadeIssues = await $(
      'android=new UiSelector().description("sidebar.help.shadeIssuesCard.button")',
    )
    const simpleControl = await $(
      'android=new UiSelector().description("sidebar.help.simpleControlCard.button")',
    )
    const contactSupport = await $(
      'android=new UiSelector().description("sidebar.help.contactSupportCard.button")',
    )

    await hubPairing.waitForDisplayed({
      timeout: 10000,
      timeoutMsg: 'Hub Pairing Assistance item not visible',
    })
    await hubOffline.waitForDisplayed({
      timeout: 10000,
      timeoutMsg: 'Hub Offline item not visible',
    })
    await shadeIssues.waitForDisplayed({
      timeout: 10000,
      timeoutMsg: 'Shade Issues item not visible',
    })
    await simpleControl.waitForDisplayed({
      timeout: 10000,
      timeoutMsg: 'Simple Control item not visible',
    })
    await contactSupport.waitForDisplayed({
      timeout: 10000,
      timeoutMsg: 'Contact Support item not visible',
    })

    await expect(hubPairing).toBeDisplayed()
    await expect(hubOffline).toBeDisplayed()
    await expect(shadeIssues).toBeDisplayed()
    await expect(simpleControl).toBeDisplayed()
    await expect(contactSupport).toBeDisplayed()
  })
})
