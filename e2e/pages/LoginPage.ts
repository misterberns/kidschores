import { Page, Locator, expect } from '@playwright/test';

/**
 * Page Object Model for the Login page
 *
 * This page handles:
 * - Email/password login form
 * - Error message display
 * - Navigation to register page
 * - Google OAuth button (placeholder)
 */
export class LoginPage {
  readonly page: Page;

  // Form elements
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;
  readonly loadingSpinner: Locator;

  // Navigation
  readonly registerLink: Locator;
  readonly googleButton: Locator;

  // Header elements
  readonly pageTitle: Locator;
  readonly welcomeText: Locator;

  constructor(page: Page) {
    this.page = page;

    // Form elements
    this.emailInput = page.locator('input#email, input[type="email"]');
    this.passwordInput = page.locator('input#password, input[type="password"]');
    this.submitButton = page.locator('button[type="submit"]');
    this.errorMessage = page.locator('.bg-error-100, [class*="error"]').filter({ hasText: /.+/ });
    this.loadingSpinner = page.locator('.animate-spin');

    // Navigation
    this.registerLink = page.locator('a[href="/register"]');
    this.googleButton = page.getByText(/google/i);

    // Header
    this.pageTitle = page.getByText('KidsChores');
    this.welcomeText = page.getByText(/welcome back/i);
  }

  /**
   * Navigate to the login page
   */
  async goto(): Promise<void> {
    await this.page.goto('/login');
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Fill in login credentials
   */
  async fillCredentials(email: string, password: string): Promise<void> {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
  }

  /**
   * Submit the login form
   */
  async submit(): Promise<void> {
    await this.submitButton.click();
  }

  /**
   * Perform complete login
   */
  async login(email: string, password: string): Promise<void> {
    await this.fillCredentials(email, password);
    await this.submit();
  }

  /**
   * Check if login form is visible
   */
  async isVisible(): Promise<boolean> {
    return await this.emailInput.isVisible() && await this.passwordInput.isVisible();
  }

  /**
   * Get the error message text
   */
  async getError(): Promise<string | null> {
    if (await this.errorMessage.isVisible()) {
      return await this.errorMessage.textContent();
    }
    return null;
  }

  /**
   * Check if the form is in loading state
   */
  async isLoading(): Promise<boolean> {
    return await this.loadingSpinner.isVisible();
  }

  /**
   * Navigate to register page
   */
  async goToRegister(): Promise<void> {
    await this.registerLink.click();
    await this.page.waitForURL('**/register');
  }

  /**
   * Wait for login to complete (redirect away from login page)
   */
  async waitForLoginComplete(): Promise<void> {
    await this.page.waitForURL((url) => !url.pathname.includes('/login'), {
      timeout: 10000,
    });
  }
}

export default LoginPage;
