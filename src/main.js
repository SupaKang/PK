// Pocket Kingdom — 메인 게임 루프 & 상태 관리
import { loadTypes } from './core/type.js';
import { loadMonsterDB, createMonster, gainExp, checkEvolution, evolve, learnSkill, replaceSkill } from './core/monster.js';
import { loadItems, Inventory } from './core/item.js';
import { Battle } from './core/battle.js';
import { PartyManager } from './core/party.js';
import { BALL_MULTIPLIERS } from './core/capture.js';
import { MapManager, loadMaps } from './world/map.js';
import { checkEncounter, generateWildMonster } from './world/encounter.js';
import { TrainerManager } from './world/npc.js';
import { StoryManager, loadStory } from './world/story.js';
import { SaveManager } from './save/save.js';
import { AudioManager } from './audio/audio.js';
import { Renderer } from './ui/renderer.js';
import { BattleUI } from './ui/battle-ui.js';
import { TitleScreenUI, GameMenuUI, ShopUI, PartyViewUI } from './ui/menu-ui.js';
import { DialogUI } from './ui/dialog-ui.js';
import { MapUI } from './ui/map-ui.js';
import { DexUI, DexTracker } from './ui/dex-ui.js';

const GameState = {
  LOADING: 'loading',
  TITLE: 'title',
  MAP: 'map',
  DIALOG: 'dialog',
  BATTLE: 'battle',
  MENU: 'menu',
  PARTY: 'party',
  SHOP: 'shop',
  DEX: 'dex',
};

class Game {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.renderer = new Renderer(this.canvas);
    this.audio = new AudioManager();

    this.state = GameState.LOADING;
    this.prevState = null;
    this.partyManager = null;
    this.inventory = null;
    this.mapManager = null;
    this.trainerManager = null;
    this.storyManager = null;
    this.dexTracker = null;
    this.playerName = '주인공';
    this.playtime = 0;

    // UI
    this.titleUI = null;
    this.battleUI = null;
    this.menuUI = null;
    this.dialogUI = new DialogUI(this.renderer);
    this.mapUI = null;
    this.dexUI = null;
    this.partyUI = null;
    this.shopUI = null;

    this.currentBattle = null;
    this.evolutionQueue = [];
    this.skillLearnQueue = [];
    this._battleEndCallback = null;
    this._battleConfig = null;

    this.lastTime = 0;
    this.dt = 0;
    this.keys = {};
    this.keyJustPressed = {};
    this.setupInput();
  }

  setupInput() {
    window.addEventListener('keydown', (e) => {
      if (!this.keys[e.key]) {
        this.keyJustPressed[e.key] = true;
      }
      this.keys[e.key] = true;
      e.preventDefault();
    });
    window.addEventListener('keyup', (e) => {
      this.keys[e.key] = false;
    });
  }

  async init() {
    this.renderer.clear('#000');
    this.renderer.drawPixelText('로딩 중...', 320, 280, '#fff', 2);

    try {
      await Promise.all([
        loadTypes(),
        loadMonsterDB(),
        loadItems(),
        loadMaps(),
        loadStory(),
      ]);
    } catch (err) {
      console.error('데이터 로드 실패:', err);
      this.renderer.clear('#000');
      this.renderer.drawPixelText('데이터 로드 실패!', 250, 280, '#f44', 2);
      return;
    }

    // 타이틀 UI
    this.titleUI = new TitleScreenUI(this.renderer);
    this.titleUI.onNewGame = () => this.startNewGame();
    this.titleUI.onLoadGame = (slot) => this.loadGame(slot);
    this.titleUI.setSaveSlots(SaveManager.getAllSlots());

    this.state = GameState.TITLE;
    this.lastTime = performance.now();
    requestAnimationFrame((t) => this.loop(t));
  }

  // ─── 새 게임 ───

  startNewGame() {
    this.partyManager = new PartyManager();
    this.inventory = new Inventory();
    this.mapManager = new MapManager();
    this.trainerManager = new TrainerManager();
    this.storyManager = new StoryManager();
    this.dexTracker = new DexTracker();
    this.playtime = 0;

    this.inventory.addItem('potion', 5);
    this.inventory.addItem('capsule_ball', 10);

    this.triggerStoryEvents();
  }

  // ─── 스토리 이벤트 ───

  triggerStoryEvents() {
    const events = this.storyManager.getActiveEvents(this.mapManager.currentLocation);
    if (events.length > 0) {
      this.processStoryEvent(events[0]);
    } else {
      this.enterMapState();
    }
  }

  processStoryEvent(event) {
    if (!event || !event.scenes || event.scenes.length === 0) {
      this.storyManager.completeEvent(event.id);
      this.triggerStoryEvents();
      return;
    }

    const scenes = [...event.scenes];
    const processNext = () => {
      if (scenes.length === 0) {
        this.storyManager.completeEvent(event.id);
        this.triggerStoryEvents();
        return;
      }

      const scene = scenes.shift();
      switch (scene.type) {
        case 'dialog':
          this.showDialog(scene.speaker, scene.text, processNext);
          break;
        case 'choice':
          this.showChoice(scene.text, scene.options, (option) => {
            if (option.result) this.applyEventResult(option.result);
            processNext();
          });
          break;
        case 'battle': {
          const enemyTeam = scene.team.map(t => createMonster(t.monsterId, t.level));
          this.startBattle({
            enemyParty: enemyTeam,
            isWild: false,
            trainerName: scene.trainerName,
            reward: scene.reward || 0,
          }, processNext);
          break;
        }
        case 'give_monster': {
          const monster = createMonster(scene.monsterId, scene.level || 5);
          this.partyManager.addMonster(monster);
          this.dexTracker.markCaught(monster.id);
          this.showDialog(null, `${monster.name}을(를) 받았다!`, processNext);
          break;
        }
        case 'give_item':
          this.inventory.addItem(scene.itemId, scene.count || 1);
          this.showDialog(null, `아이템을 받았다!`, processNext);
          break;
        case 'heal':
          this.partyManager.healAll();
          this.showDialog(null, '몬스터들의 체력이 회복되었다!', processNext);
          break;
        default:
          processNext();
      }
    };

    processNext();
  }

  applyEventResult(result) {
    if (result.give_monster) {
      const monster = createMonster(result.give_monster, result.level || 5);
      this.partyManager.addMonster(monster);
      this.dexTracker.markCaught(monster.id);
    }
    if (result.give_item) {
      this.inventory.addItem(result.give_item, result.count || 1);
    }
    if (result.heal) this.partyManager.healAll();
    if (result.badge) this.storyManager.addBadge(result.badge);
  }

  // ─── 대화 / 선택지 ───

  showDialog(speaker, text, onComplete) {
    this.dialogUI.onAllComplete = () => {
      if (this.state === GameState.DIALOG) {
        this.state = this.prevState || GameState.MAP;
      }
      if (onComplete) onComplete();
    };
    this.dialogUI.show(text, speaker);
    this.prevState = this.state !== GameState.DIALOG ? this.state : this.prevState;
    this.state = GameState.DIALOG;
  }

  showChoice(text, options, onSelect) {
    const choices = options.map((o, i) => ({ text: o.text, value: i }));
    this.dialogUI.onAllComplete = null;
    this.dialogUI.showChoice(text, choices, null, (choiceValue) => {
      if (this.state === GameState.DIALOG) {
        this.state = this.prevState || GameState.MAP;
      }
      if (onSelect) onSelect(options[choiceValue]);
    });
    this.prevState = this.state !== GameState.DIALOG ? this.state : this.prevState;
    this.state = GameState.DIALOG;
  }

  // ─── 맵 ───

  enterMapState() {
    if (!this.mapUI) {
      this.mapUI = new MapUI(this.renderer, this.mapManager);
      this.mapUI.onMove = (locationId) => this.onMapMove(locationId);
    }
    this.mapUI.badgeCount = this.storyManager.getBadgeCount();
    this.mapUI._refresh();
    this.mapUI.visible = true;
    this.state = GameState.MAP;

    const loc = this.mapManager.getLocation(this.mapManager.currentLocation);
    if (loc) {
      const bgm = loc.type === 'town' ? 'town_bgm' : loc.type === 'gym' ? 'boss_bgm' : 'route_bgm';
      this.audio.playBgm(bgm);
    }
  }

  onMapMove(locationId) {
    const badgeCount = this.storyManager.getBadgeCount();
    const result = this.mapManager.moveTo(locationId, badgeCount);
    if (!result.success) {
      this.showDialog(null, result.message);
      return;
    }

    const loc = this.mapManager.getLocation(locationId);
    if (!loc) return;

    this.mapUI.badgeCount = badgeCount;
    this.mapUI._refresh();

    const bgm = loc.type === 'town' ? 'town_bgm' : loc.type === 'gym' ? 'boss_bgm' : 'route_bgm';
    this.audio.playBgm(bgm);

    // 마을 자동 회복
    if (loc.type === 'town') {
      this.partyManager.healAll();
    }

    // 야생 인카운터
    if (loc.encounters && loc.encounters.length > 0 && checkEncounter(loc)) {
      const wildMonster = generateWildMonster(loc);
      if (wildMonster) {
        this.dexTracker.markSeen(wildMonster.id);
        this.startBattle({ enemyParty: [wildMonster], isWild: true });
        return;
      }
    }

    // 트레이너 체크
    if (loc.trainers) {
      for (const trainer of loc.trainers) {
        if (!this.trainerManager.isDefeated(trainer.id)) {
          const enemyTeam = this.trainerManager.getTrainerTeam(trainer);
          this.startBattle({
            enemyParty: enemyTeam,
            isWild: false,
            trainerName: trainer.name,
            reward: trainer.reward || 0,
            trainerId: trainer.id,
          });
          return;
        }
      }
    }

    // 체육관 자동 도전
    if (loc.gym && !this.storyManager.hasBadge(loc.gym.badge)) {
      const gymTeam = loc.gym.team.map(t => createMonster(t.monsterId, t.level));
      this.startBattle({
        enemyParty: gymTeam,
        isWild: false,
        trainerName: `체육관장 ${loc.gym.leader}`,
        reward: loc.gym.reward || 0,
        isGym: true,
        badge: loc.gym.badge,
      });
      return;
    }

    this.triggerStoryEvents();
  }

  // ─── 배틀 ───

  startBattle(config, onEnd) {
    const battle = new Battle({
      playerParty: this.partyManager.party,
      enemyParty: config.enemyParty,
      isWild: config.isWild || false,
      trainerName: config.trainerName || null,
      reward: config.reward || 0,
    });

    this.currentBattle = battle;
    this._battleConfig = config;
    this._battleEndCallback = onEnd || null;
    this.audio.playBgm(config.isGym ? 'boss_bgm' : 'battle_bgm');

    this.battleUI = new BattleUI(this.renderer, battle, this.inventory);
    this.battleUI.onBattleEnd = (result) => this.onBattleEnd(result);
    this.state = GameState.BATTLE;
  }

  onBattleEnd(result) {
    const config = this._battleConfig;
    const callback = this._battleEndCallback;
    this.currentBattle = null;
    this.battleUI = null;
    this._battleConfig = null;
    this._battleEndCallback = null;

    switch (result) {
      case 'win': {
        this.audio.playSfx('victory_fanfare');
        const rewards = [];

        if (config.reward) {
          this.inventory.money += config.reward;
          rewards.push(`${config.reward}원을 획득했다!`);
        }

        for (const enemy of config.enemyParty) {
          if (enemy.currentHp <= 0) {
            const expAmount = Math.floor((enemy.expYield * enemy.level) / 7);
            for (const m of this.partyManager.party) {
              if (m.currentHp > 0) {
                const share = Math.max(1, Math.floor(expAmount / this.partyManager.getAliveCount()));
                const events = gainExp(m, share);
                for (const evt of events) {
                  if (evt.type === 'level_up') {
                    rewards.push(`${m.name}은(는) 레벨 ${evt.level}이(가) 되었다!`);
                    if (checkEvolution(m) !== null) this.evolutionQueue.push(m);
                    for (const ns of evt.newSkills) this.skillLearnQueue.push({ monster: m, skill: ns });
                  }
                }
              }
            }
          }
        }

        if (config.trainerId) this.trainerManager.markDefeated(config.trainerId);
        if (config.isGym && config.badge) {
          this.storyManager.addBadge(config.badge);
          rewards.push(`${config.badge} 배지를 획득했다!`);
          this.storyManager.advanceChapter();
        }

        this.showRewardsSequence(rewards, () => this.processPostBattle(callback));
        break;
      }
      case 'capture': {
        const captured = config.enemyParty[0];
        const loc = this.partyManager.addMonster(captured);
        this.dexTracker.markCaught(captured.id);
        const msg = loc.location === 'party'
          ? `${captured.name}이(가) 파티에 추가되었다!`
          : `${captured.name}이(가) 보관함으로 보내졌다!`;
        this.showDialog(null, msg, () => this.processPostBattle(callback));
        break;
      }
      case 'flee':
        this.processPostBattle(callback);
        break;
      case 'lose':
        this.partyManager.healAll();
        this.inventory.money = Math.floor(this.inventory.money * 0.9);
        this.showDialog(null, '눈앞이 깜깜해졌다...\n마지막으로 방문한 마을에서 눈을 떴다.', () => {
          this.mapManager.returnToLastTown();
          this.enterMapState();
          if (callback) callback();
        });
        break;
    }
  }

  showRewardsSequence(messages, onComplete) {
    if (messages.length === 0) { onComplete(); return; }
    const msg = messages.shift();
    this.showDialog(null, msg, () => this.showRewardsSequence(messages, onComplete));
  }

  processPostBattle(callback) {
    if (this.skillLearnQueue.length > 0) {
      const { monster, skill } = this.skillLearnQueue.shift();
      const result = learnSkill(monster, skill);
      if (result.needChoice) {
        const options = monster.skills.map((s, i) => ({ text: `${s.name} (${s.type})`, index: i }));
        options.push({ text: '배우지 않는다', index: -1 });
        this.showChoice(
          `${monster.name}이(가) ${skill.name}을(를) 배우려 한다! 어떤 기술을 잊게 할까?`,
          options,
          (opt) => {
            if (opt.index >= 0) {
              replaceSkill(monster, opt.index, skill);
              this.showDialog(null, `${monster.name}은(는) ${skill.name}을(를) 배웠다!`, () => this.processPostBattle(callback));
            } else {
              this.showDialog(null, `${monster.name}은(는) ${skill.name}을(를) 배우지 않았다.`, () => this.processPostBattle(callback));
            }
          }
        );
        return;
      }
      this.showDialog(null, `${monster.name}은(는) ${skill.name}을(를) 배웠다!`, () => this.processPostBattle(callback));
      return;
    }

    if (this.evolutionQueue.length > 0) {
      const monster = this.evolutionQueue.shift();
      if (checkEvolution(monster) !== null) {
        const oldName = monster.name;
        evolve(monster);
        this.dexTracker.markCaught(monster.id);
        this.audio.playSfx('evolve');
        this.showDialog(null, `축하합니다! ${oldName}이(가) ${monster.name}(으)로 진화했다!`, () => this.processPostBattle(callback));
        return;
      }
      this.processPostBattle(callback);
      return;
    }

    this.enterMapState();
    if (callback) callback();
  }

  // ─── 상점 ───

  openShop(shopItems) {
    this.shopUI = new ShopUI(this.renderer, this.inventory, shopItems);
    this.shopUI.onClose = () => {
      this.shopUI = null;
      this.state = GameState.MAP;
    };
    this.shopUI.open(shopItems);
    this.state = GameState.SHOP;
  }

  // ─── 세이브/로드 ───

  saveGame(slot) {
    SaveManager.save(slot, {
      playerName: this.playerName,
      playtime: this.playtime,
      party: this.partyManager.serialize(),
      inventory: this.inventory.serialize(),
      map: this.mapManager.serialize(),
      trainers: this.trainerManager.serialize(),
      story: this.storyManager.serialize(),
      dex: this.dexTracker.serialize(),
    });
  }

  loadGame(slot) {
    const state = SaveManager.load(slot);
    if (!state) return false;
    this.playerName = state.playerName || '주인공';
    this.playtime = state.playtime || 0;
    this.partyManager = PartyManager.deserialize(state.party);
    this.inventory = Inventory.deserialize(state.inventory);
    this.mapManager = MapManager.deserialize(state.map);
    this.trainerManager = TrainerManager.deserialize(state.trainers);
    this.storyManager = StoryManager.deserialize(state.story);
    this.dexTracker = DexTracker.deserialize(state.dex);
    this.enterMapState();
    return true;
  }

  // ─── 메뉴 ───

  openMenu() {
    this.menuUI = new GameMenuUI(this.renderer);
    this.menuUI.partyManager = this.partyManager;
    this.menuUI.inventory = this.inventory;
    this.menuUI.playerData = {
      name: this.playerName,
      badges: this.storyManager.getBadges(),
      playTime: this.playtime,
      money: this.inventory.money,
    };
    this.menuUI.onOpenDex = () => {
      this.dexUI = new DexUI(this.renderer, this.dexTracker, {
        onClose: () => { this.dexUI = null; this.state = GameState.MENU; },
      });
      this.state = GameState.DEX;
    };
    this.menuUI.onSave = (slot) => {
      this.saveGame(slot);
      this.showDialog(null, '저장 완료!');
    };
    this.menuUI.open();
    this.state = GameState.MENU;
  }

  closeMenu() {
    if (this.menuUI) this.menuUI.visible = false;
    this.menuUI = null;
    this.state = GameState.MAP;
  }

  // ─── 게임 루프 ───

  loop(timestamp) {
    this.dt = Math.min((timestamp - this.lastTime) / 1000, 0.1);
    this.lastTime = timestamp;

    if (this.state === GameState.MAP || this.state === GameState.BATTLE) {
      this.playtime += this.dt;
    }

    this.update(this.dt);
    this.render();
    this.keyJustPressed = {};
    requestAnimationFrame((t) => this.loop(t));
  }

  update(dt) {
    switch (this.state) {
      case GameState.TITLE:
        if (this.titleUI) this.titleUI.update(dt);
        this.handleInput(this.titleUI);
        break;
      case GameState.MAP:
        if (this.mapUI) this.mapUI.update(dt);
        // Escape 메뉴
        if (this.keyJustPressed['Escape']) { this.openMenu(); break; }
        this.handleInput(this.mapUI);
        break;
      case GameState.DIALOG:
        this.dialogUI.update(dt);
        this.handleInput(this.dialogUI);
        break;
      case GameState.BATTLE:
        if (this.battleUI) this.battleUI.update(dt);
        this.handleInput(this.battleUI);
        break;
      case GameState.MENU:
        if (this.menuUI) this.menuUI.update(dt);
        if (this.keyJustPressed['Escape'] && (!this.menuUI || !this.menuUI.subMenu)) {
          this.closeMenu();
          break;
        }
        this.handleInput(this.menuUI);
        break;
      case GameState.PARTY:
        if (this.partyUI) this.partyUI.update(dt);
        this.handleInput(this.partyUI);
        break;
      case GameState.SHOP:
        if (this.shopUI) this.shopUI.update(dt);
        this.handleInput(this.shopUI);
        break;
      case GameState.DEX:
        if (this.dexUI) this.dexUI.update(dt);
        this.handleInput(this.dexUI);
        break;
    }
  }

  handleInput(ui) {
    if (!ui) return;
    for (const key of Object.keys(this.keyJustPressed)) {
      ui.handleInput(key);
    }
  }

  render() {
    this.renderer.clear('#111');
    const ctx = this.ctx;

    switch (this.state) {
      case GameState.LOADING:
        this.renderer.drawPixelText('로딩 중...', 320, 280, '#fff', 2);
        break;
      case GameState.TITLE:
        if (this.titleUI) this.titleUI.render();
        break;
      case GameState.MAP:
        if (this.mapUI) this.mapUI.render();
        break;
      case GameState.DIALOG:
        if (this.mapUI) this.mapUI.render();
        this.dialogUI.render();
        break;
      case GameState.BATTLE:
        if (this.battleUI) this.battleUI.render();
        break;
      case GameState.MENU:
        if (this.mapUI) this.mapUI.render();
        if (this.menuUI) this.menuUI.render();
        break;
      case GameState.PARTY:
        if (this.partyUI) this.partyUI.render(ctx);
        break;
      case GameState.SHOP:
        if (this.shopUI) this.shopUI.render();
        break;
      case GameState.DEX:
        if (this.dexUI) this.dexUI.render(ctx);
        break;
    }
  }
}

// ─── 앱 시작 ───
const game = new Game();
game.init().catch(console.error);
