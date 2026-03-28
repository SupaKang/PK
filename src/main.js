/**
 * main.js — Game class, main loop, state machine
 * Pocket Kingdom v4.0 — Harness Rebuild
 */

import { Renderer } from './ui/renderer.js';
import { generateSprite, generateSpriteScaled, preloadSprites } from './ui/sprite-generator.js';
import { AssetLoader } from './ui/asset-loader.js';
import { TilemapEngine } from './ui/tilemap-engine.js';
import { MapUI } from './ui/map-ui.js';
import { MapManager } from './world/map.js';
import { TypeChart } from './core/type.js';
import { BattleEngine } from './core/battle.js';
import { BattleUI } from './ui/battle-ui.js';
import { EncounterSystem } from './world/encounter.js';
import { createMonster } from './core/monster.js';
import { MenuUI } from './ui/menu-ui.js';
import { DialogUI } from './ui/dialog-ui.js';
import { PlayerClass, getPrologueDialogs } from './core/player-class.js';
import { getNPCsForMap } from './world/npc.js';
import { StoryEngine } from './world/story.js';
import { DexUI } from './ui/dex-ui.js';
import { AchievementSystem } from './core/achievement.js';
import { AudioManager } from './audio/audio.js';
import { TouchControls } from './ui/touch-controls.js';
import { saveToSlot, loadFromSlot, deserializeGameState, getSaveSlotSummaries, formatPlayTime } from './save/save.js';

// Game states
const STATE = {
  LOADING: 'LOADING',
  TITLE: 'TITLE',
  MAP: 'MAP',
  BATTLE: 'BATTLE',
  MENU: 'MENU',
  DIALOG: 'DIALOG',
  SHOP: 'SHOP',
  DEX: 'DEX',
  SAVE_MENU: 'SAVE_MENU',
  INVENTORY: 'INVENTORY',
};

class Game {
  constructor() {
    this.displayCanvas = document.getElementById('game-canvas');
    this.renderer = new Renderer(this.displayCanvas);
    this.canvas = this.renderer.canvas; // Internal 480×270 canvas
    this.state = STATE.LOADING;
    this.prevTime = 0;
    this.frameCount = 0;
    this.fps = 0;
    this.fpsTimer = 0;
    this.showFps = true;

    // Data
    this.monstersData = null;
    this.skillsData = null;
    this.typesData = null;
    this.classesData = null;
    this.itemsData = null;
    this.mapsData = null;
    this.storyData = null;

    // Asset loader
    this.assetLoader = new AssetLoader();

    // Map system (initialized after data load)
    this.mapManager = null;
    this.tilemapEngine = null;
    this.mapUI = null;

    // Battle system
    this.typeChart = null;
    this.battleEngine = null;
    this.battleUI = null;
    this.encounterSystem = null;
    this.playerMonster = null; // Current lead monster
    this.party = [];           // Player's monster party (max 6)
    this.inventory = [];       // [{item, count}]
    this.menuUI = new MenuUI();
    this.dialogUI = new DialogUI();
    this.playerClass = null;   // PlayerClass instance
    this.currentNPCs = [];     // NPCs on current map

    // Story system
    this.storyEngine = null;

    // Gold
    this.gold = 1000;

    // Save/Load
    this.playTime = 0;         // Total play time in seconds
    this.saveMenuMode = 'save'; // 'save' or 'load'
    this.saveSlotIndex = 0;
    this.saveMessage = '';
    this.saveMessageTimer = 0;

    // Inventory UI
    this.invCategory = 0;
    this.invSelected = 0;

    // Audio
    this.audio = new AudioManager();

    // Settings
    this.difficulty = 'normal'; // 'easy', 'normal', 'hard'
    this.battleSpeed = 1;       // 1, 2, 4
    this.autoBattle = false;

    // Dex + Achievements
    this.dex = { seen: new Set(), caught: new Set() };
    this.dexUI = new DexUI();
    this.achievements = new AchievementSystem();
    this._battleWins = 0;
    this._evolveCount = 0;

    // Shop state
    this.shopItems = [];       // [{item, price}] current shop stock
    this.shopMode = 'buy';     // 'buy' or 'sell'
    this.shopSelected = 0;
    this.shopMessage = '';
    this.shopMessageTimer = 0;

    // Expose helpers for deserialization
    this._PlayerClass = { PlayerClass };
    this._getNPCsForMap = getNPCsForMap;

    // Title screen state
    this.titleStars = [];
    this.titleSelected = 0;
    this.titleOptions = ['NEW GAME', 'LOAD GAME', 'OPTIONS'];
    this.titleAnimTimer = 0;

    // Input
    this.keys = {};
    this.keysJustPressed = {};
    this._setupInput();
    this._setupResponsive();

    // Touch controls (use display canvas for touch events)
    this.touchControls = new TouchControls(this.displayCanvas, this.keys, this.keysJustPressed);

    // Init stars
    for (let i = 0; i < 100; i++) {
      this.titleStars.push({
        x: Math.random() * 480,
        y: Math.random() * 270,
        speed: 0.2 + Math.random() * 0.8,
        brightness: 0.3 + Math.random() * 0.7,
        size: Math.random() < 0.2 ? 2 : 1,
      });
    }
  }

  _setupInput() {
    window.addEventListener('keydown', (e) => {
      // Init audio on first interaction
      if (!this.audio.ctx) this.audio.init();
      if (!this.keys[e.code]) {
        this.keysJustPressed[e.code] = true;
      }
      this.keys[e.code] = true;
      e.preventDefault();
    });
    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
      e.preventDefault();
    });
  }

  _setupResponsive() {
    // Renderer handles resize via window.innerWidth / window.innerHeight
    // This ensures touch controls reposition on orientation change
    window.addEventListener('resize', () => {
      if (this.touchControls) {
        this.touchControls.resize(window.innerWidth, window.innerHeight);
      }
    });
  }

  isKeyJustPressed(code) {
    return !!this.keysJustPressed[code];
  }

  async loadData() {
    const load = async (path) => {
      const resp = await fetch(path);
      return resp.json();
    };

    const [monsters, skills, types, classes, items, maps, story] = await Promise.all([
      load('./data/monsters.json'),
      load('./data/skills.json'),
      load('./data/types.json'),
      load('./data/classes.json'),
      load('./data/items.json'),
      load('./data/maps.json'),
      load('./data/story.json'),
    ]);

    this.monstersData = monsters.monsters || monsters;
    this.skillsData = skills.skills || skills;
    this.typesData = types; // Keep full object with .types and .matchups
    this.classesData = classes.classes || classes;
    this.itemsData = items.items || items;
    this.mapsData = maps.maps || maps;
    this.storyData = story.chapters || story;

    // Preload procedural sprites
    preloadSprites(this.monstersData);

    // Load image assets
    const DIRS = ['south', 'south-west', 'west', 'north-west', 'north', 'north-east', 'east', 'south-east'];
    const playerManifest = [];
    // Player rotations (idle frames)
    for (const dir of DIRS) {
      playerManifest.push({ key: `player_${dir}`, path: `./src/assets/sprites/player/rotations/${dir}.png` });
    }
    // Player walk animation frames (6 frames x 8 directions)
    for (const dir of DIRS) {
      for (let f = 0; f < 6; f++) {
        playerManifest.push({
          key: `player_walk_${dir}_${f}`,
          path: `./src/assets/sprites/player/animations/walk/${dir}/frame_${String(f).padStart(3, '0')}.png`,
        });
      }
    }

    // Monster battle sprites (east-facing for side view)
    const monsterManifest = [];
    // NPC sprites (4 directions each)
    const npcNames = ['professor', 'villager', 'shopkeeper', 'rival', 'shadow_boss', 'nurse'];
    const npcDirs = ['south', 'north', 'east', 'west'];
    const npcManifest = [];
    for (const name of npcNames) {
      for (const dir of npcDirs) {
        npcManifest.push({ key: `npc_${name}_${dir}`, path: `./src/assets/sprites/npcs/${name}/${dir}.png` });
      }
    }

    const monsterIdsWithAssets = [1, 2, 4, 5, 7, 8, 10, 11]; // starters + evolutions
    for (const mId of monsterIdsWithAssets) {
      monsterManifest.push({
        key: `monster_${mId}_east`,
        path: `./src/assets/sprites/monsters/${mId}/rotations/east.png`,
      });
    }

    await this.assetLoader.loadAll([
      ...playerManifest,
      ...npcManifest,
      ...monsterManifest,
      // Tilesets
      { key: 'tileset_grass_dirt', path: './src/assets/tilesets/grass_dirt.png' },
      { key: 'tileset_grass_water', path: './src/assets/tilesets/grass_water.png' },
      { key: 'tileset_dirt_stone', path: './src/assets/tilesets/dirt_stone.png' },
      // Map objects
      { key: 'obj_tree', path: './src/assets/objects/tree.png' },
      { key: 'obj_fence', path: './src/assets/objects/fence.png' },
      { key: 'obj_house', path: './src/assets/objects/house.png' },
      { key: 'obj_signpost', path: './src/assets/objects/signpost.png' },
      // Battle UI
      { key: 'battle_frame', path: './src/assets/ui/battle_frame.png' },
    ]);

    // Load Wang tileset metadata
    const loadJson = async (path) => { const r = await fetch(path); return r.json(); };
    const [metaGrassDirt, metaGrassWater, metaDirtStone] = await Promise.all([
      loadJson('./src/assets/tilesets/meta/8de067a5-fa64-4f06-897f-c132b0ef7b7f.json').catch(() => null),
      loadJson('./src/assets/tilesets/meta/d3359993-457c-46da-a2cc-32985fba1916.json').catch(() => null),
      loadJson('./src/assets/tilesets/meta/a784ec88-01fa-4baa-98cd-cdeccec98a1e.json').catch(() => null),
    ]);

    // Initialize map system
    this.mapManager = new MapManager(this.mapsData);
    this.tilemapEngine = new TilemapEngine(this.canvas.width, this.canvas.height);

    // Load Wang metadata
    const wangMeta = {};
    if (metaGrassDirt) wangMeta.grass_dirt = metaGrassDirt;
    if (metaGrassWater) wangMeta.grass_water = metaGrassWater;
    if (metaDirtStone) wangMeta.dirt_stone = metaDirtStone;
    this.tilemapEngine.loadWangMetadata(wangMeta);
    this.mapUI = new MapUI(this.tilemapEngine, this.mapManager);

    // Set tileset images
    this.tilemapEngine.setTilesetImages({
      grass_dirt: this.assetLoader.get('tileset_grass_dirt'),
      grass_water: this.assetLoader.get('tileset_grass_water'),
      dirt_stone: this.assetLoader.get('tileset_dirt_stone'),
    });

    // Set object images
    this.tilemapEngine.setObjectImages({
      tree: this.assetLoader.get('obj_tree'),
      fence: this.assetLoader.get('obj_fence'),
      house: this.assetLoader.get('obj_house'),
      signpost: this.assetLoader.get('obj_signpost'),
    });

    // Pass asset loader to map UI for per-frame player sprites
    this.mapUI.setAssetLoader(this.assetLoader);

    // Initialize battle system
    this.typeChart = new TypeChart(this.typesData);
    this.battleEngine = new BattleEngine(this.typeChart);
    this.battleUI = new BattleUI(this.battleEngine, this.assetLoader, this.typeChart);
    this.encounterSystem = new EncounterSystem(this.monstersData, this.skillsData);
    this.storyEngine = new StoryEngine(this.storyData, this.monstersData, this.skillsData);

    console.log(`[PK] Data loaded: ${this.monstersData.length} monsters, ${this.skillsData.length} skills`);
    console.log(`[PK] Assets loaded: ${this.assetLoader.loadedAssets}/${this.assetLoader.totalAssets}`);
  }

  async init() {
    await this.loadData();
    this.state = STATE.TITLE;
    this.prevTime = performance.now();

    // Test hook — exposes read-only game state for Playwright integration tests
    if (typeof window !== 'undefined') {
      window.__GAME_STATE__ = () => ({
        fsm: this.state,
        battleState: this.battleEngine?.state || null,
        player: {
          mapId: this.mapManager?.currentMap?.id || null,
          x: this.mapUI?.playerX ?? null,
          y: this.mapUI?.playerY ?? null,
          facing: this.mapUI?.playerFacing || null,
        },
        party: (this.party || []).map(m => ({
          id: m.id, name: m.name, level: m.level,
          hp: m.hp, maxHp: m.maxHp, status: m.status || null,
        })),
        inventory: (this.inventory || []).map(e => ({
          id: e.item?.id, name: e.item?.name, count: e.count,
        })),
        gold: this.gold,
        playerClass: this.playerClass?.name || null,
        dialogActive: this.state === STATE.DIALOG,
        battleActive: this.state === STATE.BATTLE,
        menuIndex: this.battleEngine?.menuIndex ?? null,
        playTime: this.playTime,
        dex: { seen: this.dex.seen.size, caught: this.dex.caught.size },
        titleSelected: this.titleSelected,
        saveSlotIndex: this.saveSlotIndex,
      });
    }

    this._loop();
  }

  _loop() {
    const now = performance.now();
    const dt = (now - this.prevTime) / 1000;
    this.prevTime = now;

    // FPS counter
    this.frameCount++;
    this.fpsTimer += dt;
    if (this.fpsTimer >= 1) {
      this.fps = this.frameCount;
      this.frameCount = 0;
      this.fpsTimer -= 1;
    }

    // Track play time (only when in gameplay states)
    if (this.state === STATE.MAP || this.state === STATE.BATTLE || this.state === STATE.DIALOG) {
      this.playTime += dt;
    }

    this.update(dt);
    this.achievements.update(dt);
    this.render();
    this.renderer.present();

    // Clear just-pressed keys
    this.keysJustPressed = {};

    requestAnimationFrame(() => this._loop());
  }

  update(dt) {
    // Debug: press B to force battle (works from MAP or DIALOG)
    if (this.keysJustPressed.KeyB && (this.state === STATE.MAP || this.state === STATE.DIALOG)) {
      this._debugForceBattle();
    }

    switch (this.state) {
      case STATE.LOADING:
        break;
      case STATE.TITLE:
        this._updateTitle(dt);
        break;
      case STATE.MAP: {
        const mapEvent = this.mapUI.update(dt, this.keys, this.keysJustPressed);
        // Reload NPCs on map transition + check story events
        if (this.mapUI.lastTransitionMapId) {
          const newMapId = this.mapUI.lastTransitionMapId;
          this.currentNPCs = getNPCsForMap(newMapId);
          this.mapUI.npcs = this.currentNPCs;
          this.mapUI.lastTransitionMapId = null;
          // Story trigger: arrive
          this._checkStoryTrigger('arrive', newMapId);
          // Auto-save on town entry
          if (newMapId.startsWith('town') && this.party.length > 0) {
            this._autoSave();
          }
        }
        // Check for wild encounter after player moves
        if (mapEvent === 'moved' && this.mapManager.currentMap && this.playerMonster) {
          const wild = this.encounterSystem.checkEncounter(this.mapManager.currentMap);
          if (wild) {
            this._startBattle(wild);
          }
        }
        // M key opens party menu
        if (this.keysJustPressed.KeyM) {
          this.state = STATE.MENU;
        }
        // P key opens save menu
        if (this.keysJustPressed.KeyP) {
          this.saveMenuMode = 'save';
          this.saveSlotIndex = 0;
          this.saveMessage = '';
          this.state = STATE.SAVE_MENU;
        }
        // D key opens dex
        if (this.keysJustPressed.KeyD && !this.mapUI.isMoving) {
          this.state = STATE.DEX;
        }
        // I key opens inventory
        if (this.keysJustPressed.KeyI) {
          this.invCategory = 0;
          this.invSelected = 0;
          this.state = STATE.INVENTORY;
        }
        // Enter key: interact with NPC
        if (this.keysJustPressed.Enter && !this.mapUI.isMoving) {
          this._tryNPCInteract();
        }
        break;
      }
      case STATE.BATTLE: {
        // Speed toggle: F key
        if (this.keysJustPressed.KeyF) {
          this.battleSpeed = this.battleSpeed === 1 ? 2 : (this.battleSpeed === 2 ? 4 : 1);
        }
        // Auto-battle toggle: G key
        if (this.keysJustPressed.KeyG) {
          this.autoBattle = !this.autoBattle;
        }
        // Auto-battle: simulate pressing Z on skill select
        const autoKeys = this.autoBattle && (this.battleEngine.state === 'SELECT' || this.battleEngine.state === 'SEL_SKILL')
          ? { ...this.keysJustPressed, KeyZ: true }
          : this.keysJustPressed;

        const scaledDt = dt * this.battleSpeed;
        this.battleUI.update(scaledDt);
        const battleResult = this.battleEngine.update(scaledDt, autoKeys);
        if (battleResult === 'exit') {
          // Grant EXP on win before exiting
          // Register enemy in dex as seen
          if (this.battleEngine.enemyMon) {
            this.dex.seen.add(this.battleEngine.enemyMon.id);
          }
          if (this.battleEngine.battleResult === 'win' && this.battleEngine.expEvents.length === 0) {
            this.battleEngine.grantExp();
            this.playerMonster = this.party[0];
            this._battleWins++;
            // Check for evolution events
            for (const ev of this.battleEngine.expEvents) {
              if (ev.type === 'evolution') this._evolveCount++;
            }
            // Gold reward
            const goldReward = (this.battleEngine.enemyMon?.level || 5) * 10;
            this.gold += goldReward;
            this.achievements.check(this);
          }
          if (this.battleEngine.battleResult === 'capture') {
            if (this.battleEngine.enemyMon) {
              this.dex.caught.add(this.battleEngine.enemyMon.id);
              this.dex.seen.add(this.battleEngine.enemyMon.id);
            }
            this.achievements.check(this);
          }
          this.state = STATE.MAP;
          this.encounterSystem.resetCooldown();
          this.audio.playBgm('map');
        }
        break;
      }
      case STATE.MENU: {
        const menuResult = this.menuUI.update(this.keysJustPressed, this.party);
        if (menuResult === 'close') {
          this.playerMonster = this.party[0];
          this.state = STATE.MAP;
        }
        break;
      }
      case STATE.DIALOG: {
        const dialogResult = this.dialogUI.update(dt, this.keysJustPressed);
        if (dialogResult === 'done') {
          this.state = this._dialogReturnState || STATE.MAP;
        }
        break;
      }
      case STATE.SAVE_MENU:
        this._updateSaveMenu(dt);
        break;
      case STATE.INVENTORY:
        this._updateInventory();
        break;
      case STATE.SHOP:
        this._updateShop(dt);
        break;
      case STATE.DEX: {
        const dexResult = this.dexUI.update(this.keysJustPressed, this.dex, this.monstersData);
        if (dexResult === 'close') this.state = STATE.MAP;
        break;
      }
    }
  }

  render() {
    const r = this.renderer;

    switch (this.state) {
      case STATE.LOADING:
        this._renderLoading();
        break;
      case STATE.TITLE:
        this._renderTitle();
        break;
      case STATE.MAP:
        this.mapUI.render(r);
        break;
      case STATE.BATTLE:
        this.battleUI.render(r);
        this.battleUI.drawSpeedIndicator(r, this.battleSpeed, this.autoBattle);
        break;
      case STATE.MENU:
        this.menuUI.render(r, this.party, this.typeChart);
        break;
      case STATE.DIALOG:
        if (this._dialogReturnState === STATE.MAP && this.mapManager?.currentMap) {
          this.mapUI.render(r);
        } else {
          r.clear('#0a0a16');
        }
        this.dialogUI.render(r);
        break;
      case STATE.SAVE_MENU:
        this._renderSaveMenu(r);
        break;
      case STATE.INVENTORY:
        this._renderInventory(r);
        break;
      case STATE.SHOP:
        this._renderShop(r);
        break;
      case STATE.DEX:
        this.dexUI.render(r, this.dex, this.monstersData, this.typeChart, this.assetLoader);
        break;
    }

    // Achievement toast
    this.achievements.renderToast(r);

    // Touch controls overlay
    this.touchControls.render(r.ctx);

    // FPS display
    if (this.showFps) {
      r.drawText(`FPS:${this.fps}`, 4, 4, '#888888', 1);
    }
  }

  // === LOADING ===
  _renderLoading() {
    const r = this.renderer;
    r.clear('#0a0a16');
    r.drawTextCentered('LOADING...', 290, '#AAAAAA', 2);
  }

  // === NPC INTERACTION ===
  _tryNPCInteract() {
    const px = this.mapUI.playerX;
    const py = this.mapUI.playerY;
    const facing = this.mapUI.playerFacing;
    // Check tile in front of player
    const dx = facing === 'right' ? 1 : facing === 'left' ? -1 : 0;
    const dy = facing === 'south' ? 1 : facing === 'north' ? -1 : 0;
    const tx = px + dx;
    const ty = py + dy;

    const npc = this.currentNPCs.find(n => n.x === tx && n.y === ty);
    if (!npc) return;

    if (npc.shop) {
      // Shop NPC — show dialog then open shop
      this._dialogReturnState = STATE.MAP;
      this.dialogUI.start(npc.dialog, () => {
        this._openShop(npc.shop);
      });
      this.state = STATE.DIALOG;
    } else if (npc.dialog.length > 0) {
      this._dialogReturnState = STATE.MAP;
      this.dialogUI.start(npc.dialog, () => {
        this.state = STATE.MAP;
      });
      this.state = STATE.DIALOG;
    }
  }

  // === PROLOGUE ===
  _startPrologue() {
    const classesData = this.classesData;
    const dialogs = getPrologueDialogs(classesData);

    this._dialogReturnState = STATE.MAP;
    this.dialogUI.start(dialogs, () => {
      // After prologue, give starter and enter map
      const starterData = this.monstersData.find(m => m.id === 1);
      if (starterData) {
        this.playerMonster = createMonster(starterData, 5, this.skillsData);
        this.playerMonster.isWild = false;
        this.party = [this.playerMonster];
        const findItem = (id) => (this.itemsData || []).find(i => i.id === id);
        this.inventory = [
          { item: findItem('potion') || { id: 'potion', name: 'POTION', effect: { type: 'heal_hp', value: 30 } }, count: 3 },
          { item: findItem('antidote') || { id: 'antidote', name: 'ANTIDOTE', effect: { type: 'cure_status', value: 'poison' } }, count: 2 },
          { item: findItem('magic_stone') || { id: 'magic_stone', name: 'MAGIC STONE', effect: { type: 'contract', value: 1 } }, count: 5 },
        ];
        this.dex.seen.add(this.playerMonster.id);
        this.dex.caught.add(this.playerMonster.id);
        console.log(`[PK] Starter: ${this.playerMonster.name} Lv.${this.playerMonster.level}`);
      }
      this.mapManager.loadMap('town_01');
      this.currentNPCs = getNPCsForMap('town_01');
      this.mapUI.npcs = this.currentNPCs;
      this.mapUI.spawn(7, 7);
      this.state = STATE.MAP;
    }, (lineIdx, choiceIdx) => {
      // Class selection callback (line index 3 has choices)
      if (lineIdx === 3 && classesData[choiceIdx]) {
        this.playerClass = new PlayerClass(classesData[choiceIdx]);
        console.log(`[PK] Class selected: ${this.playerClass.name}`);
      }
    });
    this.state = STATE.DIALOG;
  }

  // === STORY ===
  _checkStoryTrigger(triggerType, location) {
    if (!this.storyEngine) return;
    const event = this.storyEngine.checkTrigger(triggerType, location);
    if (event) {
      this._executeStoryEvent(event);
    }
  }

  _executeStoryEvent(event) {
    const actions = this.storyEngine.processEvent(event);
    if (actions.length === 0) {
      this.storyEngine.completeEvent(event.id);
      return;
    }

    // Convert actions to dialog lines, queue battles
    const dialogLines = [];
    this._pendingBattles = [];
    this._pendingActions = [];

    for (const action of actions) {
      switch (action.type) {
        case 'dialog':
          dialogLines.push({
            speaker: action.speaker,
            text: action.text,
            choices: action.choices,
          });
          break;
        case 'battle':
          this._pendingBattles.push(action);
          dialogLines.push({
            speaker: action.trainerName,
            text: `${action.trainerName} WANTS TO BATTLE!`,
          });
          break;
        case 'heal':
          this._pendingActions.push(action);
          dialogLines.push({ speaker: '', text: 'YOUR MONSTERS WERE HEALED!' });
          break;
        case 'karma':
          this.storyEngine.adjustKarma(action.value);
          break;
        case 'give_monster':
        case 'give_item':
          this._pendingActions.push(action);
          break;
      }
    }

    if (dialogLines.length > 0) {
      const eventId = event.id;
      this._dialogReturnState = STATE.MAP;
      this.dialogUI.start(dialogLines, () => {
        // After dialog, execute pending battles/actions
        this._processPendingActions();
        if (this._pendingBattles.length > 0) {
          const battle = this._pendingBattles.shift();
          const enemy = battle.team[0];
          if (enemy) {
            enemy.isWild = false;
            this._startBattle(enemy);
          }
        }
        this.storyEngine.completeEvent(eventId);
        if (this._pendingBattles.length === 0) {
          this.state = STATE.MAP;
        }
      }, (lineIdx, choiceIdx) => {
        // Karma choices (simple: first = light, last = dark)
        const line = dialogLines[lineIdx];
        if (line?.choices && line.choices.length > 1) {
          const karmaVal = choiceIdx === 0 ? 10 : (choiceIdx === line.choices.length - 1 ? -10 : 0);
          this.storyEngine.adjustKarma(karmaVal);
        }
      });
      this.state = STATE.DIALOG;
    } else {
      this.storyEngine.completeEvent(event.id);
    }
  }

  _processPendingActions() {
    for (const action of (this._pendingActions || [])) {
      if (action.type === 'heal') {
        for (const mon of this.party) {
          mon.hp = mon.maxHp;
          mon.status = null;
        }
      }
      if (action.type === 'give_monster' && action.monsterId) {
        const baseData = this.monstersData.find(m => m.id === action.monsterId);
        if (baseData && this.party.length < 6) {
          const mon = createMonster(baseData, action.level || 5, this.skillsData);
          mon.isWild = false;
          this.party.push(mon);
        }
      }
    }
    this._pendingActions = [];
  }

  // === BATTLE ===
  _startBattle(wildMonster) {
    console.log(`[PK] Wild ${wildMonster.name} Lv.${wildMonster.level} appeared!`);
    this.battleEngine.start(this.playerMonster, wildMonster);
    this.battleEngine.party = this.party;
    this.battleEngine.inventory = this.inventory;
    this.battleEngine.monstersData = this.monstersData;
    this.battleEngine.skillsData = this.skillsData;
    // Apply difficulty scaling
    if (this.difficulty === 'hard') {
      wildMonster.hp = Math.floor(wildMonster.hp * 1.3);
      wildMonster.maxHp = Math.floor(wildMonster.maxHp * 1.3);
    } else if (this.difficulty === 'easy') {
      wildMonster.hp = Math.floor(wildMonster.hp * 0.7);
      wildMonster.maxHp = Math.floor(wildMonster.maxHp * 0.7);
    }
    this.audio.playSfx('attack');
    this.audio.playBgm('battle');
    this.state = STATE.BATTLE;
  }

  _debugForceBattle() {
    // Ensure player has a starter monster
    if (!this.playerMonster) {
      const starterData = this.monstersData.find(m => m.id === 1);
      if (starterData) {
        this.playerMonster = createMonster(starterData, 5, this.skillsData);
        this.playerMonster.isWild = false;
        this.party = [this.playerMonster];
      }
    }
    if (!this.playerMonster) return;

    // Ensure map is loaded
    if (!this.mapManager.currentMap) {
      this.mapManager.loadMap('town_01');
      this.mapUI.spawn(7, 7);
    }

    const encounters = this.mapManager.currentMap.encounters;
    let baseData;
    if (encounters && encounters.length > 0) {
      baseData = this.monstersData.find(m => m.id === encounters[0].monsterId);
    }
    if (!baseData) {
      baseData = this.monstersData.find(m => m.id === 10);
    }
    if (baseData) {
      const wild = createMonster(baseData, 5, this.skillsData);
      wild.isWild = true;
      this._startBattle(wild);
    }
  }

  // === TITLE ===
  _updateTitle(dt) {
    this.titleAnimTimer += dt;

    // Star movement
    for (const star of this.titleStars) {
      star.y += star.speed * 30 * dt;
      if (star.y > 270) {
        star.y = 0;
        star.x = Math.random() * 480;
      }
    }

    // Menu navigation
    if (this.isKeyJustPressed('ArrowUp')) {
      this.titleSelected = (this.titleSelected - 1 + this.titleOptions.length) % this.titleOptions.length;
    }
    if (this.isKeyJustPressed('ArrowDown')) {
      this.titleSelected = (this.titleSelected + 1) % this.titleOptions.length;
    }
    if (this.isKeyJustPressed('Enter') || this.isKeyJustPressed('Space')) {
      this._titleSelect();
    }
  }

  _titleSelect() {
    switch (this.titleSelected) {
      case 0: // NEW GAME
        console.log('[PK] New Game — starting prologue');
        this._startPrologue();
        break;
      case 1: // LOAD GAME
        this.saveMenuMode = 'load';
        this.saveSlotIndex = 0;
        this.saveMessage = '';
        this.state = STATE.SAVE_MENU;
        break;
      case 2: // OPTIONS
        console.log('[PK] Options selected');
        break;
    }
  }

  _renderTitle() {
    const r = this.renderer;
    r.clear('#0a0a16');

    // Stars
    for (const star of this.titleStars) {
      const alpha = star.brightness * (0.5 + 0.5 * Math.sin(this.titleAnimTimer * 2 + star.x));
      const gray = Math.floor(alpha * 255);
      const color = `#${gray.toString(16).padStart(2, '0').repeat(3)}`;
      r.fillRect(star.x, star.y, star.size, star.size, color);
    }

    // Title text
    const titleY = 40;
    r.drawTextCentered('POCKET KINGDOM', titleY, '#FFD700', 3);
    r.drawTextCentered('- Monster Battle RPG -', titleY + 30, '#AAAAAA', 1);

    // Sprite showcase — display 3 sample monsters
    const showcaseY = 90;
    const monsterIds = [0, 20, 50];
    for (let i = 0; i < monsterIds.length; i++) {
      const m = this.monstersData[monsterIds[i]];
      if (m && m.spriteConfig) {
        const sprite = generateSpriteScaled(m.spriteConfig, 24);
        const x = 180 + i * 40;
        const bounce = Math.sin(this.titleAnimTimer * 2 + i) * 2;
        r.drawImage(sprite, x, showcaseY + bounce, 24, 24);
      }
    }

    // Menu options
    const menuY = 150;
    for (let i = 0; i < this.titleOptions.length; i++) {
      const selected = i === this.titleSelected;
      const color = selected ? '#FFD700' : '#888888';
      const prefix = selected ? '> ' : '  ';
      const pulse = selected ? Math.sin(this.titleAnimTimer * 4) * 0.2 + 0.8 : 1;
      r.save();
      r.setAlpha(pulse);
      r.drawTextCentered(prefix + this.titleOptions[i], menuY + i * 16, color, 1);
      r.restore();
      r.resetAlpha();
    }

    // Footer
    r.drawTextCentered('v4.0 HARNESS REBUILD', 248, '#444444', 1);
    r.drawTextCentered('PRESS ENTER TO SELECT', 258, '#555555', 1);
  }

  // === SAVE/LOAD MENU ===
  _updateSaveMenu(dt) {
    if (this.saveMessageTimer > 0) {
      this.saveMessageTimer -= dt;
      if (this.saveMessageTimer <= 0) this.saveMessage = '';
      return;
    }

    if (this.keysJustPressed.ArrowUp || this.keysJustPressed.KeyW) {
      this.saveSlotIndex = (this.saveSlotIndex + 2) % 3;
    }
    if (this.keysJustPressed.ArrowDown || this.keysJustPressed.KeyS) {
      this.saveSlotIndex = (this.saveSlotIndex + 1) % 3;
    }

    if (this.keysJustPressed.Enter || this.keysJustPressed.KeyZ) {
      if (this.saveMenuMode === 'save') {
        const success = saveToSlot(this.saveSlotIndex, this);
        this.saveMessage = success ? 'GAME SAVED!' : 'SAVE FAILED!';
        this.saveMessageTimer = 1.5;
      } else {
        // Load
        const data = loadFromSlot(this.saveSlotIndex);
        if (data) {
          deserializeGameState(data, this, this.itemsData);
          console.log('[PK] Game loaded from slot ' + this.saveSlotIndex);
          this.state = STATE.MAP;
          return;
        } else {
          this.saveMessage = 'EMPTY SLOT!';
          this.saveMessageTimer = 1.0;
        }
      }
    }

    if (this.keysJustPressed.Escape || this.keysJustPressed.KeyX) {
      this.state = (this.saveMenuMode === 'load') ? STATE.TITLE : STATE.MAP;
    }
  }

  _renderSaveMenu(r) {
    r.clear('#0a0a16');
    const title = this.saveMenuMode === 'save' ? 'SAVE GAME' : 'LOAD GAME';
    r.drawTextCentered(title, 15, '#FFD700', 2);

    const slots = getSaveSlotSummaries();
    for (let i = 0; i < 3; i++) {
      const slot = slots[i];
      const sy = 40 + i * 70;
      const selected = i === this.saveSlotIndex;

      r.fillRect(40, sy, 400, 60, selected ? '#222244' : '#111122');
      r.strokeRect(40, sy, 400, 60, selected ? '#FFD700' : '#333366');

      r.drawText(`SLOT ${i + 1}`, 50, sy + 5, '#AAAAAA', 1);

      if (slot.exists) {
        r.drawText(`${slot.playerClass} ${slot.playTime}`, 50, sy + 18, '#CCCCCC', 1);
        r.drawText(`${slot.leadMonster}  PARTY:${slot.partySize}`, 50, sy + 30, '#88AACC', 1);
        r.drawText(`${slot.savedAt.slice(0, 16)}`, 50, sy + 42, '#666666', 1);
      } else {
        r.drawText('(EMPTY)', 50, sy + 22, '#444444', 1);
      }
    }

    if (this.saveMessage) {
      r.fillRect(140, 255, 200, 12, '#000000');
      r.strokeRect(140, 255, 200, 12, '#FFD700');
      r.drawTextCentered(this.saveMessage, 256, '#FFD700', 1);
    }

    r.drawText('Z:SELECT  X:BACK', 5, 262, '#555566', 1);
  }

  // === INVENTORY ===
  _updateInventory() {
    const categories = ['healing', 'contract', 'battle', 'key'];
    const catItems = this.inventory.filter(s => {
      const cat = s.item.category || 'healing';
      return cat === categories[this.invCategory] || (this.invCategory === 3 && !categories.slice(0, 3).includes(cat));
    });

    // Category tabs
    if (this.keysJustPressed.ArrowLeft || this.keysJustPressed.KeyA) {
      this.invCategory = (this.invCategory + 3) % 4;
      this.invSelected = 0;
    }
    if (this.keysJustPressed.ArrowRight || this.keysJustPressed.KeyD) {
      this.invCategory = (this.invCategory + 1) % 4;
      this.invSelected = 0;
    }

    // Item selection
    if (this.keysJustPressed.ArrowUp || this.keysJustPressed.KeyW) {
      this.invSelected = Math.max(0, this.invSelected - 1);
    }
    if (this.keysJustPressed.ArrowDown || this.keysJustPressed.KeyS) {
      this.invSelected = Math.min(catItems.length - 1, this.invSelected);
      if (this.keysJustPressed.ArrowDown) this.invSelected = Math.min(catItems.length - 1, this.invSelected + 1);
    }

    // Use item (field use — healing only)
    if ((this.keysJustPressed.Enter || this.keysJustPressed.KeyZ) && catItems[this.invSelected]) {
      const slot = catItems[this.invSelected];
      if (slot.item.effect?.type === 'heal_hp' && this.playerMonster) {
        if (this.playerMonster.hp < this.playerMonster.maxHp && this.playerMonster.hp > 0) {
          const healVal = slot.item.effect.value;
          this.playerMonster.hp = Math.min(this.playerMonster.maxHp, this.playerMonster.hp + healVal);
          slot.count--;
          if (slot.count <= 0) {
            const idx = this.inventory.indexOf(slot);
            if (idx >= 0) this.inventory.splice(idx, 1);
          }
        }
      }
    }

    // Close
    if (this.keysJustPressed.Escape || this.keysJustPressed.KeyX) {
      this.state = STATE.MAP;
    }
  }

  _renderInventory(r) {
    r.clear('#0a0a16');

    // Category tabs
    const categories = ['HEAL', 'CATCH', 'BATTLE', 'KEY'];
    const catKeys = ['healing', 'contract', 'battle', 'key'];
    for (let i = 0; i < 4; i++) {
      const tx = 5 + i * 118;
      const selected = i === this.invCategory;
      r.fillRect(tx, 3, 114, 14, selected ? '#222266' : '#111122');
      r.strokeRect(tx, 3, 114, 14, selected ? '#FFD700' : '#333366');
      r.drawText(categories[i], tx + 5, 5, selected ? '#FFD700' : '#888888', 1);
    }

    const catItems = this.inventory.filter(s => {
      const cat = s.item.category || 'healing';
      return cat === catKeys[this.invCategory] || (this.invCategory === 3 && !catKeys.slice(0, 3).includes(cat));
    });

    if (catItems.length === 0) {
      r.drawTextCentered('NO ITEMS', 120, '#444444', 1);
    }

    for (let i = 0; i < catItems.length && i < 12; i++) {
      const slot = catItems[i];
      const sy = 22 + i * 18;
      const selected = i === this.invSelected;

      r.fillRect(5, sy, 300, 15, selected ? '#222244' : '#111122');
      if (selected) r.strokeRect(5, sy, 300, 15, '#FFD700');

      r.drawText(slot.item.name || slot.item.id, 10, sy + 3, selected ? '#FFFFFF' : '#AAAAAA', 1);
      r.drawText(`x${slot.count}`, 260, sy + 3, '#CCCCCC', 1);
    }

    if (catItems[this.invSelected]) {
      const item = catItems[this.invSelected].item;
      r.fillRect(5, 245, 470, 20, '#111122');
      r.strokeRect(5, 245, 470, 20, '#333366');
      r.drawText(item.description || item.id, 10, 250, '#AAAAAA', 1);
    }

    r.drawText(`TIME:${formatPlayTime(this.playTime)}`, 320, 25, '#666666', 1);
    r.drawText('L/R:TAB UP/DN:SEL Z:USE X:CLOSE', 5, 262, '#555566', 1);
  }

  // === SHOP ===
  _openShop(shopItemIds) {
    this.shopItems = shopItemIds.map(id => {
      const item = (this.itemsData || []).find(i => i.id === id);
      return item ? { item, price: item.price || 0 } : null;
    }).filter(Boolean);
    this.shopMode = 'buy';
    this.shopSelected = 0;
    this.shopMessage = '';
    this.shopMessageTimer = 0;
    this.state = STATE.SHOP;
  }

  _updateShop(dt) {
    if (this.shopMessageTimer > 0) {
      this.shopMessageTimer -= dt;
      if (this.shopMessageTimer <= 0) this.shopMessage = '';
    }

    const list = this.shopMode === 'buy' ? this.shopItems : this.inventory;
    const count = list.length;

    if (this.keysJustPressed.ArrowUp || this.keysJustPressed.KeyW) {
      this.shopSelected = Math.max(0, this.shopSelected - 1);
    }
    if (this.keysJustPressed.ArrowDown || this.keysJustPressed.KeyS) {
      this.shopSelected = Math.min(count - 1, this.shopSelected + 1);
    }

    // Toggle buy/sell
    if (this.keysJustPressed.ArrowLeft || this.keysJustPressed.ArrowRight) {
      this.shopMode = this.shopMode === 'buy' ? 'sell' : 'buy';
      this.shopSelected = 0;
    }

    // Buy or sell
    if (this.keysJustPressed.Enter || this.keysJustPressed.KeyZ) {
      if (this.shopMode === 'buy' && this.shopItems[this.shopSelected]) {
        const { item, price } = this.shopItems[this.shopSelected];
        if (this.gold >= price) {
          this.gold -= price;
          // Add to inventory
          const existing = this.inventory.find(s => s.item.id === item.id);
          if (existing) {
            existing.count = Math.min(99, existing.count + 1);
          } else {
            this.inventory.push({ item, count: 1 });
          }
          this.shopMessage = `BOUGHT ${item.name}!`;
        } else {
          this.shopMessage = 'NOT ENOUGH GOLD!';
        }
        this.shopMessageTimer = 1.0;
      } else if (this.shopMode === 'sell' && this.inventory[this.shopSelected]) {
        const slot = this.inventory[this.shopSelected];
        const sellPrice = Math.floor((slot.item.price || 0) / 2);
        if (slot.count > 0 && sellPrice > 0) {
          this.gold += sellPrice;
          slot.count--;
          if (slot.count <= 0) {
            this.inventory.splice(this.shopSelected, 1);
            this.shopSelected = Math.max(0, this.shopSelected - 1);
          }
          this.shopMessage = `SOLD FOR ${sellPrice}G!`;
        } else {
          this.shopMessage = 'CANNOT SELL!';
        }
        this.shopMessageTimer = 1.0;
      }
    }

    // Close
    if (this.keysJustPressed.Escape || this.keysJustPressed.KeyX) {
      this.state = STATE.MAP;
    }
  }

  _renderShop(r) {
    r.clear('#0a0a16');

    r.fillRect(0, 0, 480, 14, '#111122');
    r.drawText('SHOP', 5, 3, '#FFD700', 1);
    r.drawTextRight(`GOLD:${this.gold}`, 475, 3, '#FFD700', 1);

    const tabs = ['BUY', 'SELL'];
    for (let i = 0; i < 2; i++) {
      const tx = 5 + i * 236;
      const sel = (i === 0 && this.shopMode === 'buy') || (i === 1 && this.shopMode === 'sell');
      r.fillRect(tx, 18, 232, 14, sel ? '#222266' : '#111122');
      r.strokeRect(tx, 18, 232, 14, sel ? '#FFD700' : '#333366');
      r.drawText(tabs[i], tx + 100, 21, sel ? '#FFD700' : '#888888', 1);
    }

    const list = this.shopMode === 'buy' ? this.shopItems : this.inventory;
    for (let i = 0; i < list.length && i < 12; i++) {
      const sy = 36 + i * 16;
      const sel = i === this.shopSelected;
      const item = (this.shopMode === 'buy' ? list[i].item : list[i].item);
      const price = this.shopMode === 'buy' ? list[i].price : Math.floor((list[i].item.price || 0) / 2);

      r.fillRect(5, sy, 470, 14, sel ? '#222244' : '#111122');
      if (sel) r.strokeRect(5, sy, 470, 14, '#FFD700');

      r.drawText(item.name || item.id, 10, sy + 3, sel ? '#FFFFFF' : '#AAAAAA', 1);
      r.drawText(`${price}G`, 320, sy + 3, '#CCCC44', 1);
      if (this.shopMode === 'sell') r.drawText(`x${list[i].count}`, 400, sy + 3, '#CCCCCC', 1);
    }

    if (list.length === 0) r.drawTextCentered('NO ITEMS', 120, '#444444', 1);

    const ci = this.shopMode === 'buy' ? this.shopItems[this.shopSelected]?.item : this.inventory[this.shopSelected]?.item;
    if (ci) {
      r.fillRect(5, 245, 470, 16, '#111122');
      r.strokeRect(5, 245, 470, 16, '#333366');
      r.drawText(ci.description || ci.id, 10, 248, '#AAAAAA', 1);
    }

    if (this.shopMessage) {
      r.fillRect(140, 230, 200, 12, '#000000');
      r.strokeRect(140, 230, 200, 12, '#FFD700');
      r.drawTextCentered(this.shopMessage, 231, '#FFD700', 1);
    }

    r.drawText('L/R:TAB Z:BUY/SELL X:CLOSE', 5, 262, '#555566', 1);
  }

  // === AUTO-SAVE ===
  _autoSave() {
    saveToSlot(0, this);
    console.log('[PK] Auto-saved to slot 0');
  }
}

// Boot
const game = new Game();
window.__pkGame = game; // Expose for testing
game.init().catch(err => {
  console.error('[PK] Init failed:', err);
});

export { Game, STATE };
