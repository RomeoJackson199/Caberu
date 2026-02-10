import { test as base, expect, Page, BrowserContext } from '@playwright/test';

/**
 * DentiBot Test Utilities
 * 
 * Shared utilities, fixtures, and helpers for the AI browser testing agent
 */

// ============================================================================
// Custom Test Fixtures
// ============================================================================

type TestFixtures = {
    authenticatedDentistPage: Page;
    authenticatedPatientPage: Page;
    consoleErrors: string[];
};

type WorkerFixtures = {
    dentistContext: BrowserContext;
    patientContext: BrowserContext;
};

export const test = base.extend<TestFixtures, WorkerFixtures>({
    // Fixture for authenticated dentist session
    authenticatedDentistPage: async ({ browser }, use) => {
        const context = await browser.newContext();
        const page = await context.newPage();

        // Login as dentist
        await loginAs(page, 'dentist');

        await use(page);
        await context.close();
    },

    // Fixture for authenticated patient session
    authenticatedPatientPage: async ({ browser }, use) => {
        const context = await browser.newContext();
        const page = await context.newPage();

        // Login as patient
        await loginAs(page, 'patient');

        await use(page);
        await context.close();
    },

    // Capture console errors during tests
    consoleErrors: async ({ page }, use) => {
        const errors: string[] = [];

        page.on('console', (msg) => {
            if (msg.type() === 'error') {
                errors.push(msg.text());
            }
        });

        page.on('pageerror', (error) => {
            errors.push(error.message);
        });

        await use(errors);
    },
});

// ============================================================================
// Authentication Helpers
// ============================================================================

export async function loginAs(
    page: Page,
    role: 'dentist' | 'patient' | 'admin'
): Promise<void> {
    const credentials = getTestCredentials(role);

    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // Fill login form
    await page.fill('input[type="email"], input[name="email"]', credentials.email);
    await page.fill('input[type="password"], input[name="password"]', credentials.password);

    // Submit
    await page.click('button[type="submit"]');

    // Wait for redirect after successful login
    await page.waitForURL((url) => !url.pathname.includes('/login'), {
        timeout: 30000,
    });
}

export function getTestCredentials(role: 'dentist' | 'patient' | 'admin'): {
    email: string;
    password: string;
} {
    const credentials = {
        dentist: {
            email: process.env.TEST_DENTIST_EMAIL || 'dentist-test@caberu.be',
            password: process.env.TEST_DENTIST_PASSWORD || 'TestPassword123!',
        },
        patient: {
            email: process.env.TEST_PATIENT_EMAIL || 'patient-test@caberu.be',
            password: process.env.TEST_PATIENT_PASSWORD || 'TestPassword123!',
        },
        admin: {
            email: process.env.TEST_ADMIN_EMAIL || 'admin-test@caberu.be',
            password: process.env.TEST_ADMIN_PASSWORD || 'TestPassword123!',
        },
    };

    return credentials[role];
}

export async function logout(page: Page): Promise<void> {
    // Try to find and click logout button
    const logoutButton = page.locator('button:has-text("Logout"), button:has-text("Sign out"), [data-testid="logout"]');

    if (await logoutButton.isVisible()) {
        await logoutButton.click();
        await page.waitForURL('/login');
    } else {
        // Fallback: clear storage and navigate to login
        await page.evaluate(() => {
            localStorage.clear();
            sessionStorage.clear();
        });
        await page.goto('/login');
    }
}

// ============================================================================
// Navigation Helpers
// ============================================================================

export async function navigateAndWait(
    page: Page,
    path: string,
    options?: { waitForSelector?: string }
): Promise<void> {
    await page.goto(path);
    await page.waitForLoadState('networkidle');

    if (options?.waitForSelector) {
        await page.waitForSelector(options.waitForSelector, { state: 'visible' });
    }
}

export async function waitForPageReady(page: Page): Promise<void> {
    // Wait for network idle
    await page.waitForLoadState('networkidle');

    // Wait for any loading spinners to disappear
    const loadingIndicators = [
        '[class*="animate-spin"]',
        '[class*="loading"]',
        '[data-testid="loading"]',
        '.skeleton',
    ];

    for (const selector of loadingIndicators) {
        const loading = page.locator(selector);
        if (await loading.count() > 0) {
            await loading.first().waitFor({ state: 'hidden', timeout: 10000 }).catch(() => { });
        }
    }
}

// ============================================================================
// Form Helpers
// ============================================================================

export async function fillForm(
    page: Page,
    fields: Record<string, string>
): Promise<void> {
    for (const [selector, value] of Object.entries(fields)) {
        const field = page.locator(selector);
        await field.fill(value);
    }
}

export async function submitForm(page: Page): Promise<void> {
    await page.click('button[type="submit"]');
}

export async function expectFormError(
    page: Page,
    fieldSelector: string,
    errorMessage?: string
): Promise<void> {
    // Look for error near the field
    const field = page.locator(fieldSelector);
    const errorLocators = [
        field.locator('..').locator('[class*="error"], [class*="invalid"], [role="alert"]'),
        page.locator(`[id*="error"]:near(${fieldSelector})`),
    ];

    for (const errorLocator of errorLocators) {
        if (await errorLocator.count() > 0) {
            if (errorMessage) {
                await expect(errorLocator.first()).toContainText(errorMessage);
            } else {
                await expect(errorLocator.first()).toBeVisible();
            }
            return;
        }
    }

    throw new Error(`No error found for field: ${fieldSelector}`);
}

// ============================================================================
// Assertion Helpers
// ============================================================================

export async function expectToast(
    page: Page,
    type: 'success' | 'error' | 'warning',
    message?: string
): Promise<void> {
    const toastSelectors = [
        '[role="status"]',
        '[class*="toast"]',
        '[class*="sonner"]',
        '.Toaster',
    ];

    for (const selector of toastSelectors) {
        const toast = page.locator(selector);
        if (await toast.count() > 0) {
            await expect(toast.first()).toBeVisible();
            if (message) {
                await expect(toast.first()).toContainText(message);
            }
            return;
        }
    }

    // Wait for toast to appear
    const toastLocator = page.locator('[role="status"], [class*="toast"]');
    await expect(toastLocator.first()).toBeVisible({ timeout: 10000 });
}

export async function expectNoConsoleErrors(errors: string[]): Promise<void> {
    // Filter out known acceptable errors
    const criticalErrors = errors.filter((error) => {
        // Ignore React development warnings
        if (error.includes('Warning:')) return false;
        // Ignore favicon errors
        if (error.includes('favicon')) return false;
        // Ignore third-party script errors
        if (error.includes('third-party')) return false;

        return true;
    });

    expect(criticalErrors).toHaveLength(0);
}

// ============================================================================
// Screenshot & Reporting Helpers
// ============================================================================

export async function captureScreenshot(
    page: Page,
    name: string
): Promise<void> {
    await page.screenshot({
        path: `test-results/screenshots/${name}-${Date.now()}.png`,
        fullPage: true,
    });
}

export async function captureBugEvidence(
    page: Page,
    bugDescription: string
): Promise<{
    screenshot: string;
    url: string;
    timestamp: string;
    consoleLog: string[];
}> {
    const timestamp = new Date().toISOString();
    const sanitizedName = bugDescription.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const screenshotPath = `test-results/bugs/${sanitizedName}-${Date.now()}.png`;

    await page.screenshot({ path: screenshotPath, fullPage: true });

    return {
        screenshot: screenshotPath,
        url: page.url(),
        timestamp,
        consoleLog: [],
    };
}

// ============================================================================
// Data Generation Helpers
// ============================================================================

export function generateTestEmail(): string {
    return `test_${Date.now()}_${Math.random().toString(36).substring(7)}@caberu.test`;
}

export function generateTestPhone(): string {
    return `+32${Math.floor(Math.random() * 900000000 + 100000000)}`;
}

export function generateTestPatientData(): {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    dateOfBirth: string;
} {
    return {
        firstName: `Test`,
        lastName: `Patient${Date.now() % 10000}`,
        email: generateTestEmail(),
        phone: generateTestPhone(),
        dateOfBirth: '1990-01-15',
    };
}

// Re-export expect for convenience
export { expect } from '@playwright/test';
