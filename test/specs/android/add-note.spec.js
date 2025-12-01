describe('Add Notes', () => {
  before(async () => {
    // Skip the tutorial once before all tests
    await $(
      '//*[@resource-id="com.socialnmobile.dictapps.notepad.color.note:id/btn_start_skip"]',
    ).click();

    // Verify we are on the main screen
    await expect($('//*[@text="Add note"]')).toBeDisplayed();
  });



  it('add a note, save changes & verify note', async () => {
    await $('//*[@text="Add note"]').click();
    await $('//*[@text="Text"]').click();
    await expect($('//*[@text="Editing"]')).toBeDisplayed();

    // add note title
    await $(
      '//*[@resource-id="com.socialnmobile.dictapps.notepad.color.note:id/edit_title"]',
    ).addValue('Grocery List');

    // add note body
    await $(
      '//*[@resource-id="com.socialnmobile.dictapps.notepad.color.note:id/edit_note"]',
    ).addValue('Bread\nMilk\nEggs');

    // save the changes
    await driver.back();
    await driver.back();

    // assertion
    await expect(
      $(
        '//*[@resource-id="com.socialnmobile.dictapps.notepad.color.note:id/edit_btn"]',
      ),
    ).toBeDisplayed();

    await expect(
      $(
        '//*[@resource-id="com.socialnmobile.dictapps.notepad.color.note:id/view_note"]',
      ),
    ).toHaveText('Bread\nMilk\nEggs');
  });

});