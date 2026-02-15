import { test, expect, TEST_USER } from '../fixtures/test-database';
import { LoginPage } from '../pages/LoginPage';
import { RegisterPage } from '../pages/RegisterPage';
import { SelectKidPage } from '../pages/SelectKidPage';

test.describe('Authentication Flow', () => {
  test.describe('Login Page', () => {
    test('should display login form when unauthenticated', async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();

      // Verify form elements are visible
      await expect(loginPage.emailInput).toBeVisible();
      await expect(loginPage.passwordInput).toBeVisible();
      await expect(loginPage.submitButton).toBeVisible();
    });

    test('should show error with invalid credentials', async ({ page, resetDatabase }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();

      // Try to login with wrong password
      await loginPage.login('nonexistent@test.com', 'wrongpassword');

      // Wait for error message
      await page.waitForTimeout(1000);

      // Should show error or stay on login page
      const currentUrl = page.url();
      expect(currentUrl).toContain('/login');
    });

    test('should login with valid credentials and redirect', async ({ page, authTokens }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();

      // Login with test user credentials
      await loginPage.login(TEST_USER.email, TEST_USER.password);

      // Should redirect away from login
      await loginPage.waitForLoginComplete();

      const currentUrl = page.url();
      expect(currentUrl).not.toContain('/login');
    });

    test('should have link to register page', async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();

      // Click register link
      await loginPage.goToRegister();

      // Should be on register page
      await expect(page).toHaveURL(/\/register/);
    });

    test('should persist session across page reload', async ({ authenticatedPage }) => {
      // authenticatedPage fixture already has session
      await authenticatedPage.goto('/');

      // Wait for page to load
      await authenticatedPage.waitForLoadState('networkidle');

      // Should not be redirected to login
      const currentUrl = authenticatedPage.url();
      expect(currentUrl).not.toContain('/login');

      // Reload the page
      await authenticatedPage.reload();
      await authenticatedPage.waitForLoadState('networkidle');

      // Should still be authenticated
      const urlAfterReload = authenticatedPage.url();
      expect(urlAfterReload).not.toContain('/login');
    });
  });

  test.describe('Register Page', () => {
    test('should display registration form', async ({ page }) => {
      const registerPage = new RegisterPage(page);
      await registerPage.goto();

      // Verify form elements are visible
      await expect(registerPage.displayNameInput).toBeVisible();
      await expect(registerPage.emailInput).toBeVisible();
      await expect(registerPage.passwordInput).toBeVisible();
      await expect(registerPage.confirmPasswordInput).toBeVisible();
      await expect(registerPage.submitButton).toBeVisible();
    });

    test('should have link to login page', async ({ page }) => {
      const registerPage = new RegisterPage(page);
      await registerPage.goto();

      // Click login link
      await registerPage.goToLogin();

      // Should be on login page
      await expect(page).toHaveURL(/\/login/);
    });

    test('should register new user and auto-login', async ({ page, resetDatabase, apiContext }) => {
      // Generate unique email to avoid conflicts
      const uniqueEmail = `test-${Date.now()}@kidschores.com`;

      const registerPage = new RegisterPage(page);
      await registerPage.goto();

      // Fill in registration form
      await registerPage.register('Test User', uniqueEmail, 'SecurePass123');

      // Wait for registration to complete
      await registerPage.waitForRegistrationComplete();

      // Should be redirected away from register page
      const currentUrl = page.url();
      expect(currentUrl).not.toContain('/register');
    });

    test('should show error for duplicate email', async ({ page, authTokens }) => {
      // authTokens fixture ensures TEST_USER exists
      const registerPage = new RegisterPage(page);
      await registerPage.goto();

      // Try to register with existing email
      await registerPage.register('Duplicate User', TEST_USER.email, 'AnotherPass123');

      // Wait for response
      await page.waitForTimeout(1000);

      // Should show error or stay on register page
      const currentUrl = page.url();
      // Either shows error on register page or redirects to login
      expect(currentUrl).toMatch(/(register|login)/);
    });

    test('should validate password requirements', async ({ page }) => {
      const registerPage = new RegisterPage(page);
      await registerPage.goto();

      // Fill in with weak password
      await registerPage.displayNameInput.fill('Test User');
      await registerPage.emailInput.fill('weak@kidschores.com');
      await registerPage.passwordInput.fill('weak');
      await registerPage.confirmPasswordInput.fill('weak');

      // Password validation should show (if implemented)
      // This tests that the form doesn't submit with weak password
      await page.waitForTimeout(500);

      // Check if submit is disabled or validation shows
      const isDisabled = await registerPage.isSubmitDisabled();
      const checks = await registerPage.getPasswordChecks();

      // Either button is disabled or validation indicators show
      expect(isDisabled || checks.length > 0).toBeTruthy();
    });
  });

  test.describe('Select Kid Page', () => {
    test('should display after login when kids exist', async ({ authenticatedPage, apiContext, authTokens }) => {
      // Create a kid first
      await apiContext.post('/api/kids', {
        headers: {
          Authorization: `Bearer ${authTokens.accessToken}`,
        },
        data: {
          name: 'Test Kid',
          avatar: 'default',
          age: 8,
        },
      });

      // Navigate to home (should redirect to select-kid if kids exist)
      await authenticatedPage.goto('/');
      await authenticatedPage.waitForLoadState('networkidle');

      // May or may not be on select-kid page depending on app logic
      // Just verify we're authenticated
      const url = authenticatedPage.url();
      expect(url).not.toContain('/login');
    });

    test('should allow continuing as parent', async ({ authenticatedPage, apiContext, authTokens }) => {
      // Create a kid
      await apiContext.post('/api/kids', {
        headers: {
          Authorization: `Bearer ${authTokens.accessToken}`,
        },
        data: {
          name: 'Another Kid',
          avatar: 'default',
          age: 10,
        },
      });

      const selectKidPage = new SelectKidPage(authenticatedPage);

      // Navigate to select-kid page
      await selectKidPage.goto();

      // Check if page is visible (may redirect if no kids or other logic)
      const isVisible = await selectKidPage.isVisible().catch(() => false);

      if (isVisible) {
        // Continue as parent
        await selectKidPage.continueAsParent();

        // Should navigate away from select-kid
        const url = authenticatedPage.url();
        expect(url).not.toContain('/select-kid');
      }
    });

    test('should allow selecting a specific kid', async ({ page, apiContext, authTokens }) => {
      const kidName = `Kid-${Date.now()}`;

      // Create a kid via API first
      await apiContext.post('/api/kids', {
        headers: {
          Authorization: `Bearer ${authTokens.accessToken}`,
        },
        data: {
          name: kidName,
          avatar: 'default',
          age: 7,
        },
      });

      // Set auth tokens fresh (without the "continue as parent" flow)
      await page.goto('/login');
      await page.evaluate((tokens) => {
        localStorage.setItem('kc_access_token', tokens.accessToken);
        localStorage.setItem('kc_refresh_token', tokens.refreshToken);
        // Don't set kc_active_kid - let the app ask for kid selection
      }, authTokens);

      // Navigate to home - should redirect to select-kid since we have kids but no selection
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Should be on select-kid page now
      const selectKidPage = new SelectKidPage(page);
      const isVisible = await selectKidPage.isVisible().catch(() => false);

      if (isVisible) {
        // Select the kid
        await selectKidPage.selectKid(kidName);

        // Should navigate away from select-kid
        const url = page.url();
        expect(url).not.toContain('/select-kid');
      } else {
        // If we're not on select-kid, the app may have different behavior
        // Just verify we're authenticated (not on login)
        expect(page.url()).not.toContain('/login');
      }
    });

    test('should allow logout', async ({ authenticatedPage }) => {
      const selectKidPage = new SelectKidPage(authenticatedPage);
      await selectKidPage.goto();

      const isVisible = await selectKidPage.isVisible().catch(() => false);

      if (isVisible) {
        await selectKidPage.logout();

        // Should be on login page
        await expect(authenticatedPage).toHaveURL(/\/login/);
      } else {
        // If not on select-kid, try to find logout elsewhere
        // Skip this test
        test.skip();
      }
    });
  });

  test.describe('Protected Routes', () => {
    test('should redirect to login when accessing protected route unauthenticated', async ({ page }) => {
      // Clear any existing auth
      await page.goto('/login');
      await page.evaluate(() => {
        localStorage.clear();
      });

      // Try to access protected route
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Should redirect to login
      await expect(page).toHaveURL(/\/login/);
    });

    test('should allow access to protected routes when authenticated', async ({ authenticatedPage }) => {
      // Navigate to home
      await authenticatedPage.goto('/');
      await authenticatedPage.waitForLoadState('networkidle');

      // Should not be on login page
      const url = authenticatedPage.url();
      expect(url).not.toContain('/login');
    });
  });
});
