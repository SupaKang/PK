/**
 * tilemap-engine.js — 스프라이트시트 기반 타일 렌더링
 * rpg_base_sheet.png (1280x832, 64x64 타일, 20열×13행) 하나만 로드
 */

const TILE_SIZE = 64;
const CANVAS_W = 800;
const CANVAS_H = 600;

// 게임 타일 ID → 시트 내 (col, row)
const TILE_MAP = {
  1:  [3, 0],   // 풀
  2:  [1, 0],   // 흙+풀 경계
  3:  [4, 0],   // 물
  4:  [0, 1],   // 베이지 바닥
  5:  [4, 2],   // 나무 바닥
  6:  [0, 2],   // 돌벽
  7:  [0, 6],   // 나무
  8:  [5, 6],   // 덤불
  9:  [0, 0],   // 풀2
  10: [1, 0],   // 모래
  11: [3, 0],   // 얼음 (풀+오버레이)
  12: [0, 0],   // 용암 (풀+빨강)
  13: [0, 3],   // 지붕
  14: [3, 4],   // 문
  15: [0, 2],   // 어두운 돌
  16: [4, 2],   // 다리
  17: [0, 1],   // 체육관 바닥
  18: [0, 2],   // 던전 돌
  19: [0, 1],   // 카펫
  20: [4, 2],   // 책장
};

const FALLBACK = {
  1:'#4a8c3f', 2:'#9c7a4a', 3:'#4a7aac', 4:'#b0a080', 5:'#a08060',
  6:'#5a5a6a', 7:'#2a6a2a', 8:'#3a8a3a', 9:'#5aaa4a', 10:'#c0a870',
  11:'#a0d0e0', 12:'#c04020', 13:'#8a5a3a', 14:'#6a4a2a', 15:'#4a4a5a',
  16:'#8a6a4a', 17:'#c0a040', 18:'#3a3a4a', 19:'#8a3030', 20:'#5a3a1a',
};

export class TilemapEngine {
  constructor() {
    this.mapData = null;
    this.cameraX = 0;
    this.cameraY = 0;
    this.mapWidth = 0;
    this.mapHeight = 0;
    this._sheet = new Image();
    this._sheet.src = './assets/tiles/rpg_base_sheet.png';
    this._ready = false;
    this._sheet.onload = () => { this._ready = true; console.log('Spritesheet loaded!'); };
    this._sheet.onerror = () => { console.warn('Spritesheet load failed — using fallback colors'); };
  }

  get isReady() { return this._ready; }

  loadMap(data) {
    this.mapData = data;
    this.mapWidth = data.width;
    this.mapHeight = data.height;
  }

  setCamera(x, y) {
    const pw = this.mapWidth * TILE_SIZE, ph = this.mapHeight * TILE_SIZE;
    this.cameraX = x - CANVAS_W / 2;
    this.cameraY = y - CANVAS_H / 2;
    if (pw <= CANVAS_W) this.cameraX = -(CANVAS_W - pw) / 2;
    else this.cameraX = Math.max(0, Math.min(pw - CANVAS_W, this.cameraX));
    if (ph <= CANVAS_H) this.cameraY = -(CANVAS_H - ph) / 2;
    else this.cameraY = Math.max(0, Math.min(ph - CANVAS_H, this.cameraY));
  }

  isBlocked(tx, ty) {
    if (!this.mapData) return true;
    if (tx < 0 || ty < 0 || tx >= this.mapWidth || ty >= this.mapHeight) return true;
    if (this.mapData.layers?.collision?.[ty * this.mapWidth + tx]) return true;
    if (this.mapData.npcs) for (const n of this.mapData.npcs) if (n.x === tx && n.y === ty) return true;
    return false;
  }

  getNpcAt(tx, ty) { return this.mapData?.npcs?.find(n => n.x === tx && n.y === ty) || null; }
  getExitAt(tx, ty) { return this.mapData?.exits?.find(e => e.x === tx && e.y === ty) || null; }
  getTileAt(layer, tx, ty) {
    if (!this.mapData?.layers?.[layer] || tx < 0 || ty < 0 || tx >= this.mapWidth || ty >= this.mapHeight) return 0;
    return this.mapData.layers[layer][ty * this.mapWidth + tx] || 0;
  }
  worldToScreen(wx, wy) { return { x: wx - this.cameraX, y: wy - this.cameraY }; }

  _drawTile(ctx, id, sx, sy) {
    if (id === 0) return;
    const m = TILE_MAP[id];
    if (this._ready && m) {
      ctx.drawImage(this._sheet, m[0]*TILE_SIZE, m[1]*TILE_SIZE, TILE_SIZE, TILE_SIZE, sx, sy, TILE_SIZE, TILE_SIZE);
      if (id === 12) { ctx.fillStyle = 'rgba(200,50,0,0.4)'; ctx.fillRect(sx, sy, TILE_SIZE, TILE_SIZE); }
      if (id === 19) { ctx.fillStyle = 'rgba(150,30,30,0.3)'; ctx.fillRect(sx, sy, TILE_SIZE, TILE_SIZE); }
      if (id === 11) { ctx.fillStyle = 'rgba(100,150,255,0.3)'; ctx.fillRect(sx, sy, TILE_SIZE, TILE_SIZE); }
    } else if (FALLBACK[id]) {
      ctx.fillStyle = FALLBACK[id]; ctx.fillRect(sx, sy, TILE_SIZE, TILE_SIZE);
    }
  }

  renderBelow(ctx) {
    if (!this.mapData) return;
    ctx.fillStyle = '#1a2a1a'; ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    const sc = Math.max(0, Math.floor(this.cameraX / TILE_SIZE));
    const sr = Math.max(0, Math.floor(this.cameraY / TILE_SIZE));
    const ec = Math.min(this.mapWidth, Math.ceil((this.cameraX + CANVAS_W) / TILE_SIZE) + 1);
    const er = Math.min(this.mapHeight, Math.ceil((this.cameraY + CANVAS_H) / TILE_SIZE) + 1);
    const g = this.mapData.layers?.ground, o = this.mapData.layers?.objects;
    if (g) for (let r = sr; r < er; r++) for (let c = sc; c < ec; c++)
      this._drawTile(ctx, g[r*this.mapWidth+c]||0, c*TILE_SIZE-this.cameraX, r*TILE_SIZE-this.cameraY);
    if (o) for (let r = sr; r < er; r++) for (let c = sc; c < ec; c++) {
      const t = o[r*this.mapWidth+c]||0;
      if (t) this._drawTile(ctx, t, c*TILE_SIZE-this.cameraX, r*TILE_SIZE-this.cameraY);
    }
  }

  renderAbove(ctx) {}
}
