import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('should display sign in page', async ({ page }) => {
    await page.goto('/');
    
    // Should redirect to sign in if not authenticated
    await expect(page).toHaveURL(/.*signin/);
    await expect(page.locator('h1')).toContainText('Sign In');
  });

  test('should navigate to sign up page', async ({ page }) => {
    await page.goto('/signin');
    
    // Click sign up link
    await page.click('text=Sign Up');
    await expect(page).toHaveURL(/.*signup/);
    await expect(page.locator('h1')).toContainText('Sign Up');
  });
});