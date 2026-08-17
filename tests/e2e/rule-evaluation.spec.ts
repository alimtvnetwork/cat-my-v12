import { test, expect } from '@playwright/test';

// Task 133: Write E2E test for Rule Evaluation

test('Verify POST /score flow with mock score', async ({ page }) => {
  await page.route('**/score', async route => {
    const json = { score: 0.95, passed: true };
    await route.fulfill({ json });
  });

  await page.goto('/evaluate');
  
  await page.getByRole('button', { name: /evaluate/i }).click();
  
  await expect(page.getByText('Score: 0.95')).toBeVisible();
  await expect(page.getByText('Passed')).toBeVisible();
});
