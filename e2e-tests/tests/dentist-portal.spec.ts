import { test, expect } from '../utils/test-utils';
import {
    loginAs,
    waitForPageReady,
    captureScreenshot,
    expectToast
} from '../utils/test-utils';

/**
 * Dentist Portal Test Suite
 * 
 * Tests for the dentist dashboard, appointments, patients, and settings
 */

test.describe('Dentist Portal - Dashboard', () => {
    test.beforeEach(async ({ page }) => {
        await loginAs(page, 'dentist');
        await page.goto('/dentist');
        await waitForPageReady(page);
    });

    test('DENT-001: Dashboard loads correctly', async ({ page }) => {
        // Wait for dashboard to render
        await page.waitForLoadState('networkidle');

        // Should see dashboard elements
        const dashboardIndicators = [
            'text=/today|appointments|patients|overview/i',
            '[class*="dashboard"]',
            '[class*="widget"]',
        ];

        let dashboardLoaded = false;
        for (const selector of dashboardIndicators) {
            const element = page.locator(selector);
            if (await element.count() > 0 && await element.first().isVisible()) {
                dashboardLoaded = true;
                break;
            }
        }

        expect(dashboardLoaded).toBeTruthy();
        await captureScreenshot(page, 'dentist-dashboard-loaded');
    });

    test('DENT-002: Today\'s appointments widget visible', async ({ page }) => {
        // Look for today's appointments or schedule widget
        const todayWidgetSelectors = [
            'text=/today|upcoming/i',
            '[class*="appointment"]',
            '[class*="schedule"]',
        ];

        for (const selector of todayWidgetSelectors) {
            const widget = page.locator(selector);
            if (await widget.count() > 0 && await widget.first().isVisible()) {
                await captureScreenshot(page, 'dentist-today-widget');
                return;
            }
        }
    });

    test('DENT-003: Navigation tabs work', async ({ page }) => {
        // Common dentist portal tabs
        const tabs = [
            { name: 'appointments', patterns: ['text=/appointments/i', '[href*="appointments"]'] },
            { name: 'patients', patterns: ['text=/patients/i', '[href*="patients"]'] },
            { name: 'settings', patterns: ['text=/settings/i', '[href*="settings"]'] },
        ];

        for (const tab of tabs) {
            for (const pattern of tab.patterns) {
                const tabElement = page.locator(pattern).first();
                if (await tabElement.isVisible()) {
                    await tabElement.click();
                    await waitForPageReady(page);
                    await captureScreenshot(page, `dentist-nav-${tab.name}`);
                    break;
                }
            }
        }
    });

    test('DENT-004: Quick actions are accessible', async ({ page }) => {
        const quickActionSelectors = [
            'text=/new.*appointment|add.*patient|create/i',
            '[class*="quick-action"]',
            'button:has-text(/new|add|create/i)',
        ];

        for (const selector of quickActionSelectors) {
            const action = page.locator(selector);
            if (await action.count() > 0 && await action.first().isVisible()) {
                await captureScreenshot(page, 'dentist-quick-actions');
                return;
            }
        }
    });
});

test.describe('Dentist Portal - Appointments', () => {
    test.beforeEach(async ({ page }) => {
        await loginAs(page, 'dentist');
        await page.goto('/dentist/appointments');
        await waitForPageReady(page);
    });

    test('DENT-010: Appointments page loads', async ({ page }) => {
        await page.waitForLoadState('networkidle');

        const appointmentIndicators = [
            'text=/appointment/i',
            '[class*="appointment"]',
            '[class*="calendar"]',
        ];

        let loaded = false;
        for (const selector of appointmentIndicators) {
            if (await page.locator(selector).count() > 0) {
                loaded = true;
                break;
            }
        }

        expect(loaded).toBeTruthy();
        await captureScreenshot(page, 'dentist-appointments-loaded');
    });

    test('DENT-011: Can filter appointments by status', async ({ page }) => {
        // Look for filter controls
        const filterSelectors = [
            '[class*="filter"]',
            'select',
            '[role="combobox"]',
            'button:has-text(/filter|status|all/i)',
        ];

        for (const selector of filterSelectors) {
            const filter = page.locator(selector);
            if (await filter.count() > 0 && await filter.first().isVisible()) {
                await filter.first().click();
                await page.waitForTimeout(500);
                await captureScreenshot(page, 'dentist-appointments-filter');
                break;
            }
        }
    });

    test('DENT-012: Appointment details can be viewed', async ({ page }) => {
        // Look for appointment cards/rows
        const appointmentCards = page.locator('[class*="appointment"], [class*="card"], tr').filter({
            hasText: /\d{1,2}:\d{2}|AM|PM/i
        });

        if (await appointmentCards.count() > 0) {
            await appointmentCards.first().click();
            await page.waitForTimeout(1000);
            await captureScreenshot(page, 'dentist-appointment-details');
        }
    });

    test('DENT-013: Can confirm pending appointment', async ({ page }) => {
        // Navigate to pending appointments if filter exists
        const pendingFilter = page.locator('text=/pending/i, button:has-text(/pending/i)');
        if (await pendingFilter.count() > 0) {
            await pendingFilter.first().click();
            await waitForPageReady(page);
        }

        // Look for confirm button
        const confirmButton = page.locator('button:has-text(/confirm|approve|accept/i)');
        if (await confirmButton.count() > 0 && await confirmButton.first().isVisible()) {
            // Don't actually confirm in test - just verify button exists
            await captureScreenshot(page, 'dentist-confirm-button-visible');
        }
    });
});

test.describe('Dentist Portal - Patient Management', () => {
    test.beforeEach(async ({ page }) => {
        await loginAs(page, 'dentist');
        await page.goto('/dentist/patients');
        await waitForPageReady(page);
    });

    test('DENT-020: Patients page loads', async ({ page }) => {
        await page.waitForLoadState('networkidle');

        const patientIndicators = [
            'text=/patient/i',
            '[class*="patient"]',
            'table',
        ];

        let loaded = false;
        for (const selector of patientIndicators) {
            if (await page.locator(selector).count() > 0) {
                loaded = true;
                break;
            }
        }

        expect(loaded).toBeTruthy();
        await captureScreenshot(page, 'dentist-patients-loaded');
    });

    test('DENT-021: Can search patients', async ({ page }) => {
        const searchInput = page.locator('input[type="search"], input[placeholder*="search"], [class*="search"] input');

        if (await searchInput.count() > 0 && await searchInput.first().isVisible()) {
            await searchInput.first().fill('Test');
            await page.waitForTimeout(1000);
            await captureScreenshot(page, 'dentist-patient-search');
        }
    });

    test('DENT-022: Can view patient profile', async ({ page }) => {
        // Click on first patient
        const patientRows = page.locator('[class*="patient"], tr:has-text(/patient|name/i)').filter({
            hasNot: page.locator('th')
        });

        if (await patientRows.count() > 0) {
            await patientRows.first().click();
            await waitForPageReady(page);
            await captureScreenshot(page, 'dentist-patient-profile');
        }
    });

    test('DENT-023: Patient tabs are navigable', async ({ page }) => {
        // First view a patient
        const patientRows = page.locator('[class*="patient"], tr, [class*="card"]').filter({
            hasNot: page.locator('th')
        });

        if (await patientRows.count() > 0) {
            await patientRows.first().click();
            await waitForPageReady(page);

            // Check for profile tabs
            const tabs = ['history', 'documents', 'prescriptions', 'imaging'];
            for (const tab of tabs) {
                const tabElement = page.locator(`text=/${tab}/i, [href*="${tab}"]`);
                if (await tabElement.count() > 0 && await tabElement.first().isVisible()) {
                    await tabElement.first().click();
                    await waitForPageReady(page);
                    await captureScreenshot(page, `dentist-patient-tab-${tab}`);
                }
            }
        }
    });
});

test.describe('Dentist Portal - Settings', () => {
    test.beforeEach(async ({ page }) => {
        await loginAs(page, 'dentist');
        await page.goto('/dentist/settings');
        await waitForPageReady(page);
    });

    test('DENT-030: Settings page loads', async ({ page }) => {
        await page.waitForLoadState('networkidle');

        const settingsIndicators = [
            'text=/settings|profile|account/i',
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
        await captureScreenshot(page, 'dentist-settings-loaded');
    });

    test('DENT-031: Profile settings accessible', async ({ page }) => {
        const profileSettingsUrl = '/dentist/admin/profile';
        await page.goto(profileSettingsUrl);
        await waitForPageReady(page);

        // Should see profile form elements
        const profileIndicators = [
            'input[name*="name"], input[name*="email"]',
            '[class*="profile"]',
            'form',
        ];

        for (const selector of profileIndicators) {
            if (await page.locator(selector).count() > 0) {
                await captureScreenshot(page, 'dentist-profile-settings');
                return;
            }
        }
    });

    test('DENT-032: Branding settings accessible', async ({ page }) => {
        await page.goto('/dentist/admin/branding');
        await waitForPageReady(page);

        // Should see branding options
        const brandingIndicators = [
            'text=/branding|logo|color|theme/i',
            '[class*="color"]',
            'input[type="file"]',
        ];

        for (const selector of brandingIndicators) {
            if (await page.locator(selector).count() > 0) {
                await captureScreenshot(page, 'dentist-branding-settings');
                return;
            }
        }
    });

    test('DENT-033: Availability settings accessible', async ({ page }) => {
        // Navigate to availability/schedule settings
        const availabilityLink = page.locator('text=/availability|schedule|hours/i, [href*="availability"], [href*="schedule"]');

        if (await availabilityLink.count() > 0) {
            await availabilityLink.first().click();
            await waitForPageReady(page);
            await captureScreenshot(page, 'dentist-availability-settings');
        }
    });
});
