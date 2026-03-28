/**
 * eval-sprint-008.js — Sprint 008 Evaluation Script
 * Validates: Story engine, rival/boss battles, karma system, endings
 */

import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:8080';

test.describe('Sprint 008: Story / Rival / Boss / Karma', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForTimeout(3000);
  });

  async function enterGameFast(page) {
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);
    for (let i = 0; i < 25; i++) {
      await page.keyboard.press('z');
      await page.waitForTimeout(250);
    }
    await page.waitForTimeout(1000);
  }

  // === ST-001: Story engine loads chapters ===
  test('ST-001: Story engine loads 10 chapters from data', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const resp = await fetch('./data/story.json');
      const data = await resp.json();
      const chapters = data.chapters || data;
      return {
        count: chapters.length,
        titles: chapters.map(c => c.title),
        totalEvents: chapters.reduce((s, c) => s + (c.events?.length || 0), 0),
      };
    });

    expect(result.count).toBe(10);
    expect(result.totalEvents).toBeGreaterThan(15);
    console.log(`  ✓ ${result.count} chapters, ${result.totalEvents} events loaded`);
  });

  // === ST-002: Story engine initialized in game ===
  test('ST-002: StoryEngine exists in game after start', async ({ page }) => {
    await enterGameFast(page);

    const result = await page.evaluate(() => {
      const game = window.__pkGame;
      return {
        hasStory: !!game.storyEngine,
        chapters: game.storyEngine?.chapters?.length || 0,
        karma: game.storyEngine?.karma,
        currentChapter: game.storyEngine?.currentChapter,
      };
    });

    expect(result.hasStory).toBe(true);
    expect(result.chapters).toBe(10);
    expect(result.karma).toBe(0);
    console.log(`  ✓ StoryEngine initialized: ${result.chapters} chapters, karma=${result.karma}`);
  });

  // === ST-003: Rival team scales with player level ===
  test('ST-003: Rival team scales with player level', async ({ page }) => {
    await enterGameFast(page);

    const result = await page.evaluate(() => {
      const game = window.__pkGame;
      const playerLevel = game.playerMonster?.level || 5;
      const team = game.storyEngine.getRivalTeam(playerLevel);
      return {
        teamSize: team.length,
        levels: team.map(m => m.level),
        names: team.map(m => m.name),
        playerLevel,
      };
    });

    expect(result.teamSize).toBeGreaterThan(0);
    expect(result.levels[0]).toBeGreaterThan(result.playerLevel);
    console.log(`  ✓ Rival team: ${result.names.join(', ')} (Lv.${result.levels.join(',')} vs player Lv.${result.playerLevel})`);
  });

  // === ST-004: Karma adjusts with choices ===
  test('ST-004: Karma system adjusts values correctly', async ({ page }) => {
    await enterGameFast(page);

    const result = await page.evaluate(() => {
      const game = window.__pkGame;
      const before = game.storyEngine.karma;
      game.storyEngine.adjustKarma(25);
      const after1 = game.storyEngine.karma;
      game.storyEngine.adjustKarma(-50);
      const after2 = game.storyEngine.karma;
      // Test clamping
      game.storyEngine.adjustKarma(200);
      const clamped = game.storyEngine.karma;
      return { before, after1, after2, clamped };
    });

    expect(result.before).toBe(0);
    expect(result.after1).toBe(25);
    expect(result.after2).toBe(-25);
    expect(result.clamped).toBe(100); // Clamped to max
    console.log(`  ✓ Karma: 0 → +25 → -25 → 100(clamped)`);
  });

  // === ST-005: Ending types based on karma ===
  test('ST-005: Three ending types from karma score', async ({ page }) => {
    await enterGameFast(page);

    const result = await page.evaluate(() => {
      const game = window.__pkGame;
      game.storyEngine.karma = 50;
      const light = game.storyEngine.getEndingType();
      game.storyEngine.karma = -50;
      const dark = game.storyEngine.getEndingType();
      game.storyEngine.karma = 0;
      const balance = game.storyEngine.getEndingType();
      game.storyEngine.karma = 0; // Reset
      return { light, dark, balance };
    });

    expect(result.light).toBe('light');
    expect(result.dark).toBe('dark');
    expect(result.balance).toBe('balance');
    console.log(`  ✓ Endings: karma+50=${result.light}, karma-50=${result.dark}, karma0=${result.balance}`);
  });

  // === ST-006: Story serialization for save/load ===
  test('ST-006: Story state serializes and deserializes', async ({ page }) => {
    await enterGameFast(page);

    const result = await page.evaluate(() => {
      const game = window.__pkGame;
      game.storyEngine.adjustKarma(15);
      game.storyEngine.completeEvent('test_event');
      game.storyEngine.gymsDefeated.push('gym_01');

      const saved = game.storyEngine.serialize();
      const hasFields = 'currentChapter' in saved && 'karma' in saved && 'completedEvents' in saved && 'gymsDefeated' in saved;

      // Test deserialize
      game.storyEngine.karma = 0;
      game.storyEngine.completedEvents.clear();
      game.storyEngine.deserialize(saved);

      return {
        hasFields,
        karma: game.storyEngine.karma,
        completedEvents: [...game.storyEngine.completedEvents],
        gymsDefeated: game.storyEngine.gymsDefeated,
      };
    });

    expect(result.hasFields).toBe(true);
    expect(result.karma).toBe(15);
    expect(result.completedEvents).toContain('test_event');
    expect(result.gymsDefeated).toContain('gym_01');
    console.log(`  ✓ Story state serializes/deserializes correctly`);
  });

  // === ST-007: NPC sprites exist ===
  test('ST-007: Rival and boss PixelLab sprites exist', async ({ page }) => {
    const fs = await import('fs');
    const path = await import('path');

    const files = [
      'src/assets/sprites/npcs/rival/south.png',
      'src/assets/sprites/npcs/shadow_boss/south.png',
    ];

    for (const file of files) {
      const p = path.resolve(file);
      const exists = fs.existsSync(p);
      const size = exists ? fs.statSync(p).size : 0;
      expect(exists).toBe(true);
      expect(size).toBeGreaterThan(100);
      console.log(`  ✓ ${file.split('/').pop()}: ${size} bytes`);
    }
  });

  // === ST-008: Source files and required functions ===
  test('ST-008: story.js exists with required functions', async ({ page }) => {
    const fs = await import('fs');

    expect(fs.existsSync('src/world/story.js')).toBe(true);

    const content = fs.readFileSync('src/world/story.js', 'utf-8');
    expect(content).toContain('StoryEngine');
    expect(content).toContain('checkTrigger');
    expect(content).toContain('processEvent');
    expect(content).toContain('getRivalTeam');
    expect(content).toContain('adjustKarma');
    expect(content).toContain('getEndingType');
    expect(content).toContain('serialize');
    expect(content).toContain('deserialize');

    console.log('  ✓ story.js has all required functions');
  });

  // === ST-009: No crashes ===
  test('ST-009: No crashes during story flow', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    await enterGameFast(page);

    // Interact and move around
    for (let i = 0; i < 20; i++) {
      await page.keyboard.press(['ArrowRight', 'ArrowDown', 'Enter', 'z'][i % 4]);
      await page.waitForTimeout(100);
    }

    const critical = errors.filter(e => !e.includes('Failed to load') && !e.includes('404'));
    expect(critical.length).toBe(0);
    console.log(`  ✓ No crashes during gameplay`);
  });
});
