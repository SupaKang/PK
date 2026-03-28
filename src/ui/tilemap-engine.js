/**
 * tilemap-engine.js — Tilemap rendering with Wang 4-corner autotiling
 * Uses PixelLab Wang tileset metadata for seamless terrain transitions
 */

import { TILE, TILE_SIZE, RENDER_TILE } from '../world/map.js';

// Tile color fallbacks
const TILE_COLORS = {
  [TILE.GRASS]: '#4a8c3f',
  [TILE.DIRT]: '#8b7355',
  [TILE.WATER]: '#3366aa',
  [TILE.STONE]: '#888888',
  [TILE.WALL]: '#333333',
  [TILE.EXIT]: '#ffaa00',
};

// Which tile type is "upper" (overlay) vs "lower" (base) per tileset
const TILESET_MAPPING = {
  grass_dirt:  { lower: TILE.GRASS, upper: TILE.DIRT },
  grass_water: { lower: TILE.GRASS, upper: TILE.WATER },
  dirt_stone:  { lower: TILE.DIRT,  upper: TILE.STONE },
};

export class TilemapEngine {
  /**
   * @param {number} viewWidth - Internal canvas width (480)
   * @param {number} viewHeight - Internal canvas height (270)
   */
  constructor(viewWidth, viewHeight) {
    this.viewWidth = viewWidth;
    this.viewHeight = viewHeight;
    this.cameraX = 0;
    this.cameraY = 0;

    this.tilesetImages = {};
    this.objectImages = {};

    // Wang tile lookup tables: corners key → {sx, sy} in tileset PNG
    // Built from PixelLab metadata
    this.wangLookup = {}; // { grass_dirt: { 'LLLL': {sx,sy}, 'LLLU': {sx,sy}, ... } }
  }

  setTilesetImages(tilesetImages) {
    this.tilesetImages = tilesetImages;
  }

  setObjectImages(objectImages) {
    this.objectImages = objectImages;
  }

  /**
   * Load Wang tileset metadata and build lookup tables
   * @param {Object} metadataMap - { grass_dirt: {tileset_data}, ... }
   */
  loadWangMetadata(metadataMap) {
    for (const [name, meta] of Object.entries(metadataMap)) {
      const lookup = {};
      const tiles = meta.tileset_data?.tiles || meta.tiles || [];
      for (const tile of tiles) {
        const corners = tile.corners;
        // Key: NW+NE+SW+SE as L/U
        const key = (corners.NW === 'upper' ? 'U' : 'L') +
                    (corners.NE === 'upper' ? 'U' : 'L') +
                    (corners.SW === 'upper' ? 'U' : 'L') +
                    (corners.SE === 'upper' ? 'U' : 'L');
        const bb = tile.bounding_box;
        lookup[key] = { sx: bb.x, sy: bb.y };
      }
      this.wangLookup[name] = lookup;
    }
  }

  followTarget(tileX, tileY, mapWidth, mapHeight) {
    const targetPixelX = tileX * RENDER_TILE + RENDER_TILE / 2;
    const targetPixelY = tileY * RENDER_TILE + RENDER_TILE / 2;

    this.cameraX = targetPixelX - this.viewWidth / 2;
    this.cameraY = targetPixelY - this.viewHeight / 2;

    const maxX = mapWidth * RENDER_TILE - this.viewWidth;
    const maxY = mapHeight * RENDER_TILE - this.viewHeight;
    this.cameraX = Math.max(0, Math.min(this.cameraX, maxX));
    this.cameraY = Math.max(0, Math.min(this.cameraY, maxY));
  }

  renderTiles(ctx, map) {
    const startCol = Math.floor(this.cameraX / RENDER_TILE);
    const startRow = Math.floor(this.cameraY / RENDER_TILE);
    const endCol = Math.min(map.width, startCol + Math.ceil(this.viewWidth / RENDER_TILE) + 2);
    const endRow = Math.min(map.height, startRow + Math.ceil(this.viewHeight / RENDER_TILE) + 2);

    for (let row = startRow; row < endRow; row++) {
      for (let col = startCol; col < endCol; col++) {
        if (row < 0 || col < 0) continue;
        const tile = map.getTile(col, row);
        const screenX = col * RENDER_TILE - this.cameraX;
        const screenY = row * RENDER_TILE - this.cameraY;

        const tilesetName = this._getTilesetName(tile);
        const tilesetImg = tilesetName ? this.tilesetImages[tilesetName] : null;

        if (tilesetImg && this.wangLookup[tilesetName]) {
          const src = this._getWangSrc(map, col, row, tilesetName);
          if (src) {
            ctx.drawImage(tilesetImg, src.sx, src.sy, TILE_SIZE, TILE_SIZE,
              screenX | 0, screenY | 0, RENDER_TILE, RENDER_TILE);
          } else {
            ctx.fillStyle = TILE_COLORS[tile] || '#FF00FF';
            ctx.fillRect(screenX | 0, screenY | 0, RENDER_TILE, RENDER_TILE);
          }
        } else if (tilesetImg) {
          // Fallback: UUUU tile for upper terrain, LLLL tile for lower terrain
          const isUpper = this._isUpperTerrain(tile, tilesetName);
          // Use first/last tile positions from 4x4 Wang grid (16px tiles)
          const fallbackSrc = isUpper ? { sx: 0, sy: 48 } : { sx: 32, sy: 16 };
          ctx.drawImage(tilesetImg, fallbackSrc.sx, fallbackSrc.sy, TILE_SIZE, TILE_SIZE,
            screenX | 0, screenY | 0, RENDER_TILE, RENDER_TILE);
        } else {
          ctx.fillStyle = TILE_COLORS[tile] || '#FF00FF';
          ctx.fillRect(screenX | 0, screenY | 0, RENDER_TILE, RENDER_TILE);
        }
      }
    }
  }

  renderObjects(ctx, map) {
    for (const obj of map.objects) {
      const screenX = obj.x * RENDER_TILE - this.cameraX;
      const screenY = obj.y * RENDER_TILE - this.cameraY;
      const objW = (obj.w || 1) * RENDER_TILE;
      const objH = (obj.h || 1) * RENDER_TILE;

      if (screenX + objW < 0 || screenY + objH < 0 ||
          screenX > this.viewWidth || screenY > this.viewHeight) continue;

      const img = this.objectImages[obj.type];
      if (img) {
        ctx.drawImage(img, screenX | 0, screenY | 0, objW | 0, objH | 0);
      } else {
        this._renderObjectFallback(ctx, obj, screenX, screenY, objW, objH);
      }
    }
  }

  render(ctx, map) {
    this.renderTiles(ctx, map);
    this.renderObjects(ctx, map);
  }

  screenToTile(screenX, screenY) {
    return {
      x: Math.floor((screenX + this.cameraX) / RENDER_TILE),
      y: Math.floor((screenY + this.cameraY) / RENDER_TILE),
    };
  }

  /**
   * Determine which tileset to use for a tile type
   */
  _getTilesetName(tileType) {
    switch (tileType) {
      case TILE.GRASS: return 'grass_dirt';   // grass is lower in grass_dirt
      case TILE.DIRT:  return 'grass_dirt';   // dirt is upper in grass_dirt
      case TILE.WATER: return 'grass_water';  // water is upper in grass_water
      case TILE.STONE: return 'dirt_stone';   // stone is upper in dirt_stone
      default: return null;
    }
  }

  _isUpperTerrain(tileType, tilesetName) {
    const mapping = TILESET_MAPPING[tilesetName];
    return mapping ? tileType === mapping.upper : false;
  }

  /**
   * Wang 4-corner tile selection
   * Each corner is shared by 4 cells. A corner's value is determined by
   * its 3 neighbors (2 edge-adjacent + 1 diagonal) that share it.
   *
   * Upper cells always render as UUUU (pure upper terrain).
   * Lower cells compute corners: a corner is 'U' if ANY neighbor sharing
   * that corner is upper terrain (edge or diagonal).
   */
  _getWangSrc(map, col, row, tilesetName) {
    const mapping = TILESET_MAPPING[tilesetName];
    if (!mapping) return null;

    const lookup = this.wangLookup[tilesetName];
    if (!lookup) return null;

    const thisTile = map.getTile(col, row);
    const isUpper = (t) => t === mapping.upper;
    const thisIsUpper = isUpper(thisTile);

    let key;
    if (thisIsUpper) {
      key = 'UUUU';
    } else {
      // Check 4 neighbors + 4 diagonals
      const n  = isUpper(map.getTile(col, row - 1));
      const s  = isUpper(map.getTile(col, row + 1));
      const w  = isUpper(map.getTile(col - 1, row));
      const e  = isUpper(map.getTile(col + 1, row));
      const nw = isUpper(map.getTile(col - 1, row - 1));
      const ne = isUpper(map.getTile(col + 1, row - 1));
      const sw = isUpper(map.getTile(col - 1, row + 1));
      const se = isUpper(map.getTile(col + 1, row + 1));

      // Each corner is U if any of its 3 sharing neighbors is upper
      const cNW = (n || w || nw) ? 'U' : 'L';
      const cNE = (n || e || ne) ? 'U' : 'L';
      const cSW = (s || w || sw) ? 'U' : 'L';
      const cSE = (s || e || se) ? 'U' : 'L';
      key = cNW + cNE + cSW + cSE;
    }

    return lookup[key] || lookup['LLLL'] || null;
  }

  _renderObjectFallback(ctx, obj, sx, sy, w, h) {
    switch (obj.type) {
      case 'tree':
        ctx.fillStyle = '#6B4226';
        ctx.fillRect(sx + w * 0.35, sy + h * 0.5, w * 0.3, h * 0.5);
        ctx.fillStyle = '#2d6b30';
        ctx.beginPath();
        ctx.arc(sx + w / 2, sy + h * 0.35, w * 0.4, 0, Math.PI * 2);
        ctx.fill();
        break;
      case 'house':
        ctx.fillStyle = '#c4a882';
        ctx.fillRect(sx + 2, sy + h * 0.3, w - 4, h * 0.65);
        ctx.fillStyle = '#8b3a3a';
        ctx.beginPath();
        ctx.moveTo(sx, sy + h * 0.35);
        ctx.lineTo(sx + w / 2, sy + 1);
        ctx.lineTo(sx + w, sy + h * 0.35);
        ctx.fill();
        ctx.fillStyle = '#4a3520';
        ctx.fillRect(sx + w * 0.4, sy + h * 0.6, w * 0.2, h * 0.35);
        break;
      case 'fence':
        ctx.fillStyle = '#8b7355';
        ctx.fillRect(sx + 1, sy + h * 0.3, w - 2, 2);
        ctx.fillRect(sx + 2, sy + h * 0.2, 2, h * 0.6);
        ctx.fillRect(sx + w - 4, sy + h * 0.2, 2, h * 0.6);
        break;
      case 'signpost':
        ctx.fillStyle = '#6B4226';
        ctx.fillRect(sx + w * 0.4, sy + h * 0.3, w * 0.2, h * 0.7);
        ctx.fillStyle = '#c4a882';
        ctx.fillRect(sx + w * 0.1, sy + h * 0.2, w * 0.8, h * 0.25);
        break;
      default:
        ctx.fillStyle = '#FF00FF';
        ctx.fillRect(sx, sy, w, h);
    }
  }
}
