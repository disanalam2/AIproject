import { test, expect } from '@playwright/test';

test.describe('Clinical Scribe AI', () => {
  test('should render main page and have core components', async ({ page }) => {
    // Navigate to the app
    await page.goto('/');

    // Check header
    await expect(page.locator('text=Scribe AI')).toBeVisible();
    await expect(page.locator('text=Clinical Assistant')).toBeVisible();
    await expect(page.locator('text=System Online')).toBeVisible();

    // Check main prompt
    await expect(page.locator('text=Capture Session')).toBeVisible();
    await expect(page.locator('text=Press the microphone to begin recording the consultation.')).toBeVisible();

    // Check recorder exists
    // react-audio-voice-recorder renders an audio element and a button
    const recorderDiv = page.locator('.scribe-recorder');
    await expect(recorderDiv).toBeVisible();

    // Verify empty state for results
    await expect(page.locator('text=No Active Session')).toBeVisible();
  });
});
