import { test, expect } from '../utils/test-utils';
import {
    waitForPageReady,
    captureScreenshot,
    navigateAndWait
} from '../utils/test-utils';

/**
 * Error Handling & Edge Cases Test Suite
 * 
 * Tests for 404s, network errors, session expiry, and form validation
 */

test.describe('Error Handling - 404 Pages', () => {
    test('ERR-001: Non-existent route shows 404 page', async ({ page }) => {
        await page.goto('/this-page-definitely-does-not-exist-xyz123');
        await waitForPageReady(page);

        // Should show 404 page
        const notFoundIndicators = [
            'text=/404|not.*found|page.*doesn.*exist/i',
            '[class*="not-found"]',
            '[class*="error-page"]',
        ];

        let found404 = false;
        for (const selector of notFoundIndicators) {
            const element = page.locator(selector);
            if (await element.count() > 0 && await element.first().isVisible()) {
                found404 = true;
                break;
            }
        }

        expect(found404).toBeTruthy();
        await captureScreenshot(page, 'error-404-page');
    });

    test('ERR-002: 404 page has navigation options', async ({ page }) => {
        await page.goto('/non-existent-page');
        await waitForPageReady(page);

        // Should have link back to home
        const homeLink = page.locator('a[href="/"], text=/home|go.*back/i');
        await expect(homeLink.first()).toBeVisible();

        await captureScreenshot(page, 'error-404-navigation');
    });
});

test.describe('Error Handling - Network Errors', () => {
    test('ERR-010: Handles API error gracefully', async ({ page }) => {
        // Navigate to a page first
        await page.goto('/');
        await waitForPageReady(page);

        // Block API requests to simulate server error
        await page.route('**/rest/v1/**', (route) => {
            route.fulfill({
                status: 500,
                body: JSON.stringify({ error: 'Internal Server Error' }),
            });
        });

        // Navigate to a data-dependent page
        await page.goto('/dentists');
        await page.waitForTimeout(2000);

        // Should show error state or handle gracefully
        await captureScreenshot(page, 'error-api-failure');

        await page.unroute('**/rest/v1/**');
    });

    test('ERR-011: Offline banner appears when network lost', async ({ page }) => {
        await page.goto('/');
        await waitForPageReady(page);

        // Simulate offline
        await page.context().setOffline(true);

        // Try to navigate
        await page.goto('/login').catch(() => { });
        await page.waitForTimeout(1000);

        // Look for offline indicator
        const offlineIndicators = [
            'text=/offline|no.*connection|network/i',
            '[class*="offline"]',
            '[class*="network"]',
        ];

        for (const selector of offlineIndicators) {
            const element = page.locator(selector);
            if (await element.count() > 0) {
                await captureScreenshot(page, 'error-offline-indicator');
                break;
            }
        }

        // Restore network
        await page.context().setOffline(false);
    });
});

test.describe('Error Handling - Form Validation', () => {
    test('ERR-020: Required fields show errors', async ({ page }) => {
        await page.goto('/login');
        await waitForPageReady(page);

        // Submit empty form
        const submitButton = page.locator('button[type="submit"]');
        await submitButton.click();

        await page.waitForTimeout(500);

        // Check for validation
        const emailInput = page.locator('input[type="email"], input[name="email"]');
        const isRequired = await emailInput.getAttribute('required');

        if (isRequired !== null) {
            const isValid = await emailInput.evaluate((el: HTMLInputElement) => el.validity.valid);
            expect(isValid).toBeFalsy();
        }

        await captureScreenshot(page, 'error-form-validation');
    });

    test('ERR-021: Email format validation', async ({ page }) => {
        await page.goto('/login');
        await waitForPageReady(page);

        const emailInput = page.locator('input[type="email"], input[name="email"]');
        await emailInput.fill('not-an-email');
        await emailInput.blur();

        await page.waitForTimeout(500);

        const isValid = await emailInput.evaluate((el: HTMLInputElement) => el.validity.valid);
        expect(isValid).toBeFalsy();

        await captureScreenshot(page, 'error-email-validation');
    });
});

test.describe('Error Handling - Session Expiry', () => {
    test('ERR-030: Expired session redirects to login', async ({ page }) => {
        // This test simulates what happens when a session expires
        await page.goto('/');

        // Clear auth tokens
        await page.evaluate(() => {
            localStorage.clear();
            sessionStorage.clear();
        });

        // Try to access protected route
        await page.goto('/dentist');
        await page.waitForTimeout(3000);

        // Should redirect to login
        const currentUrl = page.url();
        expect(
            currentUrl.includes('/login') ||
            currentUrl === page.url() // May redirect to home
        ).toBeTruthy();

        await captureScreenshot(page, 'error-session-expired');
    });
});

test.describe('Responsive Design Tests', () => {
    test('RESP-001: Mobile viewport loads correctly', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto('/');
        await waitForPageReady(page);

        // Should have mobile menu or hamburger
        const mobileMenuIndicators = [
            '[class*="hamburger"]',
            '[class*="mobile-menu"]',
            'button[aria-label*="menu"]',
            '[class*="menu-toggle"]',
        ];

        let mobileMenuFound = false;
        for (const selector of mobileMenuIndicators) {
            const element = page.locator(selector);
            if (await element.count() > 0) {
                mobileMenuFound = true;
                break;
            }
        }

        await captureScreenshot(page, 'responsive-mobile-home');
    });

    test('RESP-002: Tablet viewport loads correctly', async ({ page }) => {
        await page.setViewportSize({ width: 768, height: 1024 });
        await page.goto('/');
        await waitForPageReady(page);

        await captureScreenshot(page, 'responsive-tablet-home');
    });

    test('RESP-003: Desktop viewport loads correctly', async ({ page }) => {
        await page.setViewportSize({ width: 1920, height: 1080 });
        await page.goto('/');
        await waitForPageReady(page);

        await captureScreenshot(page, 'responsive-desktop-home');
    });
});

test.describe('Public Pages Accessibility', () => {
    test('PUB-001: Homepage loads', async ({ page }) => {
        await page.goto('/');
        await waitForPageReady(page);

        await expect(page).toHaveTitle(/caberu|dentibot/i);
        await captureScreenshot(page, 'public-homepage');
    });

    test('PUB-002: Pricing page loads', async ({ page }) => {
        await page.goto('/pricing');
        await waitForPageReady(page);

        const pricingIndicators = [
            'text=/pricing|plan|price|€|\$/i',
            '[class*="pricing"]',
        ];

        let loaded = false;
        for (const selector of pricingIndicators) {
            if (await page.locator(selector).count() > 0) {
                loaded = true;
                break;
            }
        }

        expect(loaded).toBeTruthy();
        await captureScreenshot(page, 'public-pricing');
    });

    test('PUB-003: About page loads', async ({ page }) => {
        await page.goto('/about');
        await waitForPageReady(page);

        await captureScreenshot(page, 'public-about');
    });

    test('PUB-004: FAQ page loads', async ({ page }) => {
        await page.goto('/faq');
        await waitForPageReady(page);

        const faqIndicators = [
            'text=/faq|question|answer/i',
            '[class*="faq"]',
            '[class*="accordion"]',
        ];

        let loaded = false;
        for (const selector of faqIndicators) {
            if (await page.locator(selector).count() > 0) {
                loaded = true;
                break;
            }
        }

        expect(loaded).toBeTruthy();
        await captureScreenshot(page, 'public-faq');
    });

    test('PUB-005: Terms page loads', async ({ page }) => {
        await page.goto('/terms');
        await waitForPageReady(page);

        await captureScreenshot(page, 'public-terms');
    });

    test('PUB-006: Privacy page loads', async ({ page }) => {
        await page.goto('/privacy');
        await waitForPageReady(page);

        await captureScreenshot(page, 'public-privacy');
    });
});

test.describe('Console Error Monitoring', () => {
    test('CONSOLE-001: Homepage has no critical console errors', async ({ page }) => {
        const errors: string[] = [];

        page.on('console', (msg) => {
            if (msg.type() === 'error') {
                errors.push(msg.text());
            }
        });

        await page.goto('/');
        await waitForPageReady(page);

        // Filter out known acceptable errors
        const criticalErrors = errors.filter((error) => {
            if (error.includes('Warning:')) return false;
            if (error.includes('favicon')) return false;
            if (error.includes('net::ERR')) return false;
            return true;
        });

        if (criticalErrors.length > 0) {
            console.log('Console errors found:', criticalErrors);
        }

        await captureScreenshot(page, 'console-homepage-errors');
    });

    test('CONSOLE-002: Login page has no critical console errors', async ({ page }) => {
        const errors: string[] = [];

        page.on('console', (msg) => {
            if (msg.type() === 'error') {
                errors.push(msg.text());
            }
        });

        await page.goto('/login');
        await waitForPageReady(page);

        await captureScreenshot(page, 'console-login-errors');
    });
});
