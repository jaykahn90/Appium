// test/specs/android/auth/login.spec.js

const { ensureLoggedIn } = require('../../../helpers/app/ensureLoggedIn')

describe('Auth – Login', () => {
  it('launches app on Splash or Main activity', async () => {
    const activity = await driver.getCurrentActivity()
    console.log('Current activity:', activity)

    expect(activity).toMatch(/SplashActivity|MainActivity/)
  })

  it('ensures user is logged in', async () => {
    await ensureLoggedIn()
  })
})
