// 배틀 화면 UI
import { generateSprite, generateSpriteBack, getHybridSprite } from './sprite-generator.js';
import { TYPE_COLORS, STATUS_COLORS, STATUS_LABELS } from './renderer.js';
import { getEffectiveness } from '../core/type.js';

// 상태 상수
const STATE = {
  ACTION_SELECT: 'action_select',
  SKILL_SELECT: 'skill_select',
  MONSTER_SELECT: 'monster_select',
  ITEM_SELECT: 'item_select',
  ANIMATING: 'animating',
  MESSAGE: 'message',
  FORCE_SWITCH: 'force_switch',
};

export class BattleUI {
  /**
   * @param {import('./renderer.js').Renderer} renderer
   * @param {import('../core/battle.js').Battle} battle
   * @param {import('../core/item.js').Inventory} inventory
   */
  constructor(renderer, battle, inventory = null) {
    this.renderer = renderer;
    this.battle = battle;
    this.inventory = inventory;
    this.state = STATE.MESSAGE;
    this.cursor = 0;
    this.scrollOffset = 0;

    this.locationType = 'route'; // route/town/cave/forest/gym/elite_four

    // 스프라이트 캐시
    this._enemySprite = null;
    this._playerSprite = null;
    this._updateSprites();

    // 메시지 시스템
    this.messageQueue = [];
    this.currentMessage = '';
    this.displayedChars = 0;
    this.typewriterSpeed = 30; // 문자/초
    this.typewriterTimer = 0;
    this.messageComplete = false;

    // 초기 메시지
    if (battle.isWild) {
      this.queueMessage(`야생 ${battle.enemyActive.name}이(가) 나타났다!`);
    } else if (battle.trainerName) {
      this.queueMessage(`${battle.trainerName}이(가) 승부를 걸어왔다!`);
      this.queueMessage(`${battle.trainerName}은(는) ${battle.enemyActive.name}을(를) 내보냈다!`);
    }
    const activeLabel = battle.playerActive.isContractor
      ? `${battle.playerActive.name}이(가) 전투에 나섰다!`
      : `가라, ${battle.playerActive.name}!`;
    this.queueMessage(activeLabel);
    this._advanceMessage();

    // 애니메이션 상태
    this.animHpPlayer = battle.playerActive.currentHp;
    this.animHpEnemy = battle.enemyActive.currentHp;
    this.animHpPlayerTarget = this.animHpPlayer;
    this.animHpEnemyTarget = this.animHpEnemy;

    // 몬스터 슬라이드 애니메이션
    this.enemySpriteX = 800; // 오른쪽에서 진입
    this.enemySpriteTargetX = 500;
    this.playerSpriteX = -200; // 왼쪽에서 진입
    this.playerSpriteTargetX = 100;

    // 데미지 플래시
    this.flashEnemy = 0;
    this.flashPlayer = 0;

    // 아이템 목록 (배틀용)
    this.battleItems = [];
    this._refreshBattleItems();

    // 시간대
    this.timeOfDay = 'day';

    // 전투 기록
    this._battleLog = [];
    this._showLog = false;

    // 적 정보 표시 토글
    this._showEnemyInfo = false;

    // 배틀 속도
    this.battleSpeed = 1;

    // 승리 대기
    this._victoryPending = false;

    // 아이템 대상 선택
    this._itemTargetMode = false;
    this._itemToUse = null;

    // 플로팅 데미지 숫자
    this._floatingNumbers = []; // {text, x, y, color, timer, maxTimer}

    // 스킬 이펙트 파티클
    this._skillEffects = []; // {type, x, y, timer, maxTimer, color}

    // 자동 전투
    this.autoBattle = false;

    // 콜백
    this.onBattleEnd = null;
  }

  _updateSprites() {
    if (this.battle.enemyActive) {
      this._enemySprite = getHybridSprite(
        this.battle.enemyActive.id,
        this.battle.enemyActive.spriteConfig,
        'front', 64
      );
    }
    if (this.battle.playerActive) {
      this._playerSprite = getHybridSprite(
        this.battle.playerActive.id,
        this.battle.playerActive.spriteConfig,
        'back', 64
      );
    }
  }

  _refreshBattleItems() {
    if (!this.inventory) { this.battleItems = []; return; }
    this.battleItems = this.inventory.getAllItems().filter(
      item => item.usableInBattle !== false
    );
  }

  queueMessage(msg) {
    this.messageQueue.push(msg);
    this._battleLog.push(msg);
    if (this._battleLog.length > 50) this._battleLog.shift();
  }

  _advanceMessage() {
    if (this.messageQueue.length > 0) {
      this.currentMessage = this.messageQueue.shift();
      this.displayedChars = 0;
      this.typewriterTimer = 0;
      this.messageComplete = false;
      this.state = STATE.MESSAGE;
    } else {
      // 승리 대기 처리
      if (this._victoryPending) {
        this._victoryPending = false;
        if (this.onBattleEnd) this.onBattleEnd('win');
        return;
      }
      // 메시지 끝 -> 다음 상태로
      if (this.battle.state === 'end') {
        this._handleBattleEnd();
      } else if (this.battle.state === 'force_switch') {
        this.state = STATE.FORCE_SWITCH;
        this.cursor = 0;
      } else {
        this.state = STATE.ACTION_SELECT;
        this.cursor = 0;
      }
    }
    // 자동 전투 시 자동 행동 선택
    if (this.autoBattle && this.state === STATE.ACTION_SELECT) {
      setTimeout(() => this._autoSelectAction(), 100);
    }
  }

  _handleBattleEnd() {
    if (this.battle.result === 'win') {
      // Victory message with brief delay
      this.queueMessage('전투에서 승리했다!');
      this._victoryPending = true;
      this._advanceMessage();
    } else if (this.onBattleEnd) {
      this.onBattleEnd(this.battle.result);
    }
  }

  /**
   * 업데이트 (dt: 초)
   */
  update(dt) {
    // 타이프라이터
    if (this.state === STATE.MESSAGE && !this.messageComplete) {
      this.typewriterTimer += dt;
      const charsToShow = Math.floor(this.typewriterTimer * this.typewriterSpeed * this.battleSpeed);
      if (charsToShow >= this.currentMessage.length) {
        this.displayedChars = this.currentMessage.length;
        this.messageComplete = true;
      } else {
        this.displayedChars = charsToShow;
      }
    }

    // HP 애니메이션
    const hpSpeed = 80 * dt * this.battleSpeed;
    this.animHpPlayerTarget = this.battle.playerActive?.currentHp ?? 0;
    this.animHpEnemyTarget = this.battle.enemyActive?.currentHp ?? 0;

    if (this.animHpPlayer !== this.animHpPlayerTarget) {
      if (this.animHpPlayer > this.animHpPlayerTarget) {
        this.animHpPlayer = Math.max(this.animHpPlayerTarget, this.animHpPlayer - hpSpeed);
      } else {
        this.animHpPlayer = Math.min(this.animHpPlayerTarget, this.animHpPlayer + hpSpeed);
      }
    }
    if (this.animHpEnemy !== this.animHpEnemyTarget) {
      if (this.animHpEnemy > this.animHpEnemyTarget) {
        this.animHpEnemy = Math.max(this.animHpEnemyTarget, this.animHpEnemy - hpSpeed);
      } else {
        this.animHpEnemy = Math.min(this.animHpEnemyTarget, this.animHpEnemy + hpSpeed);
      }
    }

    // 몬스터 슬라이드
    const slideSpeed = 600 * dt;
    if (this.enemySpriteX !== this.enemySpriteTargetX) {
      if (this.enemySpriteX > this.enemySpriteTargetX) {
        this.enemySpriteX = Math.max(this.enemySpriteTargetX, this.enemySpriteX - slideSpeed);
      } else {
        this.enemySpriteX = Math.min(this.enemySpriteTargetX, this.enemySpriteX + slideSpeed);
      }
    }
    if (this.playerSpriteX !== this.playerSpriteTargetX) {
      if (this.playerSpriteX < this.playerSpriteTargetX) {
        this.playerSpriteX = Math.min(this.playerSpriteTargetX, this.playerSpriteX + slideSpeed);
      } else {
        this.playerSpriteX = Math.max(this.playerSpriteTargetX, this.playerSpriteX - slideSpeed);
      }
    }

    // 플래시 감쇠
    if (this.flashEnemy > 0) this.flashEnemy = Math.max(0, this.flashEnemy - dt * 5);
    if (this.flashPlayer > 0) this.flashPlayer = Math.max(0, this.flashPlayer - dt * 5);

    // Floating damage numbers
    for (let i = this._floatingNumbers.length - 1; i >= 0; i--) {
      const fn = this._floatingNumbers[i];
      fn.timer += dt * this.battleSpeed;
      fn.y -= 40 * dt * this.battleSpeed; // float upward
      if (fn.timer >= fn.maxTimer) {
        this._floatingNumbers.splice(i, 1);
      }
    }

    // Skill effect particles
    for (let i = this._skillEffects.length - 1; i >= 0; i--) {
      const p = this._skillEffects[i];
      p.timer += dt * this.battleSpeed;
      p.x += p.vx * dt * this.battleSpeed;
      p.y += p.vy * dt * this.battleSpeed;
      p.vy += 100 * dt * this.battleSpeed; // gravity
      if (p.timer >= p.maxTimer) this._skillEffects.splice(i, 1);
    }
  }

  /**
   * 렌더
   */
  render() {
    const r = this.renderer;
    const ctx = r.getContext();

    r.applyShake();

    // ===== 배틀 씬 (상단 0~300) =====
    this._renderBattleScene(r, ctx);

    // ===== 액션 패널 (하단 300~600) =====
    this._renderActionPanel(r, ctx);

    r.restoreShake();
  }

  _renderBattleScene(r, ctx) {
    // 배경 - 시간대별 그라디언트
    const grad = ctx.createLinearGradient(0, 0, 0, 300);
    switch (this.timeOfDay) {
      case 'morning':
        grad.addColorStop(0, '#4a3a2e');
        grad.addColorStop(0.4, '#8a6a4e');
        grad.addColorStop(0.7, '#aa8a5e');
        grad.addColorStop(1, '#5a6a3e');
        break;
      case 'evening':
        grad.addColorStop(0, '#3a1a1e');
        grad.addColorStop(0.4, '#6a3a2e');
        grad.addColorStop(0.7, '#4a3a2e');
        grad.addColorStop(1, '#2a3a2a');
        break;
      case 'night':
        grad.addColorStop(0, '#0a0a1e');
        grad.addColorStop(0.4, '#121228');
        grad.addColorStop(0.7, '#1a1a2e');
        grad.addColorStop(1, '#1a2a1a');
        break;
      default: // day
        grad.addColorStop(0, '#1a1a3e');
        grad.addColorStop(0.6, '#2a2a5e');
        grad.addColorStop(1, '#3a4a3e');
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 800, 300);

    // 지면 — 지형별 색상
    const groundColors = {
      route:      { base: '#2a3a2a', detail: '#354535' },
      town:       { base: '#3a3a2a', detail: '#4a4535' },
      cave:       { base: '#2a2a3a', detail: '#353545' },
      forest:     { base: '#1a3a1a', detail: '#254525' },
      gym:        { base: '#3a3a1a', detail: '#4a4525' },
      elite_four: { base: '#2a1a2a', detail: '#352535' },
      dungeon:    { base: '#1a1a2a', detail: '#252535' },
    };
    const gc = groundColors[this.locationType] || groundColors.route;
    ctx.fillStyle = gc.base;
    ctx.fillRect(0, 240, 800, 60);
    ctx.fillStyle = gc.detail;
    for (let i = 0; i < 40; i++) {
      const gx = (i * 23 + 5) % 800;
      const gy = 250 + (i * 7) % 40;
      ctx.fillRect(gx, gy, 3, 1);
    }
    // Ground texture dots
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    for (let i = 0; i < 30; i++) {
      const gx = (i * 29 + 7) % 800;
      const gy = 245 + (i * 11) % 50;
      ctx.fillRect(gx, gy, 2, 1);
    }

    // 적 플랫폼 — 지형별
    const platColor = this.locationType === 'cave' ? '#3a3a5a' :
                      this.locationType === 'elite_four' ? '#3a2a3a' :
                      this.locationType === 'gym' ? '#3a3a1a' : '#3a5a3a';
    const platLight = platColor.replace(/3a/g, '4a');
    ctx.fillStyle = platColor;
    ctx.beginPath();
    ctx.ellipse(560, 160, 100, 20, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = platLight;
    ctx.beginPath();
    ctx.ellipse(560, 158, 95, 16, 0, 0, Math.PI * 2);
    ctx.fill();

    // 플레이어 플랫폼
    ctx.fillStyle = platColor;
    ctx.beginPath();
    ctx.ellipse(200, 270, 110, 22, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = platLight;
    ctx.beginPath();
    ctx.ellipse(200, 268, 105, 18, 0, 0, Math.PI * 2);
    ctx.fill();

    // 적 몬스터 스프라이트
    if (this._enemySprite && this.battle.enemyActive) {
      ctx.save();
      if (this.flashEnemy > 0) {
        ctx.globalAlpha = 0.3 + Math.sin(this.flashEnemy * 20) * 0.4;
      }
      r.drawSprite(this._enemySprite, this.enemySpriteX, 50, 3);
      ctx.restore();
    }

    // 플레이어 몬스터 스프라이트 (뒷모습)
    if (this._playerSprite && this.battle.playerActive) {
      ctx.save();
      if (this.flashPlayer > 0) {
        ctx.globalAlpha = 0.3 + Math.sin(this.flashPlayer * 20) * 0.4;
      }
      r.drawSprite(this._playerSprite, this.playerSpriteX, 80, 3);
      ctx.restore();
    }

    // Floating damage numbers
    for (const fn of this._floatingNumbers) {
      const alpha = Math.max(0, 1 - fn.timer / fn.maxTimer);
      const scale = fn.timer < 0.1 ? 3 : 2; // brief pop-in
      ctx.globalAlpha = alpha;
      r.drawPixelText(fn.text, fn.x, fn.y, fn.color, scale);
    }
    ctx.globalAlpha = 1;

    // Skill effect particles
    for (const p of this._skillEffects) {
      const alpha = Math.max(0, 1 - p.timer / p.maxTimer);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, p.size, p.size);
    }
    ctx.globalAlpha = 1;

    // ===== 적 정보 패널 (좌상단) =====
    if (this.battle.enemyActive) {
      const em = this.battle.enemyActive;
      r.drawPanel(20, 15, 280, 70, '#0d0d1e', '#3a3a5a');
      r.drawPixelText(em.nickname || em.name, 32, 24, '#ffffff', 2);
      r.drawPixelText(`Lv${em.level}`, 220, 24, '#aaaacc', 2);

      // HP 바
      r.drawPixelText('HP', 32, 48, '#ffcc44', 1);
      r.drawHpBar(52, 47, 200, 10, Math.round(this.animHpEnemy), em.stats.hp);

      // 상태이상
      if (em.status) {
        const sColor = STATUS_COLORS[em.status] || '#888888';
        const sLabel = STATUS_LABELS[em.status] || em.status;
        ctx.fillStyle = sColor;
        ctx.fillRect(258, 47, 34, 12);
        r.drawPixelText(sLabel, 260, 49, '#ffffff', 1);

        // Status icon (small pixel art)
        const iconX = 248;
        const iconY = 47;
        const t = Date.now() * 0.005;
        switch(em.status) {
          case 'burn':
            ctx.fillStyle = `rgba(255,100,0,${0.5 + Math.sin(t*3)*0.3})`;
            ctx.fillRect(iconX, iconY, 3, 6);
            ctx.fillRect(iconX+1, iconY-2, 2, 3);
            break;
          case 'poison':
            ctx.fillStyle = `rgba(160,0,200,${0.5 + Math.sin(t*2)*0.3})`;
            ctx.beginPath();
            ctx.arc(iconX+3, iconY+4, 3, 0, Math.PI*2);
            ctx.fill();
            break;
          case 'paralyze':
            ctx.fillStyle = `rgba(255,255,0,${0.3 + Math.sin(t*5)*0.4})`;
            ctx.fillRect(iconX, iconY+1, 6, 2);
            ctx.fillRect(iconX+2, iconY-1, 2, 6);
            break;
          case 'sleep':
            ctx.fillStyle = '#aaaaff';
            r.drawPixelText('z', iconX, iconY + Math.sin(t)*2, '#aaaaff', 1);
            break;
          case 'freeze':
            ctx.fillStyle = `rgba(150,200,255,${0.6 + Math.sin(t)*0.2})`;
            ctx.fillRect(iconX+1, iconY, 4, 6);
            ctx.fillRect(iconX, iconY+2, 6, 2);
            break;
          case 'confuse': {
            ctx.fillStyle = '#ffff44';
            const angle = t * 3;
            ctx.fillRect(iconX + Math.cos(angle)*3 + 3, iconY + Math.sin(angle)*3 + 3, 2, 2);
            ctx.fillRect(iconX + Math.cos(angle+2)*3 + 3, iconY + Math.sin(angle+2)*3 + 3, 2, 2);
            break;
          }
        }
      }
    }

    // ===== 적 상세 정보 패널 =====
    if (this._showEnemyInfo && this.battle.enemyActive) {
      const em = this.battle.enemyActive;
      const r2 = this.renderer;
      // Extended info panel
      r2.drawPanel(20, 90, 280, 80, '#0d0d1e', '#3a3a5a');
      // Type display
      r2.drawPixelText('타입:', 32, 100, '#888899', 1);
      if (em.type) {
        for (let t = 0; t < em.type.length; t++) {
          const tc = TYPE_COLORS[em.type[t]] || '#888';
          const ctx2 = r2.getContext();
          ctx2.fillStyle = tc;
          ctx2.fillRect(70 + t * 55, 98, 48, 14);
          r2.drawPixelText(em.type[t], 73 + t * 55, 100, '#fff', 1);
        }
      }
      // Stats hint
      const hpPct = Math.floor((em.currentHp / em.stats.hp) * 100);
      r2.drawPixelText('HP: ' + hpPct + '%', 32, 118, '#aaaacc', 1);
      r2.drawPixelText('Lv ' + em.level, 32, 134, '#aaaacc', 1);
      if (em.status) {
        r2.drawPixelText('상태: ' + (STATUS_LABELS[em.status] || em.status), 120, 134, '#ffaa44', 1);
      }
      r2.drawPixelText('[I] 닫기', 32, 152, '#666688', 1);
    }

    // ===== 플레이어 정보 패널 (우하단) =====
    if (this.battle.playerActive) {
      const pm = this.battle.playerActive;
      r.drawPanel(460, 195, 320, 95, '#0d0d1e', '#3a3a5a');
      r.drawPixelText(pm.nickname || pm.name, 475, 204, '#ffffff', 2);
      r.drawPixelText(`Lv${pm.level}`, 690, 204, '#aaaacc', 2);

      // HP 바 + 숫자
      r.drawPixelText('HP', 475, 230, '#ffcc44', 1);
      r.drawHpBar(498, 229, 220, 10, Math.round(this.animHpPlayer), pm.stats.hp);
      r.drawPixelText(
        `${Math.round(this.animHpPlayer)}/${pm.stats.hp}`,
        580, 243, '#aaaaaa', 1
      );

      // EXP 바
      r.drawPixelText('EXP', 475, 260, '#4488ff', 1);
      const expCurrent = pm.exp;
      const expForLv = pm.level >= 100 ? 1 : this._expForLevel(pm.level + 1, pm.growthRate) - this._expForLevel(pm.level, pm.growthRate);
      const expProgress = pm.level >= 100 ? 0 : pm.exp - this._expForLevel(pm.level, pm.growthRate);
      r.drawExpBar(504, 259, 214, 8, Math.max(0, expProgress), Math.max(1, expForLv));

      // 상태이상
      if (pm.status) {
        const sColor = STATUS_COLORS[pm.status] || '#888888';
        const sLabel = STATUS_LABELS[pm.status] || pm.status;
        ctx.fillStyle = sColor;
        ctx.fillRect(735, 229, 34, 12);
        r.drawPixelText(sLabel, 737, 231, '#ffffff', 1);

        // Status icon (small pixel art)
        const iconX = 725;
        const iconY = 229;
        const t = Date.now() * 0.005;
        switch(pm.status) {
          case 'burn':
            ctx.fillStyle = `rgba(255,100,0,${0.5 + Math.sin(t*3)*0.3})`;
            ctx.fillRect(iconX, iconY, 3, 6);
            ctx.fillRect(iconX+1, iconY-2, 2, 3);
            break;
          case 'poison':
            ctx.fillStyle = `rgba(160,0,200,${0.5 + Math.sin(t*2)*0.3})`;
            ctx.beginPath();
            ctx.arc(iconX+3, iconY+4, 3, 0, Math.PI*2);
            ctx.fill();
            break;
          case 'paralyze':
            ctx.fillStyle = `rgba(255,255,0,${0.3 + Math.sin(t*5)*0.4})`;
            ctx.fillRect(iconX, iconY+1, 6, 2);
            ctx.fillRect(iconX+2, iconY-1, 2, 6);
            break;
          case 'sleep':
            ctx.fillStyle = '#aaaaff';
            r.drawPixelText('z', iconX, iconY + Math.sin(t)*2, '#aaaaff', 1);
            break;
          case 'freeze':
            ctx.fillStyle = `rgba(150,200,255,${0.6 + Math.sin(t)*0.2})`;
            ctx.fillRect(iconX+1, iconY, 4, 6);
            ctx.fillRect(iconX, iconY+2, 6, 2);
            break;
          case 'confuse': {
            ctx.fillStyle = '#ffff44';
            const angle = t * 3;
            ctx.fillRect(iconX + Math.cos(angle)*3 + 3, iconY + Math.sin(angle)*3 + 3, 2, 2);
            ctx.fillRect(iconX + Math.cos(angle+2)*3 + 3, iconY + Math.sin(angle+2)*3 + 3, 2, 2);
            break;
          }
        }
      }
    }
  }

  _expForLevel(level, growthRate) {
    const base = level * level * level;
    switch (growthRate) {
      case 'fast': return Math.floor(base * 0.8);
      case 'medium': return base;
      case 'slow': return Math.floor(base * 1.25);
      default: return base;
    }
  }

  _renderActionPanel(r, ctx) {
    // 패널 배경
    r.drawPanel(0, 300, 800, 300, '#0d0d1e', '#3a3a5a');

    switch (this.state) {
      case STATE.MESSAGE:
        this._renderMessage(r, ctx);
        break;
      case STATE.ACTION_SELECT:
        if (this._showLog) {
          r.drawPanel(20, 315, 760, 270, '#0a0a16', '#3a3a5a');
          r.drawPixelText('전투 기록 [L]', 40, 325, '#ffcc44', 2);
          const start = Math.max(0, this._battleLog.length - 10);
          for (let i = start; i < this._battleLog.length; i++) {
            const y = 350 + (i - start) * 22;
            r.drawPixelText(this._battleLog[i].substring(0, 45), 40, y, '#aaaacc', 1);
          }
          r.drawPixelText('[L] 닫기', 40, 570, '#666688', 1);
          return; // skip normal panel rendering
        }
        this._renderActionSelect(r, ctx);
        break;
      case STATE.SKILL_SELECT:
        this._renderSkillSelect(r, ctx);
        break;
      case STATE.MONSTER_SELECT:
      case STATE.FORCE_SWITCH:
        this._renderMonsterSelect(r, ctx);
        break;
      case STATE.ITEM_SELECT:
        this._renderItemSelect(r, ctx);
        break;
    }
  }

  _renderMessage(r, ctx) {
    // 메시지 박스
    r.drawPanel(20, 315, 760, 120, '#111122', '#3a3a5a');
    const displayText = this.currentMessage.substring(0, this.displayedChars);
    r.drawPixelText(displayText, 40, 340, '#ffffff', 2);

    // 진행 표시
    if (this.messageComplete) {
      const blink = Math.floor(Date.now() / 500) % 2;
      if (blink) {
        r.drawPixelText('V', 740, 410, '#ffcc44', 2);
      }
    }
  }

  _renderActionSelect(r, ctx) {
    // 메시지 영역
    r.drawPanel(20, 315, 400, 120, '#111122', '#3a3a5a');
    r.drawPixelText('어떻게 할까?', 40, 345, '#ffffff', 2);

    // 2x2 버튼 그리드
    const actions = ['싸우기', '가방', '파티', '도주'];
    const bx = 440, by = 315;
    const bw = 165, bh = 55;

    for (let i = 0; i < 4; i++) {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = bx + col * (bw + 10);
      const y = by + row * (bh + 10);
      r.drawButton(x, y, bw, bh, actions[i], this.cursor === i, false);
    }

    // Flee chance indicator
    if (this.battle.isWild) {
      const playerSpeed = this.battle.playerActive?.stats?.speed || 50;
      const enemySpeed = this.battle.enemyActive?.stats?.speed || 50;
      const fleeChance = Math.min(100, Math.floor((playerSpeed * 128 / enemySpeed + 30 * this.battle.turn) / 256 * 100));
      r.drawPixelText(`(${fleeChance}%)`, 620, 382, '#888899', 1);
    } else {
      r.drawPixelText('(불가)', 620, 382, '#664444', 1);
    }

    const autoLabel = this.autoBattle ? '[A] 자동:ON' : '[A] 자동';
    r.drawPixelText(`[I] 적 정보  [L] 기록  [S] 속도: x${this.battleSpeed}  ${autoLabel}`, 440, 430, '#666688', 1);
  }

  _renderSkillSelect(r, ctx) {
    const pm = this.battle.playerActive;
    if (!pm) return;

    r.drawPanel(20, 315, 520, 270, '#111122', '#3a3a5a');
    r.drawPixelText('기술 선택', 40, 325, '#ffcc44', 2);

    for (let i = 0; i < pm.skills.length; i++) {
      const skill = pm.skills[i];
      const y = 355 + i * 44;
      const selected = this.cursor === i;

      if (selected) {
        ctx.fillStyle = 'rgba(100,100,200,0.2)';
        ctx.fillRect(30, y - 4, 500, 40);
        // 선택 인디케이터
        ctx.fillStyle = '#ffcc44';
        ctx.fillRect(34, y + 8, 6, 6);
      }

      // 타입 색상 태그
      const typeColor = TYPE_COLORS[skill.type] || '#888888';
      ctx.fillStyle = typeColor;
      ctx.fillRect(48, y + 2, 4, 20);

      // 이름
      r.drawPixelText(skill.name, 60, y + 2, selected ? '#ffffff' : '#ccccdd', 2);

      // PP
      let ppColor;
      if (skill.pp <= 0) {
        const blink = Math.floor(Date.now() / 300) % 2;
        ppColor = blink ? '#ff4444' : '#882222';
      } else if (skill.pp <= Math.floor(skill.maxPp / 4)) {
        ppColor = '#ffaa00';
      } else {
        ppColor = '#88cc88';
      }
      r.drawPixelText(`PP ${skill.pp}/${skill.maxPp}`, 60, y + 22, ppColor, 1);
      if (skill.pp <= 0) {
        r.drawPixelText('PP 없음!', 280, y + 22, '#ff4444', 1);
      }

      // 카테고리 + 위력
      if (skill.category !== 'status') {
        r.drawPixelText(`위력:${skill.power}`, 180, y + 22, '#aaaaaa', 1);
      } else {
        r.drawPixelText('변화', 180, y + 22, '#aaaaaa', 1);
      }
    }

    // 뒤로가기 안내
    r.drawPixelText('[ESC] 뒤로', 40, 570, '#666688', 1);

    // 우측 - 선택된 기술 상세
    if (pm.skills[this.cursor]) {
      const skill = pm.skills[this.cursor];
      r.drawPanel(550, 315, 230, 270, '#111122', '#3a3a5a');
      r.drawPixelText('기술 정보', 565, 325, '#ffcc44', 2);

      const typeColor = TYPE_COLORS[skill.type] || '#888888';
      ctx.fillStyle = typeColor;
      ctx.fillRect(565, 350, 60, 18);
      r.drawPixelText(skill.type, 570, 353, '#ffffff', 1);

      const catLabel = { physical: '물리', special: '특수', status: '변화' };
      r.drawPixelText(`분류: ${catLabel[skill.category] || skill.category}`, 565, 378, '#aaaacc', 2);
      if (skill.power) r.drawPixelText(`위력: ${skill.power}`, 565, 400, '#aaaacc', 2);
      r.drawPixelText(`명중: ${skill.accuracy}%`, 565, 422, '#aaaacc', 2);

      // Effectiveness
      if (this.battle.enemyActive) {
        const eff = getEffectiveness(skill.type, this.battle.enemyActive?.type || []);
        let effLabel, effColor;
        if (eff >= 2) { effLabel = '효과 굉장!'; effColor = '#44ff44'; }
        else if (eff > 1) { effLabel = '효과적'; effColor = '#88ff88'; }
        else if (eff === 1) { effLabel = '보통'; effColor = '#aaaaaa'; }
        else if (eff > 0) { effLabel = '별로...'; effColor = '#ff8844'; }
        else { effLabel = '효과 없음'; effColor = '#ff4444'; }
        r.drawPixelText(effLabel, 565, 444, effColor, 2);
      }

      // 설명
      if (skill.description) {
        const desc = skill.description;
        // 줄 바꿈 처리 (25자마다)
        for (let j = 0; j < desc.length; j += 20) {
          r.drawPixelText(desc.substring(j, j + 20), 565, 470 + Math.floor(j / 20) * 18, '#888899', 1);
        }
      }
    }
  }

  _renderMonsterSelect(r, ctx) {
    const party = this.battle.playerParty;
    const isForceSwitch = this.state === STATE.FORCE_SWITCH;

    r.drawPanel(20, 315, 760, 270, '#111122', '#3a3a5a');
    r.drawPixelText(
      isForceSwitch ? '다음 전투 멤버를 선택!' : '파티 교체',
      40, 325, '#ffcc44', 2
    );

    for (let i = 0; i < party.length; i++) {
      const mon = party[i];
      const y = 350 + i * 35;
      const selected = this.cursor === i;
      const isFainted = mon.currentHp <= 0;
      const isActive = mon === this.battle.playerActive;

      if (selected) {
        ctx.fillStyle = 'rgba(100,100,200,0.2)';
        ctx.fillRect(30, y - 2, 740, 32);
        ctx.fillStyle = '#ffcc44';
        ctx.fillRect(34, y + 8, 6, 6);
      }

      // 계약자 표시
      const prefix = mon.isContractor ? `[${mon.className}] ` : '';
      const nameColor = isFainted ? '#664444' : isActive ? '#44aa44' : mon.isContractor ? '#ffdd66' : selected ? '#ffffff' : '#ccccdd';
      r.drawPixelText(`${prefix}${mon.nickname || mon.name}`, 50, y, nameColor, 2);
      r.drawPixelText(`Lv${mon.level}`, 300, y, '#aaaacc', 2);

      // HP 바
      r.drawHpBar(370, y + 2, 120, 10, mon.currentHp, mon.stats.hp);
      r.drawPixelText(`${mon.currentHp}/${mon.stats.hp}`, 500, y, isFainted ? '#664444' : '#aaaaaa', 1);

      // 상태이상
      if (mon.status) {
        const sColor = STATUS_COLORS[mon.status] || '#888';
        ctx.fillStyle = sColor;
        ctx.fillRect(580, y, 30, 14);
        r.drawPixelText(STATUS_LABELS[mon.status] || '', 582, y + 2, '#fff', 1);
      }

      if (isActive) {
        r.drawPixelText('[전투중]', 630, y, '#44aa44', 1);
      }
    }

    if (!isForceSwitch) {
      r.drawPixelText('[ESC] 뒤로', 40, 570, '#666688', 1);
    }
  }

  _renderItemSelect(r, ctx) {
    r.drawPanel(20, 315, 760, 270, '#111122', '#3a3a5a');
    r.drawPixelText('가방', 40, 325, '#ffcc44', 2);

    if (this.battleItems.length === 0) {
      r.drawPixelText('사용할 아이템이 없다!', 40, 365, '#888899', 2);
    } else {
      const maxVisible = 5;
      const start = this.scrollOffset;
      const end = Math.min(start + maxVisible, this.battleItems.length);

      for (let i = start; i < end; i++) {
        const item = this.battleItems[i];
        const y = 355 + (i - start) * 42;
        const selected = this.cursor === i;

        if (selected) {
          ctx.fillStyle = 'rgba(100,100,200,0.2)';
          ctx.fillRect(30, y - 2, 500, 38);
          ctx.fillStyle = '#ffcc44';
          ctx.fillRect(34, y + 10, 6, 6);
        }

        r.drawPixelText(item.name, 50, y, selected ? '#ffffff' : '#ccccdd', 2);
        r.drawPixelText(`x${item.count}`, 300, y, '#aaaacc', 2);
        if (item.description) {
          r.drawPixelText(item.description.substring(0, 30), 50, y + 20, '#888899', 1);
        }

        // 계약 확률 표시
        if (selected && item.category === 'contract' && this.battle.isWild) {
          const target = this.battle.enemyActive;
          const mult = {magic_stone: 1, high_stone: 1.5, ultra_stone: 2, domination_stone: 255}[item.id] || 1;
          const rate = Math.min(100, Math.floor(((3 * target.stats.hp - 2 * target.currentHp) * target.catchRate * mult) / (3 * target.stats.hp) / 255 * 100));
          r.drawPixelText(`계약 확률: ~${rate}%`, 50, y + 20, '#88cc88', 1);
        }
      }

      // 스크롤 인디케이터
      if (start > 0) r.drawPixelText('^', 750, 355, '#ffcc44', 2);
      if (end < this.battleItems.length) r.drawPixelText('v', 750, 555, '#ffcc44', 2);
    }

    r.drawPixelText('[ESC] 뒤로', 40, 570, '#666688', 1);
  }

  /**
   * 입력 처리
   * @returns {boolean} 입력 소비 여부
   */
  handleInput(key) {
    switch (this.state) {
      case STATE.MESSAGE:
        return this._handleMessageInput(key);
      case STATE.ACTION_SELECT:
        return this._handleActionInput(key);
      case STATE.SKILL_SELECT:
        return this._handleSkillInput(key);
      case STATE.MONSTER_SELECT:
      case STATE.FORCE_SWITCH:
        return this._handleMonsterInput(key);
      case STATE.ITEM_SELECT:
        return this._handleItemInput(key);
    }
    return false;
  }

  _handleMessageInput(key) {
    if (key === 'Enter' || key === ' ') {
      if (!this.messageComplete) {
        // 즉시 전체 표시
        this.displayedChars = this.currentMessage.length;
        this.messageComplete = true;
      } else {
        this._advanceMessage();
      }
      return true;
    }
    return false;
  }

  _handleActionInput(key) {
    switch (key) {
      case 'ArrowUp':
        if (this.cursor >= 2) this.cursor -= 2;
        return true;
      case 'ArrowDown':
        if (this.cursor < 2) this.cursor += 2;
        return true;
      case 'ArrowLeft':
        if (this.cursor % 2 === 1) this.cursor--;
        return true;
      case 'ArrowRight':
        if (this.cursor % 2 === 0) this.cursor++;
        return true;
      case 'Enter':
      case ' ':
        this._selectAction(this.cursor);
        return true;
      case 'i':
      case 'I':
        this._showEnemyInfo = !this._showEnemyInfo;
        return true;
      case 's':
      case 'S':
        this.battleSpeed = this.battleSpeed >= 3 ? 1 : this.battleSpeed + 1;
        return true;
      case 'l': case 'L':
        this._showLog = !this._showLog;
        return true;
      case 'a': case 'A':
        this.autoBattle = !this.autoBattle;
        if (this.autoBattle) {
          this.queueMessage('자동 전투 ON');
          this._autoSelectAction();
        } else {
          this.queueMessage('자동 전투 OFF');
        }
        return true;
    }
    return false;
  }

  _autoSelectAction() {
    if (!this.autoBattle) return;
    const pm = this.battle.playerActive;
    if (!pm || pm.currentHp <= 0) return;

    // Simple AI: pick highest power skill with PP
    let bestIdx = 0;
    let bestScore = -1;
    for (let i = 0; i < pm.skills.length; i++) {
      const s = pm.skills[i];
      if (s.pp <= 0) continue;
      const score = (s.power || 20) * (s.accuracy / 100);
      if (score > bestScore) { bestScore = score; bestIdx = i; }
    }
    this._executeTurn({ type: 'fight', skillIndex: bestIdx });
  }

  _selectAction(index) {
    switch (index) {
      case 0: // 싸우기
        this.state = STATE.SKILL_SELECT;
        this.cursor = 0;
        break;
      case 1: // 가방
        this._refreshBattleItems();
        this.state = STATE.ITEM_SELECT;
        this.cursor = 0;
        this.scrollOffset = 0;
        break;
      case 2: // 몬스터
        this.state = STATE.MONSTER_SELECT;
        this.cursor = 0;
        break;
      case 3: // 도망
        this._executeTurn({ type: 'flee' });
        break;
    }
  }

  _handleSkillInput(key) {
    const pm = this.battle.playerActive;
    if (!pm) return false;
    const maxCursor = pm.skills.length - 1;

    switch (key) {
      case 'ArrowUp':
        this.cursor = Math.max(0, this.cursor - 1);
        return true;
      case 'ArrowDown':
        this.cursor = Math.min(maxCursor, this.cursor + 1);
        return true;
      case 'Enter':
      case ' ': {
        const skill = pm.skills[this.cursor];
        if (skill && skill.pp > 0) {
          this._executeTurn({ type: 'fight', skillIndex: this.cursor });
        } else {
          this.queueMessage('PP가 부족하다!');
          this.state = STATE.MESSAGE;
          this._advanceMessage();
        }
        return true;
      }
      case 'Escape':
        this.state = STATE.ACTION_SELECT;
        this.cursor = 0;
        return true;
    }
    return false;
  }

  _handleMonsterInput(key) {
    const party = this.battle.playerParty;
    const maxCursor = party.length - 1;
    const isForceSwitch = this.state === STATE.FORCE_SWITCH;

    // 아이템 대상 선택 모드
    if (this._itemTargetMode) {
      switch (key) {
        case 'ArrowUp':
          this.cursor = Math.max(0, this.cursor - 1);
          return true;
        case 'ArrowDown':
          this.cursor = Math.min(maxCursor, this.cursor + 1);
          return true;
        case 'Enter':
        case ' ': {
          const target = party[this.cursor];
          const result = this.inventory.useItem(this._itemToUse.id, target);
          this._itemTargetMode = false;
          this._itemToUse = null;
          if (result.success) {
            this._executeTurn({ type: 'item', itemResult: result });
          } else {
            for (const msg of result.messages) this.queueMessage(msg);
            this._advanceMessage();
          }
          return true;
        }
        case 'Escape':
          this._itemTargetMode = false;
          this._itemToUse = null;
          this.state = STATE.ITEM_SELECT;
          this.cursor = 0;
          return true;
      }
      return false;
    }

    switch (key) {
      case 'ArrowUp':
        this.cursor = Math.max(0, this.cursor - 1);
        return true;
      case 'ArrowDown':
        this.cursor = Math.min(maxCursor, this.cursor + 1);
        return true;
      case 'Enter':
      case ' ': {
        const mon = party[this.cursor];
        if (mon.currentHp <= 0) {
          this.queueMessage('기절한 몬스터는 내보낼 수 없다!');
          this._advanceMessage();
          return true;
        }
        if (mon === this.battle.playerActive && !isForceSwitch) {
          this.queueMessage('이미 전투중이다!');
          this._advanceMessage();
          return true;
        }

        if (isForceSwitch) {
          const msgs = this.battle.forceSwitch(this.cursor);
          for (const msg of msgs) this.queueMessage(msg);
          this._updateSprites();
          this.animHpPlayer = this.battle.playerActive.currentHp;
          this._advanceMessage();
        } else {
          this._executeTurn({ type: 'switch', monsterIndex: this.cursor });
        }
        return true;
      }
      case 'Escape':
        if (!isForceSwitch) {
          this.state = STATE.ACTION_SELECT;
          this.cursor = 0;
        }
        return true;
    }
    return false;
  }

  _handleItemInput(key) {
    const maxCursor = this.battleItems.length - 1;

    switch (key) {
      case 'ArrowUp':
        this.cursor = Math.max(0, this.cursor - 1);
        if (this.cursor < this.scrollOffset) this.scrollOffset = this.cursor;
        return true;
      case 'ArrowDown':
        this.cursor = Math.min(maxCursor, this.cursor + 1);
        if (this.cursor >= this.scrollOffset + 5) this.scrollOffset = this.cursor - 4;
        return true;
      case 'Enter':
      case ' ': {
        if (this.battleItems.length === 0) return true;
        const item = this.battleItems[this.cursor];
        if (!item) return true;

        // 마석(계약) 체크
        if (item.category === 'contract') {
          this._useContractStone(item);
        } else if (item.effect?.type === 'escape') {
          // 탈출로프 — 야생전에서 도주
          if (this.battle.isWild) {
            this.inventory.removeItem(item.id);
            this.queueMessage('탈출로프를 사용했다!');
            this.queueMessage('무사히 도망쳤다!');
            this.battle.result = 'flee';
            this.battle.state = 'end';
            this._advanceMessage();
          } else {
            this.queueMessage('상대와의 배틀에서는 사용할 수 없다!');
            this._advanceMessage();
          }
        } else {
          // 회복 아이템 등 -> 대상 선택
          if (['heal_hp', 'cure_status', 'restore_pp', 'revive'].includes(item.effect?.type)) {
            this._itemToUse = item;
            this.state = STATE.MONSTER_SELECT;
            this._itemTargetMode = true;
            this.cursor = 0;
            return true;
          }
          const result = this.inventory.useItem(item.id, this.battle.playerActive);
          if (result.success) {
            this._executeTurn({
              type: 'item',
              itemId: item.id,
              itemResult: result,
            });
          } else {
            for (const msg of result.messages) this.queueMessage(msg);
            this._advanceMessage();
          }
        }
        return true;
      }
      case 'Escape':
        this.state = STATE.ACTION_SELECT;
        this.cursor = 0;
        return true;
    }
    return false;
  }

  _useContractStone(item) {
    const STONE_MULTIPLIERS = {
      magic_stone: 1,
      high_stone: 1.5,
      ultra_stone: 2,
      domination_stone: 255,
    };

    const multiplier = STONE_MULTIPLIERS[item.id] || 1;
    const result = this.battle.attemptCapture(multiplier);
    this.inventory.removeItem(item.id);

    this.queueMessage(`${item.name}을(를) 사용했다!`);
    for (const msg of result.messages) {
      this.queueMessage(msg);
    }

    if (!result.success) {
      // 적 턴 진행
      const enemyAction = this.battle.getEnemyAction();
      if (enemyAction) {
        const msgs = this.battle.executeAction({ side: 'enemy', ...enemyAction });
        for (const msg of msgs) this.queueMessage(msg);
        this.battle.checkBattleEnd();
        if (this.battle.result) this.battle.state = 'end';
      }
    }

    this._refreshBattleItems();
    this._advanceMessage();
  }

  _spawnDamageNumber(text, isEnemy, color = '#ffffff') {
    const x = isEnemy ? 560 + Math.random() * 40 - 20 : 200 + Math.random() * 40 - 20;
    const y = isEnemy ? 100 : 180;
    this._floatingNumbers.push({
      text: String(text),
      x, y,
      color,
      timer: 0,
      maxTimer: 1.0,
    });
  }

  _spawnSkillEffect(skillType, isEnemy) {
    const x = isEnemy ? 560 : 200;
    const y = isEnemy ? 120 : 200;
    const colors = {
      fire: '#ff4400', water: '#4488ff', grass: '#44cc44', electric: '#ffff00',
      ice: '#88ddff', dark: '#8844cc', light: '#ffee88', fighting: '#cc6644',
      dragon: '#6644cc', poison: '#aa44aa', metal: '#aaaacc', rock: '#886644',
      wind: '#88ccaa', spirit: '#aa88ff', earth: '#aa8844', sound: '#44aaaa',
      cosmic: '#cc88ff', normal: '#aaaaaa',
    };
    const color = colors[skillType] || '#ffffff';

    // Spawn 5-8 particles
    const count = 5 + Math.floor(Math.random() * 4);
    for (let i = 0; i < count; i++) {
      this._skillEffects.push({
        x: x + Math.random() * 60 - 30,
        y: y + Math.random() * 40 - 20,
        vx: (Math.random() - 0.5) * 100,
        vy: -50 - Math.random() * 50,
        timer: 0,
        maxTimer: 0.5 + Math.random() * 0.3,
        color,
        size: 3 + Math.random() * 4,
      });
    }
  }

  _executeTurn(action) {
    // Detect HP changes for damage numbers
    const enemyHpBefore = this.animHpEnemyTarget;
    const playerHpBefore = this.animHpPlayerTarget;

    const result = this.battle.selectAction(action);

    // Spawn skill effect for the action
    if (action.type === 'fight' && action.skillIndex >= 0) {
      const skill = this.battle.playerActive?.skills?.[action.skillIndex];
      if (skill) this._spawnSkillEffect(skill.type, true); // effect on enemy
    }

    const enemyHpAfter = this.battle.enemyActive?.currentHp ?? 0;
    const playerHpAfter = this.battle.playerActive?.currentHp ?? 0;

    if (enemyHpAfter < enemyHpBefore) {
      const dmg = Math.round(enemyHpBefore - enemyHpAfter);
      this._spawnDamageNumber(dmg, true, '#ff4444');
    }
    if (playerHpAfter < playerHpBefore) {
      const dmg = Math.round(playerHpBefore - playerHpAfter);
      this._spawnDamageNumber(dmg, false, '#ff4444');
    }
    // Healing numbers
    if (enemyHpAfter > enemyHpBefore) {
      this._spawnDamageNumber('+' + Math.round(enemyHpAfter - enemyHpBefore), true, '#44cc44');
    }
    if (playerHpAfter > playerHpBefore) {
      this._spawnDamageNumber('+' + Math.round(playerHpAfter - playerHpBefore), false, '#44cc44');
    }

    // 결과 메시지 큐
    for (const msg of result.messages) {
      this.queueMessage(msg);
    }

    // 데미지 플래시 & 쉐이크
    if (this.animHpEnemyTarget !== (this.battle.enemyActive?.currentHp ?? 0)) {
      this.flashEnemy = 1;
      this.renderer.screenShake(200, 3);
    }
    if (this.animHpPlayerTarget !== (this.battle.playerActive?.currentHp ?? 0)) {
      this.flashPlayer = 1;
      this.renderer.screenShake(200, 3);
    }

    // 스프라이트 업데이트 (교체 등)
    this._updateSprites();

    this._advanceMessage();
  }
}
