import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('should show login page', async ({ page }) => {
    await page.goto('/');
    
    // Check for title
    const title = await page.textContent('h1');
    expect(title).toContain('Entrar no sistema');
    
    // Check if login fields exist (using placeholders as they are more stable here)
    await expect(page.locator('input[placeholder="000.000.000-00"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('should show error on invalid login', async ({ page }) => {
    await page.goto('/');
    
    await page.fill('input[placeholder="000.000.000-00"]', 'invalid@example.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    
    // Error message should appear (handled by Firebase Auth UI/Logic)
    await expect(page.locator('.auth-error')).toBeVisible();
  });
});
