describe ('iOS Native Feature', ()=> {
    it('working with alert box', async ()=>{
        // press alert view and then press okay / cancel, we have accessibilty id for all. 
        await $('~Alert Views').click();
        await $('~Okay / Cancel').click();

        //Click Okay in alert box
        // await $('~OK').click();
        

        //accept or dismiss alert
        await driver.dismissAlert();
    

    // Ensure the alert box is gone by checking that the button is no longer present
    await expect($('~OK')).not.toBeDisplayed();
    })

    it('working with scrollable elements', async()=> {
        //easiest
        // await driver.execute('mobile: scroll', {direction: "down" })
        // await driver.execute('mobile: scroll', {direction: "up" })

        //complex scenario

    await $('~Picker View').click();

   const redPicker = (await $('~Red color component value'));
   const bluePicker = (await $('~Blue color component value'))

   
  await driver.execute('mobile: scroll', { element: redPicker.elementId, direction: "down" })
  await driver.execute('mobile: scroll', { element: bluePicker.elementId, direction: "up" })
  await driver.pause(2000);
    
    })

    it.only('working with Picker View', async ()=> {
        await $('~Picker View').click()

        const redPicker = (await $('~Red color component value'));
        const greenPicker = (await $('~Green color component value'));
        const bluePicker = (await $('~Blue color component value'))

        //set purple color (125, 0 , 125)
        await redPicker.addValue('125');
        await greenPicker.addValue('0');
        await bluePicker.addValue('125');



        await driver.pause(2000)
    })
})
