// Pocket Kingdom — 핵심 재작성
import { loadTypes } from './core/type.js';
import { loadMonsterDB, createMonster, gainExp, checkEvolution, evolve, learnSkill, replaceSkill, getAllMonsters } from './core/monster.js';
import { loadClasses, getAllClasses, createContractor, gainContractorExp } from './core/player-class.js';
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
import { TitleScreenUI, GameMenuUI, ShopUI } from './ui/menu-ui.js';
import { DialogUI } from './ui/dialog-ui.js';
import { MapUI } from './ui/map-ui.js';
import { DexUI, DexTracker } from './ui/dex-ui.js';

const S = { LOADING:'loading', TITLE:'title', MAP:'map', DIALOG:'dialog', BATTLE:'battle', MENU:'menu', SHOP:'shop', DEX:'dex' };

class Game {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.renderer = new Renderer(this.canvas);
    this.audio = AudioManager;
    this.state = S.LOADING;
    this.prevState = null;
    this.partyManager = null; this.inventory = null; this.mapManager = null;
    this.trainerManager = null; this.storyManager = null; this.dexTracker = null;
    this.playerName = '주인공'; this.playtime = 0;
    this.titleUI = null; this.battleUI = null; this.menuUI = null;
    this.dialogUI = new DialogUI(this.renderer);
    this.mapUI = null; this.dexUI = null; this.shopUI = null;
    this.currentBattle = null; this._battleConfig = null; this._battleEndCb = null;
    this.evolutionQueue = []; this.skillLearnQueue = [];
    this.lastTime = 0; this.keys = {}; this.keyJustPressed = {};
    window.addEventListener('keydown', e => { if (!this.keys[e.key]) this.keyJustPressed[e.key] = true; this.keys[e.key] = true; e.preventDefault(); });
    window.addEventListener('keyup', e => { this.keys[e.key] = false; });
  }

  async init() {
    this.renderer.clear('#000');
    this.renderer.drawPixelText('로딩 중...', 320, 280, '#fff', 2);
    await Promise.all([loadTypes(), loadMonsterDB(), loadItems(), loadMaps(), loadStory(), loadClasses()]);
    this.titleUI = new TitleScreenUI(this.renderer);
    this.titleUI.onNewGame = () => this.startNewGame();
    this.titleUI.onLoadGame = slot => this.loadGame(slot);
    this.titleUI.setSaveSlots(SaveManager.getAllSlots());
    this.state = S.TITLE;
    this.lastTime = performance.now();
    requestAnimationFrame(t => this.loop(t));
  }

  startNewGame() {
    this.partyManager = new PartyManager(); this.inventory = new Inventory();
    this.mapManager = new MapManager(); this.trainerManager = new TrainerManager();
    this.storyManager = new StoryManager(); this.dexTracker = new DexTracker();
    this.playtime = 0;
    this.inventory.addItem('potion', 5); this.inventory.addItem('magic_stone', 10);
    this.enterMapState();
    this.triggerStoryEvents();
  }

  triggerStoryEvents() {
    const evts = this.storyManager.getActiveEvents(this.mapManager.currentLocation);
    if (evts.length > 0) { this.processStoryEvent(evts[0]); }
    else {
      if (this.storyManager.isChapterComplete()) { const r = this.storyManager.advanceChapter(); if (r.success) { this.triggerStoryEvents(); return; } }
      this.enterMapState();
    }
  }

  processStoryEvent(event) {
    if (!event?.scenes?.length) { this.storyManager.completeEvent(event.id); this.triggerStoryEvents(); return; }
    const scenes = [...event.scenes];
    const next = () => {
      if (!scenes.length) {
        this.storyManager.completeEvent(event.id);
        if (event.id === 'prologue_01' && !this.partyManager.contractor) { this._classSelect(() => this.triggerStoryEvents()); return; }
        this.triggerStoryEvents(); return;
      }
      const s = scenes.shift();
      switch (s.type) {
        case 'dialog': this.showDialog(s.speaker, s.text, next); break;
        case 'choice': this.showChoice(s.text, s.options, o => { if (o.result) this._applyResult(o.result); next(); }); break;
        case 'battle': { const t = s.team.map(x => createMonster(x.monsterId, x.level)); this.startBattle({ enemyParty: t, isWild: false, trainerName: s.trainerName, reward: s.reward||0 }, next); break; }
        case 'rival_battle': { const lv = Math.max(5, this.partyManager.contractor?.level||5); this.startBattle({ enemyParty: [createMonster(4,lv), createMonster(10,lv+1)], isWild:false, trainerName:'라이벌 은하', reward:lv*80 }, next); break; }
        case 'give_monster': { const m = createMonster(s.monsterId, s.level||5); this.partyManager.addMonster(m); this.dexTracker.markCaught(m.id); this.showDialog(null, `${m.name}을(를) 받았다!`, next); break; }
        case 'give_item': this.inventory.addItem(s.itemId, s.count||1); this.showDialog(null, '아이템을 받았다!', next); break;
        case 'heal': this.partyManager.healAll(); this.showDialog(null, '체력 회복!', next); break;
        default: next();
      }
    };
    next();
  }

  _classSelect(done) {
    const opts = getAllClasses().map(c => ({ text: `${c.name} [${c.type}]`, classId: c.id }));
    this.showChoice('어떤 길을 걷겠나?', opts, o => {
      this.partyManager.setContractor(createContractor(o.classId, 5, this.playerName));
      const g = createMonster(101, 5); g.nickname = '고랭이';
      this.partyManager.addMonster(g); this.dexTracker.markCaught(101);
      this.inventory.addItem('monster_dex', 1);
      if (done) done();
    });
  }

  _applyResult(r) {
    if (r.give_monster) { const m = createMonster(r.give_monster, r.level||5); this.partyManager.addMonster(m); this.dexTracker.markCaught(m.id); }
    if (r.give_item) this.inventory.addItem(r.give_item, r.count||1);
    if (r.heal) this.partyManager.healAll();
    if (r.badge) this.storyManager.addBadge(r.badge);
  }

  showDialog(speaker, text, onDone) {
    const cb = this.dialogUI.onAllComplete;
    this.dialogUI.onAllComplete = () => { if (!onDone && this.state === S.DIALOG) this.state = this.prevState || S.MAP; if (onDone) onDone(); };
    this.dialogUI.show(text, speaker);
    if (this.state !== S.DIALOG) this.prevState = this.state;
    this.state = S.DIALOG;
  }

  showChoice(text, options, onSelect) {
    const choices = options.map((o,i) => ({ text: o.text, value: i }));
    this.dialogUI.onAllComplete = null;
    this.dialogUI.showChoice(text, choices, null, v => { if (!onSelect && this.state === S.DIALOG) this.state = this.prevState || S.MAP; if (onSelect) onSelect(options[v]); });
    if (this.state !== S.DIALOG) this.prevState = this.state;
    this.state = S.DIALOG;
  }

  enterMapState() {
    if (!this.mapUI) {
      this.mapUI = new MapUI(this.renderer, this.mapManager);
      this.mapUI.onMove = id => { const loc = this.mapManager.getLocation(id); if (loc?.type === 'town') this.partyManager.healAll(); this.mapUI.badgeCount = this.storyManager.getBadgeCount(); this.triggerStoryEvents(); };
      this.mapUI.onInteract = npc => this._onNpc(npc);
      this.mapUI.onShop = () => { const loc = this.mapManager.getCurrentLocation(); if (loc?.shop) this.openShop(loc.shop); };
      this.mapUI.onHeal = () => { this.partyManager.healAll(); this.showDialog(null, '파티가 회복되었다!'); };
      this.mapUI.onEncounterCheck = () => { const loc = this.mapManager.getCurrentLocation(); if (loc && checkEncounter(loc)) { const w = generateWildMonster(loc); if (w) { this.dexTracker.markSeen(w.id); this.startBattle({enemyParty:[w],isWild:true}); } } };
    }
    this.mapUI.badgeCount = this.storyManager.getBadgeCount();
    this.mapUI._refresh(); this.mapUI.visible = true;
    this.state = S.MAP;
  }

  _onNpc(npc) {
    if (npc.type === 'trainer' && npc.trainerId) {
      if (!this.trainerManager.isDefeated(npc.trainerId)) {
        const loc = this.mapManager.getCurrentLocation();
        const td = loc?.trainers?.find(t => t.id === npc.trainerId);
        if (td) { const team = this.trainerManager.getTrainerTeam(td); this.showDialog(null, `${npc.name} 승부!`, () => { this.startBattle({enemyParty:team, isWild:false, trainerName:npc.name, reward:td.reward||0, trainerId:npc.trainerId}); }); }
      } else this.showDialog(npc.name, '다음에는 지지 않겠어!');
      return;
    }
    if (npc.type === 'gym_leader') {
      const loc = this.mapManager.getCurrentLocation();
      if (loc?.gym && !this.storyManager.hasBadge(loc.gym.badge)) {
        const team = loc.gym.team.map(t => createMonster(t.monsterId, t.level));
        this.showDialog(null, `${loc.gym.leader} 도전!`, () => { this.startBattle({enemyParty:team, isWild:false, trainerName:loc.gym.leader, reward:loc.gym.reward||0, isGym:true, badge:loc.gym.badge}); });
      } else this.showDialog(npc.name, '인장은 네 것이다.');
      return;
    }
    if (npc.dialog) this.showDialog(npc.name, npc.dialog);
  }

  startBattle(config, onEnd) {
    const battle = new Battle({ playerParty: this.partyManager.getBattleParty(), enemyParty: config.enemyParty, isWild: config.isWild||false, trainerName: config.trainerName||null, reward: config.reward||0 });
    this.currentBattle = battle; this._battleConfig = config; this._battleEndCb = onEnd||null;
    this.battleUI = new BattleUI(this.renderer, battle, this.inventory);
    this.battleUI.onBattleEnd = r => this._onBattleEnd(r);
    this.state = S.BATTLE;
  }

  _onBattleEnd(result) {
    const config = this._battleConfig, cb = this._battleEndCb;
    this.currentBattle = null; this.battleUI = null; this._battleConfig = null; this._battleEndCb = null;
    if (result === 'win') {
      const rw = [];
      if (config.reward) { this.inventory.money += config.reward; rw.push(`${config.reward}원!`); }
      for (const e of config.enemyParty) if (e.currentHp <= 0) {
        const exp = Math.max(1, Math.floor((e.expYield*e.level)/7));
        const share = Math.max(1, Math.floor(exp/this.partyManager.getAliveCount()));
        for (const m of this.partyManager.getBattleParty()) if (m.currentHp > 0) {
          const evts = m.isContractor ? gainContractorExp(m, share) : gainExp(m, share);
          for (const ev of evts) if (ev.type === 'level_up') {
            rw.push(`${m.name} Lv${ev.level}!`);
            if (!m.isContractor && checkEvolution(m) !== null) this.evolutionQueue.push(m);
            for (const ns of ev.newSkills) this.skillLearnQueue.push({monster:m, skill:ns});
          }
        }
      }
      if (config.trainerId) this.trainerManager.markDefeated(config.trainerId);
      if (config.isGym && config.badge) { this.storyManager.addBadge(config.badge); rw.push(`${config.badge} 인장!`); this.storyManager.completeTrigger('defeat_gym_'+this.mapManager.currentLocation); this.storyManager.advanceChapter(); }
      this._showRw(rw, () => this._postBattle(cb));
    } else if (result === 'capture') {
      const m = config.enemyParty[0]; this.partyManager.addMonster(m); this.dexTracker.markCaught(m.id);
      this.showDialog(null, `${m.name} 계약!`, () => this._postBattle(cb));
    } else if (result === 'flee') { this._postBattle(cb); }
    else { this.partyManager.healAll(); this.inventory.money = Math.floor(this.inventory.money*0.9); this.showDialog(null, '패배... 마을로.', () => { this.mapManager.returnToLastTown(); this.enterMapState(); if (cb) cb(); }); }
  }

  _showRw(msgs, done) { if (!msgs.length) { done(); return; } this.showDialog(null, msgs.shift(), () => this._showRw(msgs, done)); }

  _postBattle(cb) {
    if (this.skillLearnQueue.length) {
      const {monster, skill} = this.skillLearnQueue.shift();
      const r = learnSkill(monster, skill);
      if (r.needChoice) { const opts = monster.skills.map((s,i) => ({text:`${s.name}(${s.type})`,index:i})); opts.push({text:'안 배움',index:-1}); this.showChoice(`${skill.name} 배우기?`, opts, o => { if (o.index>=0) replaceSkill(monster, o.index, skill); this._postBattle(cb); }); return; }
      this.showDialog(null, `${monster.name}: ${skill.name} 습득!`, () => this._postBattle(cb)); return;
    }
    if (this.evolutionQueue.length) {
      const m = this.evolutionQueue.shift();
      if (checkEvolution(m) !== null) { const old = m.name; evolve(m); this.dexTracker.markCaught(m.id); this.showDialog(null, `${old} → ${m.name} 진화!`, () => this._postBattle(cb)); return; }
      this._postBattle(cb); return;
    }
    this.enterMapState(); if (cb) cb();
  }

  openShop(items) { this.shopUI = new ShopUI(this.renderer, this.inventory, items); this.shopUI.onClose = () => { this.shopUI = null; this.state = S.MAP; }; this.shopUI.open(items); this.state = S.SHOP; }
  openMenu() {
    this.menuUI = new GameMenuUI(this.renderer); this.menuUI.partyManager = this.partyManager; this.menuUI.inventory = this.inventory;
    this.menuUI.playerData = {name:this.playerName, badges:this.storyManager.getBadgeCount(), playTime:this.playtime, money:this.inventory.money};
    this.menuUI.onOpenDex = () => { this.dexUI = new DexUI(this.renderer, this.dexTracker, getAllMonsters()); this.dexUI.visible = true; this.dexUI.onClose = () => { this.dexUI = null; this.state = S.MENU; }; this.state = S.DEX; };
    this.menuUI.onSave = slot => { this.saveGame(slot); this.showDialog(null, '저장 완료!'); };
    this.menuUI.open(); this.state = S.MENU;
  }
  closeMenu() { if (this.menuUI) this.menuUI.visible = false; this.menuUI = null; this.state = S.MAP; }

  saveGame(slot) { SaveManager.save(slot, { playerName:this.playerName, playtime:this.playtime, party:this.partyManager.serialize(), inventory:this.inventory.serialize(), map:this.mapManager.serialize(), trainers:this.trainerManager.serialize(), story:this.storyManager.serialize(), dex:this.dexTracker.serialize() }); }
  loadGame(slot) {
    const s = SaveManager.load(slot); if (!s) return false;
    this.playerName = s.playerName||'주인공'; this.playtime = s.playtime||0;
    this.partyManager = PartyManager.deserialize(s.party); this.inventory = Inventory.deserialize(s.inventory);
    this.mapManager = MapManager.deserialize(s.map); this.trainerManager = TrainerManager.deserialize(s.trainers);
    this.storyManager = StoryManager.deserialize(s.story); this.dexTracker = DexTracker.deserialize(s.dex);
    this.enterMapState(); return true;
  }

  loop(ts) {
    const dt = Math.min((ts - this.lastTime)/1000, 0.1); this.lastTime = ts;
    if (this.state === S.MAP || this.state === S.BATTLE) this.playtime += dt;
    this.update(dt); this.render(); this.keyJustPressed = {};
    requestAnimationFrame(t => this.loop(t));
  }

  update(dt) {
    switch (this.state) {
      case S.TITLE: if (this.titleUI) this.titleUI.update(dt); this._inp(this.titleUI); break;
      case S.MAP: if (this.mapUI) { this.mapUI.syncKeys(this.keys); this.mapUI.update(dt); } if (this.keyJustPressed['Escape']) { this.openMenu(); break; } if (this.keyJustPressed['Enter']||this.keyJustPressed[' ']) { if (this.mapUI) this.mapUI.handleInput('Enter'); } break;
      case S.DIALOG: this.dialogUI.update(dt); this._inp(this.dialogUI); break;
      case S.BATTLE: if (this.battleUI) this.battleUI.update(dt); this._inp(this.battleUI); break;
      case S.MENU: if (this.menuUI) this.menuUI.update(dt); if (this.keyJustPressed['Escape'] && (!this.menuUI||!this.menuUI.subMenu)) { this.closeMenu(); break; } this._inp(this.menuUI); break;
      case S.SHOP: if (this.shopUI) this.shopUI.update(dt); this._inp(this.shopUI); break;
      case S.DEX: if (this.dexUI) this.dexUI.update(dt); this._inp(this.dexUI); break;
    }
  }

  _inp(ui) { if (!ui) return; for (const k of Object.keys(this.keyJustPressed)) ui.handleInput(k); }

  render() {
    this.renderer.clear('#111');
    switch (this.state) {
      case S.LOADING: this.renderer.drawPixelText('로딩...', 320, 280, '#fff', 2); break;
      case S.TITLE: if (this.titleUI) this.titleUI.render(); break;
      case S.MAP: if (this.mapUI) this.mapUI.render(); break;
      case S.DIALOG: if (this.mapUI?.mapLoaded) this.mapUI.render(); else this.renderer.clear('#0a0a16'); this.dialogUI.render(); break;
      case S.BATTLE: if (this.battleUI) this.battleUI.render(); break;
      case S.MENU: if (this.mapUI) this.mapUI.render(); if (this.menuUI) this.menuUI.render(); break;
      case S.SHOP: if (this.shopUI) this.shopUI.render(); break;
      case S.DEX: if (this.dexUI) this.dexUI.render(this.ctx); break;
    }
  }
}

const game = new Game();
game.init().catch(console.error);
