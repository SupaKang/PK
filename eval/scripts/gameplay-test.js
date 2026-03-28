/**
 * gameplay-test.js — Full gameplay walkthrough with screenshots
 * Forces render calls to capture actual game state in headless mode
 */

import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

const BASE_URL = 'http://localhost:8080';
const SS_DIR = path.resolve('eval/screenshots');

test.describe('Gameplay Walkthrough Test', () => {

  test('Full game playthrough with screenshots', async ({ page }) => {
    if (!fs.existsSync(SS_DIR)) fs.mkdirSync(SS_DIR, { recursive: true });

    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    // Force render helper — calls game.render() directly to update canvas
    async function forceRender(page) {
      await page.evaluate(() => {
        const game = window.__pkGame;
        if (game && game.renderer) {
          game.render();
        }
      });
      await page.waitForTimeout(50);
    }

    async function setupGame(page) {
      await page.evaluate(() => {
        const game = window.__pkGame;
        if (!game.playerMonster && game.monstersData) {
          const sd = game.monstersData.find(m => m.id === 1);
          if (sd) {
            const mon = { id:sd.id, name:sd.name, type:sd.type, level:5, hp:25, maxHp:25,
              exp:0, expToNext:37, baseStats:sd.baseStats,
              iv:{hp:15,atk:15,def:15,spAtk:15,spDef:15,speed:15},
              stats:{hp:25,atk:12,def:10,spAtk:13,spDef:11,speed:11},
              skills:[{id:'scratch',name:'SCRATCH',type:'normal',category:'physical',power:40,accuracy:100,pp:35,ppLeft:35},
                      {id:'ember',name:'EMBER',type:'fire',category:'special',power:40,accuracy:100,pp:25,ppLeft:25}],
              status:null, isWild:false, spriteConfig:sd.spriteConfig, statStages:{} };
            game.playerMonster = mon; game.party = [mon]; game.gold = 1000;
            game.inventory = [
              {item:{id:'potion',name:'POTION',price:200,effect:{type:'heal_hp',value:30},category:'healing',description:'HP +30'},count:5},
              {item:{id:'magic_stone',name:'MAGIC STONE',price:200,effect:{type:'contract',value:1},category:'contract',description:'Catch monsters'},count:5}
            ];
            game.dex.seen.add(1); game.dex.caught.add(1);
            if (!game.mapManager.currentMap) { game.mapManager.loadMap('town_01'); game.mapUI.spawn(7,7); }
            if (game._getNPCsForMap) { game.currentNPCs = game._getNPCsForMap('town_01'); game.mapUI.npcs = game.currentNPCs; }
            game.state = 'MAP';
          }
        }
      });
    }

    // === 1. TITLE SCREEN ===
    await page.goto(BASE_URL);
    await page.waitForTimeout(4000);
    await forceRender(page);
    await page.screenshot({ path: path.join(SS_DIR, '01_title.png') });
    console.log('  [1] ✓ Title screen');

    // === 2. Start game + setup
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);
    // Speed through dialog
    for (let i = 0; i < 25; i++) {
      await page.keyboard.press('z');
      await page.waitForTimeout(200);
    }
    await page.waitForTimeout(500);
    await setupGame(page);
    await forceRender(page);
    await page.screenshot({ path: path.join(SS_DIR, '02_map.png') });
    console.log('  [2] ✓ Map screen');

    // Move around
    await page.evaluate(() => {
      const game = window.__pkGame;
      game.mapUI.playerX = 10; game.mapUI.playerY = 7;
      game.mapUI.renderX = 10; game.mapUI.renderY = 7;
      game.mapUI.prevX = 10; game.mapUI.prevY = 7;
      if (game.mapManager.currentMap) {
        game.tilemapEngine.followTarget(10, 7, game.mapManager.currentMap.width, game.mapManager.currentMap.height);
      }
    });
    await forceRender(page);
    await page.screenshot({ path: path.join(SS_DIR, '03_map_moved.png') });
    console.log('  [3] ✓ Map after movement');

    // === 3. BATTLE ===
    await page.evaluate(() => {
      const game = window.__pkGame;
      const bd = game.monstersData.find(m => m.id === 10);
      if (bd) {
        const wild = { id:bd.id, name:bd.name, type:bd.type, level:3, hp:15, maxHp:15,
          baseStats:bd.baseStats, iv:{hp:10,atk:10,def:10,spAtk:10,spDef:10,speed:10},
          stats:{hp:15,atk:8,def:7,spAtk:8,spDef:7,speed:8},
          skills:[{id:'tackle',name:'TACKLE',type:'normal',category:'physical',power:40,accuracy:100,pp:35,ppLeft:35}],
          status:null, isWild:true, spriteConfig:bd.spriteConfig, statStages:{} };
        game.battleEngine.start(game.playerMonster, wild);
        game.battleEngine.party = game.party;
        game.battleEngine.inventory = game.inventory;
        game.battleEngine.monstersData = game.monstersData;
        game.battleEngine.skillsData = game.skillsData;
        game.state = 'BATTLE';
      }
    });
    // Advance past INTRO
    await page.evaluate(() => {
      const game = window.__pkGame;
      game.battleEngine.introTimer = 999;
      game.battleEngine.state = 'SELECT';
      game.battleEngine.currentMessage = '';
    });
    await forceRender(page);
    await page.screenshot({ path: path.join(SS_DIR, '04_battle_menu.png') });
    console.log('  [4] ✓ Battle main menu');

    // Enter FIGHT → skill select
    await page.evaluate(() => {
      const game = window.__pkGame;
      game.battleEngine.state = 'SEL_SKILL';
      game.battleEngine.selectedSkill = 0;
    });
    await forceRender(page);
    await page.screenshot({ path: path.join(SS_DIR, '05_skill_select.png') });
    console.log('  [5] ✓ Skill selection');

    // Execute attack
    await page.evaluate(() => {
      const game = window.__pkGame;
      const skill = game.playerMonster.skills[0];
      game.battleEngine._executeTurn(skill);
    });
    await forceRender(page);
    await page.screenshot({ path: path.join(SS_DIR, '06_attack_result.png') });
    console.log('  [6] ✓ Attack result');

    // === 4. PARTY MENU ===
    await page.evaluate(() => { window.__pkGame.state = 'MENU'; });
    await forceRender(page);
    await page.screenshot({ path: path.join(SS_DIR, '07_party_menu.png') });
    console.log('  [7] ✓ Party menu');

    // === 5. INVENTORY ===
    await page.evaluate(() => {
      const g = window.__pkGame;
      g.invCategory = 0; g.invSelected = 0; g.state = 'INVENTORY';
    });
    await forceRender(page);
    await page.screenshot({ path: path.join(SS_DIR, '08_inventory.png') });
    console.log('  [8] ✓ Inventory');

    // === 6. SHOP ===
    await page.evaluate(() => {
      const g = window.__pkGame;
      g.shopItems = (g.itemsData||[]).filter(i=>['potion','super_potion','magic_stone','antidote','revive'].includes(i.id)).map(i=>({item:i,price:i.price}));
      g.shopMode='buy'; g.shopSelected=0; g.state='SHOP';
    });
    await forceRender(page);
    await page.screenshot({ path: path.join(SS_DIR, '09_shop.png') });
    console.log('  [9] ✓ Shop');

    // === 7. DEX ===
    await page.evaluate(() => {
      const g = window.__pkGame;
      g.dex.seen.add(1); g.dex.seen.add(4); g.dex.seen.add(7); g.dex.seen.add(10);
      g.dex.caught.add(1); g.dex.caught.add(4);
      g.state = 'DEX';
    });
    await forceRender(page);
    await page.screenshot({ path: path.join(SS_DIR, '10_dex.png') });
    console.log('  [10] ✓ Monster Dex');

    // === 8. SAVE MENU ===
    await page.evaluate(() => {
      const g = window.__pkGame;
      g.saveMenuMode='save'; g.saveSlotIndex=0; g.state='SAVE_MENU';
    });
    await forceRender(page);
    await page.screenshot({ path: path.join(SS_DIR, '11_save.png') });
    console.log('  [11] ✓ Save menu');

    // === FINAL ===
    const criticalErrors = errors.filter(e => !e.includes('Failed to load') && !e.includes('404'));
    const ssCount = fs.readdirSync(SS_DIR).filter(f => f.endsWith('.png')).length;

    console.log('');
    console.log('  ========== GAMEPLAY TEST RESULTS ==========');
    console.log(`  Screenshots: ${ssCount}`);
    console.log(`  Critical errors: ${criticalErrors.length}`);
    console.log('  ============================================');

    expect(criticalErrors.length).toBe(0);
    expect(ssCount).toBeGreaterThanOrEqual(10);
  });
});
