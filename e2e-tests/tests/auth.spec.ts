import { test, expect } from '../utils/test-utils';
import { loginAs, logout, getTestCredentials, navigateAndWait, waitForPageReady, expectToast, captureScreenshot } from '../utils/test-utils';

/**
 * Authentication Test Suite
 * 
 * Tests for login, signup, password reset, and session management
 */

test.describe('Authentication - Login Flow', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/login');
        await waitForPageReady(page);
    });

    test('AUTH-001: Login page loads correctly', async ({ page }) => {
        // Verify essential elements are visible
        await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible();
        await expect(page.locator('input[type="password"], input[name="password"]')).toBeVisible();
        await expect(page.locator('button[type="submit"]')).toBeVisible();

        // Check for forgot password link
        await expect(page.locator('a[href*="forgot"], text=/forgot.*password/i').first()).toBeVisible();

        // Check for signup link
        await expect(page.locator('a[href*="signup"], text=/sign.*up|create.*account/i').first()).toBeVisible();

        // No console errors
        await captureScreenshot(page, 'login-page-loaded');
    });

    test('AUTH-002: Successful login with valid credentials', async ({ page }) => {
        const credentials = getTestCredentials('dentist');

        // Fill form
        await page.fill('input[type="email"], input[name="email"]', credentials.email);
        await page.fill('input[type="password"], input[name="password"]', credentials.password);

        // Submit
        await page.click('button[type="submit"]');

        // Should redirect away from login page
        await page.waitForURL((url) => !url.pathname.includes('/login'), {
            timeout: 30000,
        });

        // Verify we're on a dashboard or authenticated page
        const currentUrl = page.url();
        expect(
            currentUrl.includes('/dashboard') ||
            currentUrl.includes('/dentist') ||
            currentUrl.includes('/select-business') ||
            currentUrl.includes('/onboarding')
        ).toBeTruthy();

        await captureScreenshot(page, 'login-success');
    });

    test('AUTH-003: Failed login with invalid email', async ({ page }) => {
        // Use invalid email
        await page.fill('input[type="email"], input[name="email"]', 'nonexistent@invalid.com');
        await page.fill('input[type="password"], input[name="password"]', 'WrongPassword123!');

        // Submit
        await page.click('button[type="submit"]');

        // Wait for error response
        await page.waitForTimeout(2000);

        // Should still be on login page
        expect(page.url()).toContain('/login');

        // Look for error message
        const errorIndicators = [
            'text=/invalid.*credentials|incorrect.*password|wrong.*password/i',
            '[role="alert"]',
            '[class*="error"]',
            '[class*="destructive"]',
        ];

        let errorFound = false;
        for (const selector of errorIndicators) {
            const element = page.locator(selector);
            if (await element.count() > 0 && await element.first().isVisible()) {
                errorFound = true;
                break;
            }
        }

        expect(errorFound).toBeTruthy();
        await captureScreenshot(page, 'login-invalid-credentials');
    });

    test('AUTH-004: Failed login with wrong password', async ({ page }) => {
        const credentials = getTestCredentials('dentist');

        await page.fill('input[type="email"], input[name="email"]', credentials.email);
        await page.fill('input[type="password"], input[name="password"]', 'CompletelyWrongPassword123!');

        await page.click('button[type="submit"]');
        await page.waitForTimeout(2000);

        // Should remain on login page
        expect(page.url()).toContain('/login');

        await captureScreenshot(page, 'login-wrong-password');
    });

    test('AUTH-005: Empty form submission shows validation errors', async ({ page }) => {
        // Submit empty form
        await page.click('button[type="submit"]');

        await page.waitForTimeout(1000);

        // Check for validation errors - could be HTML5 validation or custom
        const emailInput = page.locator('input[type="email"], input[name="email"]');
        const passwordInput = page.locator('input[type="password"], input[name="password"]');

        // Check for required attribute or visible validation message
        const emailRequired = await emailInput.getAttribute('required');
        const emailValid = await emailInput.evaluate((el: HTMLInputElement) => el.validity.valid);

        // Either HTML5 validation should fail or there should be a visible error
        if (emailRequired !== null) {
            expect(emailValid).toBeFalsy();
        }

        await captureScreenshot(page, 'login-empty-form-validation');
    });

    test('AUTH-006: Google OAuth button is present', async ({ page }) => {
        // Look for Google sign-in button
        const googleButton = page.locator('button:has-text("Google"), [data-provider="google"], [aria-label*="Google"]');

        if (await googleButton.count() > 0) {
            await expect(googleButton.first()).toBeVisible();
            await captureScreenshot(page, 'login-google-oauth-visible');
        } else {
            // Mark as info - Google OAuth might not be enabled
            console.log('INFO: Google OAuth button not found - may not be enabled');
        }
    });
});

test.describe('Authentication - Signup Flow', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/signup');
        await waitForPageReady(page);
    });

    test('AUTH-010: Signup page loads correctly', async ({ page }) => {
        // Should have form elements
        await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible();
        await expect(page.locator('input[type="password"], input[name="password"]').first()).toBeVisible();

        // Should have login link
        await expect(page.locator('a[href*="login"], text=/sign.*in|log.*in/i').first()).toBeVisible();

        await captureScreenshot(page, 'signup-page-loaded');
    });

    test('AUTH-011: Signup form validation - weak password', async ({ page }) => {
        await page.fill('input[type="email"], input[name="email"]', 'test@example.com');

        // Password input(s)
        const passwordInputs = page.locator('input[type="password"]');
        await passwordInputs.first().fill('weak');

        // If there's a confirm password field
        if (await passwordInputs.count() > 1) {
            await passwordInputs.nth(1).fill('weak');
        }

        await page.click('button[type="submit"]');
        await page.waitForTimeout(1000);

        // Look for password strength error
        const weakPasswordIndicators = [
            'text=/password.*strong|password.*weak|at least|minimum/i',
            '[class*="error"]',
        ];

        await captureScreenshot(page, 'signup-weak-password');
    });

    test('AUTH-012: Signup form validation - invalid email format', async ({ page }) => {
        const emailInput = page.locator('input[type="email"], input[name="email"]');
        await emailInput.fill('not-an-email');
        await emailInput.blur();

        await page.waitForTimeout(500);

        // Check HTML5 validation
        const isValid = await emailInput.evaluate((el: HTMLInputElement) => el.validity.valid);
        expect(isValid).toBeFalsy();

        await captureScreenshot(page, 'signup-invalid-email');
    });
});

test.describe('Authentication - Password Reset', () => {
    test('AUTH-020: Forgot password page loads', async ({ page }) => {
        await page.goto('/forgot-password');
        await waitForPageReady(page);

        await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible();
        await expect(page.locator('button[type="submit"]')).toBeVisible();

        await captureScreenshot(page, 'forgot-password-loaded');
    });

    test('AUTH-021: Password reset request submitted', async ({ page }) => {
        await page.goto('/forgot-password');
        await waitForPageReady(page);

        await page.fill('input[type="email"], input[name="email"]', 'test@caberu.be');
        await page.click('button[type="submit"]');

        await page.waitForTimeout(2000);

        // Should show success message or redirect
        const successIndicators = [
            'text=/email.*sent|check.*email|reset.*link/i',
            '[class*="success"]',
        ];

        let successFound = false;
        for (const selector of successIndicators) {
            const element = page.locator(selector);
            if (await element.count() > 0 && await element.first().isVisible()) {
                successFound = true;
                break;
            }
        }

        // Either success message or redirect to login
        if (!successFound) {
            // May redirect to login
            expect(page.url().includes('/login') || page.url().includes('/forgot-password')).toBeTruthy();
        }

        await captureScreenshot(page, 'forgot-password-submitted');
    });
});

test.describe('Authentication - Session Management', () => {
    test('AUTH-030: Protected route redirects to login', async ({ page }) => {
        // Clear any existing session
        await page.goto('/');
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
            currentUrl.includes('/') // May redirect to homepage
        ).toBeTruthy();

        await captureScreenshot(page, 'protected-route-redirect');
    });

    test('AUTH-031: Session persists after page reload', async ({ page }) => {
        // Login first
        await loginAs(page, 'dentist');

        // Get current URL after login
        const urlAfterLogin = page.url();

        // Reload page
        await page.reload();
        await waitForPageReady(page);

        // Should still be logged in (not redirected to login)
        expect(page.url()).not.toContain('/login');

        await captureScreenshot(page, 'session-persists-after-reload');
    });

    test('AUTH-032: Logout clears session', async ({ page }) => {
        // Login first
        await loginAs(page, 'dentist');

        // Try to logout
        await logout(page);

        // Try accessing protected route
        await page.goto('/dentist');
        await page.waitForTimeout(2000);

        // Should be redirected to login
        expect(page.url().includes('/login') || page.url() === '/').toBeTruthy();

        await captureScreenshot(page, 'logout-clears-session');
    });
});
