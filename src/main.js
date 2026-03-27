// Pocket Kingdom — 메인 게임 루프 & 상태 관리
import { loadTypes } from './core/type.js';
import { loadMonsterDB, createMonster, gainExp, checkEvolution, evolve, learnSkill, replaceSkill, getAllMonsters } from './core/monster.js';
import { loadClasses, getAllClasses, createContractor, gainContractorExp, recalcContractorStats } from './core/player-class.js';
import { loadItems, Inventory } from './core/item.js';
import { Battle } from './core/battle.js';
import { PartyManager } from './core/party.js';

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
import { AssetLoader } from './ui/asset-loader.js';
import { getZoneBoss, getBossRewards, ZONE_BOSSES } from './core/zone-boss.js';
import { ExpeditionManager } from './core/expedition.js';
import { CampingManager, FOOD_ITEMS } from './core/camping.js';
import { TimeEncounterManager } from './core/time-encounter.js';
import { AchievementManager } from './core/achievements.js';
import { RECIPES, canCraft, craft } from './core/crafting.js';
import { DailyChallenge } from './core/daily-challenge.js';

import { ExpeditionHUD } from './ui/expedition-hud.js';
import { ExpeditionSummary } from './ui/expedition-summary.js';
import { HIDDEN_EVENT_TYPES } from './core/time-encounter.js';
import { TouchControls } from './ui/touch-controls.js';
import { CreditsUI } from './ui/credits-ui.js';

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
  EXPEDITION_SUMMARY: 'expedition_summary',
  CREDITS: 'credits',
};

class Game {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.renderer = new Renderer(this.canvas);
    this.audio = AudioManager;

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
    this.creditsUI = null;

    this.currentBattle = null;
    this.evolutionQueue = [];
    this.skillLearnQueue = [];
    this._battleEndCallback = null;
    this._battleConfig = null;
    this._gauntletQueue = [];
    this._gauntletHealBetween = false;
    this._isBossRush = false;

    // 탐험 시스템
    this.expeditionManager = null;
    this.campingManager = new CampingManager();
    this.timeEncounterManager = new TimeEncounterManager();
    this.achievementManager = new AchievementManager();
    this.dailyChallenge = new DailyChallenge();
    this.expeditionHUD = null;
    this.expeditionSummary = null;
    // 탐험 중 추적 데이터
    this._expTracker = { monstersDefeated: 0, expGained: 0, moneyEarned: 0 };
    this._expeditionSuccessCount = 0;
    this._tutorialShown = false;

    // 완료된 퀘스트
    this._completedQuests = new Set();

    // 카르마/성향 시스템 (-100 어둠 ~ +100 빛)
    this._karma = 0;

    // 플레이 통계
    this._playStats = {
      battlesWon: 0,
      battlesLost: 0,
      monstersContracted: 0,
      stepsWalked: 0,
      campingCount: 0,
    };

    this.lastTime = 0;
    this.dt = 0;
    this.keys = {};
    this.keyJustPressed = {};

    // Settings
    this.settings = {
      textSpeed: 1,  // 0=slow, 1=normal, 2=fast
      volume: 5,     // 0~10
    };

    // 난이도 설정
    this._difficulty = 'normal';
    this._difficultySettings = { maxAP: 240, expMultiplier: 1.0, enemyLevelBonus: 0 };

    this.setupInput();
    this.touchControls = new TouchControls(this.canvas);
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

  _adjustKarma(amount) {
    this._karma = Math.max(-100, Math.min(100, this._karma + amount));
  }

  _isQuestComplete(quest) {
    if (quest.task.includes('보스 격파')) {
      const zoneId = quest.task.split(' ')[0];
      return this.trainerManager.isDefeated('boss_' + zoneId);
    }
    if (quest.task.includes('방문')) {
      const locId = quest.task.split(' ')[0];
      return this.mapManager.hasVisited(locId);
    }
    return false;
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
        loadClasses(),
      ]);
    } catch (err) {
      console.error('데이터 로드 실패:', err);
      this.renderer.clear('#000');
      this.renderer.drawPixelText('데이터 로드 실패!', 250, 280, '#f44', 2);
      return;
    }

    // 에셋 프리로드 (외부 PNG — 없어도 OK, 프로시저럴 폴백)
    this.renderer.clear('#000');
    this.renderer.drawPixelText('에셋 로딩 중...', 300, 260, '#fff', 2);
    try {
      await AssetLoader.preloadAll();
    } catch (e) {
      console.warn('에셋 프리로드 일부 실패 (폴백 사용):', e);
    }

    // 타이틀 UI
    this.titleUI = new TitleScreenUI(this.renderer);
    this.titleUI.onNewGame = () => this.startNewGame();
    this.titleUI.onLoadGame = (slot) => this.loadGame(slot);
    this.titleUI.setSaveSlots(SaveManager.getAllSlots());

    this.state = GameState.TITLE;
    this.audio.playBgm('town_bgm');
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
    this.inventory.addItem('magic_stone', 10);

    // 난이도 선택
    const diffOptions = [
      { text: '쉬움 — 탐험 AP 320, 전투 보너스 경험치', difficulty: 'easy' },
      { text: '보통 — 표준 (AP 240)', difficulty: 'normal' },
      { text: '어려움 — AP 180, 적 레벨 +3', difficulty: 'hard' },
    ];
    this.showChoice('난이도를 선택하세요:', diffOptions, (opt) => {
      this._difficulty = opt.difficulty;
      this._difficultySettings = {
        easy:   { maxAP: 320, expMultiplier: 1.5, enemyLevelBonus: 0 },
        normal: { maxAP: 240, expMultiplier: 1.0, enemyLevelBonus: 0 },
        hard:   { maxAP: 180, expMultiplier: 0.8, enemyLevelBonus: 3 },
      }[opt.difficulty];

      // 맵 UI 생성 및 스토리 시작
      this.enterMapState();
      this.triggerStoryEvents();
    });
  }

  // ─── 직업 선택 (꿈속에서 할아버지가 묻는다) ───

  _showClassSelection(onComplete) {
    const classes = getAllClasses();
    const options = classes.map(c => ({
      text: `${c.name} - ${c.description.substring(0, 25)}`,
      classId: c.id,
    }));

    this.showChoice('할아버지가 묻는다. 어떤 길을 걷고 싶으냐?', options, (opt) => {
      const contractor = createContractor(opt.classId, 5, this.playerName);
      this.audio.playSfx('level_up');
      this.partyManager.setContractor(contractor);

      // 고랭이를 기본 파트너로 추가 (어린 시절부터 함께한 고양이)
      const goraengi = createMonster(101, 5);
      goraengi.nickname = '고랭이';
      this.partyManager.addMonster(goraengi);
      this.dexTracker.markCaught(101);

      // 기본 아이템 보충
      this.inventory.addItem('monster_dex', 1);

      if (onComplete) onComplete();
    });
  }

  // ─── 스토리 이벤트 ───

  triggerStoryEvents() {
    const events = this.storyManager.getActiveEvents(this.mapManager.currentLocation);
    if (events.length > 0) {
      this.processStoryEvent(events[0]);
    } else {
      // Auto-advance chapter if all events complete (non-gym chapters like prologue)
      if (this.storyManager.isChapterComplete()) {
        const result = this.storyManager.advanceChapter();
        if (result.success) {
          // Re-check for events in new chapter
          this.triggerStoryEvents();
          return;
        }
      }
      // 스토리 이벤트 완료 후 사천왕 가운틀릿 체크
      if (this._checkGauntlet()) return;
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

        // prologue_01 완료 → 직업 선택 삽입 (계약자가 없을 때만)
        if (event.id === 'prologue_01' && !this.partyManager.contractor) {
          this._showClassSelection(() => this.triggerStoryEvents());
          return;
        }

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
        case 'rival_battle': {
          const rivalLevel = Math.max(5, (this.partyManager.contractor?.level || 5));
          // Rival team scales with story progress
          const badgeCount = this.storyManager.getBadgeCount();
          const rivalTeam = [createMonster(4, rivalLevel)]; // 물방울이 base
          if (badgeCount >= 2) rivalTeam.push(createMonster(10, rivalLevel - 1));
          if (badgeCount >= 4) rivalTeam.push(createMonster(48, rivalLevel));
          if (badgeCount >= 7) {
            rivalTeam.push(createMonster(73, rivalLevel + 1));
            rivalTeam.push(createMonster(28, rivalLevel + 2));
          }
          this.startBattle({
            enemyParty: rivalTeam,
            isWild: false,
            trainerName: '라이벌 은하',
            reward: rivalLevel * 80,
          }, processNext);
          break;
        }
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
      this.mapUI.onInteract = (npc) => this._onNpcInteract(npc);
      this.mapUI.onShop = (npc) => {
        const loc = this.mapManager.getCurrentLocation();
        if (loc && loc.shop) this.openShop(loc.shop);
      };
      this.mapUI.onHeal = () => {
        this.partyManager.healAll();
        this._adjustKarma(1); // 치유사 이용 — 빛 성향
        this.showDialog(null, '파티의 체력이 모두 회복되었다!');
      };
      this.mapUI.onBox = () => {
        this._openBoxUI();
      };
      this.mapUI.onCraft = (npc) => {
        const available = RECIPES.filter(r => canCraft(r, this.inventory));
        if (available.length === 0) {
          this.showDialog(npc.name, '조합할 수 있는 레시피가 없다. 재료를 모아오자.');
          return;
        }
        const options = available.map(r => ({ text: r.name + ' — ' + r.description.substring(0, 20), recipe: r }));
        options.push({ text: '취소', recipe: null });
        this.showChoice('어떤 아이템을 조합할까?', options, (opt) => {
          if (!opt.recipe) return;
          craft(opt.recipe, this.inventory);
          this.audio.playSfx('level_up');
          this.showDialog(null, `${opt.recipe.result.itemId} 조합 성공!`);
        });
      };
      this.mapUI.onBoss = (npc) => {
        this.audio.playSfx('evolve');
        this.showDialog(npc.name, npc.dialog, () => {
          const bossData = getZoneBoss(this.mapManager.currentLocation);
          if (bossData) {
            const bossTeam = bossData.team.map(t => createMonster(t.monsterId, t.level));
            this.startBattle({
              enemyParty: bossTeam,
              isWild: false,
              trainerName: npc.name,
              reward: bossData.rewards.money,
              trainerId: npc.id,
              isBoss: true,
            });
          }
        });
      };
      this.mapUI.onQuest = (npc) => {
        const quest = npc.quest;
        if (!quest) return;

        // Check if quest already completed
        if (this._completedQuests?.has(quest.id)) {
          this.showDialog(npc.name, '고마워! 이미 보상을 줬잖아.');
          return;
        }

        // Check if quest condition met
        const questDone = this._isQuestComplete(quest);
        if (questDone) {
          // Give reward
          if (quest.reward.itemId) this.inventory.addItem(quest.reward.itemId, quest.reward.count || 1);
          if (quest.reward.money) this.inventory.money += quest.reward.money;
          if (!this._completedQuests) this._completedQuests = new Set();
          this._completedQuests.add(quest.id);
          this.audio.playSfx('level_up');
          this.showDialog(npc.name, `감사합니다! 보상을 드리겠습니다!`);
        } else {
          this.showDialog(npc.name, npc.dialog);
        }
      };
      this.mapUI.onHiddenEvent = (event) => {
        const eventDef = HIDDEN_EVENT_TYPES[event.type];
        if (!eventDef) return;
        this.audio.playSfx('level_up');
        this.showDialog(null, event.description || eventDef.description, () => {
          switch (eventDef.reward) {
            case 'heal_full':
              this.partyManager.healAll();
              if (event.type === 'fairy_tea_party') this._adjustKarma(5); // 요정의 차 — 자연 성향
              this.showDialog(null, '파티가 완전 회복되었다!');
              break;
            case 'item': {
              const items = eventDef.possibleItems || ['potion'];
              const itemId = items[Math.floor(Math.random() * items.length)];
              this.inventory.addItem(itemId, 1);
              this.showDialog(null, '아이템을 획득했다!');
              break;
            }
            case 'ap_restore':
              if (this.expeditionManager?.isActive) {
                this.expeditionManager.currentAP = Math.min(
                  this.expeditionManager.maxAP,
                  this.expeditionManager.currentAP + (eventDef.apAmount || 20)
                );
                this._syncExpeditionHUD();
                this.showDialog(null, `AP가 ${eventDef.apAmount || 20} 회복되었다!`);
              }
              break;
            case 'exp': {
              const exp = eventDef.expAmount || 200;
              const party = this.partyManager.getBattleParty();
              for (const m of party) {
                if (m.isContractor) gainContractorExp(m, exp);
                else gainExp(m, exp);
              }
              this.showDialog(null, `경험치 ${exp}를 얻었다!`);
              break;
            }
            case 'battle': {
              const ids = eventDef.monsterIds || [31];
              const bonus = eventDef.levelBonus || 5;
              const team = ids.map(id => createMonster(id, (this.partyManager.contractor?.level || 10) + bonus));
              this.startBattle({ enemyParty: team, isWild: false, trainerName: '마족의 함정' });
              break;
            }
            case 'stat_boost': {
              if (event.type === 'dark_altar') this._adjustKarma(-10); // 어둠의 제단 — 어둠 성향
              const c = this.partyManager.contractor;
              if (c) {
                const stat = eventDef.statBoost?.stat || 'atk';
                const amount = eventDef.statBoost?.amount || 1;
                if (!c._statStages) c._statStages = { atk: 0, def: 0, spAtk: 0, spDef: 0, speed: 0 };
                c._statStages[stat] = Math.min(6, (c._statStages[stat] || 0) + amount);
                const names = { atk: '공격', def: '방어', spAtk: '특수공격', spDef: '특수방어', speed: '속도' };
                this.showDialog(null, `어둠의 힘이 스며든다... ${names[stat] || stat}이(가) 상승했다!`);
              }
              break;
            }
            case 'rare_shop': {
              const rareShop = [
                { itemId: 'ultra_stone', stock: -1 },
                { itemId: 'full_revive', stock: -1 },
                { itemId: 'pp_restore_full', stock: -1 },
                { itemId: 'return_scroll', stock: -1 },
              ];
              this.showDialog(null, '떠돌이 상인이 나타났다!', () => {
                this.openShop(rareShop);
              });
              break;
            }
            default:
              break;
          }
        });
      };
      this.mapUI.onEncounterCheck = () => {
        this._playStats.stepsWalked++;
        // AP 소모 (이동 1타일 = 1AP)
        if (this.expeditionManager?.isActive) {
          if (!this.expeditionManager.spendAP(1)) {
            // AP 고갈 — 탐험 실패
            this._onExpeditionFail();
            return;
          }
          this._syncExpeditionHUD();
        }

        // 시간대 기반 인카운터
        const loc = this.mapManager.getCurrentLocation();
        const magiDensity = this.expeditionManager?.getMagiDensity() || 0.1;
        if (loc && loc.encounters && loc.encounters.length > 0) {
          if (checkEncounter(loc)) {
            let wildMonster = generateWildMonster(loc, this.storyManager.getBadgeCount());
            if (wildMonster) {
              // 난이도에 따른 적 레벨 보너스
              if (this._difficultySettings.enemyLevelBonus > 0) {
                wildMonster = createMonster(wildMonster.id, wildMonster.level + this._difficultySettings.enemyLevelBonus);
              }
              // 마기 농도에 따른 레벨 보너스 → 스탯 포함 재생성
              const nightBonus = Math.floor(wildMonster.level * magiDensity * 0.3);
              if (nightBonus > 0) {
                wildMonster = createMonster(wildMonster.id, wildMonster.level + nightBonus);
              }
              // After generating wildMonster, check for night replacement
              if (magiDensity > 0.7 && Math.random() < 0.2) {
                // Night special encounter
                const nightEnc = this.timeEncounterManager.getNightSpecialEncounter(magiDensity);
                if (nightEnc) {
                  const nightLevel = (this.partyManager.contractor?.level || 10) + Math.floor(magiDensity * 5);
                  wildMonster = createMonster(nightEnc.monsterId, nightLevel);
                }
              }
              this.dexTracker.markSeen(wildMonster.id);
              // 전설 몬스터 특별 연출 (ID 91-100)
              if (wildMonster.id >= 91 && wildMonster.id <= 100) {
                this.audio.playSfx('evolve');
                this.renderer.screenShake(600, 6);
                this._checkAchievement('legendary_encounter');
                this.showDialog(null, '...! 강대한 기운이 느껴진다!', () => {
                  this.showDialog(null, `전설의 ${wildMonster.name}이(가) 나타났다!`, () => {
                    this.startBattle({ enemyParty: [wildMonster], isWild: true });
                  });
                });
                return;
              }
              this.audio.playSfx('hit');
              this.startBattle({ enemyParty: [wildMonster], isWild: true });
            }
          }
        }
      };
    }

    // 계약자 외형 설정
    const c = this.partyManager.contractor;
    if (c && c.spriteConfig) {
      this.mapUI.setPlayerAppearance(c.classId, c.spriteConfig.baseColor, c.spriteConfig.accentColor);
    }

    this.mapUI.badgeCount = this.storyManager.getBadgeCount();
    if (this.partyManager.contractor) {
      this.mapUI._contractorLevel = this.partyManager.contractor.level;
    }
    this.mapUI._refresh();
    this.mapUI.visible = true;
    this.state = GameState.MAP;

    // 위치 배너 표시
    const locName = this.mapManager.getCurrentLocation()?.name;
    if (locName && this.mapUI) {
      this.mapUI.showBanner(locName);
    }

    // 첫 플레이 조작법 힌트
    if (!this._tutorialShown) {
      this._tutorialShown = true;
      this.showDialog(null, '조작법: 방향키로 이동, Enter로 상호작용, ESC로 메뉴, H로 도움말');
    }

    // 탐험 시작 대기 플래그 처리
    if (this._pendingExpeditionStart) {
      this._pendingExpeditionStart = false;
      const apMax = this._difficultySettings.maxAP;
      this.expeditionManager.startExpedition({
        maxAP: apMax,
        startLocation: this._expeditionStartLocation || this.mapManager.currentLocation,
      });
      this._syncExpeditionHUD();
      this.audio.playSfx('select');
      this.showDialog(null, `탐험을 시작한다. 마석의 빛이 타오른다! (AP: ${apMax})`);
    }

    // 탐험 HUD 초기화
    if (!this.expeditionHUD) {
      this.expeditionHUD = new ExpeditionHUD(this.renderer);
      this.expeditionHUD.onCamp = (opt) => this._executeCamp(opt);
    }

    // 탐험 상태 동기화
    this._syncExpeditionHUD();

    const loc = this.mapManager.getLocation(this.mapManager.currentLocation);
    if (loc) {
      const bgm = loc.type === 'town' ? 'town_bgm' : loc.type === 'gym' ? 'boss_bgm' : 'route_bgm';
      this.audio.playBgm(bgm);

      const ambientMap = { cave: 'cave', forest: 'forest', route: 'forest', dungeon: 'cave' };
      const ambient = ambientMap[loc?.type];
      if (ambient) this.audio.playAmbient(ambient);
      else this.audio.stopAmbient();

      // 마을 진입 시 자동으로 탐험 시작 (마을이 아닌 곳으로 이동할 때)
      if (loc.type === 'town' && this.expeditionManager?.isActive) {
        // 마을 도착 = 안전 귀환 가능 지점
      }
    }
  }

  /** 탐험 HUD 데이터 동기화 */
  _syncExpeditionHUD() {
    if (!this.expeditionHUD || !this.expeditionManager) return;
    const em = this.expeditionManager;
    this.expeditionHUD.currentAP = em.getRemainingAP();
    this.expeditionHUD.maxAP = em.maxAP;
    this.expeditionHUD.timeOfDay = em.getTimeOfDay();
    this.expeditionHUD.magiDensity = em.getMagiDensity();
    this.expeditionHUD.hourOfDay = em.getHourOfDay();
    this.expeditionHUD.isExpeditionActive = em.isActive;

    // Quest indicator
    if (this.storyManager) {
      const chInfo = this.storyManager.getCurrentChapterInfo();
      this.expeditionHUD.objectiveText = chInfo ? `Ch${this.storyManager.currentChapter}: ${chInfo.title}` : '';
    }

    if (this.mapUI) {
      this.mapUI.expeditionTimeOfDay = em.getTimeOfDay();
      const party = this.partyManager.getBattleParty();
      this.mapUI._partyLowHP = party.some(m => m.currentHp > 0 && m.currentHp < m.stats.hp * 0.25);
      this.mapUI._partyData = party;
    }

    // AP 경고
    if (em.getRemainingAP() <= 30 && em.getRemainingAP() > 0 && !this._apWarningShown) {
      this._apWarningShown = true;
      this.audio.playSfx('cancel');
      this.showDialog(null, '⚠ 마석의 빛이 약해지고 있다! AP가 얼마 남지 않았다!');
    }
    if (em.getRemainingAP() > 30) this._apWarningShown = false;

    this.expeditionHUD.playtime = this.playtime;

    // Estimate return AP (manhattan distance from current tile to start)
    if (this.mapUI && this.expeditionHUD && this.expeditionManager?.isActive) {
      // Simple estimate based on map width (rough distance to town)
      const mapData = this.mapUI.currentMapData;
      if (mapData) {
        const px = this.mapUI.player?.getTileX() || 0;
        const estimate = px + 10; // distance to exit + buffer
        this.expeditionHUD.returnAPEstimate = estimate;
      }
    }
  }

  /** 캠핑 실행 */
  _executeCamp(campOption) {
    if (!this.expeditionManager) return;
    this._playStats.campingCount++;
    this._checkAchievement('camp', this._playStats.campingCount);

    // Collect food bonuses BEFORE AP check (consume one of each type only)
    let apSave = 0, healBonus = 0, ppBonus = 0;
    const foodToConsume = [];
    for (const fid of ['ration', 'herb_tea', 'energy_bar']) {
      if (this.inventory.hasItem(fid)) {
        const food = FOOD_ITEMS[fid];
        if (food) {
          if (food.healBonus) { healBonus = food.healBonus; foodToConsume.push(fid); }
          if (food.ppBonus) { ppBonus = food.ppBonus; foodToConsume.push(fid); }
          if (food.apSave) { apSave = food.apSave; foodToConsume.push(fid); }
        }
      }
    }

    const actualAPCost = Math.max(1, campOption.ap - apSave);

    // AP 확인 먼저
    if (!this.expeditionManager.spendAP(actualAPCost)) {
      this.showDialog(null, 'AP가 부족하다!');
      return;
    }

    // Consume food AFTER AP check (one of each type only)
    for (const fid of foodToConsume) {
      this.inventory.removeItem(fid, 1);
    }

    // 파티 회복 (pass food bonuses to camping manager)
    const party = this.partyManager.getBattleParty();
    const result = this.campingManager.executeCamp(party, actualAPCost, { healBonus, ppBonus });

    // 유대도 증가 (캠핑)
    for (const m of this.partyManager.getBattleParty()) {
      if (!m.isContractor) {
        m.bond = Math.min(255, (m.bond || 0) + 5);
      }
    }

    this._syncExpeditionHUD();
    this.audio.playSfx('select');

    // 캠핑 결과 메시지
    this.showDialog(null, `야영을 했다. (${actualAPCost}AP 소모)`, () => {
      // 캠핑 이벤트 체크
      if (result.event) {
        this._handleCampEvent(result.event);
      }
    });
  }

  /** 탐험 실패 처리 */
  _onExpeditionFail() {
    if (!this.expeditionManager) return;
    this.audio.playSfx('cancel');
    const apUsed = this.expeditionManager.maxAP - this.expeditionManager.currentAP;
    const apRemaining = this.expeditionManager.currentAP;
    const timeOfDay = this.expeditionManager.getTimeOfDay();
    const penalty = this.expeditionManager.failExpedition(this.inventory.money);
    const moneyLost = penalty.moneyLost || 0;
    this.inventory.money = Math.max(0, this.inventory.money - moneyLost);
    this.partyManager.healAll();
    // Show expedition failure summary screen
    this.expeditionSummary = new ExpeditionSummary(this.renderer);
    this.expeditionSummary.show({
      success: false,
      apUsed: apUsed,
      apRemaining: apRemaining,
      monstersDefeated: this._expTracker.monstersDefeated,
      itemsFound: [],
      expGained: 0,
      moneyChange: -moneyLost,
      bonusExp: 0,
      timeOfDay: timeOfDay,
    });
    this.expeditionSummary.onDismiss = () => {
      this.expeditionSummary = null;
      this.mapManager.returnToLastTown();
      this._syncExpeditionHUD();
      this.enterMapState();
    };
    this.state = GameState.EXPEDITION_SUMMARY;
  }

  /** 탐험 시작 (마을에서 루트로 나갈 때 자동) */
  _startExpedition() {
    if (!this.expeditionManager) {
      this.expeditionManager = new ExpeditionManager();
    }
    if (!this.expeditionManager.isActive) {
      this._pendingExpeditionStart = true;
      this._expeditionStartLocation = this.mapManager.currentLocation;
      this._expTracker = { monstersDefeated: 0, expGained: 0, moneyEarned: 0 };
    }
  }

  /** 캠핑 이벤트 처리 */
  _handleCampEvent(event) {
    this.showDialog(null, event.description || '이벤트 발생!', () => {
      switch (event.type) {
        case 'ap_restore':
          if (this.expeditionManager) {
            this.expeditionManager.currentAP = Math.min(
              this.expeditionManager.maxAP,
              this.expeditionManager.currentAP + (event.apAmount || 10)
            );
            this._syncExpeditionHUD();
            this.showDialog(null, `AP가 ${event.apAmount || 10} 회복되었다!`);
          }
          break;
        case 'item': {
          const items = event.possibleItems || ['potion'];
          const itemId = items[Math.floor(Math.random() * items.length)];
          this.inventory.addItem(itemId, 1);
          this.showDialog(null, '아이템을 발견했다!');
          break;
        }
        case 'bond':
          // 경험치 보너스
          const expBonus = event.expBonus || 50;
          const battleParty = this.partyManager.getBattleParty();
          for (const m of battleParty) {
            if (m.isContractor) gainContractorExp(m, expBonus);
            else gainExp(m, expBonus);
          }
          this.showDialog(null, '유대가 깊어졌다. 경험치를 얻었다!');
          break;
        case 'battle': {
          const monsterIds = event.monsterIds || [31, 64];
          const levelBonus = event.levelBonus || 3;
          const level = (this.partyManager.contractor?.level || 10) + levelBonus;
          const team = monsterIds.map(id => createMonster(id, level));
          this.showDialog(null, '야습이다! 마물이 습격해왔다!', () => {
            this.startBattle({ enemyParty: team, isWild: true });
          });
          break;
        }
        default:
          break;
      }
    });
  }

  /** 보관함 UI */
  _openBoxUI() {
    const box = this.partyManager.box;
    if (box.length === 0) {
      this.showDialog(null, '보관함이 비어있다.');
      return;
    }

    // Show box monsters as choices
    const options = box.map((m, i) => ({
      text: `${m.nickname || m.name} Lv${m.level} (${m.type.join('/')})`,
      index: i,
    }));
    options.push({ text: '취소', index: -1 });

    this.showChoice('보관함에서 꺼낼 몬스터를 선택하세요:', options, (opt) => {
      if (opt.index === -1) return;

      if (this.partyManager.party.length >= 5) {
        // Party full — need to deposit first
        const partyOpts = this.partyManager.party.map((m, i) => ({
          text: `${m.nickname || m.name} Lv${m.level}`,
          index: i,
        }));
        partyOpts.push({ text: '취소', index: -1 });

        this.showChoice('파티가 가득 찼다. 보관함에 넣을 몬스터를 선택:', partyOpts, (pOpt) => {
          if (pOpt.index === -1) return;
          this.partyManager.swapWithBox(pOpt.index, opt.index);
          this.showDialog(null, '몬스터를 교환했다!');
        });
      } else {
        const name = box[opt.index]?.name || '몬스터';
        this.partyManager.withdrawFromBox(opt.index);
        this.showDialog(null, `${name}을(를) 파티에 추가했다!`);
      }
    });
  }

  /** NPC 상호작용 */
  _onNpcInteract(npc) {
    if (!npc) return;

    if (npc.type === 'trainer' && npc.trainerId) {
      if (!this.trainerManager.isDefeated(npc.trainerId)) {
        // 트레이너 배틀
        const loc = this.mapManager.getCurrentLocation();
        const trainerData = loc?.trainers?.find(t => t.id === npc.trainerId);
        if (trainerData) {
          const enemyTeam = this.trainerManager.getTrainerTeam(trainerData);
          this.showDialog(null, `${npc.name}이(가) 승부를 걸어왔다!`, () => {
            this.startBattle({
              enemyParty: enemyTeam,
              isWild: false,
              trainerName: npc.name,
              reward: trainerData.reward || 0,
              trainerId: npc.trainerId,
            });
          });
        }
      } else {
        // Varied defeat dialog
        const defeatDialogs = [
          '다음에는 지지 않겠어!',
          '강해졌구나... 인정한다.',
          '너한테 배울 게 있어.',
          '다음에 만나면 더 강해져 있을 거야!',
          '좋은 승부였어!',
        ];
        const dialogIdx = npc.trainerId.split('').reduce((s,c) => s + c.charCodeAt(0), 0) % defeatDialogs.length;
        this.showDialog(npc.name, defeatDialogs[dialogIdx]);
      }
      return;
    }

    if (npc.type === 'gym_leader' && npc.trainerId) {
      const loc = this.mapManager.getCurrentLocation();
      if (loc?.gym && !this.storyManager.hasBadge(loc.gym.badge)) {
        const gymTeam = loc.gym.team.map(t => createMonster(t.monsterId, t.level));
        this.showDialog(null, `${loc.gym.leader}이(가) 도전을 받아들였다!`, () => {
          this.startBattle({
            enemyParty: gymTeam,
            isWild: false,
            trainerName: loc.gym.leader,
            reward: loc.gym.reward || 0,
            isGym: true,
            badge: loc.gym.badge,
          });
        });
      } else {
        this.showDialog(npc.name, '네 실력은 인정했다. 더 강해져라.');
      }
      return;
    }

    // 일반 대화
    if (npc.dialog) {
      this.showDialog(npc.name, npc.dialog);
    }
  }

  onMapMove(locationId) {
    const loc = this.mapManager.getLocation(locationId);
    if (!loc) return;

    this.mapUI.badgeCount = this.storyManager.getBadgeCount();

    const bgm = loc.type === 'town' ? 'town_bgm' : loc.type === 'gym' ? 'boss_bgm' : 'route_bgm';
    this.audio.playBgm(bgm);

    const ambientMap = { cave: 'cave', forest: 'forest', route: 'forest', dungeon: 'cave' };
    const ambient = ambientMap[loc?.type];
    if (ambient) this.audio.playAmbient(ambient);
    else this.audio.stopAmbient();

    // 마을 진입 시
    if (loc.type === 'town') {
      this.partyManager.healAll();
      // 자동 저장
      try { this.saveGame(0); } catch(e) { /* 저장 실패 무시 */ }
      // 탐험 중이면 귀환 성공 처리
      if (this.expeditionManager?.isActive) {
        const apUsed = this.expeditionManager.maxAP - this.expeditionManager.currentAP;
        const timeOfDay = this.expeditionManager.getTimeOfDay();
        const result = this.expeditionManager.returnSafely();
        this._syncExpeditionHUD();
        this.audio.playSfx('capture_success');
        this._expeditionSuccessCount++;
        this._checkAchievement('expedition_success', this._expeditionSuccessCount);
        // Show expedition summary screen
        this.expeditionSummary = new ExpeditionSummary(this.renderer);
        this.expeditionSummary.show({
          success: true,
          apUsed: apUsed,
          apRemaining: result.bonusAP,
          monstersDefeated: this._expTracker.monstersDefeated,
          itemsFound: [],
          expGained: result.bonusExp,
          moneyChange: 0,
          bonusExp: result.bonusExp,
          timeOfDay: timeOfDay,
        });
        this.expeditionSummary.onDismiss = () => {
          this.expeditionSummary = null;
          this.state = GameState.MAP;
          // Give bonus exp
          const party = this.partyManager.getBattleParty();
          const share = Math.floor(result.bonusExp / Math.max(1, party.length));
          for (const m of party) {
            if (m.isContractor) gainContractorExp(m, share);
            else gainExp(m, share);
          }
        };
        this.state = GameState.EXPEDITION_SUMMARY;
      }
    }

    // 마을 밖으로 나가면 탐험 시작 (사천왕은 제외)
    if (loc.type !== 'town' && loc.type !== 'gym' && loc.type !== 'elite_four') {
      this._startExpedition();
    }

    // 스토리 이벤트 체크 (사천왕 가운틀릿보다 먼저 실행)
    // triggerStoryEvents will call _checkGauntlet() after all story events complete
    this.triggerStoryEvents();
  }

  // ─── 배틀 ───

  startBattle(config, onEnd) {
    this.renderer.screenShake(300, 5);
    this.audio.playSfx('select');
    const battle = new Battle({
      playerParty: this.partyManager.getBattleParty(),
      enemyParty: config.enemyParty,
      isWild: config.isWild || false,
      trainerName: config.trainerName || null,
      reward: config.reward || 0,
    });

    this.currentBattle = battle;
    this._battleConfig = config;
    this._battleEndCallback = onEnd || null;

    // Deduct AP when battling during an expedition
    if (this.expeditionManager?.isActive) {
      const apCost = config.isGym ? 5 : config.isWild ? 2 : 3;
      this.expeditionManager.spendAP(apCost);
      this._syncExpeditionHUD();
    }

    this.audio.playBgm(config.isGym ? 'boss_bgm' : 'battle_bgm');

    this.battleUI = new BattleUI(this.renderer, battle, this.inventory);
    // After creating battleUI, set location type
    const loc = this.mapManager.getCurrentLocation();
    if (loc && this.battleUI) {
      this.battleUI.locationType = loc.type || 'route';
    }
    if (this.expeditionManager?.isActive) {
      this.battleUI.timeOfDay = this.expeditionManager.getTimeOfDay();
    }
    this.battleUI.onBattleEnd = (result) => this.onBattleEnd(result);
    this.state = GameState.BATTLE;
  }

  onBattleEnd(result) {
    const config = this._battleConfig;
    const callback = this._battleEndCallback;
    this._contractorWasKO = this.currentBattle?.contractorKO || false;
    this.currentBattle = null;
    this.battleUI = null;
    this._battleConfig = null;
    this._battleEndCallback = null;

    switch (result) {
      case 'win': {
        this._playStats.battlesWon++;
        this.renderer.screenShake(200, 3);
        this.audio.playSfx('victory_fanfare');
        const rewards = [];

        if (config.reward) {
          this.inventory.money += config.reward;
          this._expTracker.moneyEarned += config.reward;
          rewards.push(`${config.reward}원 획득! (소지금: ${this.inventory.money}원)`);
        }
        // 탐험 추적
        this._expTracker.monstersDefeated += config.enemyParty.filter(e => e.currentHp <= 0).length;

        for (const enemy of config.enemyParty) {
          if (enemy.currentHp <= 0) {
            const expAmount = Math.floor((enemy.expYield * enemy.level) / 7);
            const battleParty = this.partyManager.getBattleParty();
            const aliveCount = this.partyManager.getAliveCount();
            for (const m of battleParty) {
              if (m.currentHp > 0) {
                let share = Math.max(1, Math.floor(expAmount / aliveCount));
                // 난이도 경험치 배율 적용
                share = Math.floor(share * this._difficultySettings.expMultiplier);
                // Bonus exp from magi density during expeditions
                let magiBonus = 0;
                if (this.expeditionManager?.isActive) {
                  magiBonus = Math.floor(share * this.expeditionManager.getMagiDensity() * 0.5);
                  share += magiBonus;
                }
                rewards.push(`${m.name}: 경험치 +${share} (마기 보너스 +${magiBonus})`);
                if (m.isContractor) {
                  const events = gainContractorExp(m, share);
                  for (const evt of events) {
                    if (evt.type === 'level_up') {
                      rewards.push(`${m.name}은(는) 레벨 ${evt.level}이(가) 되었다!`);
                      this.audio.playSfx('level_up');
                      this._checkAchievement('level', evt.level);
                      for (const ns of evt.newSkills) this.skillLearnQueue.push({ monster: m, skill: ns });
                    }
                  }
                } else {
                  const events = gainExp(m, share);
                  for (const evt of events) {
                    if (evt.type === 'level_up') {
                      rewards.push(`${m.name}은(는) 레벨 ${evt.level}이(가) 되었다!`);
                      this.audio.playSfx('level_up');
                      const timeOfDay = this.expeditionManager?.getTimeOfDay() || 'day';
                      if (checkEvolution(m, timeOfDay) !== null) this.evolutionQueue.push(m);
                      for (const ns of evt.newSkills) this.skillLearnQueue.push({ monster: m, skill: ns });
                    }
                  }
                }
              }
            }
          }
        }

        // 유대도 증가 (전투 승리)
        for (const m of this.partyManager.getBattleParty()) {
          if (m.currentHp > 0 && !m.isContractor) {
            m.bond = Math.min(255, (m.bond || 0) + 3);
          }
        }

        if (config.trainerId) this.trainerManager.markDefeated(config.trainerId);
        // 그림자단 승리 — 정의 성향
        if (config.trainerName && config.trainerName.includes('그림자단')) {
          this._adjustKarma(5);
        }
        if (config.isBoss) {
          const bossReward = getBossRewards(this.mapManager.currentLocation);
          if (bossReward.items) {
            for (const item of bossReward.items) {
              this.inventory.addItem(item.itemId, item.count);
            }
          }
          rewards.push(bossReward.message);
          this._checkAchievement('boss_defeat');
        }
        if (config.isGym && config.badge) {
          this.storyManager.addBadge(config.badge);
          rewards.push(`${config.badge} 배지를 획득했다!`);
          this._checkAchievement('badge', this.storyManager.getBadgeCount());
          // 체육관 승리 트리거 등록 → 스토리 defeat_gym 이벤트 발동 가능
          const loc = this.mapManager.currentLocation;
          this.storyManager.completeTrigger('defeat_gym_' + loc);
          this.storyManager.advanceChapter();
        }

        // Gauntlet: continue to next battle instead of returning to map
        if (config.isGauntlet) {
          this.showRewardsSequence(rewards, () => this.processPostBattle(() => {
            if (this._gauntletHealBetween) {
              this.partyManager.healAll();
            }
            this._nextGauntletBattle();
          }));
          break;
        }

        this.showRewardsSequence(rewards, () => this.processPostBattle(callback));
        break;
      }
      case 'capture': {
        this._playStats.monstersContracted++;
        this._adjustKarma(2); // 몬스터와 계약 — 빛 성향
        const captured = config.enemyParty[0];
        const isNewDex = !this.dexTracker.isCaught(captured.id);
        const loc = this.partyManager.addMonster(captured);
        this.dexTracker.markCaught(captured.id);

        const msg = loc.location === 'party'
          ? `${captured.name}과(와) 계약했다! 파티에 추가되었다!`
          : `${captured.name}과(와) 계약했다! 보관함으로 보내졌다!`;

        if (isNewDex) {
          this.audio.playSfx('level_up');
          this.renderer.screenShake(200, 3);
          this.showDialog(null, msg, () => {
            this.showDialog(null, `📖 도감에 ${captured.name}이(가) 등록되었다! (${this.dexTracker.getCaughtCount()}/102)`, () => {
              this._checkAchievement('contract');
              this._checkAchievement('dex', this.dexTracker.getCaughtCount());
              this.processPostBattle(callback);
            });
          });
        } else {
          this._checkAchievement('contract');
          this.showDialog(null, msg, () => {
            this.processPostBattle(callback);
          });
        }
        break;
      }
      case 'flee':
        this.processPostBattle(callback);
        break;
      case 'lose':
        this._playStats.battlesLost++;
        // Expedition wipe: trigger expedition failure
        if (this.expeditionManager?.isActive) {
          this._onExpeditionFail();
          return;
        }
        // Gauntlet loss: reset all gauntlet trainer defeats so they must retry
        if (config.isGauntlet) {
          if (config.trainerId) this.trainerManager.unmarkDefeated(config.trainerId);
          for (const g of this._gauntletQueue) {
            if (g.trainerId) this.trainerManager.unmarkDefeated(g.trainerId);
          }
          this._gauntletQueue = [];
        }
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

  // ─── 연속 배틀 (사천왕/리그) ───

  /** 현재 위치가 사천왕이면 가운틀릿 시작. 시작되면 true 반환. */
  _checkGauntlet() {
    const loc = this.mapManager.getCurrentLocation();
    if (loc && loc.type === 'elite_four' && loc.trainers && loc.trainers.length > 0) {
      const undefeated = loc.trainers.filter(t => !this.trainerManager.isDefeated(t.id));
      if (undefeated.length > 0) {
        this.startGauntlet(undefeated, false);
        return true;
      }
    }
    return false;
  }

  startGauntlet(trainers, healBetween = false) {
    this._gauntletQueue = trainers.map(t => ({
      enemyParty: this.trainerManager.getTrainerTeam(t),
      isWild: false,
      trainerName: t.name,
      reward: t.reward || 0,
      trainerId: t.id,
      isGauntlet: true,
    }));
    this._gauntletHealBetween = healBetween;
    this._isBossRush = false;

    this.showDialog(null, '사천왕과의 연속 배틀이 시작된다! 준비하라!', () => {
      this._nextGauntletBattle();
    });
  }

  _nextGauntletBattle() {
    if (this._gauntletQueue.length === 0) {
      // All defeated — gauntlet complete

      // 보스 러시 완료 시 카르마 감소
      if (this._isBossRush) {
        this._adjustKarma(-5); // 보스 러시 — 폭력 성향
        this._isBossRush = false;
        this._checkAchievement('champion_defeat');
        this.showDialog(null, '보스 러시를 클리어했다!', () => {
          this.enterMapState();
        });
        return;
      }

      this._checkAchievement('champion_defeat');

      // 카르마에 따른 엔딩 분기
      const karma = this._karma;
      let endingType, endingDialog;
      if (karma >= 30) {
        endingType = '빛의 결말';
        endingDialog = '마왕이 쓰러지자, 세계에 빛이 돌아왔다.\n인간과 몬스터, 그리고 마족까지... 모두가 공존하는 새 시대가 시작되었다.';
      } else if (karma <= -30) {
        endingType = '어둠의 결말';
        endingDialog = '마왕을 쓰러뜨렸다. 하지만... 그 어둠의 힘이 계약자에게 스며들었다.\n새로운 마왕이 탄생했다.';
      } else {
        endingType = '균형의 결말';
        endingDialog = '마왕이 쓰러졌다. 어둠은 걷혔지만, 완전히 사라진 것은 아니다.\n계약자의 여정은 계속된다.';
      }

      this.showDialog(null, '모든 사천왕을 물리쳤다! 축하합니다!', () => {
        this.showDialog(null, endingDialog, () => {
          this.showDialog(null, `── ${endingType} ──`, () => {
            this.showDialog(null, '── THE END ──', () => {
              this.storyManager.advanceChapter();
              this.showChoice('게임을 클리어했습니다! 어떻게 하시겠습니까?', [
                { text: '계속 플레이 (엔드게임)', value: 'continue' },
                { text: '뉴게임+ (스토리 리셋, 파티 유지)', value: 'newgame_plus' },
              ], (opt) => {
                if (opt.value === 'newgame_plus') {
                  this._startNewGamePlus();
                } else {
                  this.enterMapState();
                }
              });
            });
          });
        });
      });
      return;
    }

    const config = this._gauntletQueue.shift();
    const remaining = this._gauntletQueue.length;

    this.showDialog(null, `${config.trainerName}이(가) 도전해왔다! (남은 상대: ${remaining}명)`, () => {
      this.startBattle(config, (result) => {
        // On gauntlet loss, main onBattleEnd handles it
      });
    });
  }

  _startNewGamePlus() {
    // Keep: party, contractor, inventory, dex, achievements, playStats
    // Reset: story, map position, trainer defeats, expedition
    this.storyManager = new StoryManager();
    this.mapManager = new MapManager();
    this.trainerManager = new TrainerManager();
    this.expeditionManager = null;
    this._difficulty = this._difficulty; // keep difficulty

    // Bonus for NG+: slightly higher levels on enemies
    this._difficultySettings.enemyLevelBonus += 5;

    this.showDialog(null, '뉴게임+를 시작합니다! 모든 적이 더 강해집니다!', () => {
      this.enterMapState();
      this.triggerStoryEvents();
    });
  }

  _startBossRush() {
    const bossIds = Object.keys(ZONE_BOSSES);
    const allBosses = bossIds.map(id => ({
      ...ZONE_BOSSES[id],
      zoneId: id,
    }));

    this._gauntletQueue = allBosses.map(boss => ({
      enemyParty: boss.team.map(t => createMonster(t.monsterId, t.level + 10)),
      isWild: false,
      trainerName: boss.name,
      reward: boss.rewards.money,
      isGauntlet: true,
      isBoss: true,
    }));
    this._gauntletHealBetween = false;
    this._isBossRush = true;

    this.showDialog(null, `보스 러시! ${allBosses.length}명의 보스와 연속 배틀!`, () => {
      this._nextGauntletBattle();
    });
  }

  // _onGauntletBattleWin — removed (dead code, handled inline in onBattleEnd)

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
        const options = monster.skills.map((s, i) => {
          const catLabel = { physical: '물리', special: '특수', status: '변화' }[s.category] || '';
          const powerStr = s.power ? ` 위력:${s.power}` : '';
          return { text: `${s.name} [${s.type}/${catLabel}${powerStr}]`, index: i };
        });
        options.push({ text: '배우지 않는다', index: -1 });
        const newCatLabel = { physical: '물리', special: '특수', status: '변화' }[skill.category] || '';
        const newPowerStr = skill.power ? ` 위력:${skill.power}` : '';
        const newInfo = `${skill.name} [${skill.type}/${newCatLabel}${newPowerStr}]`;
        this.showChoice(
          `${monster.name}이(가) ${newInfo}을(를) 배우려 한다! 어떤 기술을 잊게 할까?`,
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
      const timeOfDay = this.expeditionManager?.getTimeOfDay() || 'day';
      if (checkEvolution(monster, timeOfDay) !== null) {
        const oldName = monster.name;
        evolve(monster);
        this.dexTracker.markCaught(monster.id);
        this.audio.playSfx('evolve');
        this.renderer.screenShake(500, 5);
        this.showDialog(null, `...! ${oldName}의 모습이 변하기 시작한다!`, () => {
          this.renderer.screenShake(300, 3);
          this.showDialog(null, `축하합니다! ${oldName}이(가) ${monster.name}(으)로 진화했다!`, () => this.processPostBattle(callback));
        });
        return;
      }
      this.processPostBattle(callback);
      return;
    }

    // 계약자가 쓰러졌으면 마을로 강제 복귀
    if (this.currentBattle?.contractorKO || this._contractorWasKO) {
      this._contractorWasKO = false;
      this.partyManager.healAll();
      this.showDialog(null, '계약자가 쓰러졌다... 마을로 돌아간다.', () => {
        this.mapManager.returnToLastTown();
        this.enterMapState();
        if (callback) callback();
      });
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
    this.shopUI.onTransaction = (type) => {
      this.audio.playSfx('select');
    };
    this.shopUI.open(shopItems);
    this.state = GameState.SHOP;
  }

  // ─── 업적 ───

  _checkAchievement(type, value) {
    const results = this.achievementManager?.check(type, value);
    if (results && results.length > 0) {
      this.audio.playSfx('level_up');
      const msgs = results.map(a => `🏆 ${a.name}: ${a.description}`).join('\n');
      this.showDialog(null, `업적 달성!\n${msgs}`);
    }
  }

  // ─── 세이브/로드 ───

  saveGame(slot) {
    SaveManager.save(slot, {
      playerName: this.playerName,
      playtime: this.playtime,
      settings: { ...this.settings },
      party: this.partyManager.serialize(),
      inventory: this.inventory.serialize(),
      map: this.mapManager.serialize(),
      trainers: this.trainerManager.serialize(),
      story: this.storyManager.serialize(),
      dex: this.dexTracker.serialize(),
      expedition: this.expeditionManager?.serialize() || null,
      achievements: this.achievementManager.serialize(),
      expeditionSuccessCount: this._expeditionSuccessCount,
      difficulty: this._difficulty,
      difficultySettings: this._difficultySettings,
      playStats: this._playStats,
      karma: this._karma,
      completedQuests: [...this._completedQuests],
      dailyChallenge: this.dailyChallenge.serialize(),
    });
  }

  loadGame(slot) {
    const state = SaveManager.load(slot);
    if (!state) return false;
    this.playerName = state.playerName || '주인공';
    this.playtime = state.playtime || 0;
    if (state.difficulty) {
      this._difficulty = state.difficulty;
      this._difficultySettings = state.difficultySettings || { maxAP: 240, expMultiplier: 1.0, enemyLevelBonus: 0 };
    }
    this.partyManager = PartyManager.deserialize(state.party);
    this.inventory = Inventory.deserialize(state.inventory);
    this.mapManager = MapManager.deserialize(state.map);
    this.trainerManager = TrainerManager.deserialize(state.trainers);
    this.storyManager = StoryManager.deserialize(state.story);
    this.dexTracker = DexTracker.deserialize(state.dex);
    if (state.settings) this.applySettings(state.settings);
    if (state.expedition) {
      this.expeditionManager = ExpeditionManager.deserialize(state.expedition);
    }
    if (state.achievements) {
      this.achievementManager = AchievementManager.deserialize(state.achievements);
    } else {
      this.achievementManager = new AchievementManager();
    }
    this._expeditionSuccessCount = state.expeditionSuccessCount || 0;
    if (state.playStats) {
      this._playStats = state.playStats;
    }
    this._karma = state.karma || 0;
    this._completedQuests = new Set(state.completedQuests || []);
    if (state.dailyChallenge) {
      this.dailyChallenge = DailyChallenge.deserialize(state.dailyChallenge);
    } else {
      this.dailyChallenge = new DailyChallenge();
    }
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
    this.menuUI._playStats = this._playStats;
    this.menuUI.onOpenDex = () => {
      const allMonsters = getAllMonsters();
      this.dexUI = new DexUI(this.renderer, this.dexTracker, allMonsters);
      this.dexUI.visible = true;
      this.dexUI.onClose = () => { this.dexUI = null; this.state = GameState.MENU; };
      this.state = GameState.DEX;
    };
    this.menuUI.onSave = (slot) => {
      this.saveGame(slot);
      this.showDialog(null, '저장 완료!');
    };
    this.menuUI.onShowMessage = (msg) => {
      this.showDialog(null, msg);
    };
    this.menuUI.settings = { ...this.settings };
    this.menuUI.onSettingsChange = (s) => this.applySettings(s);
    this.menuUI.onClassChange = () => {
      this.closeMenu();
      this._showClassSelection(() => {
        // Recalculate stats for new class
        const c = this.partyManager.contractor;
        if (c) recalcContractorStats(c);
        this.showDialog(null, `${c.className}(으)로 전직했다!`);
      });
    };
    this.menuUI.onNicknameEdit = (mon) => {
      const newName = prompt(`${mon.name}의 새 닉네임을 입력하세요:`, mon.nickname || mon.name);
      if (newName && newName.trim()) {
        mon.nickname = newName.trim().substring(0, 8);
      }
    };
    this.menuUI.onAchievements = () => {
      const all = this.achievementManager.getAll();
      const unlocked = this.achievementManager.getUnlocked();

      // Show achievement list as a series of dialogs
      let text = `업적: ${unlocked.length}/${all.length} 달성\n\n`;
      for (const ach of all) {
        const done = this.achievementManager.unlocked.has(ach.id);
        text += `${done ? '✅' : '⬜'} ${ach.name}\n`;
      }

      this.closeMenu();
      // Split into pages if too long
      const lines = text.split('\n');
      const page1 = lines.slice(0, 10).join('\n');
      const page2 = lines.slice(10).join('\n');

      if (page2.trim()) {
        this.showDialog(null, page1, () => {
          this.showDialog(null, page2);
        });
      } else {
        this.showDialog(null, page1);
      }
    };
    this.menuUI.onCredits = () => {
      this.closeMenu();
      this.creditsUI = new CreditsUI(this.renderer);
      this.creditsUI.onClose = () => {
        this.creditsUI = null;
        this.enterMapState();
      };
      this.creditsUI.show();
      this.state = GameState.CREDITS;
    };
    if (this.storyManager.getBadgeCount() >= 8) {
      this.menuUI.menuItems.push({ id: 'boss_rush', label: '보스 러시' });
      this.menuUI.onBossRush = () => {
        this.closeMenu();
        this._startBossRush();
      };
    }
    this.menuUI.onPvP = () => {
      this.closeMenu();
      this._startPvPSimulation();
    };
    this.menuUI.onDaily = () => {
      this.closeMenu();
      if (this.dailyChallenge.isCompleted()) {
        this.showDialog(null, '오늘의 도전은 이미 완료했다! 내일 다시 도전하자.');
        return;
      }
      const challenge = this.dailyChallenge.getChallenge();
      this.showDialog(null, challenge.description, () => {
        const team = challenge.team.map(t => createMonster(t.monsterId, t.level));
        this.startBattle({
          enemyParty: team,
          isWild: false,
          trainerName: challenge.name,
          reward: challenge.reward.money,
          isDaily: true,
        }, () => {
          this.dailyChallenge.markCompleted();
          this.inventory.addItem(challenge.reward.itemId, challenge.reward.count);
          this.showDialog(null, `일일 도전 클리어! ${challenge.reward.itemId} x${challenge.reward.count} 획득!`);
        });
      });
    };
    this.menuUI.onUseEscapeRope = () => {
      this.closeMenu();
      if (this.expeditionManager?.isActive) {
        // Return scroll during expedition → safe return
        const result = this.expeditionManager.returnSafely();
        this.mapManager.returnToLastTown();
        this.partyManager.healAll();
        this._syncExpeditionHUD();
        this.showDialog(null, '귀환의 두루마리를 사용했다! 마을로 돌아왔다.', () => {
          this.enterMapState();
        });
      } else {
        // Normal escape rope behavior
        const loc = this.mapManager.getCurrentLocation();
        if (loc && (loc.type === 'cave' || loc.type === 'dungeon' || loc.type === 'route')) {
          this.mapManager.returnToLastTown();
          this.showDialog(null, '탈출로프를 사용했다! 마을로 돌아왔다!', () => {
            this.enterMapState();
          });
        } else {
          this.showDialog(null, '여기서는 사용할 수 없다!');
        }
      }
    };
    this.menuUI.open();
    this.state = GameState.MENU;
  }

  closeMenu() {
    if (this.menuUI) this.menuUI.visible = false;
    this.menuUI = null;
    this.state = GameState.MAP;
  }

  // ─── PvP 시뮬레이션 ───

  _startPvPSimulation() {
    // Generate two random AI teams
    const teamSize = 3;
    const team1 = [];
    const team2 = [];
    const playerLevel = this.partyManager.contractor?.level || 20;

    for (let i = 0; i < teamSize; i++) {
      const id1 = 1 + Math.floor(Math.random() * 100);
      const id2 = 1 + Math.floor(Math.random() * 100);
      team1.push(createMonster(id1, playerLevel + Math.floor(Math.random() * 5)));
      team2.push(createMonster(id2, playerLevel + Math.floor(Math.random() * 5)));
    }

    // Start battle with AI controlling both sides
    const battle = new Battle({
      playerParty: team1,
      enemyParty: team2,
      isWild: false,
      trainerName: 'AI 챌린저',
    });

    this.currentBattle = battle;
    this._battleConfig = { enemyParty: team2, isWild: false, trainerName: 'AI 챌린저', isPvP: true };
    this._battleEndCallback = null;

    this.battleUI = new BattleUI(this.renderer, battle, this.inventory);
    this.battleUI.autoBattle = true; // Force auto-battle for player side too
    this.battleUI.onBattleEnd = (result) => {
      this.currentBattle = null;
      this.battleUI = null;
      this._battleConfig = null;
      const msg = result === 'win' ? 'AI 팀 1 승리!' : 'AI 팀 2 승리!';
      this.showDialog(null, `AI 대전 결과: ${msg}`);
    };

    this.audio.playBgm('battle_bgm');
    this.state = GameState.BATTLE;
  }

  // ─── 설정 ───

  applySettings(settings) {
    this.settings = { ...settings };

    // Text speed: 0=slow, 1=normal, 2=fast
    this.dialogUI.speedSetting = settings.textSpeed;

    // Volume: 0~10 -> 0.0~1.0
    const vol = settings.volume / 10;
    this.audio.setVolume(vol, vol);
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
    // Merge touch input
    if (this.touchControls?.visible) {
      for (const [k, v] of Object.entries(this.touchControls.keys)) {
        if (v) {
          this.keys[k] = true;
          if (!this._prevTouchKeys?.[k]) this.keyJustPressed[k] = true;
        }
      }
      this._prevTouchKeys = { ...this.touchControls.keys };
    }

    switch (this.state) {
      case GameState.TITLE:
        if (this.titleUI) this.titleUI.update(dt);
        this.handleInput(this.titleUI);
        break;
      case GameState.MAP:
        if (this.mapUI) {
          this.mapUI.syncKeys(this.keys);
          this.mapUI.update(dt);
        }
        if (this.expeditionHUD) this.expeditionHUD.update(dt);
        // C키 = 캠핑 메뉴
        if (this.keyJustPressed['c'] || this.keyJustPressed['C']) {
          if (this.expeditionHUD?.isExpeditionActive) {
            this.expeditionHUD.handleInput('c');
            break;
          }
        }
        // 캠핑 메뉴 활성 시 입력 차단
        if (this.expeditionHUD?.showCampMenu) {
          for (const key of Object.keys(this.keyJustPressed)) {
            this.expeditionHUD.handleInput(key);
          }
          break;
        }
        // Escape 메뉴
        if (this.keyJustPressed['Escape']) { this.openMenu(); break; }
        // Enter/Space 상호작용
        if (this.keyJustPressed['Enter'] || this.keyJustPressed[' ']) {
          if (this.mapUI) this.mapUI.handleInput('Enter');
        }
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
      case GameState.EXPEDITION_SUMMARY:
        if (this.expeditionSummary) this.expeditionSummary.update(dt);
        if (this.keyJustPressed['Enter'] || this.keyJustPressed[' ']) {
          if (this.expeditionSummary) this.expeditionSummary.handleInput('Enter');
        }
        break;
      case GameState.CREDITS:
        if (this.creditsUI) this.creditsUI.update(dt);
        this.handleInput(this.creditsUI);
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
        if (this.expeditionHUD) this.expeditionHUD.render(ctx);
        break;
      case GameState.DIALOG:
        if (this.mapUI && this.mapUI.mapLoaded) {
          this.mapUI.render();
        } else {
          // 맵 로드 전 대화 (프롤로그 등) — 어두운 배경
          this.renderer.clear('#0a0a16');
          // 모닥불 효과
          const flicker = 0.7 + Math.sin(Date.now() * 0.003) * 0.15;
          ctx.fillStyle = `rgba(255,150,50,${0.03 * flicker})`;
          ctx.fillRect(300, 200, 200, 200);
          ctx.fillStyle = `rgba(255,100,30,${0.05 * flicker})`;
          ctx.beginPath();
          ctx.arc(400, 350, 80, 0, Math.PI * 2);
          ctx.fill();
        }
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
      case GameState.EXPEDITION_SUMMARY:
        this.renderer.clear('#0a0a16');
        if (this.expeditionSummary) this.expeditionSummary.render(ctx);
        break;
      case GameState.CREDITS:
        if (this.creditsUI) this.creditsUI.render(ctx);
        break;
    }

    if (this.touchControls) this.touchControls.render(this.ctx);
  }
}

// ─── 앱 시작 ───
const game = new Game();
game.init().catch(console.error);
