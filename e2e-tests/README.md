# DentiBot AI Browser Testing Agent

Automated end-to-end testing suite for the DentiBot dental practice management application using Playwright.

## Quick Start

### 1. Install Playwright
```bash
# Install Playwright and browsers
npm install -D @playwright/test
npx playwright install
```

### 2. Configure Test Credentials
```bash
# Copy the environment template
cp e2e-tests/.env.example e2e-tests/.env

# Edit with your test account credentials
```

### 3. Run Tests
```bash
# Run all e2e tests
npm run test:e2e

# Run with visual UI (debugging)
npm run test:e2e:ui

# Run specific test suite
npm run test:e2e:auth      # Authentication tests
npm run test:e2e:booking   # Appointment booking tests
npm run test:e2e:dentist   # Dentist portal tests
npm run test:e2e:patient   # Patient portal tests

# Run in headed mode (see browser)
npm run test:e2e:headed

# View test report
npm run test:e2e:report
```

## Test Suites

| Suite | File | Tests |
|-------|------|-------|
| Authentication | `auth.spec.ts` | Login, signup, password reset, session management |
| Booking | `booking.spec.ts` | Public booking, clinic portals, AI triage |
| Dentist Portal | `dentist-portal.spec.ts` | Dashboard, appointments, patients, settings |
| Patient Portal | `patient-portal.spec.ts` | Care home, billing, documents, account |
| Error Handling | `error-handling.spec.ts` | 404 pages, network errors, responsive design |

## Test Structure

```
e2e-tests/
├── .env.example          # Environment template
├── tests/
│   ├── auth.spec.ts           # Authentication tests
│   ├── booking.spec.ts        # Appointment booking tests
│   ├── dentist-portal.spec.ts # Dentist portal tests
│   ├── patient-portal.spec.ts # Patient portal tests
│   └── error-handling.spec.ts # Error & edge case tests
└── utils/
    ├── test-utils.ts     # Shared test utilities
    └── bug-reporter.ts   # Bug reporting utility
```

## Test Coverage

### Authentication (10 tests)
- ✅ Login page loads
- ✅ Successful login with valid credentials
- ✅ Failed login with invalid email
- ✅ Failed login with wrong password
- ✅ Empty form validation
- ✅ Google OAuth button presence
- ✅ Signup form validation
- ✅ Password reset flow
- ✅ Session persistence
- ✅ Logout functionality

### Appointment Booking (12 tests)
- ✅ Booking page loads
- ✅ Date selection from calendar
- ✅ Time slot display
- ✅ AI triage chat accessibility
- ✅ Form validation
- ✅ Clinic portal loading
- ✅ Clinic services display
- ✅ Book button functionality
- ✅ Guest booking flow
- ✅ Unavailable slot handling
- ✅ Network error handling

### Dentist Portal (17 tests)
- ✅ Dashboard loading
- ✅ Today's appointments widget
- ✅ Navigation tabs
- ✅ Quick actions
- ✅ Appointments filtering
- ✅ Appointment details view
- ✅ Confirm appointment action
- ✅ Patient search
- ✅ Patient profile view
- ✅ Patient tabs navigation
- ✅ Profile settings
- ✅ Branding settings
- ✅ Availability settings

### Patient Portal (18 tests)
- ✅ Care home loading
- ✅ Upcoming appointments display
- ✅ Prescriptions page
- ✅ Treatment history
- ✅ Billing page
- ✅ Payment history
- ✅ Documents page
- ✅ Account settings pages
- ✅ Appointment actions

### Error Handling (15 tests)
- ✅ 404 page display
- ✅ 404 navigation options
- ✅ API error handling
- ✅ Offline indicator
- ✅ Form validation errors
- ✅ Session expiry handling
- ✅ Mobile responsive design
- ✅ Tablet responsive design
- ✅ Public pages accessibility
- ✅ Console error monitoring

## Configuration

### Environment Variables

| Variable | Description |
|----------|-------------|
| `TEST_BASE_URL` | Base URL for tests (default: `http://localhost:5173`) |
| `TEST_DENTIST_EMAIL` | Dentist test account email |
| `TEST_DENTIST_PASSWORD` | Dentist test account password |
| `TEST_PATIENT_EMAIL` | Patient test account email |
| `TEST_PATIENT_PASSWORD` | Patient test account password |
| `TEST_CLINIC_SLUG` | Test clinic slug for booking tests |

### Playwright Configuration

Tests are configured to run on:
- Chrome (Desktop)
- Firefox (Desktop)
- Safari/WebKit (Desktop)
- Chrome (Mobile - Pixel 5)
- Safari (Mobile - iPhone 12)
- iPad Pro 11 (Tablet)

## Bug Reporting

Failed tests automatically:
- Capture full-page screenshots
- Record video of the test run
- Collect trace files for debugging
- Log console errors

Reports are saved to `test-results/`:
- `html-report/` - Visual HTML report
- `results.json` - Machine-readable results
- `bugs/` - Bug reports and screenshots

## CI/CD Integration

Add to your GitHub Actions workflow:

```yaml
- name: Install Playwright
  run: npx playwright install --with-deps

- name: Run E2E Tests
  run: npm run test:e2e
  env:
    TEST_BASE_URL: ${{ secrets.TEST_BASE_URL }}
    TEST_DENTIST_EMAIL: ${{ secrets.TEST_DENTIST_EMAIL }}
    TEST_DENTIST_PASSWORD: ${{ secrets.TEST_DENTIST_PASSWORD }}
```

## Creating New Tests

Use the provided test utilities:

```typescript
import { test, expect } from '../utils/test-utils';
import { loginAs, waitForPageReady, captureScreenshot } from '../utils/test-utils';

test('My new test', async ({ page }) => {
  await loginAs(page, 'dentist');
  await page.goto('/dentist/dashboard');
  await waitForPageReady(page);
  
  // Your test logic here
  
  await captureScreenshot(page, 'my-test-screenshot');
});
```
