/**
 * map.js — Map metadata, connections, badge gates
 * Manages map definitions and transition logic
 */

// Tile size in pixels (internal canvas, no scaling)
export const TILE_SIZE = 16;
export const RENDER_TILE = 16; // 1:1 on internal 480×270 canvas

// Map tile types
export const TILE = {
  GRASS: 0,
  DIRT: 1,
  WATER: 2,
  STONE: 3,
  WALL: 4,    // Collision — impassable
  EXIT: 5,    // Triggers map transition
};

// Which tiles block movement
const SOLID_TILES = new Set([TILE.WATER, TILE.WALL]);

/**
 * Map definition loaded from data + tilemap
 */
export class GameMap {
  /**
   * @param {Object} mapData - From maps.json
   * @param {number[][]} tilemap - 2D tile grid
   * @param {number[][]} collisionMap - 2D collision grid (0=passable, 1=solid)
   * @param {Array} objects - Placed map objects [{id, type, x, y, w, h}]
   * @param {Array} exits - [{x, y, targetMap, targetX, targetY}]
   */
  constructor(mapData, tilemap, collisionMap, objects, exits) {
    this.id = mapData.id;
    this.name = mapData.name;
    this.type = mapData.type;
    this.connections = mapData.connections || [];
    this.requiredBadges = mapData.requiredBadges || 0;
    this.wildEncounterRate = mapData.wildEncounterRate || 0;
    this.encounters = mapData.encounters || [];
    this.tilemap = tilemap;
    this.collisionMap = collisionMap;
    this.objects = objects;
    this.exits = exits;
    this.width = tilemap[0]?.length || 0;
    this.height = tilemap.length;
  }

  /**
   * Check if a tile position is passable
   */
  isPassable(tileX, tileY) {
    if (tileX < 0 || tileY < 0 || tileX >= this.width || tileY >= this.height) {
      return false;
    }
    return this.collisionMap[tileY][tileX] === 0;
  }

  /**
   * Get tile type at position
   */
  getTile(tileX, tileY) {
    if (tileX < 0 || tileY < 0 || tileX >= this.width || tileY >= this.height) {
      return TILE.WALL;
    }
    return this.tilemap[tileY][tileX];
  }

  /**
   * Find exit at tile position
   * @returns {Object|null} Exit data or null
   */
  getExitAt(tileX, tileY) {
    return this.exits.find(e => e.x === tileX && e.y === tileY) || null;
  }

  /**
   * Check badge gate — can player enter this map?
   */
  canEnter(playerBadges) {
    return playerBadges >= this.requiredBadges;
  }
}

/**
 * Map manager — handles loading maps and transitions
 */
export class MapManager {
  /**
   * @param {Array} mapsData - Full maps.json array
   */
  constructor(mapsData) {
    this.mapsData = mapsData;
    /** @type {GameMap|null} */
    this.currentMap = null;
    this.playerBadges = 0;
  }

  /**
   * Build a GameMap from a map ID using hardcoded tilemaps
   */
  loadMap(mapId) {
    const mapData = this.mapsData.find(m => m.id === mapId);
    if (!mapData) {
      console.error(`[MapManager] Map not found: ${mapId}`);
      return null;
    }

    const layout = MAP_LAYOUTS[mapId];
    if (!layout) {
      console.warn(`[MapManager] No layout for: ${mapId}, using default`);
      return this._buildDefaultMap(mapData);
    }

    const map = new GameMap(
      mapData,
      layout.tilemap,
      layout.collisionMap,
      layout.objects || [],
      layout.exits || []
    );
    this.currentMap = map;
    return map;
  }

  /**
   * Attempt map transition
   * @returns {{map: GameMap, spawnX: number, spawnY: number}|null}
   */
  tryTransition(tileX, tileY) {
    if (!this.currentMap) return null;
    const exit = this.currentMap.getExitAt(tileX, tileY);
    if (!exit) return null;

    // Badge gate check
    const targetData = this.mapsData.find(m => m.id === exit.targetMap);
    if (targetData && (targetData.requiredBadges || 0) > this.playerBadges) {
      return { blocked: true, required: targetData.requiredBadges };
    }

    const newMap = this.loadMap(exit.targetMap);
    if (!newMap) return null;

    return {
      map: newMap,
      spawnX: exit.targetX,
      spawnY: exit.targetY,
    };
  }

  _buildDefaultMap(mapData) {
    const w = 20, h = 15;
    const tilemap = [];
    const collisionMap = [];

    for (let y = 0; y < h; y++) {
      const row = [];
      const cRow = [];
      for (let x = 0; x < w; x++) {
        // Border walls
        if (x === 0 || y === 0 || x === w - 1 || y === h - 1) {
          row.push(TILE.WALL);
          cRow.push(1);
        } else {
          row.push(TILE.GRASS);
          cRow.push(0);
        }
      }
      tilemap.push(row);
      collisionMap.push(cRow);
    }

    const map = new GameMap(mapData, tilemap, collisionMap, [], []);
    this.currentMap = map;
    return map;
  }
}

// ============================
// Hardcoded map layouts
// ============================

const MAP_LAYOUTS = {
  town_01: {
    // 20x15 town map
    tilemap: [
      [4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4],
      [4,0,0,0,0,0,1,1,1,0,0,0,0,0,0,0,0,0,0,4],
      [4,0,0,0,0,0,1,3,1,0,0,0,0,0,0,0,0,0,0,4],
      [4,0,0,0,0,0,1,1,1,0,0,0,0,0,0,0,0,0,0,4],
      [4,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,4],
      [4,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,4],
      [4,0,0,0,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,4],
      [4,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,4],
      [4,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,4],
      [4,0,0,0,0,0,1,1,1,0,0,0,0,0,0,0,0,0,0,4],
      [4,0,0,0,0,0,1,3,1,0,0,0,0,0,0,0,0,0,0,4],
      [4,0,0,0,0,0,1,1,1,0,0,0,0,0,0,0,0,0,0,4],
      [4,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,4],
      [4,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,4],
      [4,4,4,4,4,4,4,5,4,4,4,4,4,4,4,4,4,4,4,4],
    ],
    collisionMap: [
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
      [1,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,1],
      [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
      [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
      [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
      [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
      [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
      [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
      [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
      [1,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,1],
      [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
      [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
      [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
      [1,1,1,1,1,1,1,0,1,1,1,1,1,1,1,1,1,1,1,1],
    ],
    objects: [
      { type: 'house', x: 6, y: 2, w: 3, h: 3 },
      { type: 'house', x: 6, y: 10, w: 3, h: 3 },
      { type: 'tree', x: 2, y: 2, w: 1, h: 1 },
      { type: 'tree', x: 3, y: 4, w: 1, h: 1 },
      { type: 'tree', x: 15, y: 3, w: 1, h: 1 },
      { type: 'tree', x: 16, y: 5, w: 1, h: 1 },
      { type: 'tree', x: 14, y: 8, w: 1, h: 1 },
      { type: 'signpost', x: 5, y: 7, w: 1, h: 1 },
      { type: 'fence', x: 11, y: 6, w: 1, h: 1 },
      { type: 'fence', x: 12, y: 6, w: 1, h: 1 },
      { type: 'fence', x: 13, y: 6, w: 1, h: 1 },
    ],
    exits: [
      { x: 7, y: 14, targetMap: 'route_01', targetX: 7, targetY: 1 },
    ],
  },

  route_01: {
    // 20x20 route map
    tilemap: (() => {
      const m = [];
      for (let y = 0; y < 20; y++) {
        const row = [];
        for (let x = 0; x < 20; x++) {
          if (x === 0 || x === 19 || y === 19) {
            row.push(TILE.WALL);
          } else if (y === 0) {
            row.push(x === 7 ? TILE.EXIT : TILE.WALL);
          } else if (x >= 6 && x <= 8) {
            row.push(TILE.DIRT);
          } else if (x >= 3 && x <= 5 && y >= 8 && y <= 12) {
            row.push(TILE.WATER);
          } else {
            row.push(TILE.GRASS);
          }
        }
        m.push(row);
      }
      // Bottom exit to town_02
      m[19][7] = TILE.EXIT;
      return m;
    })(),
    collisionMap: (() => {
      const m = [];
      for (let y = 0; y < 20; y++) {
        const row = [];
        for (let x = 0; x < 20; x++) {
          if (x === 0 || x === 19) {
            row.push(1);
          } else if (y === 0 && x !== 7) {
            row.push(1);
          } else if (y === 19 && x !== 7) {
            row.push(1);
          } else if (x >= 3 && x <= 5 && y >= 8 && y <= 12) {
            row.push(1); // water is impassable
          } else {
            row.push(0);
          }
        }
        m.push(row);
      }
      return m;
    })(),
    objects: [
      { type: 'tree', x: 2, y: 3, w: 1, h: 1 },
      { type: 'tree', x: 1, y: 6, w: 1, h: 1 },
      { type: 'tree', x: 12, y: 4, w: 1, h: 1 },
      { type: 'tree', x: 15, y: 7, w: 1, h: 1 },
      { type: 'tree', x: 10, y: 14, w: 1, h: 1 },
      { type: 'tree', x: 16, y: 16, w: 1, h: 1 },
      { type: 'signpost', x: 9, y: 2, w: 1, h: 1 },
    ],
    exits: [
      { x: 7, y: 0, targetMap: 'town_01', targetX: 7, targetY: 13 },
      { x: 7, y: 19, targetMap: 'town_02', targetX: 7, targetY: 1 },
    ],
  },

  town_02: {
    // 20x15 second town
    tilemap: (() => {
      const m = [];
      for (let y = 0; y < 15; y++) {
        const row = [];
        for (let x = 0; x < 20; x++) {
          if (x === 0 || x === 19 || y === 14) {
            row.push(TILE.WALL);
          } else if (y === 0) {
            row.push(x === 7 ? TILE.EXIT : TILE.WALL);
          } else if (x >= 6 && x <= 8) {
            row.push(TILE.DIRT);
          } else if (x >= 10 && x <= 14 && y >= 2 && y <= 6) {
            row.push(TILE.STONE);
          } else {
            row.push(TILE.GRASS);
          }
        }
        m.push(row);
      }
      return m;
    })(),
    collisionMap: (() => {
      const m = [];
      for (let y = 0; y < 15; y++) {
        const row = [];
        for (let x = 0; x < 20; x++) {
          if (x === 0 || x === 19 || y === 14) {
            row.push(1);
          } else if (y === 0 && x !== 7) {
            row.push(1);
          } else {
            row.push(0);
          }
        }
        m.push(row);
      }
      return m;
    })(),
    objects: [
      { type: 'house', x: 10, y: 2, w: 3, h: 3 },
      { type: 'house', x: 2, y: 8, w: 3, h: 3 },
      { type: 'tree', x: 15, y: 9, w: 1, h: 1 },
      { type: 'tree', x: 17, y: 4, w: 1, h: 1 },
      { type: 'fence', x: 10, y: 7, w: 1, h: 1 },
      { type: 'fence', x: 11, y: 7, w: 1, h: 1 },
      { type: 'fence', x: 12, y: 7, w: 1, h: 1 },
      { type: 'fence', x: 13, y: 7, w: 1, h: 1 },
      { type: 'fence', x: 14, y: 7, w: 1, h: 1 },
      { type: 'signpost', x: 5, y: 4, w: 1, h: 1 },
    ],
    exits: [
      { x: 7, y: 0, targetMap: 'route_01', targetX: 7, targetY: 18 },
    ],
  },
};
