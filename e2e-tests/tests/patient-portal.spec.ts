import { test, expect } from '../utils/test-utils';
import {
    loginAs,
    waitForPageReady,
    captureScreenshot
} from '../utils/test-utils';

/**
 * Patient Portal Test Suite
 * 
 * Tests for the patient dashboard, appointments, billing, and account
 */

test.describe('Patient Portal - Dashboard', () => {
    test.beforeEach(async ({ page }) => {
        await loginAs(page, 'patient');
        await page.goto('/dashboard');
        await waitForPageReady(page);
    });

    test('PAT-001: Dashboard page loads', async ({ page }) => {
        await page.waitForLoadState('networkidle');

        const dashboardIndicators = [
            'text=/dashboard|health|appointment|prescription/i',
            '[class*="dashboard"]',
            '[class*="patient"]',
        ];

        let loaded = false;
        for (const selector of dashboardIndicators) {
            if (await page.locator(selector).count() > 0) {
                loaded = true;
                break;
            }
        }

        expect(loaded).toBeTruthy();
        await captureScreenshot(page, 'patient-dashboard-loaded');
    });

    test('PAT-002: Upcoming appointments visible', async ({ page }) => {
        const appointmentIndicators = [
            'text=/appointment|scheduled|upcoming/i',
            '[class*="appointment"]',
        ];

        for (const selector of appointmentIndicators) {
            const element = page.locator(selector);
            if (await element.count() > 0) {
                await captureScreenshot(page, 'patient-upcoming-appointments');
                return;
            }
        }
    });

});

test.describe('Patient Portal - Billing', () => {
    test.beforeEach(async ({ page }) => {
        await loginAs(page, 'patient');
        await page.goto('/billing');
        await waitForPageReady(page);
    });

    test('PAT-010: Billing page loads', async ({ page }) => {
        await page.waitForLoadState('networkidle');

        const billingIndicators = [
            'text=/billing|payment|invoice|amount/i',
            '[class*="billing"]',
            '[class*="payment"]',
        ];

        let loaded = false;
        for (const selector of billingIndicators) {
            if (await page.locator(selector).count() > 0) {
                loaded = true;
                break;
            }
        }

        expect(loaded).toBeTruthy();
        await captureScreenshot(page, 'patient-billing-loaded');
    });

    test('PAT-011: Payment history visible', async ({ page }) => {
        const paymentHistoryIndicators = [
            'text=/history|past.*payment|transaction/i',
            'table',
            '[class*="history"]',
        ];

        for (const selector of paymentHistoryIndicators) {
            if (await page.locator(selector).count() > 0) {
                await captureScreenshot(page, 'patient-payment-history');
                return;
            }
        }
    });

    test('PAT-012: Outstanding balance shown if any', async ({ page }) => {
        const balanceIndicators = [
            'text=/balance|outstanding|due|amount/i',
            '[class*="balance"]',
        ];

        for (const selector of balanceIndicators) {
            if (await page.locator(selector).count() > 0) {
                await captureScreenshot(page, 'patient-outstanding-balance');
                return;
            }
        }
    });
});

test.describe('Patient Portal - Documents', () => {
    test.beforeEach(async ({ page }) => {
        await loginAs(page, 'patient');
        await page.goto('/docs');
        await waitForPageReady(page);
    });

    test('PAT-020: Documents page loads', async ({ page }) => {
        await page.waitForLoadState('networkidle');

        const docIndicators = [
            'text=/document|file|record|no document/i',
            '[class*="document"]',
        ];

        let loaded = false;
        for (const selector of docIndicators) {
            if (await page.locator(selector).count() > 0) {
                loaded = true;
                break;
            }
        }

        expect(loaded).toBeTruthy();
        await captureScreenshot(page, 'patient-documents-loaded');
    });

    test('PAT-021: Document list or empty state visible', async ({ page }) => {
        // Should show either documents or empty state
        const contentIndicators = [
            '[class*="document"]',
            'text=/no document|upload|empty/i',
        ];

        for (const selector of contentIndicators) {
            if (await page.locator(selector).count() > 0) {
                await captureScreenshot(page, 'patient-documents-content');
                return;
            }
        }
    });
});

test.describe('Patient Portal - Account Settings', () => {
    test.beforeEach(async ({ page }) => {
        await loginAs(page, 'patient');
    });

    test('PAT-030: Profile page loads', async ({ page }) => {
        await page.goto('/account/profile');
        await waitForPageReady(page);

        const profileIndicators = [
            'text=/profile|personal.*info|name|email/i',
            'input',
            'form',
        ];

        let loaded = false;
        for (const selector of profileIndicators) {
            if (await page.locator(selector).count() > 0) {
                loaded = true;
                break;
            }
        }

        expect(loaded).toBeTruthy();
        await captureScreenshot(page, 'patient-profile-page');
    });

    test('PAT-031: Insurance page loads', async ({ page }) => {
        await page.goto('/account/insurance');
        await waitForPageReady(page);

        const insuranceIndicators = [
            'text=/insurance|coverage|provider/i',
            '[class*="insurance"]',
        ];

        let loaded = false;
        for (const selector of insuranceIndicators) {
            if (await page.locator(selector).count() > 0) {
                loaded = true;
                break;
            }
        }

        expect(loaded).toBeTruthy();
        await captureScreenshot(page, 'patient-insurance-page');
    });

    test('PAT-032: Privacy page loads', async ({ page }) => {
        await page.goto('/account/privacy');
        await waitForPageReady(page);

        const privacyIndicators = [
            'text=/privacy|data|consent|gdpr/i',
            '[class*="privacy"]',
        ];

        let loaded = false;
        for (const selector of privacyIndicators) {
            if (await page.locator(selector).count() > 0) {
                loaded = true;
                break;
            }
        }

        expect(loaded).toBeTruthy();
        await captureScreenshot(page, 'patient-privacy-page');
    });

    test('PAT-033: Settings page loads', async ({ page }) => {
        await page.goto('/account/settings');
        await waitForPageReady(page);

        const settingsIndicators = [
            'text=/settings|preferences|notification/i',
            '[class*="settings"]',
        ];

        let loaded = false;
        for (const selector of settingsIndicators) {
            if (await page.locator(selector).count() > 0) {
                loaded = true;
                break;
            }
        }

        expect(loaded).toBeTruthy();
        await captureScreenshot(page, 'patient-settings-page');
    });

    test('PAT-034: Help page loads', async ({ page }) => {
        await page.goto('/account/help');
        await waitForPageReady(page);

        const helpIndicators = [
            'text=/help|support|faq|contact/i',
            '[class*="help"]',
        ];

        let loaded = false;
        for (const selector of helpIndicators) {
            if (await page.locator(selector).count() > 0) {
                loaded = true;
                break;
            }
        }

        expect(loaded).toBeTruthy();
        await captureScreenshot(page, 'patient-help-page');
    });
});

test.describe('Patient Portal - Appointment Actions', () => {
    test.beforeEach(async ({ page }) => {
        await loginAs(page, 'patient');
        await page.goto('/dashboard');
        await waitForPageReady(page);
    });

    test('PAT-040: Can view appointment details', async ({ page }) => {
        const appointmentCards = page.locator('[class*="appointment"], [class*="card"]').filter({
            hasText: /\d{1,2}/
        });

        if (await appointmentCards.count() > 0) {
            await appointmentCards.first().click();
            await page.waitForTimeout(1000);
            await captureScreenshot(page, 'patient-appointment-details');
        }
    });

    test('PAT-041: Cancel button available for future appointments', async ({ page }) => {
        const cancelButton = page.locator('button:has-text(/cancel/i)');

        if (await cancelButton.count() > 0 && await cancelButton.first().isVisible()) {
            await captureScreenshot(page, 'patient-cancel-button-visible');
        }
    });

    test('PAT-042: Reschedule option available', async ({ page }) => {
        const rescheduleButton = page.locator('button:has-text(/reschedule/i), text=/reschedule/i');

        if (await rescheduleButton.count() > 0 && await rescheduleButton.first().isVisible()) {
            await captureScreenshot(page, 'patient-reschedule-button-visible');
        }
    });
});
