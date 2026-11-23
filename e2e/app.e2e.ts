import { expect, test } from '@playwright/test';

test('die App startet', async ({ page }) => {
  await page.goto('./');

  await expect(page.locator('app-root')).toBeAttached();
});
