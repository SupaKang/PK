/**
 * battle-ui.js — Battle screen rendering
 * Draws monsters, HP bars, skill menu, battle messages
 */

import { BATTLE_STATE } from '../core/battle.js';
import { generateSpriteScaled } from './sprite-generator.js';

// Layout constants (480×270 internal canvas)
const CANVAS_W = 480;
const CANVAS_H = 270;

// Monster positions
const PLAYER_MON_X = 40;
const PLAYER_MON_Y = 100;
const ENEMY_MON_X = 320;
const ENEMY_MON_Y = 20;
const MON_SIZE = 80;

// HP bar positions
const PLAYER_HP_X = 260;
const PLAYER_HP_Y = 130;
const ENEMY_HP_X = 20;
const ENEMY_HP_Y = 15;
const HP_BAR_W = 140;
const HP_BAR_H = 6;

// Skill menu
const MENU_X = 5;
const MENU_Y = 200;
const MENU_W = 470;
const MENU_H = 65;

// Message box
const MSG_X = 5;
const MSG_Y = 230;
const MSG_W = 470;
const MSG_H = 35;

export class BattleUI {
  /**
   * @param {import('../core/battle.js').BattleEngine} engine
   * @param {import('./asset-loader.js').AssetLoader} assetLoader
   * @param {import('../core/type.js').TypeChart} typeChart
   */
  constructor(engine, assetLoader, typeChart) {
    this.engine = engine;
    this.assetLoader = assetLoader;
    this.typeChart = typeChart;

    // Animation
    this.playerBounce = 0;
    this.enemyBounce = 0;
    this.shakeX = 0;
    this.shakeY = 0;
    this.flashTimer = 0;
  }

  /**
   * Update animation timers
   */
  update(dt) {
    this.playerBounce = Math.sin(performance.now() / 600) * 3;
    this.enemyBounce = Math.sin(performance.now() / 500 + 1) * 3;

    // Shake effect during attacks
    if (this.engine.attackAnimPhase) {
      const t = this.engine.attackAnimTimer;
      if (t < 0.3) {
        this.shakeX = Math.sin(t * 40) * 4;
        this.shakeY = Math.cos(t * 30) * 2;
      } else {
        this.shakeX *= 0.9;
        this.shakeY *= 0.9;
      }
    } else {
      this.shakeX = 0;
      this.shakeY = 0;
    }
  }

  /**
   * Render the battle screen
   * @param {import('./renderer.js').Renderer} renderer
   */
  render(renderer) {
    const ctx = renderer.ctx;
    const engine = this.engine;

    // Background
    renderer.clear('#1a1a2e');
    this._drawBattleBackground(renderer);

    // Draw monsters
    this._drawMonster(renderer, engine.enemyMon, ENEMY_MON_X, ENEMY_MON_Y + this.enemyBounce, false);
    this._drawMonster(renderer, engine.playerMon, PLAYER_MON_X, PLAYER_MON_Y + this.playerBounce, true);

    // HP bars
    this._drawHPBar(renderer, engine.playerMon, PLAYER_HP_X, PLAYER_HP_Y, true);
    this._drawHPBar(renderer, engine.enemyMon, ENEMY_HP_X, ENEMY_HP_Y, false);

    // Floating damage numbers
    for (const fd of engine.floatingDamage) {
      const alpha = Math.min(1, fd.timer * 2);
      renderer.setAlpha(alpha);
      renderer.drawText(String(fd.value), fd.x | 0, fd.y | 0, fd.color, 3);
      renderer.resetAlpha();
    }

    // UI panel based on state
    if (engine.state === BATTLE_STATE.SELECT_ACTION) {
      this._drawMainMenu(renderer);
    } else if (engine.state === BATTLE_STATE.SELECT_SKILL) {
      this._drawSkillMenu(renderer);
    } else if (engine.state === BATTLE_STATE.SELECT_ITEM) {
      this._drawItemMenu(renderer);
    } else if (engine.state === BATTLE_STATE.SELECT_SWAP) {
      this._drawSwapMenu(renderer);
    } else {
      this._drawMessageBox(renderer);
    }
  }

  // === Background ===
  _drawBattleBackground(renderer) {
    // Ground gradient
    const ctx = renderer.ctx;
    const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
    grad.addColorStop(0, '#2a2a4e');
    grad.addColorStop(0.5, '#1a3a1a');
    grad.addColorStop(1, '#1a2a1a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // Battle platform - enemy side
    ctx.fillStyle = '#3a5a3a';
    ctx.beginPath();
    ctx.ellipse(ENEMY_MON_X + MON_SIZE / 2, ENEMY_MON_Y + MON_SIZE + 5, 50, 10, 0, 0, Math.PI * 2);
    ctx.fill();

    // Battle platform - player side
    ctx.fillStyle = '#3a5a3a';
    ctx.beginPath();
    ctx.ellipse(PLAYER_MON_X + MON_SIZE / 2, PLAYER_MON_Y + MON_SIZE + 5, 50, 10, 0, 0, Math.PI * 2);
    ctx.fill();

    // Divider line
    renderer.drawLine(0, 195, CANVAS_W, 195, '#333355', 1);
  }

  // === Monster sprite ===
  _drawMonster(renderer, monster, x, y, isPlayer) {
    if (!monster) return;

    const ctx = renderer.ctx;
    let drawX = x;
    let drawY = y;

    // Apply shake to the target of attack
    if (this.engine.attackAnimPhase === 'player' && !isPlayer) {
      drawX += this.shakeX;
      drawY += this.shakeY;
    } else if (this.engine.attackAnimPhase === 'enemy' && isPlayer) {
      drawX += this.shakeX;
      drawY += this.shakeY;
    }

    // Try PixelLab asset first
    const monKey = `monster_${monster.id}_east`;
    const monImg = this.assetLoader ? this.assetLoader.get(monKey) : null;

    if (monImg && monImg.complete && (monImg.naturalWidth > 0 || monImg.width > 0)) {
      ctx.imageSmoothingEnabled = false;
      // Flip for player side (face right)
      if (isPlayer) {
        ctx.save();
        ctx.translate(drawX + MON_SIZE, drawY);
        ctx.scale(-1, 1);
        ctx.drawImage(monImg, 0, 0, MON_SIZE, MON_SIZE);
        ctx.restore();
      } else {
        ctx.drawImage(monImg, drawX | 0, drawY | 0, MON_SIZE, MON_SIZE);
      }
    } else if (monster.spriteConfig) {
      // Procedural sprite fallback
      const sprite = generateSpriteScaled(monster.spriteConfig, MON_SIZE);
      if (isPlayer) {
        ctx.save();
        ctx.translate(drawX + MON_SIZE, drawY);
        ctx.scale(-1, 1);
        ctx.drawImage(sprite, 0, 0, MON_SIZE, MON_SIZE);
        ctx.restore();
      } else {
        renderer.drawImage(sprite, drawX, drawY, MON_SIZE, MON_SIZE);
      }
    } else {
      // Ultimate fallback: colored box
      const typeColor = this.typeChart.getColor(monster.type[0]);
      ctx.fillStyle = typeColor;
      ctx.fillRect(drawX + 20, drawY + 20, MON_SIZE - 40, MON_SIZE - 40);
      ctx.strokeStyle = '#FFFFFF';
      ctx.strokeRect(drawX + 20, drawY + 20, MON_SIZE - 40, MON_SIZE - 40);
    }
  }

  // === HP Bar ===
  _drawHPBar(renderer, monster, x, y, isPlayer) {
    if (!monster) return;

    // Name plate background
    renderer.fillRect(x - 3, y - 12, HP_BAR_W + 6, 38, '#111122');
    renderer.strokeRect(x - 3, y - 12, HP_BAR_W + 6, 38, '#444466');

    // Name and level
    const prefix = isPlayer ? '' : 'WILD ';
    renderer.drawText(`${prefix}${monster.name}`, x, y - 9, '#FFFFFF', 1);
    renderer.drawTextRight(`Lv.${monster.level}`, x + HP_BAR_W, y - 9, '#CCCCCC', 1);

    // Type badges
    const types = monster.type || ['normal'];
    for (let i = 0; i < types.length; i++) {
      const typeInfo = this.typeChart.getType(types[i]);
      renderer.fillRect(x + i * 50, y - 6, 45, 10, typeInfo.color);
      renderer.drawText(typeInfo.name, x + i * 50 + 2, y - 5, '#FFFFFF', 1);
    }

    // HP bar
    const hpRatio = monster.hp / monster.maxHp;
    let hpColor = '#44CC44';
    if (hpRatio < 0.25) hpColor = '#CC4444';
    else if (hpRatio < 0.5) hpColor = '#CCCC44';

    renderer.drawText('HP', x, y + 10, '#FFCC00', 1);
    renderer.drawBar(x + 20, y + 10, HP_BAR_W - 20, HP_BAR_H, hpRatio, hpColor, '#333333');

    // HP text
    if (isPlayer) {
      renderer.drawTextRight(
        `${Math.max(0, monster.hp)}/${monster.maxHp}`,
        x + HP_BAR_W, y + 26, '#CCCCCC', 1
      );
    }

    // Status icon
    if (monster.status) {
      const statusColors = {
        burn: '#FF6622', poison: '#AA44CC', paralyze: '#FFCC00',
        sleep: '#888888', confusion: '#FF88CC', freeze: '#66CCEE',
      };
      const statusLabels = {
        burn: 'BRN', poison: 'PSN', paralyze: 'PAR',
        sleep: 'SLP', confusion: 'CNF', freeze: 'FRZ',
      };
      const sc = statusColors[monster.status] || '#888888';
      const sl = statusLabels[monster.status] || monster.status.slice(0, 3).toUpperCase();
      renderer.fillRect(x + HP_BAR_W - 30, y - 6, 30, 10, sc);
      renderer.drawText(sl, x + HP_BAR_W - 28, y - 5, '#FFFFFF', 1);
    }
  }

  // === Main Menu (FIGHT / BAG / SWAP / RUN) ===
  _drawMainMenu(renderer) {
    const engine = this.engine;
    renderer.fillRect(MENU_X, MENU_Y, MENU_W, MENU_H, '#111122');
    renderer.strokeRect(MENU_X, MENU_Y, MENU_W, MENU_H, '#444488');

    renderer.drawText('WHAT WILL YOU DO?', MENU_X + 10, MENU_Y + 8, '#AAAAAA', 1);

    const options = ['FIGHT', 'BAG', 'SWAP', 'RUN'];
    const startX = MENU_X + 40;
    const startY = MENU_Y + 35;
    for (let i = 0; i < 4; i++) {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const sx = startX + col * 360;
      const sy = startY + row * 45;
      const selected = i === engine.menuIndex;

      if (selected) {
        renderer.fillRect(sx - 5, sy - 3, 200, 35, '#222244');
        renderer.strokeRect(sx - 5, sy - 3, 200, 35, '#FFD700');
      }
      renderer.drawText((selected ? '> ' : '  ') + options[i], sx, sy, selected ? '#FFD700' : '#888888', 3);
    }
  }

  // === Skill Menu ===
  _drawSkillMenu(renderer) {
    const engine = this.engine;
    const skills = engine.playerMon.skills;

    // Background
    renderer.fillRect(MENU_X, MENU_Y, MENU_W, MENU_H, '#111122');
    renderer.strokeRect(MENU_X, MENU_Y, MENU_W, MENU_H, '#444488');

    // "FIGHT" label
    renderer.drawText('FIGHT', MENU_X + 10, MENU_Y + 8, '#FFD700', 2);

    // Skill grid (2x2)
    const colW = 360;
    const rowH = 40;
    const startX = MENU_X + 20;
    const startY = MENU_Y + 35;

    for (let i = 0; i < 4; i++) {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const sx = startX + col * colW;
      const sy = startY + row * rowH;

      if (i >= skills.length) {
        renderer.drawText('---', sx + 5, sy + 5, '#444444', 2);
        continue;
      }

      const skill = skills[i];
      const selected = i === engine.selectedSkill;
      const typeInfo = this.typeChart.getType(skill.type);

      // Highlight selected
      if (selected) {
        renderer.fillRect(sx, sy, colW - 20, rowH - 5, '#222244');
        renderer.strokeRect(sx, sy, colW - 20, rowH - 5, '#FFD700');
      }

      // Type color dot
      renderer.fillRect(sx + 5, sy + 5, 20, 14, typeInfo.color);

      // Skill name
      const color = selected ? '#FFFFFF' : '#AAAAAA';
      renderer.drawText(skill.name || skill.id, sx + 30, sy + 5, color, 2);

      // PP
      const ppColor = skill.ppLeft <= 0 ? '#CC4444' : '#888888';
      renderer.drawText(`PP:${skill.ppLeft}/${skill.pp || '?'}`, sx + 250, sy + 8, ppColor, 1);
    }

    // Controls hint
    renderer.drawText('ARROWS:SELECT  Z:CONFIRM  X:FLEE', MENU_X + 10, MENU_Y + MENU_H - 15, '#555566', 1);
  }

  // === Item Menu ===
  _drawItemMenu(renderer) {
    const engine = this.engine;
    renderer.fillRect(MENU_X, MENU_Y, MENU_W, MENU_H, '#111122');
    renderer.strokeRect(MENU_X, MENU_Y, MENU_W, MENU_H, '#444488');
    renderer.drawText('BAG', MENU_X + 10, MENU_Y + 8, '#FFD700', 2);

    const startY = MENU_Y + 35;
    const maxShow = Math.min(engine.inventory.length, 3);
    for (let i = 0; i < maxShow; i++) {
      const slot = engine.inventory[i];
      const sy = startY + i * 30;
      const selected = i === engine.selectedItem;
      if (selected) {
        renderer.fillRect(MENU_X + 15, sy, MENU_W - 30, 25, '#222244');
        renderer.strokeRect(MENU_X + 15, sy, MENU_W - 30, 25, '#FFD700');
      }
      const color = selected ? '#FFFFFF' : '#AAAAAA';
      renderer.drawText(`${slot.item.name}  x${slot.count}`, MENU_X + 25, sy + 5, color, 2);
    }
    renderer.drawText('Z:USE  X:BACK', MENU_X + 10, MENU_Y + MENU_H - 15, '#555566', 1);
  }

  // === Swap Menu ===
  _drawSwapMenu(renderer) {
    const engine = this.engine;
    renderer.fillRect(MENU_X, MENU_Y, MENU_W, MENU_H, '#111122');
    renderer.strokeRect(MENU_X, MENU_Y, MENU_W, MENU_H, '#444488');
    renderer.drawText('PARTY', MENU_X + 10, MENU_Y + 8, '#FFD700', 2);

    const startY = MENU_Y + 35;
    for (let i = 0; i < engine.party.length && i < 4; i++) {
      const mon = engine.party[i];
      const sy = startY + i * 25;
      const selected = i === engine.selectedSwap;
      const isActive = mon === engine.playerMon;
      if (selected) {
        renderer.fillRect(MENU_X + 15, sy, MENU_W - 30, 22, '#222244');
        renderer.strokeRect(MENU_X + 15, sy, MENU_W - 30, 22, '#FFD700');
      }
      const label = isActive ? '[ACTIVE] ' : '';
      const hpText = `HP:${mon.hp}/${mon.maxHp}`;
      const color = mon.hp <= 0 ? '#CC4444' : (selected ? '#FFFFFF' : '#AAAAAA');
      renderer.drawText(`${label}${mon.name} Lv.${mon.level}  ${hpText}`, MENU_X + 25, sy + 3, color, 1);
    }
    renderer.drawText('Z:SWAP  X:BACK', MENU_X + 10, MENU_Y + MENU_H - 15, '#555566', 1);
  }

  // === Message Box ===
  _drawMessageBox(renderer) {
    const engine = this.engine;

    renderer.fillRect(MSG_X, MSG_Y, MSG_W, MSG_H, '#111122');
    renderer.strokeRect(MSG_X, MSG_Y, MSG_W, MSG_H, '#444488');

    if (engine.currentMessage) {
      renderer.drawText(engine.currentMessage, MSG_X + 15, MSG_Y + 15, '#FFFFFF', 2);
    }
  }

  /**
   * Draw speed and auto-battle indicators
   * @param {number} speed - 1, 2, or 4
   * @param {boolean} auto - auto-battle on/off
   */
  drawSpeedIndicator(renderer, speed, auto) {
    const x = 700;
    const y = 425;
    if (speed > 1) {
      renderer.fillRect(x, y, 40, 16, '#224422');
      renderer.drawText(`${speed}x`, x + 5, y + 2, '#44FF44', 1);
    }
    if (auto) {
      renderer.fillRect(x + 45, y, 50, 16, '#442222');
      renderer.drawText('AUTO', x + 48, y + 2, '#FF4444', 1);
    }
  }
}
