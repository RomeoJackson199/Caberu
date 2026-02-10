import { defineConfig, devices } from '@playwright/test';

/**
 * DentiBot AI Browser Testing Agent Configuration
 * 
 * This configuration sets up Playwright for comprehensive end-to-end testing
 * of the DentiBot dental practice management application.
 */

export default defineConfig({
  // Test directory
  testDir: './e2e-tests',
  
  // Run tests in parallel
  fullyParallel: true,
  
  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,
  
  // Retry failed tests
  retries: process.env.CI ? 2 : 0,
  
  // Number of parallel workers
  workers: process.env.CI ? 1 : undefined,
  
  // Reporter configuration
  reporter: [
    ['html', { outputFolder: 'test-results/html-report' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['list'],
  ],
  
  // Global test settings
  use: {
    // Base URL for the application
    baseURL: process.env.TEST_BASE_URL || 'http://localhost:5173',
    
    // Capture screenshot on failure
    screenshot: 'only-on-failure',
    
    // Record video for failed tests
    video: 'retain-on-failure',
    
    // Capture trace for debugging
    trace: 'retain-on-failure',
    
    // Default timeout for actions
    actionTimeout: 15000,
    
    // Navigation timeout
    navigationTimeout: 30000,
  },
  
  // Global timeout for each test
  timeout: 60000,
  
  // Configure projects for different browsers and viewports
  projects: [
    // Desktop browsers
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    
    // Mobile viewports
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 12'] },
    },
    
    // Tablet viewport
    {
      name: 'tablet',
      use: { ...devices['iPad Pro 11'] },
    },
  ],
  
  // Run local dev server before tests
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
