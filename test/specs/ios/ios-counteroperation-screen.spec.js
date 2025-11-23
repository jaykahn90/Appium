import CounterScreen  from '../../screenobjects/ios/counter.screen';


describe('iOS TestApp counter sample', () => {
    it('adds two numbers test', async () => {
    
      const answerField = await $('~Answer');
  
      await CounterScreen.firstInputBtn.setValue('3');
      await CounterScreen.secondInputBtn.setValue('5');
      await CounterScreen.computeBtn.click();
  
      await driver.pause(1000);
  
      const value = await answerField.getText();
      console.log('Answer:', value);
  
      await expect(value).toEqual('8');
    });
  });
  