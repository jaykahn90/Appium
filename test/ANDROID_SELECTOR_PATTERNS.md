# Android Selector Patterns - Knowledge Base

## Overview

This document serves as a knowledge base for Android test automation selectors. It documents the ID types used for each element, the changes made to fix failing tests, and best practices discovered during troubleshooting.

**Date Created:** January 2026  
**Test Fixed:** `test/specs/android/menu/edit-location-name.spec.js`

---

## Problem Statement

The test was failing because selectors were using **accessibility-id/description** when the actual elements use **resource-id**. This caused "no such element" errors throughout the test flow.

### Root Cause

The Android app uses **resource-id** (Android resource identifiers) for most UI elements, not accessibility identifiers or content descriptions. When selectors used `.description()` or accessibility-id syntax (`~`), they couldn't find the elements.

---

## ID Type Reference

### 1. Resource-ID (Primary Method)
- **Format:** `id=element.id` or `android=new UiSelector().resourceId("element.id")`
- **When to use:** Primary method for most Android elements
- **Example:** `id=sharedHeader.menuButton.button`

### 2. Accessibility-ID
- **Format:** `~accessibility.id` (tilde prefix)
- **When to use:** Only when element explicitly has accessibility identifier set
- **Example:** `~sidebar.locationCard.button`

### 3. Description/Content-Desc
- **Format:** `android=new UiSelector().description("element.description")`
- **When to use:** Fallback option when resource-id is not available
- **Example:** `android=new UiSelector().description("sharedHeader.menuButton.button")`

### 4. Text Selector
- **Format:** `android=new UiSelector().text("Visible Text")`
- **When to use:** For text-based elements or validation
- **Example:** `android=new UiSelector().text("MENU")`

---

## Changes Made

### File 1: `test/helpers/app/ensureLoggedIn.js`

#### Change: Hamburger Menu Selector

**Before:**
```javascript
const SELECTORS = {
  hamburger: 'android=new UiSelector().description("sharedHeader.menuButton.button")',
  // ...
}
```

**After:**
```javascript
const SELECTORS = {
  // Hamburger menu button - use resource-id (not description) with fallback candidates
  hamburgerCandidates: [
    'id=sharedHeader.menuButton.button',
    'android=new UiSelector().resourceId("sharedHeader.menuButton.button")',
    // Fallback to description in case resource-id changes in future builds
    'android=new UiSelector().description("sharedHeader.menuButton.button")',
  ],
  // ...
}
```

**ID Type:** Resource-ID (primary), Description (fallback)  
**Reason:** The hamburger menu button uses resource-id, not description. Changed to resource-id with fallback for reliability.

#### Change: Added Helper Function

**Added:**
```javascript
/**
 * Helper: find first displayed element from candidate selectors
 */
async function findFirstDisplayed(selectors, timeout = 20000, pollMs = 300) {
  const start = Date.now()
  while (Date.now() - start < timeout) {
    for (const sel of selectors) {
      const el = await $(sel)
      const displayed = await el.isDisplayed().catch(() => false)
      if (displayed) return el
    }
    await browser.pause(pollMs)
  }
  throw new Error(
    `None of these selectors became visible within ${timeout}ms:\n${selectors.join('\n')}`,
  )
}
```

**Reason:** Allows trying multiple selector candidates in order, improving reliability when elements might use different ID types.

#### Change: Updated All Hamburger References

**Changed:** All references to `SELECTORS.hamburger` throughout the file to use the candidate array pattern, trying each selector until one is found.

---

### File 2: `test/specs/android/menu/edit-location-name.spec.js`

#### Change 1: Added Pause After Login

**Added:**
```javascript
// Let app finish background loading (hub scan etc.) - similar to other working tests
await browser.pause(7000)
```

**Location:** After `await findFirstDisplayed(SELECTORS.homeReadyCandidates, 60000)`  
**Reason:** Gives the app time to finish background loading (hub scan, etc.) before attempting to interact with UI elements. This pattern is used in other working tests like `knowledge-base-links.spec.js` and `contact-support-inapp.spec.js`.

#### Change 2: Simplified clickFirstReady Function

**Before:**
```javascript
async function clickFirstReady(selectors, timeout = 25000) {
  const el = await findFirstDisplayed(selectors, timeout)
  await el.waitForClickable({ timeout })
  await el.click()
}
```

**After:**
```javascript
async function clickFirstReady(selectors, timeout = 25000) {
  const el = await findFirstDisplayed(selectors, timeout)
  // Wait for element to be displayed and ready (matching pattern from working tests)
  await el.waitForDisplayed({ timeout: 10000 })
  await browser.pause(300) // Small pause to ensure element is ready
  await el.click()
}
```

**Reason:** `waitForClickable()` was causing issues on Android. Simplified to `waitForDisplayed()` with a small pause, matching the pattern used in working tests like `support-center.spec.js`.

#### Change 3: Hamburger Menu Selector

**Before:**
```javascript
hamburgerCandidates: [
  'id=sharedHeader.menuButton.button',
  'android=new UiSelector().resourceId("sharedHeader.menuButton.button")',
],
```

**After:** (No change needed - already using resource-id)  
**ID Type:** Resource-ID  
**Note:** This was already correct, but now matches the pattern in `ensureLoggedIn.js`.

#### Change 4: Current Location Selector

**Before:**
```javascript
currentLocationCandidates: [
  'android=new UiSelector().description("sidebar.locationCard.button")',
  '~sidebar.locationCard.button',
],
```

**After:**
```javascript
currentLocationCandidates: [
  'id=sidebar.activeLocationName.text',
  'android=new UiSelector().resourceId("sidebar.activeLocationName.text")',
  // Fallback to description in case resource-id changes in future builds
  'android=new UiSelector().description("sidebar.locationCard.button")',
  '~sidebar.locationCard.button',
],
```

**ID Type:** Resource-ID (primary), Description/Accessibility-ID (fallback)  
**Reason:** The current location element uses resource-id `sidebar.activeLocationName.text`, not accessibility-id or description.

#### Change 5: Back Button Selector

**Before:**
```javascript
inAppBackCandidates: ['~locationDetails.backButton.button'],
```

**After:**
```javascript
inAppBackCandidates: [
  'id=locationDetails.backButton.button',
  'android=new UiSelector().resourceId("locationDetails.backButton.button")',
  // Fallback to accessibility id in case resource-id changes in future builds
  '~locationDetails.backButton.button',
],
```

**ID Type:** Resource-ID (primary), Accessibility-ID (fallback)  
**Reason:** The back button uses resource-id `locationDetails.backButton.button`, not accessibility-id.

---

## Element-by-Element Breakdown

| Element | Resource-ID | Accessibility-ID | Description | Primary Method |
|---------|-------------|------------------|-------------|----------------|
| **Hamburger Menu** | `sharedHeader.menuButton.button` | ❌ | `sharedHeader.menuButton.button` (fallback) | Resource-ID |
| **Home Marker** | `home.location.icon` | ❌ | ❌ | Resource-ID |
| **Current Location** | `sidebar.activeLocationName.text` | `sidebar.locationCard.button` (fallback) | `sidebar.locationCard.button` (fallback) | Resource-ID |
| **Back Button** | `locationDetails.backButton.button` | `locationDetails.backButton.button` (fallback) | ❌ | Resource-ID |
| **Location Name Input** | `locationDetails.locationName.input` | `locationDetails.locationName.input` (fallback) | ❌ | Resource-ID |
| **Edit Name Button** | ❌ | `Edit name` | ❌ | Accessibility-ID |
| **Save Changes Button** | ❌ | `Save changes` | ❌ | Accessibility-ID |
| **Menu Title** | ❌ | ❌ | ❌ | Text Selector |

---

## Best Practices Discovered

### 1. Always Use Resource-ID as Primary Selector

**Rule:** For Android elements, always check if resource-id exists first. Use it as the primary selector method.

**Why:** Most Android elements use resource-id, not accessibility identifiers. Resource-ids are more stable and reliable.

### 2. Use Fallback Candidates Pattern

**Pattern:**
```javascript
elementCandidates: [
  'id=element.resource.id',                                    // Primary: resource-id
  'android=new UiSelector().resourceId("element.resource.id")', // Alternative format
  '~element.accessibility.id',                                  // Fallback: accessibility-id
  'android=new UiSelector().description("element.description")', // Fallback: description
],
```

**Why:** Provides resilience if the app changes ID types in future builds. The `findFirstDisplayed()` helper tries each selector in order.

### 3. Add Pause After Login

**Pattern:**
```javascript
await ensureLoggedIn()
await driver.switchContext('NATIVE_APP')
await findFirstDisplayed(SELECTORS.homeReadyCandidates, 60000)
await browser.pause(7000) // Let app finish background loading
```

**Why:** Gives the app time to complete background tasks (hub scan, data loading, etc.) before interacting with UI elements.

### 4. Use waitForDisplayed Instead of waitForClickable

**Pattern:**
```javascript
await el.waitForDisplayed({ timeout: 10000 })
await browser.pause(300) // Small pause to ensure element is ready
await el.click()
```

**Why:** `waitForClickable()` can be unreliable on Android. `waitForDisplayed()` with a small pause is more reliable.

### 5. Verify ID Type in Inspector

**Process:**
1. Use Appium Inspector or UI Automator Viewer
2. Check the element's properties
3. Look for `resource-id` attribute (not `content-desc` or `accessibility-id`)
4. Use the appropriate selector format

**Example:** If Inspector shows `id=sharedHeader.menuButton.button`, use:
- `id=sharedHeader.menuButton.button` ✅
- NOT `~sharedHeader.menuButton.button` ❌
- NOT `android=new UiSelector().description("sharedHeader.menuButton.button")` ❌

---

## Common Patterns

### Pattern 1: Resource-ID with Fallbacks
```javascript
elementCandidates: [
  'id=element.id',
  'android=new UiSelector().resourceId("element.id")',
  '~element.accessibility.id', // fallback
  'android=new UiSelector().description("element.description")', // fallback
],
```

### Pattern 2: Using findFirstDisplayed Helper
```javascript
const el = await findFirstDisplayed(SELECTORS.elementCandidates, 25000)
await el.waitForDisplayed({ timeout: 10000 })
await el.click()
```

### Pattern 3: Click with Retry Logic
```javascript
async function clickFirstReady(selectors, timeout = 25000) {
  const el = await findFirstDisplayed(selectors, timeout)
  await el.waitForDisplayed({ timeout: 10000 })
  await browser.pause(300) // Small pause to ensure element is ready
  await el.click()
}
```

---

## Troubleshooting Guide

### Issue: "no such element" error

**Checklist:**
1. ✅ Verify the element uses resource-id (check in Inspector)
2. ✅ Use `id=` or `resourceId()` format for resource-ids
3. ✅ Add fallback candidates (accessibility-id, description)
4. ✅ Ensure element is visible before interacting (add pause if needed)
5. ✅ Check if element needs time to load (add `browser.pause()`)

### Issue: Element found but click fails

**Solutions:**
1. Replace `waitForClickable()` with `waitForDisplayed()` + pause
2. Add `browser.pause(300)` before click
3. Ensure app has finished loading (add longer pause after login)

### Issue: Test timing out

**Solutions:**
1. Increase timeout values
2. Add pauses after state changes (login, navigation)
3. Verify selectors are correct (resource-id vs accessibility-id)

---

## Files Modified

1. **`test/helpers/app/ensureLoggedIn.js`**
   - Changed hamburger selector from description to resource-id
   - Added `findFirstDisplayed()` helper function
   - Updated all hamburger references to use candidate array

2. **`test/specs/android/menu/edit-location-name.spec.js`**
   - Added 7000ms pause after login
   - Simplified `clickFirstReady()` function
   - Updated current location selector to resource-id
   - Updated back button selector to resource-id

---

## Key Takeaways

1. **Resource-ID is King:** Most Android elements use resource-id, not accessibility-id or description
2. **Always Verify in Inspector:** Check the actual ID type before writing selectors
3. **Use Fallback Pattern:** Include multiple selector candidates for reliability
4. **Add Appropriate Pauses:** Give the app time to load and settle before interactions
5. **Simplify Click Logic:** Use `waitForDisplayed()` + pause instead of `waitForClickable()`

---

## Future Reference

When encountering similar issues:
1. Check Inspector for actual ID type (resource-id vs accessibility-id vs description)
2. Update selectors to use resource-id as primary
3. Add fallback candidates for resilience
4. Add pauses after state changes (login, navigation)
5. Simplify click logic if `waitForClickable()` fails

---

**Last Updated:** January 2026  
**Test Status:** ✅ Passing
