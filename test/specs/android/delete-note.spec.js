describe('Add Notes', () => {
  it('skip the tutorial', async () => {
    await $(
      '//*[@resource-id="com.socialnmobile.dictapps.notepad.color.note:id/btn_start_skip"]',
    ).click()

    await expect($('//*[@text="Add note"]')).toBeDisplayed()
  })

  it('add a note, save changes & verify note', async () => {
    await $('//*[@text="Add note"]').click()
    await $('//*[@text="Text"]').click()
    await expect($('//*[@text="Editing"]')).toBeDisplayed()

    //add note title
    await $(
      '//*[@resource-id="com.socialnmobile.dictapps.notepad.color.note:id/edit_title"]',
    ).addValue('Grocery List')

    //add note body
    await $(
      '//*[@resource-id="com.socialnmobile.dictapps.notepad.color.note:id/edit_note"]',
    ).addValue('Bread\nMilk\nEggs')

    //save the changes
    await driver.back()
    await driver.back()

    //assertion
    await expect(
      $(
        '//*[@resource-id="com.socialnmobile.dictapps.notepad.color.note:id/edit_btn"]',
      ),
    ).toBeDisplayed()

    await expect(
      $(
        '//*[@resource-id="com.socialnmobile.dictapps.notepad.color.note:id/view_note"]',
      ),
    ).toHaveText('Bread\nMilk\nEggs')
    await driver.back()
  })

  it('Delete a note and check the note in trash can', async () => {
    //to go to main screen with all notes.

    await driver.pause(3000)
    const note = await $(
      '//*[@resource-id="com.socialnmobile.dictapps.notepad.color.note:id/title"]',
    ).getText()

    //click on note
    await $(
      '//*[@resource-id="com.socialnmobile.dictapps.notepad.color.note:id/title"]',
    ).click()

    //click on the 3 dots
    await $('~More').click()

    //click on delete
    await $('//*[@text="Delete"]').click()

    //accept alert
    await driver.acceptAlert()

    await driver.pause(1000)

    //click on Nav icon , 3 horizontal bars

    await $(
      '//*[@resource-id="com.socialnmobile.dictapps.notepad.color.note:id/icon_nav"]',
    ).click()

    await driver.pause(3000)
    //click on trash can
    await $(
      '//android.widget.TextView[@resource-id="com.socialnmobile.dictapps.notepad.color.note:id/text" and @text="Trash Can"]',
    ).click()

    // asserion : check if recently delete note is here

    const trashCanItem = await $(
      '//*[@resource-id="com.socialnmobile.dictapps.notepad.color.note:id/title"]',
    ).getText()

    await expect(trashCanItem).toEqual(note)
  })
})
