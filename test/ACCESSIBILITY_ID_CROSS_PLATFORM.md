# Accessibility IDs for Cross-Platform Uniformity - Knowledge Base

## Overview

This document explains the strategy for using accessibility IDs as primary selectors to enable cross-platform test uniformity between Android and iOS. It documents how accessibility IDs work across both platforms, the fallback pattern used during transition, and best practices for implementing cross-platform tests.

**Date Created:** January 2026  
**Related Files:** 
- `test/helpers/app/ensureLoggedIn.js`
- `test/specs/android/menu/stable-location-tests/edit-location-name.spec.js`

---

## Why Accessibility IDs for Cross-Platform?

### The Problem

Previously, Android tests used resource-id selectors (`id=element.id`) which are Android-specific. iOS tests use accessibility identifiers. This created platform-specific test code that couldn't be shared, leading to:

- Duplicate test code for Android and iOS
- Different selector strategies for the same functionality
- Increased maintenance burden
- Slower test development for multiple platforms

### The Solution

By using accessibility IDs as primary selectors, we can write tests that work on both Android and iOS with minimal platform-specific code.

---

## How Accessibility IDs Work Across Platforms

### Android Implementation

On Android, accessibility IDs map to the `content-desc` attribute:

```
Android: accessibilityLabel → content-desc → Appium shows as "accessibility id"
```

**Appium Selector:** `~accessibility.id` (tilde prefix)

**Example:**
```javascript
// In Android app code
imageView.setContentDescription("sharedHeader.menuButton.button")

// In test code
const hamburger = await $('~sharedHeader.menuButton.button')
```

### iOS Implementation

On iOS, accessibility IDs map to the `accessibilityIdentifier` property:

```
iOS: testID → accessibilityIdentifier → Appium shows as "accessibility id"
```

**Appium Selector:** `~accessibility.id` (same tilde prefix)

**Example:**
```swift
// In iOS app code
button.accessibilityIdentifier = "sharedHeader.menuButton.button"

// In test code (same as Android!)
const hamburger = await $('~sharedHeader.menuButton.button')
```

### Key Insight

**The same selector works on both platforms!** This enables true cross-platform test code.

---

## Our Implementation Strategy

### Primary Pattern: Accessibility ID with Fallbacks

Since accessibility IDs are being rolled out, we use a **primary-with-fallback** pattern:

```javascript
const SELECTORS = {
  hamburgerCandidates: [
    '~sharedHeader.menuButton.button',           // Primary: accessibility ID (cross-platform)
    'id=sharedHeader.menuButton.button',         // Fallback 1: Android resource-id
    'android=new UiSelector().resourceId("...")', // Fallback 2: Android UiSelector
    'android=new UiSelector().description("...")', // Fallback 3: Android description
  ],
}
```

### Why This Pattern?

1. **Future-proof:** Once accessibility IDs are fully implemented, tests will automatically use them
2. **Backward-compatible:** Tests continue to work on current Android builds using resource-ids
3. **Cross-platform ready:** When iOS tests are written, they can use the same selectors
4. **Gradual migration:** No need to update all tests at once - they work during transition

---

## Selector Priority Order

When using candidate arrays, selectors are tried in this order:

1. **Accessibility ID** (`~accessibility.id`) - Cross-platform, preferred
2. **Resource-ID** (`id=element.id`) - Android-specific, current fallback
3. **UiSelector ResourceId** (`android=new UiSelector().resourceId(...)`) - Android alternative format
4. **Description** (`android=new UiSelector().description(...)`) - Android fallback

The `findFirstDisplayed()` helper tries each selector until one finds a displayed element.

---

## Real-World Examples

### Example 1: Hamburger Menu Button

**Location:** `test/helpers/app/ensureLoggedIn.js`

```javascript
const SELECTORS = {
  // Hamburger menu button - use accessibility ID for cross-platform uniformity
  // Fallbacks for backwards compatibility during transition
  hamburgerCandidates: [
    '~sharedHeader.menuButton.button',
    'id=sharedHeader.menuButton.button',
    'android=new UiSelector().resourceId("sharedHeader.menuButton.button")',
    'android=new UiSelector().description("sharedHeader.menuButton.button")',
  ],
}
```

**Usage:**
```javascript
const hamburger = await findFirstDisplayed(SELECTORS.hamburgerCandidates, 20000)
await hamburger.click()
```

### Example 2: Home Location Icon

**Location:** `test/specs/android/menu/stable-location-tests/edit-location-name.spec.js`

```javascript
const SELECTORS = {
  // Home readiness marker - use accessibility ID with fallbacks
  homeReadyCandidates: [
    '~home.location.icon',
    'id=home.location.icon',
    'android=new UiSelector().resourceId("home.location.icon")',
  ],
}
```

### Example 3: Location Name Input Field

```javascript
const SELECTORS = {
  // Location name input field - use accessibility ID with fallbacks
  locationNameInputCandidates: [
    '~locationDetails.locationName.input',
    'id=locationDetails.locationName.input',
    'android=new UiSelector().resourceId("locationDetails.locationName.input")',
  ],
}
```

### Example 4: Edit Pencil Icon

```javascript
const SELECTORS = {
  // Edit pencil icon on Location Name screen - use accessibility ID with fallback
  editNameCandidates: [
    '~locationDetails.locationName.pencillcon.button',
    'id=locationDetails.locationName.pencillcon.button',
    'android=new UiSelector().resourceId("locationDetails.locationName.pencillcon.button")',
    // Fallback to text-based selector
    '~Edit name',
  ],
}
```

### Example 5: Save Check Icon (Note: Capital I)

```javascript
const SELECTORS = {
  // Confirm/save check icon - use accessibility ID with fallbacks
  // NOTE: Accessibility ID uses capital "I" in checkIcon, but resource-id may use lowercase
  saveNameCandidates: [
    '~locationDetails.locationName.checkIcon.button',  // Capital I
    'id=locationDetails.locationName.checkicon.button', // Lowercase i (resource-id)
    'android=new UiSelector().resourceId("locationDetails.locationName.checkicon.button")',
    // Fallback to text-based selector
    '~Save changes',
  ],
}
```

**Important:** Watch for case sensitivity differences between accessibility IDs and resource-ids!

---

## Element Reference Table

| Element | Accessibility ID | Resource-ID | Cross-Platform Ready |
|---------|-----------------|-------------|---------------------|
| **Hamburger Menu** | `sharedHeader.menuButton.button` | `sharedHeader.menuButton.button` | ✅ Yes |
| **Home Location Icon** | `home.location.icon` | `home.location.icon` | ✅ Yes |
| **Right Button/Home Marker** | `sharedHeader.rightButton.button` | `sharedHeader.rightButton.button` | ✅ Yes |
| **Current Location Name** | `sidebar.activeLocationName.text` | `sidebar.activeLocationName.text` | ✅ Yes |
| **Location Card Button** | `sidebar.locationCard.button` | ❌ | ✅ Yes |
| **Back Button** | `locationDetails.backButton.button` | `locationDetails.backButton.button` | ✅ Yes |
| **Location Name Input** | `locationDetails.locationName.input` | `locationDetails.locationName.input` | ✅ Yes |
| **Pencil Edit Icon** | `locationDetails.locationName.pencillcon.button` | `locationDetails.locationName.pencillcon.button` | ✅ Yes |
| **Check Save Icon** | `locationDetails.locationName.checkIcon.button` | `locationDetails.locationName.checkicon.button` | ⚠️ Case difference |
| **Login Button** | ❌ (not yet set) | ❌ | ❌ No - using text selector |
| **Menu Title** | ❌ (not yet set) | ❌ | ❌ No - using text selector |

**Legend:**
- ✅ Fully cross-platform ready
- ⚠️ Works but has platform differences (case sensitivity)
- ❌ Not yet available, using platform-specific selectors

---

## Best Practices

### 1. Always Prefer Accessibility IDs

**Rule:** Use accessibility IDs as the first selector in candidate arrays.

```javascript
// ✅ Good
elementCandidates: [
  '~element.accessibility.id',  // Primary
  'id=element.resource.id',     // Fallback
]

// ❌ Avoid (unless accessibility ID not yet available)
elementCandidates: [
  'id=element.resource.id',     // Platform-specific
  '~element.accessibility.id',  // Should be primary
]
```

### 2. Use Descriptive Candidate Arrays

**Pattern:**
```javascript
const SELECTORS = {
  // Clear comment explaining purpose
  elementCandidates: [
    '~element.accessibility.id',           // Primary: accessibility ID (cross-platform)
    'id=element.resource.id',              // Fallback: Android resource-id
    'android=new UiSelector().resourceId("element.resource.id")', // Alternative format
  ],
}
```

### 3. Use the findFirstDisplayed Helper

**Always use the helper function to try candidates in order:**

```javascript
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

**Usage:**
```javascript
const element = await findFirstDisplayed(SELECTORS.elementCandidates, 25000)
await element.click()
```

### 4. Handle Case Sensitivity Differences

Some elements may have case differences between accessibility IDs and resource-ids:

```javascript
// Accessibility ID: checkIcon (capital I)
// Resource-ID: checkicon (lowercase i)
saveNameCandidates: [
  '~locationDetails.locationName.checkIcon.button',  // Accessibility ID
  'id=locationDetails.locationName.checkicon.button', // Resource-ID (different case)
]
```

### 5. Document Elements Without Accessibility IDs

When accessibility IDs aren't available yet, document why platform-specific selectors are used:

```javascript
// Login button - accessibility ID not yet available, using text selector
loginBtn: 'android=new UiSelector().textMatches("(?i)log\\s?in|sign\\s?in")',
```

### 6. Group Selectors by Feature Area

Organize selectors logically:

```javascript
const SELECTORS = {
  // Header elements
  hamburgerCandidates: [...],
  homeMarkerCandidates: [...],
  
  // Menu/Drawer elements
  currentLocationCandidates: [...],
  locationCardCandidates: [...],
  
  // Location details elements
  backButtonCandidates: [...],
  locationNameInputCandidates: [...],
  editNameCandidates: [...],
  saveNameCandidates: [...],
}
```

---

## Migration Guide

### Step 1: Identify Elements with Accessibility IDs

1. Use Appium Inspector or UI Automator Viewer
2. Check the "Selected Element" tab
3. Look for `accessibility id` in the "Find By" section
4. Note the exact value (watch for case differences!)

### Step 2: Update Selector Arrays

Replace resource-id primary selectors with accessibility ID primary:

**Before:**
```javascript
hamburgerCandidates: [
  'id=sharedHeader.menuButton.button',
  'android=new UiSelector().resourceId("sharedHeader.menuButton.button")',
]
```

**After:**
```javascript
hamburgerCandidates: [
  '~sharedHeader.menuButton.button',           // New: accessibility ID primary
  'id=sharedHeader.menuButton.button',         // Keep: resource-id as fallback
  'android=new UiSelector().resourceId("sharedHeader.menuButton.button")',
  'android=new UiSelector().description("sharedHeader.menuButton.button")', // Additional fallback
]
```

### Step 3: Test on Android First

1. Run tests on Android to ensure fallbacks work
2. Verify tests pass with the new selector order
3. Accessibility IDs may not work yet, but fallbacks should

### Step 4: Test on iOS (When Available)

1. Use the same selector arrays
2. Accessibility IDs should work natively on iOS
3. Fallback selectors will be ignored (iOS doesn't support resource-id)

### Step 5: Clean Up Fallbacks (Future)

Once accessibility IDs are fully implemented across all elements:

```javascript
// Future: Simplified selector (accessibility IDs only)
hamburgerCandidates: [
  '~sharedHeader.menuButton.button',
]
```

---

## Troubleshooting

### Issue: Accessibility ID not found

**Symptoms:**
```
Error: no such element
COMMAND findElement("accessibility id", "sharedHeader.menuButton.button")
```

**Solution:**
- Verify accessibility ID is set in app code
- Check Inspector for exact accessibility ID value
- Ensure fallback selectors are included
- Test should automatically fall back to resource-id

**Check:**
```javascript
// Test should have fallbacks
hamburgerCandidates: [
  '~sharedHeader.menuButton.button',  // Will try this first
  'id=sharedHeader.menuButton.button', // Falls back to this if above fails
]
```

### Issue: Test works on Android but fails on iOS

**Symptoms:**
- Test passes on Android (using resource-id fallback)
- Test fails on iOS (accessibility ID not found)

**Solution:**
- Verify accessibility ID is set in iOS app code
- Check that iOS uses same accessibility ID as Android
- Ensure `accessibilityIdentifier` matches Android `content-desc`

### Issue: Case sensitivity errors

**Symptoms:**
- Accessibility ID: `checkIcon` (capital I)
- Resource-ID: `checkicon` (lowercase i)
- Selector fails with one but works with the other

**Solution:**
- Include both variations in candidate array
- Place accessibility ID version first
- Document the case difference in comments

```javascript
saveNameCandidates: [
  '~locationDetails.locationName.checkIcon.button',  // Accessibility ID (capital I)
  'id=locationDetails.locationName.checkicon.button', // Resource-ID (lowercase i)
]
```

---

## Common Patterns

### Pattern 1: Standard Element with Full Fallbacks

```javascript
elementCandidates: [
  '~element.accessibility.id',                      // Primary: accessibility ID
  'id=element.resource.id',                         // Fallback 1: resource-id
  'android=new UiSelector().resourceId("element.resource.id")', // Fallback 2: UiSelector
  'android=new UiSelector().description("element.description")', // Fallback 3: description
]
```

### Pattern 2: Element with Case Sensitivity Issue

```javascript
elementCandidates: [
  '~element.checkIcon.button',       // Accessibility ID (capital I)
  'id=element.checkicon.button',     // Resource-ID (lowercase i)
  'android=new UiSelector().resourceId("element.checkicon.button")',
]
```

### Pattern 3: Element Without Accessibility ID Yet

```javascript
// Element - accessibility ID not yet available, using platform-specific selector
elementCandidates: [
  'id=element.resource.id',
  'android=new UiSelector().resourceId("element.resource.id")',
  // TODO: Add '~element.accessibility.id' when available in app
]
```

### Pattern 4: Using findFirstDisplayed Helper

```javascript
async function findFirstDisplayed(selectors, timeout = 25000, pollMs = 300) {
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

// Usage
const element = await findFirstDisplayed(SELECTORS.elementCandidates, 25000)
await element.click()
```

---

## iOS Test Preparation

When creating iOS tests, you can reuse the same selectors:

### Android Test (Current)
```javascript
const hamburger = await findFirstDisplayed(SELECTORS.hamburgerCandidates, 20000)
await hamburger.click()
```

### iOS Test (Future)
```javascript
// Same code works! iOS will use the accessibility ID directly
const hamburger = await findFirstDisplayed(SELECTORS.hamburgerCandidates, 20000)
await hamburger.click()
```

**Note:** On iOS, fallback selectors (resource-id, UiSelector) will simply not match, but the accessibility ID selector should work.

---

## Verification Checklist

When updating selectors to use accessibility IDs:

- [ ] Accessibility ID verified in Appium Inspector
- [ ] Accessibility ID placed as first selector in candidate array
- [ ] Resource-id fallbacks included for backward compatibility
- [ ] Case sensitivity checked (accessibility ID vs resource-id)
- [ ] Test passes on Android (using fallback if needed)
- [ ] Test ready for iOS (accessibility ID will work natively)
- [ ] Comments added explaining selector purpose
- [ ] Documented any elements without accessibility IDs yet

---

## Future State

### Current State (Transition Period)
- Accessibility IDs are primary selectors
- Resource-id fallbacks ensure backward compatibility
- Tests work on Android using fallbacks
- Tests ready for iOS using accessibility IDs

### Future State (Full Implementation)
- All elements have accessibility IDs
- Fallbacks can be removed
- Same tests work on both Android and iOS
- No platform-specific selector code needed

---

## Key Takeaways

1. **Accessibility IDs enable cross-platform tests:** Same selectors work on Android and iOS
2. **Use fallback pattern during transition:** Ensures tests work before accessibility IDs are fully implemented
3. **Priority order matters:** Try accessibility ID first, then platform-specific fallbacks
4. **Watch for case sensitivity:** Some elements have different casing between platforms
5. **Future-proof your tests:** Start using accessibility IDs now, even if fallbacks are needed
6. **Document missing IDs:** Clearly mark elements that don't have accessibility IDs yet

---

## References

- [Appium Accessibility ID Documentation](http://appium.io/docs/en/commands/element/find-elements/#accessibility-id)
- [Android Content Description](https://developer.android.com/reference/android/view/View#setContentDescription(java.lang.CharSequence))
- [iOS Accessibility Identifier](https://developer.apple.com/documentation/objectivec/nsobject/1615081-accessibilityidentifier)
- Related: `test/ANDROID_SELECTOR_PATTERNS.md` for Android-specific selector patterns

---

**Last Updated:** January 2026  
**Test Status:** ✅ Passing (with fallbacks)  
**Cross-Platform Status:** ✅ Ready for iOS implementation
