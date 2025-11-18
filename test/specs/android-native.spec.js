describe('Android Native Feature Tests', () => {
  it('Access an Activity directly', async () => {
    // to access activity directly

    await driver.startActivity(
      'io.appium.android.apis',
      'io.appium.android.apis.app.AlertDialogSamples',
    )

    //pause
    await driver.pause(3000)
    //assertion
    await expect($('//*[@text="App/Alert Dialogs"]')).toExist()
  })

  it('working with dialogue boxes', async () => {
    // to access activity directly
    await driver.startActivity(
      'io.appium.android.apis',
      'io.appium.android.apis.app.AlertDialogSamples',
    )
    //click on the first dialogue box
    await $('//*[@resource-id="io.appium.android.apis:id/two_buttons"]').click()

    // //Accept the alert box
    // await driver.acceptAlert()

    // //dismiss the alert box
    // await driver.dismissAlert()

    //click on the ok button
    await $('//*[@resource-id="android:id/button1"]').click()

    //asertion - alert box no longer visible
    await expect($('//*[@resource-id = "android:id/alertTitle"]')).not.toExist()
  })

  it('Vertical Scrolling', async () => {
    await $('~App').click()
    await $('~Activity').click()

    //scroll to the end (not so stable if elements get moved)
    // await $(
    //   'android=new UiScrollable(new UiSelector().scrollable(true)).scrollToEnd(1,5)',
    // )

    //scrollTextIntoView - more stable
    await $(
      'android=new UiScrollable(new UiSelector().scrollable(true)).scrollTextIntoView("Secure Surfaces")',
    ).click(),
      //await $('~Secure Surfaces').click()

      //assertion
      await expect($('~Secure Dialog')).toExist()
  })

  it('Horizontal Scrolling', async () => {
    await driver.startActivity(
      'io.appium.android.apis',
      'io.appium.android.apis.view.Gallery1',
    )

    //Horizontal Scrollinh
    await $(
      'android=new UiScrollable(new UiSelector().scrollable(true)).setAsHorizontalList().scrollForward()',
    )
    await $(
      'android=new UiScrollable(new UiSelector().scrollable(true)).setAsHorizontalList().scrollBackward()',
    )
    await driver.pause(3000)
  })

  // mCurrentFocus=Window{147a0bc u0 io.appium.android.apis/io.appium.android.apis.view.Gallery1}

  it.only('Scrolling Exercise', async () => {
    //click on Views
    await $(
      'android=new UiScrollable(new UiSelector().scrollable(true)).scrollTextIntoView("Views")',
    ).click()
    await driver.pause(2000)
    // then press on date widgets
    await $('~Date Widgets').click()

    await driver.pause(1000)

    //press on 1. dialogue but via xpath
    await $('//android.widget.TextView[@content-desc="1. Dialog"]').click()

    //get the date
    // Locate the date element
    const dateDisplay = await $('id=io.appium.android.apis:id/dateDisplay')

    // Get the text
    const appDateText = await dateDisplay.getText()

    // Print it out (or use it later in the test)
    console.log('Date from app:', appDateText)

    //now click on change the date
    await $('//android.widget.Button[@content-desc="change the date"]').click()

    //now scroll to the right
    await $(
      'android=new UiScrollable(new UiSelector().scrollable(true)).setAsHorizontalList().scrollForward()',
    )
    await driver.pause(1000)

    //select date 10th of next month
    await $('//android.view.View[@content-desc="10 October 2025"]').click()

    //after selecting 10 press ok

    await $(
      '//android.widget.Button[@resource-id="android:id/button1"]',
    ).click()

    //assert that date is changed
    await expect(await dateDisplay.getText()).not.toEqual(appDateText)
  })
})
