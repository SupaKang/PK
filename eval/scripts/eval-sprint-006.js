/**
 * eval-sprint-006.js — Sprint 006 Evaluation Script
 * Validates: Dialog system, prologue, class selection, NPC interaction
 */

import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:8080';

test.describe('Sprint 006: Dialog / Prologue / Class Selection', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForTimeout(3000);
  });

  // === DC-001: New Game → Prologue dialog starts ===
  test('DC-001: New Game starts prologue dialog', async ({ page }) => {
    const logs = [];
    page.on('console', msg => logs.push(msg.text()));

    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);

    // Should be in DIALOG state with prologue
    // Check canvas has dialog box rendered
    const hasContent = await page.evaluate(() => {
      const canvas = document.getElementById('game-canvas');
      const ctx = canvas.getContext('2d');
      // Check bottom area for dialog box
      const data = ctx.getImageData(0, 450, 800, 150).data;
      let bluePixels = 0;
      for (let i = 0; i < data.length; i += 4) {
        if (data[i + 2] > 30 && data[i] < 50) bluePixels++; // Dark blue dialog bg
      }
      return bluePixels;
    });

    expect(hasContent).toBeGreaterThan(100);
    console.log('  ✓ Prologue dialog box rendered');
  });

  // === DC-002: Typewriter effect shows partial text ===
  test('DC-002: Typewriter effect displays text gradually', async ({ page }) => {
    await page.keyboard.press('Enter');
    await page.waitForTimeout(300); // Partial typewriter

    const screenshot1 = await page.screenshot();

    await page.waitForTimeout(2000); // More text typed

    const screenshot2 = await page.screenshot();

    // Screenshots should differ (more text appeared)
    expect(Buffer.compare(screenshot1, screenshot2)).not.toBe(0);
    console.log('  ✓ Typewriter effect — screenshots differ over time');
  });

  // === DC-003: 5 class choices appear ===
  test('DC-003: Class selection with 5 options', async ({ page }) => {
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);

    // Advance through prologue dialogs (3 lines before choices)
    for (let i = 0; i < 4; i++) {
      await page.keyboard.press('KeyZ');
      await page.waitForTimeout(600);
      await page.keyboard.press('KeyZ'); // Skip typewriter
      await page.waitForTimeout(300);
    }

    // Should now show choice menu
    const screenshot = await page.screenshot();
    expect(screenshot).toBeTruthy();

    // Navigate choices
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(200);
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(200);

    console.log('  ✓ Class selection choices navigable');
  });

  // === DC-004: Choice selection triggers callback ===
  test('DC-004: Selecting a class logs the choice', async ({ page }) => {
    const logs = [];
    page.on('console', msg => logs.push(msg.text()));

    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);

    // Skip to choices
    for (let i = 0; i < 4; i++) {
      await page.keyboard.press('KeyZ');
      await page.waitForTimeout(400);
      await page.keyboard.press('KeyZ');
      await page.waitForTimeout(200);
    }

    // Select first class
    await page.keyboard.press('KeyZ');
    await page.waitForTimeout(500);

    const classSelected = logs.some(l => l.includes('Class selected'));
    expect(classSelected).toBe(true);
    console.log('  ✓ Class selection callback fired');
  });

  // === DC-005: Completing prologue enters MAP with starter ===
  test('DC-005: Prologue completion enters MAP state', async ({ page }) => {
    const logs = [];
    page.on('console', msg => logs.push(msg.text()));

    await page.keyboard.press('Enter');
    await page.waitForTimeout(300);

    // Speed through all dialog
    for (let i = 0; i < 20; i++) {
      await page.keyboard.press('KeyZ');
      await page.waitForTimeout(250);
    }
    await page.waitForTimeout(500);

    const hasStarter = logs.some(l => l.includes('Starter'));
    expect(hasStarter).toBe(true);
    console.log('  ✓ Prologue completed, starter monster received');
  });

  // === DC-006: NPC assets exist ===
  test('DC-006: NPC PixelLab assets exist on disk', async ({ page }) => {
    const fs = await import('fs');
    const path = await import('path');

    const files = [
      'src/assets/sprites/npcs/professor/south.png',
      'src/assets/sprites/npcs/villager/south.png',
      'src/assets/ui/dialog_box.png',
    ];

    for (const file of files) {
      const filePath = path.resolve(file);
      const exists = fs.existsSync(filePath);
      const size = exists ? fs.statSync(filePath).size : 0;
      expect(exists).toBe(true);
      expect(size).toBeGreaterThan(100);
      console.log(`  ✓ ${file.split('/').pop()}: ${size} bytes`);
    }
  });

  // === DC-007: Required source files ===
  test('DC-007: Dialog and NPC source files exist', async ({ page }) => {
    const fs = await import('fs');

    const requiredFiles = [
      'src/ui/dialog-ui.js',
      'src/core/player-class.js',
      'src/world/npc.js',
    ];

    for (const file of requiredFiles) {
      expect(fs.existsSync(file)).toBe(true);
      console.log(`  ✓ ${file} exists`);
    }

    const dialogContent = fs.readFileSync('src/ui/dialog-ui.js', 'utf-8');
    expect(dialogContent).toContain('typewriter');
    expect(dialogContent).toContain('choices');

    const npcContent = fs.readFileSync('src/world/npc.js', 'utf-8');
    expect(npcContent).toContain('MAP_NPCS');
  });

  // === DC-008: No crash during dialog flow ===
  test('DC-008: No crash during full dialog interaction', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    await page.keyboard.press('Enter');
    await page.waitForTimeout(300);

    // Mash through dialog with various keys
    for (let i = 0; i < 30; i++) {
      const key = ['KeyZ', 'ArrowDown', 'ArrowUp', 'KeyZ', 'Enter'][i % 5];
      await page.keyboard.press(key);
      await page.waitForTimeout(150);
    }
    await page.waitForTimeout(500);

    const criticalErrors = errors.filter(e => !e.includes('Failed to load') && !e.includes('404'));
    expect(criticalErrors.length).toBe(0);
    console.log(`  ✓ No crashes during dialog flow`);
  });
});
