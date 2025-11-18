describe('Android Elements Tests', () => {
  it('find element by accessibility id', async () => {
    //find elements by accessibilty id
    const appOption = await $('~App')

    // click on element
    await appOption.click()

    //assertion
    const actionBar = await $('~Action Bar')
    await expect(actionBar).toBeExisting()
  })

  it('find element by class name', async () => {
    //find element by class name
    const className = await $('android.widget.TextView')

    console.log(await className.getText())

    //Assertion
    await expect(className).toHaveText('API Demos')
  })

  xit('find elements by Xpath', async () => {
    //xpath - (//tagname[@attribute=value])
    await $('//android.widget.TextView[@content-desc="Alert Dialogs"]').click()

    //find by resource ID
    await $(
      '//android.widget.Button[@resource-id= "io.appium.android.apis:id/select_button"]',
    ).click()

    //find elements by text
    await $('//android.widget.TextView[@text="Command two"]').click()

    //find by class
    const textAssertion = await $('//android.widget.TextView')
    await expect(textAssertion).toHaveText('You selected: 1 , Command two')
  })

  it('Find Elements by UIAutomator', async () => {
    //find by text contains
    await $('android=new UiSelector().textContains("Alert")').click()
  })

  it('Find multiple elements', async () => {
    const expectedList = [
      'API Demos',
      "Access'ibility",
      'Accessibility',
      'Animation',
      'App',
      'Content',
      'Graphics',
      'Media',
      'NFC',
      'OS',
      'Preference',
      'Text',
      'Views',
    ]
    const actualList = []
    //find multiple elements
    const textList = await $$('android.widget.TextView')

    //lopp through them
    for (const element of textList) {
      actualList.push(await element.getText())
    }

    //assert the list
    await expect(actualList).toEqual(expectedList)
  })

  it.only('should scroll down and click Views', async () => {
    //look and click on "Views" - first part of exercise
    // "Views" has an accessibility id so will use that.
    const viewsTab = await $('~Views')
    await viewsTab.scrollIntoView() // WebdriverIO helper
    await viewsTab.click()

    //look and click on "Auto Complete" - second part of exercise.
    await $('//*[@text="Auto Complete"]').click()

    //look and click on "Screen Top" - third part of exercise.
    const screenTop = await $('~1. Screen Top')
    //await autoComplete.scrollIntoView()
    await screenTop.click()

    // Locate the Country input, im doing that by using resource-id
    const countryInput = await $('id=io.appium.android.apis:id/edit')

    // Wait until it’s visible
    await countryInput.waitForDisplayed({ timeout: 5000 })

    // Clear any default text
    await countryInput.clearValue()

    // Enter the country name
    await countryInput.setValue('Australia')

    // double confirm that text entered is Australia - last part of exercise.
    await expect(countryInput).toHaveText('Australia')
  })
})
