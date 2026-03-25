/**
 * tilemap-engine.js — Image-based tile rendering engine
 * Uses Kenney RPG Base 64x64 individual tile PNGs
 * Renders at 1:1 scale (64x64 per tile) on 800x600 canvas.
 */

const TILE_SIZE = 64;  // Display size per tile
const CANVAS_W = 800;
const CANVAS_H = 600;

/**
 * Game tile ID → RPG Base PNG filename mapping
 */
const TILE_FILES = {
  1:  'rpgTile003',  // grass
  2:  'rpgTile005',  // dirt path
  3:  'rpgTile030',  // water
  4:  'rpgTile050',  // beige wall/floor
  5:  'rpgTile120',  // wood floor
  6:  'rpgTile060',  // stone wall
  7:  'rpgTile200',  // tree
  8:  'rpgTile160',  // bush
  9:  'rpgTile040',  // grass alt / flower
  10: 'rpgTile005',  // sand (reuse dirt)
  11: 'rpgTile030',  // ice (reuse water tinted)
  12: 'rpgTile150',  // lava (dark floor tinted)
  13: 'rpgTile110',  // roof / dark wall
  14: 'rpgTile170',  // door
  15: 'rpgTile130',  // fence / dark stone
  16: 'rpgTile120',  // bridge (reuse wood)
  17: 'rpgTile070',  // gym floor (beige)
  18: 'rpgTile130',  // dark stone
  19: 'rpgTile150',  // carpet (dark floor)
  20: 'rpgTile080',  // bookshelf (gray wall)
};

/**
 * Fallback colors when images fail to load
 */
const TILE_COLORS = {
  1: '#4a8c3f', 2: '#9c7a4a', 3: '#4a7aac', 4: '#b0a080',
  5: '#a08060', 6: '#5a5a6a', 7: '#2a6a2a', 8: '#3a8a3a',
  9: '#5aaa4a', 10: '#c0a870', 11: '#a0d0e0', 12: '#c04020',
  13: '#6a4a3a', 14: '#6a4a2a', 15: '#4a4a5a', 16: '#8a6a4a',
  17: '#c0a040', 18: '#3a3a4a', 19: '#8a3030', 20: '#5a3a1a',
};

export class TilemapEngine {
  constructor(canvas) {
    this.canvas = canvas;
    this.mapData = null;
    this.cameraX = 0;
    this.cameraY = 0;
    this.mapWidth = 0;
    this.mapHeight = 0;

    // Tile image cache
    this._tileImages = {};
    this._loadingStarted = false;
  }

  /** Preload all tile images */
  _ensureImagesLoaded() {
    if (this._loadingStarted) return;
    this._loadingStarted = true;

    for (const [id, filename] of Object.entries(TILE_FILES)) {
      const img = new Image();
      img.src = `./assets/tiles/${filename}.png`;
      img.onload = () => { this._tileImages[id] = img; };
      img.onerror = () => { this._tileImages[id] = null; };
    }
  }

  loadMap(mapData) {
    this.mapData = mapData;
    this.mapWidth = mapData.width;
    this.mapHeight = mapData.height;
    this._ensureImagesLoaded();
  }

  setCamera(x, y) {
    const mapPixelW = this.mapWidth * TILE_SIZE;
    const mapPixelH = this.mapHeight * TILE_SIZE;

    this.cameraX = x - CANVAS_W / 2;
    this.cameraY = y - CANVAS_H / 2;

    if (mapPixelW <= CANVAS_W) {
      this.cameraX = -(CANVAS_W - mapPixelW) / 2;
    } else {
      this.cameraX = Math.max(0, Math.min(mapPixelW - CANVAS_W, this.cameraX));
    }
    if (mapPixelH <= CANVAS_H) {
      this.cameraY = -(CANVAS_H - mapPixelH) / 2;
    } else {
      this.cameraY = Math.max(0, Math.min(mapPixelH - CANVAS_H, this.cameraY));
    }
  }

  isBlocked(tx, ty) {
    if (!this.mapData) return true;
    if (tx < 0 || ty < 0 || tx >= this.mapWidth || ty >= this.mapHeight) return true;

    const idx = ty * this.mapWidth + tx;
    const collision = this.mapData.layers?.collision;
    if (collision && collision[idx]) return true;

    if (this.mapData.npcs) {
      for (const npc of this.mapData.npcs) {
        if (npc.x === tx && npc.y === ty) return true;
      }
    }
    return false;
  }

  getNpcAt(tx, ty) {
    if (!this.mapData?.npcs) return null;
    return this.mapData.npcs.find(n => n.x === tx && n.y === ty) || null;
  }

  getExitAt(tx, ty) {
    if (!this.mapData?.exits) return null;
    return this.mapData.exits.find(e => e.x === tx && e.y === ty) || null;
  }

  getTileAt(layer, tx, ty) {
    if (!this.mapData?.layers?.[layer]) return 0;
    if (tx < 0 || ty < 0 || tx >= this.mapWidth || ty >= this.mapHeight) return 0;
    return this.mapData.layers[layer][ty * this.mapWidth + tx] || 0;
  }

  worldToScreen(wx, wy) {
    return {
      x: wx - this.cameraX,
      y: wy - this.cameraY,
    };
  }

  /** Draw a single tile */
  _drawTile(ctx, tileId, screenX, screenY) {
    if (tileId === 0) return;

    const img = this._tileImages[tileId];
    if (img) {
      ctx.drawImage(img, screenX, screenY, TILE_SIZE, TILE_SIZE);
    } else {
      // Fallback colored rectangle
      const color = TILE_COLORS[tileId];
      if (color) {
        ctx.fillStyle = color;
        ctx.fillRect(screenX, screenY, TILE_SIZE, TILE_SIZE);
      }
    }
  }

  /** Render ground + objects layers */
  renderBelow(ctx) {
    if (!this.mapData) return;

    ctx.fillStyle = '#0a0a16';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    const startCol = Math.max(0, Math.floor(this.cameraX / TILE_SIZE));
    const startRow = Math.max(0, Math.floor(this.cameraY / TILE_SIZE));
    const endCol = Math.min(this.mapWidth, Math.ceil((this.cameraX + CANVAS_W) / TILE_SIZE) + 1);
    const endRow = Math.min(this.mapHeight, Math.ceil((this.cameraY + CANVAS_H) / TILE_SIZE) + 1);

    const ground = this.mapData.layers?.ground;
    const objects = this.mapData.layers?.objects;

    if (ground) {
      for (let row = startRow; row < endRow; row++) {
        for (let col = startCol; col < endCol; col++) {
          const idx = row * this.mapWidth + col;
          const tileId = ground[idx] || 0;
          const sx = col * TILE_SIZE - this.cameraX;
          const sy = row * TILE_SIZE - this.cameraY;
          this._drawTile(ctx, tileId, sx, sy);
        }
      }
    }

    if (objects) {
      for (let row = startRow; row < endRow; row++) {
        for (let col = startCol; col < endCol; col++) {
          const idx = row * this.mapWidth + col;
          const tileId = objects[idx] || 0;
          if (tileId === 0) continue;
          const sx = col * TILE_SIZE - this.cameraX;
          const sy = row * TILE_SIZE - this.cameraY;
          this._drawTile(ctx, tileId, sx, sy);
        }
      }
    }
  }

  renderAbove(ctx) {
    // Reserved for tree canopy overlay etc.
  }
}
