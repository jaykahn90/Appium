async function loginIOSBrowserStack(email, password) {
  // Wait for the first visible email textfield
  const emailField = await $(
    '-ios predicate string:type == "XCUIElementTypeTextField" AND visible == 1',
  )
  await emailField.waitForDisplayed({ timeout: 30000 })

  // Wait for the first visible password securetextfield
  const passwordField = await $(
    '-ios predicate string:type == "XCUIElementTypeSecureTextField" AND visible == 1',
  )
  await passwordField.waitForDisplayed({ timeout: 30000 })

  // Click email field, optionally clearValue, addValue(email)
  await emailField.click()
  try {
    await emailField.clearValue()
  } catch (e) {
    // ignore if clearValue fails
  }
  await emailField.addValue(email)

  // Click password field, optionally clearValue, addValue(password)
  await passwordField.click()
  try {
    await passwordField.clearValue()
  } catch (e) {
    // ignore if clearValue fails
  }
  await passwordField.addValue(password)

  // Try to tap the keyboard Done button
  try {
    const doneButton = await $('~Done')
    await doneButton.waitForDisplayed({ timeout: 2000 })
    await doneButton.click()
  } catch (e) {
    // Done button not found or not displayed within timeout, continue
  }

  // Wait for login button to be displayed
  const loginButton = await $(
    '-ios predicate string:visible == 1 AND (name CONTAINS "LOG IN" OR label CONTAINS "LOG IN" OR name CONTAINS "Log In" OR label CONTAINS "Log In")',
  )
  await loginButton.waitForDisplayed({ timeout: 30000 })

  // Click the login button
  await loginButton.click()
}

module.exports = { loginIOSBrowserStack }
