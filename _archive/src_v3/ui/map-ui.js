/**
 * map-ui.js — 타일맵 맵 화면 (핵심 재작성)
 */
import { TilemapEngine } from './tilemap-engine.js';

const TILE = 64;
const cache = new Map();

async function loadTilemap(id) {
  if (cache.has(id)) return cache.get(id);
  try {
    const r = await fetch(`./data/tilemaps/${id}.json`);
    if (!r.ok) return null;
    const d = await r.json(); cache.set(id, d); return d;
  } catch { return null; }
}

export class MapUI {
  constructor(renderer, mapManager) {
    this.renderer = renderer;
    this.mapManager = mapManager;
    this.engine = new TilemapEngine();
    this.visible = false;
    this.mapLoaded = false;
    this.currentMapData = null;
    this._locId = null;

    this.px = 8; this.py = 8;
    this.worldX = 0; this.worldY = 0;
    this.targetX = 0; this.targetY = 0;
    this.moving = false;
    this.dir = 'down';
    this.walkFrame = 0;
    this._walkTimer = 0;

    this.transitioning = false;
    this.fadeAlpha = 0;
    this.transitionTimer = 0;
    this._transTarget = null;
    this._transSpawn = null;

    this.onMove = null;
    this.onInteract = null;
    this.onShop = null;
    this.onHeal = null;
    this.onEncounterCheck = null;
    this.badgeCount = 0;
    this._stepCount = 0;
    this._keys = {};
  }

  async loadCurrentMap() {
    const id = this.mapManager.currentLocation;
    if (id === this._locId && this.mapLoaded) return;
    const data = await loadTilemap(id);
    if (data) {
      this.engine.loadMap(data);
      this.currentMapData = data;
      this._locId = id;
      this.mapLoaded = true;
      if (this._transSpawn) {
        this.px = this._transSpawn.x; this.py = this._transSpawn.y;
        this._transSpawn = null;
      } else if (data.playerSpawn) {
        this.px = data.playerSpawn.x; this.py = data.playerSpawn.y;
      }
      this.worldX = this.targetX = this.px * TILE;
      this.worldY = this.targetY = this.py * TILE;
    } else { this.mapLoaded = false; }
  }

  _refresh() { this.loadCurrentMap(); }
  syncKeys(keys) { this._keys = keys; }

  update(dt) {
    if (!this.visible) return;
    if (this.transitioning) {
      this.transitionTimer += dt;
      if (this.transitionTimer < 0.3) this.fadeAlpha = this.transitionTimer / 0.3;
      else if (this._transTarget) { this._execTransition(); this._transTarget = null; this.fadeAlpha = 1; }
      else this.fadeAlpha = Math.max(0, 1 - (this.transitionTimer - 0.3) / 0.3);
      if (this.transitionTimer >= 0.6) { this.transitioning = false; this.fadeAlpha = 0; }
      return;
    }
    if (!this.mapLoaded) { this.loadCurrentMap(); return; }

    const spd = 300 * dt;
    if (this.worldX !== this.targetX || this.worldY !== this.targetY) {
      this.moving = true; this._walkTimer += dt;
      this.walkFrame = Math.floor(this._walkTimer * 6) % 2;
      const dx = this.targetX - this.worldX, dy = this.targetY - this.worldY;
      if (Math.abs(dx) <= spd) this.worldX = this.targetX; else this.worldX += Math.sign(dx) * spd;
      if (Math.abs(dy) <= spd) this.worldY = this.targetY; else this.worldY += Math.sign(dy) * spd;
    } else {
      this.moving = false; this.walkFrame = 0;
      let nx = this.px, ny = this.py, moved = false;
      if (this._keys['ArrowUp']) { ny--; this.dir = 'up'; moved = true; }
      else if (this._keys['ArrowDown']) { ny++; this.dir = 'down'; moved = true; }
      else if (this._keys['ArrowLeft']) { nx--; this.dir = 'left'; moved = true; }
      else if (this._keys['ArrowRight']) { nx++; this.dir = 'right'; moved = true; }
      if (moved && !this.engine.isBlocked(nx, ny)) {
        this.px = nx; this.py = ny;
        this.targetX = nx * TILE; this.targetY = ny * TILE;
        const exit = this.engine.getExitAt(nx, ny);
        if (exit) { this._startTrans(exit.to, exit.spawnX, exit.spawnY); return; }
        const gt = this.engine.getTileAt('ground', nx, ny);
        if ((gt === 1 || gt === 9) && ++this._stepCount >= 4 && this.onEncounterCheck) {
          this._stepCount = 0; this.onEncounterCheck();
        }
      }
    }
    this.engine.setCamera(this.worldX + TILE/2, this.worldY + TILE/2);
  }

  _startTrans(to, sx, sy) {
    this.transitioning = true; this.transitionTimer = 0;
    this._transTarget = to; this._transSpawn = { x: sx||1, y: sy||1 };
  }
  _execTransition() {
    const r = this.mapManager.moveTo(this._transTarget, this.badgeCount);
    if (r.success) { this._locId = null; this.mapLoaded = false; this.loadCurrentMap(); if (this.onMove) this.onMove(this._transTarget); }
  }

  render() {
    if (!this.visible) return;
    const ctx = this.renderer.getContext();
    if (!this.mapLoaded) { this.renderer.clear('#1a2a1a'); this.renderer.drawPixelText('로딩...', 360, 280, '#888', 2); return; }

    this.engine.renderBelow(ctx);

    // NPC
    if (this.currentMapData?.npcs) for (const n of this.currentMapData.npcs) {
      const s = this.engine.worldToScreen(n.x * TILE, n.y * TILE);
      if (s.x < -TILE || s.x > 864 || s.y < -TILE || s.y > 664) continue;
      const c = { shop:'#44aa55', heal:'#88aaff', trainer:'#cc4444', gym_leader:'#ddaa22', boss:'#992266' }[n.type] || '#4488cc';
      ctx.fillStyle = c;
      ctx.fillRect(s.x+20, s.y+16, 24, 32);
      ctx.fillStyle = '#ffdcb0';
      ctx.fillRect(s.x+22, s.y+4, 20, 16);
      this.renderer.drawPixelText(n.name?.substring(0,4)||'', s.x+4, s.y-8, '#fff', 1);
    }

    // 플레이어
    const ps = this.engine.worldToScreen(this.worldX, this.worldY);
    ctx.fillStyle = '#cc4444'; ctx.fillRect(ps.x+20, ps.y+20, 24, 28);
    ctx.fillStyle = '#ffdcb0'; ctx.fillRect(ps.x+22, ps.y+4, 20, 18);
    ctx.fillStyle = '#4a3728'; ctx.fillRect(ps.x+22, ps.y+4, 20, 6);
    if (this.dir !== 'up') { ctx.fillStyle='#222'; ctx.fillRect(ps.x+26,ps.y+12,4,4); ctx.fillRect(ps.x+34,ps.y+12,4,4); }
    ctx.fillStyle = '#882222';
    const lo = this.walkFrame ? 4 : 0;
    ctx.fillRect(ps.x+22, ps.y+48, 10, 14+lo); ctx.fillRect(ps.x+34, ps.y+48+lo, 10, 14-lo);

    // HUD
    const loc = this.mapManager.getCurrentLocation();
    if (loc) {
      ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, 0, 800, 22);
      this.renderer.drawPixelText(loc.name, 8, 4, '#fff', 2);
      this.renderer.drawPixelText(`인장:${this.badgeCount}/8`, 660, 4, '#ffcc44', 1);
    }

    if (this.fadeAlpha > 0) { ctx.fillStyle = `rgba(0,0,0,${this.fadeAlpha})`; ctx.fillRect(0, 0, 800, 600); }
  }

  handleInput(key) {
    if (!this.visible || this.transitioning) return false;
    if (key === 'Enter' || key === ' ') {
      const f = {up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]}[this.dir]||[0,1];
      const npc = this.engine.getNpcAt(this.px+f[0], this.py+f[1]);
      if (npc) {
        if (npc.type === 'shop' && this.onShop) this.onShop(npc);
        else if (npc.type === 'heal' && this.onHeal) this.onHeal(npc);
        else if (this.onInteract) this.onInteract(npc);
      }
      return true;
    }
    return false;
  }
}
