/**
 * menu-ui.js — Party management menu (MENU game state)
 * Shows 6 party slots with stats, allows reordering
 */

import { isFainted } from '../core/monster.js';

export class MenuUI {
  constructor() {
    this.selectedSlot = 0;
    this.swapMode = false;
    this.swapFrom = -1;
  }

  /**
   * Update menu input
   * @param {Object} keysJustPressed
   * @param {Array} party
   * @returns {string|null} 'close' to return to map
   */
  update(keysJustPressed, party) {
    const count = party.length;
    if (count === 0) return 'close';

    if (keysJustPressed.ArrowUp || keysJustPressed.KeyW) {
      this.selectedSlot = (this.selectedSlot - 1 + count) % count;
    }
    if (keysJustPressed.ArrowDown || keysJustPressed.KeyS) {
      this.selectedSlot = (this.selectedSlot + 1) % count;
    }

    // Swap mode
    if (keysJustPressed.Enter || keysJustPressed.Space || keysJustPressed.KeyZ) {
      if (this.swapMode) {
        // Execute swap
        if (this.swapFrom !== this.selectedSlot) {
          const temp = party[this.swapFrom];
          party[this.swapFrom] = party[this.selectedSlot];
          party[this.selectedSlot] = temp;
        }
        this.swapMode = false;
        this.swapFrom = -1;
      } else {
        this.swapMode = true;
        this.swapFrom = this.selectedSlot;
      }
    }

    // Cancel
    if (keysJustPressed.Escape || keysJustPressed.KeyX) {
      if (this.swapMode) {
        this.swapMode = false;
        this.swapFrom = -1;
      } else {
        return 'close';
      }
    }

    return null;
  }

  /**
   * Render party menu
   * @param {import('./renderer.js').Renderer} renderer
   * @param {Array} party
   * @param {import('../core/type.js').TypeChart} typeChart
   */
  render(renderer, party, typeChart) {
    renderer.clear('#0a0a16');

    // Title
    renderer.fillRect(0, 0, 480, 14, '#111122');
    renderer.drawText('PARTY', 5, 3, '#FFD700', 1);
    if (this.swapMode) {
      renderer.drawText('SELECT SWAP TARGET', 200, 10, '#FFAA00', 1);
    }

    // Party slots
    const slotH = 40;
    const startY = 18;

    for (let i = 0; i < 6; i++) {
      const sy = startY + i * slotH;
      const mon = party[i];
      const selected = i === this.selectedSlot;
      const isSwapFrom = this.swapMode && i === this.swapFrom;

      const bg = isSwapFrom ? '#332244' : (selected ? '#222244' : '#111122');
      renderer.fillRect(5, sy, 470, slotH - 3, bg);
      if (selected) renderer.strokeRect(5, sy, 470, slotH - 3, '#FFD700');
      else renderer.strokeRect(5, sy, 470, slotH - 3, '#333344');

      if (!mon) {
        renderer.drawText('--- EMPTY ---', 180, sy + 14, '#333344', 1);
        continue;
      }

      const fainted = isFainted(mon);
      const nameColor = fainted ? '#CC4444' : '#FFFFFF';

      renderer.drawText(mon.name, 10, sy + 3, nameColor, 1);
      renderer.drawText(`Lv.${mon.level}`, 150, sy + 3, '#CCCCCC', 1);

      // Type
      const types = mon.type || ['normal'];
      for (let t = 0; t < types.length; t++) {
        const info = typeChart.getType(types[t]);
        renderer.fillRect(210 + t * 40, sy + 2, 36, 8, info.color);
        renderer.drawText(info.name, 211 + t * 40, sy + 3, '#FFF', 1);
      }

      // HP bar
      const hpRatio = mon.hp / mon.maxHp;
      let hpColor = hpRatio < 0.25 ? '#CC4444' : (hpRatio < 0.5 ? '#CCCC44' : '#44CC44');
      renderer.drawText('HP', 10, sy + 15, '#FFCC00', 1);
      renderer.drawBar(28, sy + 15, 140, 6, hpRatio, hpColor, '#333333');
      renderer.drawText(`${mon.hp}/${mon.maxHp}`, 175, sy + 15, '#CCCCCC', 1);

      // Status
      if (mon.status) {
        const sc = { burn:'#FF6622', poison:'#AA44CC', paralyze:'#FFCC00', sleep:'#888888', confusion:'#FF88CC', freeze:'#66CCEE' };
        renderer.fillRect(300, sy + 2, 20, 8, sc[mon.status] || '#888');
        renderer.drawText(mon.status.slice(0,3).toUpperCase(), 301, sy + 3, '#FFF', 1);
      }

      // Stats + EXP
      renderer.drawText(`A:${mon.stats.atk} D:${mon.stats.def} S:${mon.stats.speed}`, 10, sy + 27, '#888888', 1);
      if (mon.expToNext) {
        const expRatio = (mon.exp || 0) / mon.expToNext;
        renderer.drawText('EXP', 250, sy + 27, '#6688FF', 1);
        renderer.drawBar(275, sy + 27, 100, 4, expRatio, '#6688FF', '#222233');
      }
    }

    renderer.fillRect(0, 260, 480, 10, '#111122');
    renderer.drawText('UP/DN:SEL Z:SWAP X:CLOSE', 5, 262, '#555566', 1);
  }
}
