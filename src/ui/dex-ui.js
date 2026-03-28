/**
 * dex-ui.js — Monster encyclopedia (Pokedex) UI
 * Shows 102 monsters: seen/caught status, stats, type, sprite
 */

import { generateSpriteScaled } from './sprite-generator.js';

export class DexUI {
  constructor() {
    this.selectedIndex = 0;
    this.scrollOffset = 0;
    this.maxVisible = 10;
  }

  /**
   * @param {Object} keysJustPressed
   * @param {Object} dex - { seen: Set, caught: Set }
   * @param {Array} monstersData
   * @returns {string|null} 'close'
   */
  update(keysJustPressed, dex, monstersData) {
    const count = monstersData.length;

    if (keysJustPressed.ArrowUp || keysJustPressed.KeyW) {
      this.selectedIndex = Math.max(0, this.selectedIndex - 1);
    }
    if (keysJustPressed.ArrowDown || keysJustPressed.KeyS) {
      this.selectedIndex = Math.min(count - 1, this.selectedIndex + 1);
    }
    if (keysJustPressed.ArrowLeft || keysJustPressed.KeyA) {
      this.selectedIndex = Math.max(0, this.selectedIndex - 10);
    }
    if (keysJustPressed.ArrowRight || keysJustPressed.KeyD) {
      this.selectedIndex = Math.min(count - 1, this.selectedIndex + 10);
    }

    // Keep selected in view
    if (this.selectedIndex < this.scrollOffset) this.scrollOffset = this.selectedIndex;
    if (this.selectedIndex >= this.scrollOffset + this.maxVisible) {
      this.scrollOffset = this.selectedIndex - this.maxVisible + 1;
    }

    if (keysJustPressed.Escape || keysJustPressed.KeyX) return 'close';
    return null;
  }

  /**
   * @param {import('./renderer.js').Renderer} renderer
   * @param {Object} dex
   * @param {Array} monstersData
   * @param {import('../core/type.js').TypeChart} typeChart
   * @param {import('./asset-loader.js').AssetLoader} assetLoader
   */
  render(renderer, dex, monstersData, typeChart, assetLoader) {
    renderer.clear('#0a0a16');

    // Header
    renderer.fillRect(0, 0, 480, 14, '#111122');
    renderer.drawText('MONSTER DEX', 5, 3, '#FFD700', 1);
    const caughtCount = dex.caught.size;
    const seenCount = dex.seen.size;
    renderer.drawTextRight(`S:${seenCount} C:${caughtCount}/${monstersData.length}`, 475, 3, '#AAAAAA', 1);

    // List (left panel)
    for (let i = 0; i < this.maxVisible; i++) {
      const idx = this.scrollOffset + i;
      if (idx >= monstersData.length) break;

      const mon = monstersData[idx];
      const sy = 18 + i * 22;
      const selected = idx === this.selectedIndex;
      const caught = dex.caught.has(mon.id);
      const seen = dex.seen.has(mon.id);

      renderer.fillRect(5, sy, 200, 19, selected ? '#222244' : '#111122');
      if (selected) renderer.strokeRect(5, sy, 200, 19, '#FFD700');

      // Number
      renderer.drawText(`#${String(mon.id).padStart(3, '0')}`, 8, sy + 5, '#666666', 1);

      // Name (or ???)
      const name = caught ? mon.name : (seen ? mon.name : '???');
      const color = caught ? '#FFFFFF' : (seen ? '#888888' : '#444444');
      renderer.drawText(name, 40, sy + 5, color, 1);

      // Catch indicator
      if (caught) renderer.drawText('*', 185, sy + 5, '#FFD700', 1);
      else if (seen) renderer.drawText('o', 185, sy + 5, '#888888', 1);
    }

    // Scrollbar
    if (monstersData.length > this.maxVisible) {
      const barH = 220;
      const thumbH = Math.max(10, barH * this.maxVisible / monstersData.length);
      const thumbY = 18 + (barH - thumbH) * this.scrollOffset / (monstersData.length - this.maxVisible);
      renderer.fillRect(208, 18, 2, barH, '#222233');
      renderer.fillRect(208, thumbY, 2, thumbH, '#FFD700');
    }

    // Detail panel (right)
    const selMon = monstersData[this.selectedIndex];
    if (selMon && (dex.caught.has(selMon.id) || dex.seen.has(selMon.id))) {
      const dx = 215;

      renderer.fillRect(dx, 18, 260, 240, '#111122');
      renderer.strokeRect(dx, 18, 260, 240, '#333366');

      // Sprite
      const isCaught = dex.caught.has(selMon.id);

      // Try PixelLab sprite
      const monImg = assetLoader ? assetLoader.get(`monster_${selMon.id}_east`) : null;
      if (monImg && monImg.complete && (monImg.naturalWidth > 0 || monImg.width > 0)) {
        renderer.ctx.imageSmoothingEnabled = false;
        renderer.drawImage(monImg, dx + 80, 22, 64, 64);
      } else if (selMon.spriteConfig) {
        const sprite = generateSpriteScaled(selMon.spriteConfig, 64);
        renderer.drawImage(sprite, dx + 80, 22, 64, 64);
      } else {
        renderer.fillRect(dx + 90, 30, 44, 44, '#333344');
        renderer.drawText('?', dx + 105, 45, '#666666', 2);
      }

      // Name + types
      renderer.drawText(selMon.name, dx + 5, 92, '#FFFFFF', 1);
      const types = selMon.type || ['normal'];
      for (let t = 0; t < types.length; t++) {
        const info = typeChart.getType(types[t]);
        renderer.fillRect(dx + 5 + t * 40, 104, 36, 8, info.color);
        renderer.drawText(info.name, dx + 6 + t * 40, 105, '#FFFFFF', 1);
      }

      if (isCaught) {
        const bs = selMon.baseStats;
        const stats = ['HP', 'ATK', 'DEF', 'SpA', 'SpD', 'SPD'];
        const vals = [bs.hp, bs.atk, bs.def, bs.spAtk, bs.spDef, bs.speed];
        for (let s = 0; s < 6; s++) {
          const sy = 118 + s * 12;
          renderer.drawText(stats[s], dx + 5, sy, '#AAAAAA', 1);
          renderer.drawBar(dx + 35, sy, 100, 6, vals[s] / 150, '#44CC44', '#222233');
          renderer.drawText(String(vals[s]), dx + 140, sy, '#CCCCCC', 1);
        }
        renderer.drawText(selMon.description || '', dx + 5, 200, '#888888', 1);
      } else {
        renderer.drawText('CATCH TO SEE', dx + 40, 140, '#444444', 1);
      }
    }

    renderer.drawText('UP/DN:SEL L/R:PAGE X:CLOSE', 5, 262, '#555566', 1);
  }
}
