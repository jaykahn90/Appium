const AddNoteScreen = require('../../screenobjects/android/add-note.screen')

describe('Add Notes', () => {
  it('skip the tutorial', async () => {
    await AddNoteScreen.skipBtn.click()

    await expect(AddNoteScreen.addNoteText).toBeDisplayed()
  })

  it('add a note, save changes & verify note', async () => {
    await AddNoteScreen.addNoteText.click()
    await AddNoteScreen.txtOption.click()
    await expect(AddNoteScreen.textEditing).toBeDisplayed()

    //add note title
    await AddNoteScreen.noteHeading.addValue('Grocery List')

    //add note body
    await AddNoteScreen.noteBody.addValue('Bread\nMilk\nEggs')

    //save the changes
    await AddNoteScreen.saveNote()

    //assertion
    await expect(AddNoteScreen.editBtn).toBeDisplayed()
    await expect(AddNoteScreen.viewNote).toHaveText('Bread\nMilk\nEggs')
  })
})
