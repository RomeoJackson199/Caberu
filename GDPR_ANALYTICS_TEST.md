# GDPR Analytics Compliance Testing Guide

## ✅ What Was Fixed

### Critical Changes:
1. **Removed unconditional GA/GTM loading** from `index.html`
2. **Added consent-first analytics** - Scripts only load AFTER user accepts
3. **Cookie removal on rejection** - GA/GTM cookies deleted when user clicks "Essential Only"
4. **Created Cookie Policy pages** in 3 languages (EN, FR, NL)
5. **Translated Privacy Policy** to French and Dutch

---

## 🧪 How to Test (CRITICAL)

### Test 1: No Tracking Without Consent

**Steps:**
1. Open site in **private/incognito window** (to clear existing consent)
2. Navigate to `https://caberu.be` (or localhost)
3. **DO NOT click any consent buttons**
4. Open DevTools → Application → Cookies
5. **Expected Result:** ❌ NO `_ga`, `_gid`, or `_ga_*` cookies present
6. Open DevTools → Network tab
7. **Expected Result:** ❌ NO requests to `google-analytics.com` or `googletagmanager.com`

✅ **PASS:** Site loads without any analytics tracking
❌ **FAIL:** If you see GA/GTM cookies or network requests → GDPR violation

---

### Test 2: Analytics Load After Acceptance

**Steps:**
1. Open site in **private/incognito window**
2. Click **"Accept All"** on cookie banner
3. Wait 2 seconds
4. Open DevTools → Application → Cookies
5. **Expected Result:** ✅ `_ga`, `_gid`, and `_ga_G-9LGVN77ZBR` cookies ARE present
6. Open DevTools → Network tab → Filter "gtm" or "gtag"
7. **Expected Result:** ✅ Requests to `googletagmanager.com` and `google-analytics.com`

✅ **PASS:** Analytics loads only after consent
❌ **FAIL:** If analytics doesn't load → Implementation error

---

### Test 3: Cookie Removal on Rejection

**Steps:**
1. Open site in **private/incognito window**
2. Click **"Accept All"** to load analytics
3. Verify cookies are set (see Test 2)
4. Go to `/cookies` page
5. Click **"Change Cookie Preferences"** button
6. Click **"Necessary Only"** or **"Reject All"**
7. Open DevTools → Application → Cookies
8. **Expected Result:** ❌ All GA/GTM cookies should be REMOVED

✅ **PASS:** Cookies deleted on rejection
❌ **FAIL:** If GA cookies remain → Privacy violation

---

### Test 4: Cookie Policy Pages Exist

**Test all language versions:**

```bash
# English
https://caberu.be/cookies

# French
https://caberu.be/fr/cookies

# Dutch
https://caberu.be/nl/cookies
```

**Expected:** Each page loads with:
- List of all cookies (essential, analytics, marketing)
- Purpose and duration for each cookie
- "Change Cookie Preferences" button
- Links to Privacy Policy

---

### Test 5: Privacy Policy Translations

**Test all language versions:**

```bash
# English (existing)
https://caberu.be/privacy

# French (NEW)
https://caberu.be/fr/privacy

# Dutch (NEW)
https://caberu.be/nl/privacy
```

**Expected:** Each page loads with complete translations of:
- Who We Are
- GDPR roles (Controller/Processor)
- Data collection details
- Legal basis tables
- User rights (GDPR Art. 15-21)
- Contact information

---

## 🔍 Technical Implementation Details

### Files Changed:

1. **`index.html`**
   - ❌ REMOVED: Unconditional GA/GTM script loading
   - ✅ ADDED: Consent mode default (denied)

2. **`src/lib/googleAnalytics.ts`** (NEW)
   - Dynamic script loader for GA/GTM
   - Cookie removal function
   - Consent mode updater
   - Initialization from localStorage

3. **`src/components/CookieConsent.tsx`**
   - Updated to call `handleAnalyticsConsent()`
   - Triggers script loading or cookie removal

4. **`src/main.tsx`**
   - Added `initializeAnalyticsFromConsent()` on app load
   - Checks saved consent before loading analytics

### Cookie Consent Flow:

```
1. User visits site
   ↓
2. index.html sets consent mode = DENIED
   ↓
3. No GA/GTM scripts load
   ↓
4. User clicks "Accept All"
   ↓
5. CookieConsent calls handleAnalyticsConsent(true)
   ↓
6. googleAnalytics.ts loads GA/GTM scripts dynamically
   ↓
7. Consent mode updates to GRANTED
   ↓
8. Analytics start tracking
```

### Cookie Removal Flow:

```
1. User clicks "Essential Only" or "Reject All"
   ↓
2. CookieConsent calls handleAnalyticsConsent(false)
   ↓
3. Consent mode updates to DENIED
   ↓
4. removeAnalyticsCookies() runs
   ↓
5. All _ga*, _gid, _gat* cookies deleted
   ↓
6. No tracking occurs
```

---

## 🚨 Common Issues

### Issue: Analytics still loading without consent
**Cause:** Browser cached old index.html with unconditional scripts
**Fix:** Hard refresh (Ctrl+Shift+R) or clear browser cache

### Issue: Cookies not being removed
**Cause:** Domain/path mismatch in cookie deletion
**Fix:** Check `removeAnalyticsCookies()` includes all cookie paths

### Issue: Consent banner not showing
**Cause:** localStorage already has consent from previous session
**Fix:** Clear localStorage or test in private window

---

## ✅ GDPR Compliance Checklist

- [x] Analytics scripts do NOT load before consent
- [x] Default consent mode set to DENIED
- [x] Cookie banner appears before any tracking
- [x] "Essential Only" option available
- [x] Cookie Policy page exists in 3 languages (EN/FR/NL)
- [x] Privacy Policy translated to French and Dutch
- [x] Cookies removed when user rejects analytics
- [x] User can withdraw consent at any time (/cookies page)
- [x] IP anonymization enabled for Google Analytics

---

## 📋 Next Steps (Optional Improvements)

1. **Add cookie consent to footer links**
   - Add "Cookie Settings" link to Footer component

2. **Test with real Google Analytics**
   - Deploy to staging environment
   - Verify GA4 dashboard shows events only after consent

3. **Document for legal team**
   - Share this test guide with legal/compliance team
   - Get approval for Cookie Policy wording

4. **Monitor compliance**
   - Set up alerts for GA requests without consent
   - Regular audits of cookie behavior

---

## 🎯 Success Criteria (DONE WHEN)

✅ Open site in private window
✅ Do nothing
✅ Check cookies → NO `_ga` or GTM cookies
✅ Check network → NO GA/GTM requests

**Result:** GDPR compliant! 🎉

---

## 📞 Support

For questions about this implementation:
- Technical: Check `src/lib/googleAnalytics.ts`
- Legal: Review Cookie Policy at `/cookies`
- Testing: Follow tests above

**Important:** Always test in private/incognito mode to simulate first-time visitors without existing consent.
