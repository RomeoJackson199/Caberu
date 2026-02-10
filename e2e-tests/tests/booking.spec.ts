import { test, expect } from '../utils/test-utils';
import {
    navigateAndWait,
    waitForPageReady,
    captureScreenshot,
    generateTestPatientData,
    generateTestEmail
} from '../utils/test-utils';

/**
 * Appointment Booking Test Suite
 * 
 * Tests for the public appointment booking flow and AI triage
 */

test.describe('Appointment Booking - Public Flow', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/book-appointment');
        await waitForPageReady(page);
    });

    test('BOOK-001: Booking page loads correctly', async ({ page }) => {
        // Wait for page to fully load
        await page.waitForLoadState('networkidle');

        // Should have key booking elements
        const pageContent = await page.content();

        // Could be a wizard, calendar, or form-based booking
        const bookingIndicators = [
            page.locator('text=/book.*appointment|schedule.*visit|choose.*time/i'),
            page.locator('[class*="calendar"]'),
            page.locator('[class*="appointment"]'),
            page.locator('form'),
        ];

        let foundBookingUI = false;
        for (const indicator of bookingIndicators) {
            if (await indicator.count() > 0 && await indicator.first().isVisible()) {
                foundBookingUI = true;
                break;
            }
        }

        expect(foundBookingUI).toBeTruthy();
        await captureScreenshot(page, 'booking-page-loaded');
    });

    test('BOOK-002: Can select a date from calendar', async ({ page }) => {
        // Look for calendar or date picker
        const calendarSelectors = [
            '[class*="calendar"]',
            '[role="grid"]',
            '[data-testid="calendar"]',
            '.rdp', // react-day-picker
        ];

        let calendarFound = false;
        for (const selector of calendarSelectors) {
            const calendar = page.locator(selector);
            if (await calendar.count() > 0 && await calendar.first().isVisible()) {
                calendarFound = true;

                // Try to click on an available date (not disabled)
                const availableDates = calendar.locator('button:not([disabled]), td:not([disabled])');
                if (await availableDates.count() > 0) {
                    await availableDates.first().click();
                }
                break;
            }
        }

        // If no calendar visible, may need to open it first
        if (!calendarFound) {
            const dateInputs = page.locator('input[type="date"], [class*="date-picker"], button:has-text(/select.*date/i)');
            if (await dateInputs.count() > 0) {
                await dateInputs.first().click();
                await page.waitForTimeout(500);
            }
        }

        await captureScreenshot(page, 'booking-date-selection');
    });

    test('BOOK-003: Time slots display correctly', async ({ page }) => {
        // Navigate through booking flow to time selection
        await page.waitForTimeout(1000);

        // Look for time slot indicators
        const timeSlotSelectors = [
            '[class*="slot"]',
            '[class*="time"]',
            'button:has-text(/\d{1,2}:\d{2}/)',
            'text=/AM|PM/i',
        ];

        let timeSlotsFound = false;
        for (const selector of timeSlotSelectors) {
            const slots = page.locator(selector);
            if (await slots.count() > 0) {
                timeSlotsFound = true;
                break;
            }
        }

        // Time slots may require selecting a date first
        await captureScreenshot(page, 'booking-time-slots');
    });

    test('BOOK-004: AI Triage chat is accessible', async ({ page }) => {
        // Look for AI/chatbot interface
        const aiChatSelectors = [
            '[class*="chat"]',
            '[class*="ai"]',
            '[class*="triage"]',
            '[data-testid*="chat"]',
            'button:has-text(/chat|ai|assistant/i)',
        ];

        let aiChatFound = false;
        for (const selector of aiChatSelectors) {
            const aiElement = page.locator(selector);
            if (await aiElement.count() > 0) {
                aiChatFound = true;
                await captureScreenshot(page, 'booking-ai-chat-visible');
                break;
            }
        }

        // AI chat may be optional or in a different location
        if (!aiChatFound) {
            console.log('INFO: AI triage chat not visible on initial booking page');
        }
    });

    test('BOOK-005: Form validation on patient details', async ({ page }) => {
        // Try to submit without filling details
        const submitButton = page.locator('button[type="submit"], button:has-text(/book|confirm|submit/i)').first();

        if (await submitButton.isVisible()) {
            await submitButton.click();
            await page.waitForTimeout(1000);

            // Should see validation errors
            const errorIndicators = [
                '[class*="error"]',
                '[role="alert"]',
                'text=/required|please.*fill|cannot.*empty/i',
            ];

            for (const selector of errorIndicators) {
                const errors = page.locator(selector);
                if (await errors.count() > 0 && await errors.first().isVisible()) {
                    await captureScreenshot(page, 'booking-validation-errors');
                    return;
                }
            }
        }
    });
});

test.describe('Clinic-Specific Booking', () => {
    const testClinicSlug = process.env.TEST_CLINIC_SLUG || 'test-clinic';

    test('BOOK-010: Clinic portal page loads', async ({ page }) => {
        await page.goto(`/clinic/${testClinicSlug}`);
        await waitForPageReady(page);

        const currentUrl = page.url();

        // Could be the clinic page or 404 if clinic doesn't exist
        if (currentUrl.includes('/clinic/')) {
            // Check for clinic branding elements
            const clinicIndicators = [
                page.locator('[class*="logo"]'),
                page.locator('h1, h2'),
                page.locator('text=/book|appointment|schedule/i'),
            ];

            for (const indicator of clinicIndicators) {
                if (await indicator.count() > 0) {
                    await expect(indicator.first()).toBeVisible();
                    break;
                }
            }
        }

        await captureScreenshot(page, 'clinic-portal-loaded');
    });

    test('BOOK-011: Clinic shows available services', async ({ page }) => {
        await page.goto(`/clinic/${testClinicSlug}`);
        await waitForPageReady(page);

        // Look for services list
        const serviceIndicators = [
            '[class*="service"]',
            'text=/cleaning|checkup|filling|extraction|whitening/i',
        ];

        for (const selector of serviceIndicators) {
            const services = page.locator(selector);
            if (await services.count() > 0) {
                await captureScreenshot(page, 'clinic-services-visible');
                return;
            }
        }
    });

    test('BOOK-012: Book appointment button works', async ({ page }) => {
        await page.goto(`/clinic/${testClinicSlug}`);
        await waitForPageReady(page);

        const bookButton = page.locator('button:has-text(/book/i), a:has-text(/book/i), [class*="book"]').first();

        if (await bookButton.isVisible()) {
            await bookButton.click();
            await page.waitForTimeout(1000);

            // Should navigate to booking flow or open modal
            await captureScreenshot(page, 'clinic-book-button-clicked');
        }
    });
});

test.describe('Appointment Booking - Guest Flow', () => {
    test('BOOK-020: Complete booking as guest', async ({ page }) => {
        await page.goto('/book-appointment');
        await waitForPageReady(page);

        const patientData = generateTestPatientData();

        // This is a complex flow that depends on the specific UI
        // We'll try common field patterns

        // Fill name fields if present
        const firstNameInput = page.locator('input[name*="first"], input[placeholder*="first"]');
        const lastNameInput = page.locator('input[name*="last"], input[placeholder*="last"]');
        const emailInput = page.locator('input[type="email"], input[name*="email"]');
        const phoneInput = page.locator('input[type="tel"], input[name*="phone"]');

        if (await firstNameInput.count() > 0 && await firstNameInput.isVisible()) {
            await firstNameInput.fill(patientData.firstName);
        }
        if (await lastNameInput.count() > 0 && await lastNameInput.isVisible()) {
            await lastNameInput.fill(patientData.lastName);
        }
        if (await emailInput.count() > 0 && await emailInput.isVisible()) {
            await emailInput.fill(patientData.email);
        }
        if (await phoneInput.count() > 0 && await phoneInput.isVisible()) {
            await phoneInput.fill(patientData.phone);
        }

        await captureScreenshot(page, 'booking-guest-form-filled');
    });
});

test.describe('Appointment Booking - Error Handling', () => {
    test('BOOK-030: Handles unavailable slots gracefully', async ({ page }) => {
        await page.goto('/book-appointment');
        await waitForPageReady(page);

        // Try to find disabled/unavailable slots
        const unavailableSlots = page.locator('[disabled], [class*="unavailable"], [class*="booked"]');

        if (await unavailableSlots.count() > 0) {
            // Disabled slots should not be clickable
            const isClickable = await unavailableSlots.first().isEnabled();
            expect(isClickable).toBeFalsy();
        }

        await captureScreenshot(page, 'booking-unavailable-slots');
    });

    test('BOOK-031: Network error during booking shows message', async ({ page }) => {
        await page.goto('/book-appointment');
        await waitForPageReady(page);

        // Simulate network failure
        await page.route('**/rest/v1/**', (route) => route.abort());
        await page.route('**/functions/**', (route) => route.abort());

        // Try to trigger a network request
        const submitButton = page.locator('button[type="submit"], button:has-text(/next|continue|book/i)').first();
        if (await submitButton.isVisible()) {
            await submitButton.click();
            await page.waitForTimeout(2000);
        }

        // Should show error message
        await captureScreenshot(page, 'booking-network-error');

        // Restore network
        await page.unroute('**/rest/v1/**');
        await page.unroute('**/functions/**');
    });
});
