import { Page, Locator, expect } from '@playwright/test';

/**
 * Page Object Model for the Register page
 *
 * This page handles:
 * - Registration form (name, email, password, confirm password)
 * - Password validation indicators
 * - Error message display
 * - Navigation to login page
 */
export class RegisterPage {
  readonly page: Page;

  // Form elements
  readonly displayNameInput: Locator;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly confirmPasswordInput: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;
  readonly loadingSpinner: Locator;

  // Password validation indicators
  readonly passwordChecks: Locator;

  // Navigation
  readonly loginLink: Locator;

  // Header elements
  readonly pageTitle: Locator;
  readonly subtitle: Locator;

  constructor(page: Page) {
    this.page = page;

    // Form elements
    this.displayNameInput = page.locator('input#displayName, input[placeholder*="Mom"], input[placeholder*="Dad"]');
    this.emailInput = page.locator('input#email, input[type="email"]');
    this.passwordInput = page.locator('input#password').first();
    this.confirmPasswordInput = page.locator('input#confirmPassword, input[placeholder="••••••••"]').last();
    this.submitButton = page.locator('button[type="submit"]');
    this.errorMessage = page.locator('.bg-error-100, [class*="error"]').filter({ hasText: /.+/ });
    this.loadingSpinner = page.locator('.animate-spin');

    // Password validation indicators
    this.passwordChecks = page.locator('[class*="text-success"], [class*="text-text-muted"]').filter({ hasText: /characters|number|match/i });

    // Navigation
    this.loginLink = page.locator('a[href="/login"]');

    // Header
    this.pageTitle = page.getByText('Join KidsChores');
    this.subtitle = page.getByText(/create your family account/i);
  }

  /**
   * Navigate to the register page
   */
  async goto(): Promise<void> {
    await this.page.goto('/register');
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Fill in registration form
   */
  async fillForm(displayName: string, email: string, password: string, confirmPassword?: string): Promise<void> {
    await this.displayNameInput.fill(displayName);
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.confirmPasswordInput.fill(confirmPassword || password);
  }

  /**
   * Submit the registration form
   */
  async submit(): Promise<void> {
    await this.submitButton.click();
  }

  /**
   * Perform complete registration
   */
  async register(displayName: string, email: string, password: string): Promise<void> {
    await this.fillForm(displayName, email, password);
    await this.submit();
  }

  /**
   * Check if register form is visible
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
   * Check if submit button is disabled
   */
  async isSubmitDisabled(): Promise<boolean> {
    return await this.submitButton.isDisabled();
  }

  /**
   * Get password validation check states
   */
  async getPasswordChecks(): Promise<{ label: string; valid: boolean }[]> {
    const checks: { label: string; valid: boolean }[] = [];
    const checkElements = await this.passwordChecks.all();

    for (const element of checkElements) {
      const text = await element.textContent() || '';
      const className = await element.getAttribute('class') || '';
      const valid = className.includes('success') || className.includes('text-success');
      checks.push({ label: text.trim(), valid });
    }

    return checks;
  }

  /**
   * Navigate to login page
   */
  async goToLogin(): Promise<void> {
    await this.loginLink.click();
    await this.page.waitForURL('**/login');
  }

  /**
   * Wait for registration to complete (redirect away from register page)
   */
  async waitForRegistrationComplete(): Promise<void> {
    await this.page.waitForURL((url) => !url.pathname.includes('/register'), {
      timeout: 10000,
    });
  }
}

export default RegisterPage;
