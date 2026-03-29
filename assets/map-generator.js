/**
 * map-generator.js v2 — WFC + Biome-Aware Town Generator
 * Each town has unique buildings, vegetation, and decorations matching its theme.
 */

// ============================================================
// WFC CORE
// ============================================================
class WFC {
  constructor(width, height, tiles) {
    this.width = width;
    this.height = height;
    this.tiles = tiles;
    this.numTiles = tiles.length;
    this.adjacency = this._buildAdjacency();
    this.grid = [];
    this.reset();
  }

  reset() {
    this.grid = [];
    for (let i = 0; i < this.width * this.height; i++) {
      this.grid.push(new Set(this.tiles.map((_, i) => i)));
    }
  }

  _buildAdjacency() {
    const adj = { east: [], west: [], south: [], north: [] };
    for (let a = 0; a < this.numTiles; a++) {
      adj.east[a] = []; adj.west[a] = []; adj.south[a] = []; adj.north[a] = [];
      for (let b = 0; b < this.numTiles; b++) {
        const ta = this.tiles[a].corners, tb = this.tiles[b].corners;
        if (ta.NE === tb.NW && ta.SE === tb.SW) adj.east[a].push(b);
        if (ta.NW === tb.NE && ta.SW === tb.SE) adj.west[a].push(b);
        if (ta.SW === tb.NW && ta.SE === tb.NE) adj.south[a].push(b);
        if (ta.NW === tb.SW && ta.NE === tb.SE) adj.north[a].push(b);
      }
    }
    return adj;
  }

  constrain(x, y, allowedIndices) {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return true;
    const cell = this.grid[y * this.width + x];
    for (const t of [...cell]) { if (!allowedIndices.includes(t)) cell.delete(t); }
    return cell.size > 0;
  }

  solve(maxIter = 80000) {
    for (let iter = 0; iter < maxIter; iter++) {
      let minE = Infinity, minIdx = -1;
      for (let i = 0; i < this.grid.length; i++) {
        const e = this.grid[i].size;
        if (e <= 1) continue;
        if (e + Math.random() * 0.1 < minE) { minE = e + Math.random() * 0.1; minIdx = i; }
      }
      if (minIdx === -1) return true;
      const cell = this.grid[minIdx];
      const opts = [...cell];
      const ws = opts.map(i => this.tiles[i].weight || 1);
      const tw = ws.reduce((a, b) => a + b, 0);
      let r = Math.random() * tw, chosen = opts[0];
      for (let i = 0; i < opts.length; i++) { r -= ws[i]; if (r <= 0) { chosen = opts[i]; break; } }
      cell.clear(); cell.add(chosen);
      if (!this._propagate(minIdx)) return false;
    }
    return false;
  }

  _propagate(startIdx) {
    const stack = [startIdx];
    const dirs = [
      { dx: 1, dy: 0, dir: 'east' }, { dx: -1, dy: 0, dir: 'west' },
      { dx: 0, dy: 1, dir: 'south' }, { dx: 0, dy: -1, dir: 'north' },
    ];
    while (stack.length > 0) {
      const idx = stack.pop();
      const x = idx % this.width, y = Math.floor(idx / this.width);
      const cell = this.grid[idx];
      for (const { dx, dy, dir } of dirs) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || nx >= this.width || ny < 0 || ny >= this.height) continue;
        const nIdx = ny * this.width + nx;
        const neighbor = this.grid[nIdx];
        const prev = neighbor.size;
        const allowed = new Set();
        for (const t of cell) for (const c of this.adjacency[dir][t]) allowed.add(c);
        for (const t of [...neighbor]) { if (!allowed.has(t)) neighbor.delete(t); }
        if (neighbor.size === 0) return false;
        if (neighbor.size < prev) stack.push(nIdx);
      }
    }
    return true;
  }

  getTile(x, y) {
    const cell = this.grid[y * this.width + x];
    return cell.size === 1 ? [...cell][0] : -1;
  }
}

// ============================================================
// TOWN BIOME DEFINITIONS
// ============================================================
const TOWN_BIOMES = {
  town_01: {
    name: '시작의 마을', tileset: 'T09_cobblestone_grass',
    description: '평화로운 작은 마을',
    palette: { road: '#B8A070', roofMain: '#CC6633', roofAlt: '#8855AA', wall: '#D4C4A0', wallAlt: '#C8B890', door: '#553322', window: '#446688' },
    buildings: [
      { type: 'house', label: '할아버지 집', w: 4, h: 3, roof: '#CC6633', required: true },
      { type: 'shop', label: '상점', w: 4, h: 3, roof: '#8855AA', required: true },
      { type: 'heal', label: '치유소', w: 4, h: 3, roof: '#CC4466', required: true },
      { type: 'house', label: '주민 집', w: 3, h: 3, roof: '#BB7744' },
      { type: 'house', label: '주민 집', w: 3, h: 3, roof: '#AA8855' },
    ],
    vegetation: { type: 'oak', color: '#4A8C3F', trunkColor: '#6B4226', density: 0.06 },
    decorations: [
      { type: 'well', count: 1, icon: 'O', color: '#888' },
      { type: 'flowers', count: 3, icon: '*', color: '#E88' },
      { type: 'sign', count: 2, icon: '!', color: '#DA2' },
    ],
    exits: [{ side: 'east', pos: 0.5 }],
  },
  town_02: {
    name: '화염도시', tileset: 'T07_volcanic_lava',
    description: '화산 근처에 세워진 뜨거운 도시',
    palette: { road: '#8B6B47', roofMain: '#991100', roofAlt: '#CC4400', wall: '#554444', wallAlt: '#665544', door: '#331111', window: '#FF6600' },
    buildings: [
      { type: 'gym', label: '화염 수호자 전당', w: 5, h: 4, roof: '#DD2200', required: true },
      { type: 'shop', label: '상점', w: 4, h: 3, roof: '#993300', required: true },
      { type: 'heal', label: '치유소', w: 4, h: 3, roof: '#CC4466', required: true },
      { type: 'house', label: '대장간', w: 4, h: 3, roof: '#882200' },
      { type: 'house', label: '주민 집', w: 3, h: 3, roof: '#773311' },
      { type: 'house', label: '주민 집', w: 3, h: 3, roof: '#884422' },
    ],
    vegetation: { type: 'dead_tree', color: '#554433', trunkColor: '#332211', density: 0.02 },
    decorations: [
      { type: 'lava_vent', count: 4, icon: '~', color: '#F60' },
      { type: 'torch', count: 3, icon: 'T', color: '#FA0' },
      { type: 'rock', count: 5, icon: '.', color: '#555' },
    ],
    exits: [{ side: 'west', pos: 0.4 }, { side: 'east', pos: 0.6 }],
  },
  town_03: {
    name: '해류항', tileset: 'T03_ocean_beach',
    description: '큰 항구가 있는 바닷가 마을',
    palette: { road: '#D4C494', roofMain: '#4488AA', roofAlt: '#EEEECC', wall: '#E8DCC0', wallAlt: '#DDD0B0', door: '#664422', window: '#88BBDD' },
    buildings: [
      { type: 'gym', label: '해류 수호자 전당', w: 5, h: 4, roof: '#2266AA', required: true },
      { type: 'shop', label: '상점', w: 4, h: 3, roof: '#55AACC', required: true },
      { type: 'heal', label: '치유소', w: 4, h: 3, roof: '#CC4466', required: true },
      { type: 'house', label: '어부의 집', w: 3, h: 3, roof: '#5599BB' },
      { type: 'house', label: '선장의 집', w: 4, h: 3, roof: '#4488AA' },
      { type: 'house', label: '주민 집', w: 3, h: 3, roof: '#6699AA' },
    ],
    vegetation: { type: 'palm', color: '#66AA44', trunkColor: '#AA8844', density: 0.04 },
    decorations: [
      { type: 'boat', count: 2, icon: 'B', color: '#864' },
      { type: 'lighthouse', count: 1, icon: 'L', color: '#FFF' },
      { type: 'anchor', count: 2, icon: 'A', color: '#888' },
      { type: 'barrel', count: 3, icon: 'o', color: '#975' },
    ],
    exits: [{ side: 'west', pos: 0.5 }, { side: 'north', pos: 0.7 }],
  },
  town_04: {
    name: '전격시티', tileset: 'T09_cobblestone_grass',
    description: '첨단 기술의 도시',
    palette: { road: '#909090', roofMain: '#4466AA', roofAlt: '#CCCC44', wall: '#BBBBCC', wallAlt: '#AAAABB', door: '#334455', window: '#FFDD44' },
    buildings: [
      { type: 'gym', label: '전격 수호자 전당', w: 5, h: 4, roof: '#3355CC', required: true },
      { type: 'shop', label: '테크 상점', w: 4, h: 3, roof: '#556699', required: true },
      { type: 'heal', label: '치유소', w: 4, h: 3, roof: '#CC4466', required: true },
      { type: 'house', label: '연구소', w: 5, h: 3, roof: '#4477AA' },
      { type: 'house', label: '주민 집', w: 3, h: 3, roof: '#5566AA' },
      { type: 'house', label: '주민 집', w: 3, h: 3, roof: '#667788' },
    ],
    vegetation: { type: 'trimmed', color: '#558844', trunkColor: '#665533', density: 0.03 },
    decorations: [
      { type: 'antenna', count: 3, icon: 'Y', color: '#AAA' },
      { type: 'lamp', count: 4, icon: 'i', color: '#FF0' },
      { type: 'bench', count: 2, icon: '=', color: '#876' },
    ],
    exits: [{ side: 'west', pos: 0.5 }, { side: 'east', pos: 0.5 }],
  },
  town_05: {
    name: '자연마을', tileset: 'T05_forest_grass',
    description: '숲에 둘러싸인 평화로운 마을',
    palette: { road: '#8B7B55', roofMain: '#557733', roofAlt: '#886644', wall: '#C8B078', wallAlt: '#BBA868', door: '#443322', window: '#88AA66' },
    buildings: [
      { type: 'gym', label: '자연 수호자 전당', w: 5, h: 4, roof: '#446622', required: true },
      { type: 'shop', label: '약초 상점', w: 4, h: 3, roof: '#668844', required: true },
      { type: 'heal', label: '치유소', w: 4, h: 3, roof: '#CC4466', required: true },
      { type: 'house', label: '나무 오두막', w: 3, h: 3, roof: '#775533' },
      { type: 'house', label: '나무 오두막', w: 3, h: 3, roof: '#886644' },
    ],
    vegetation: { type: 'big_tree', color: '#336622', trunkColor: '#5B3A18', density: 0.10 },
    decorations: [
      { type: 'mushroom', count: 4, icon: 'm', color: '#C66' },
      { type: 'vine', count: 3, icon: 'v', color: '#4A4' },
      { type: 'stump', count: 2, icon: 'u', color: '#864' },
    ],
    exits: [{ side: 'south', pos: 0.5 }, { side: 'north', pos: 0.5 }],
  },
  town_06: {
    name: '투지시티', tileset: 'T01_grass_dirt',
    description: '무술의 도시',
    palette: { road: '#B8A070', roofMain: '#AA4422', roofAlt: '#887766', wall: '#DDD0B0', wallAlt: '#CCBB99', door: '#442211', window: '#998877' },
    buildings: [
      { type: 'gym', label: '투지 수호자 전당', w: 6, h: 4, roof: '#882211', required: true },
      { type: 'shop', label: '무기 상점', w: 4, h: 3, roof: '#996644', required: true },
      { type: 'heal', label: '치유소', w: 4, h: 3, roof: '#CC4466', required: true },
      { type: 'house', label: '도장', w: 4, h: 3, roof: '#BB5533' },
      { type: 'house', label: '주민 집', w: 3, h: 3, roof: '#997755' },
      { type: 'house', label: '주민 집', w: 3, h: 3, roof: '#AA8866' },
    ],
    vegetation: { type: 'bamboo', color: '#558833', trunkColor: '#669944', density: 0.05 },
    decorations: [
      { type: 'training_post', count: 3, icon: '+', color: '#A86' },
      { type: 'lantern', count: 4, icon: 'o', color: '#FA0' },
      { type: 'banner', count: 2, icon: 'P', color: '#C44' },
    ],
    exits: [{ side: 'west', pos: 0.4 }, { side: 'east', pos: 0.6 }],
  },
  town_07: {
    name: '빙결마을', tileset: 'T06_snow_ice',
    description: '만년설이 덮인 산 위의 마을',
    palette: { road: '#AABBCC', roofMain: '#6688AA', roofAlt: '#BBCCDD', wall: '#DDEEFF', wallAlt: '#CCDDEE', door: '#445566', window: '#AADDFF' },
    buildings: [
      { type: 'gym', label: '빙결 수호자 전당', w: 5, h: 4, roof: '#4466AA', required: true },
      { type: 'shop', label: '상점', w: 4, h: 3, roof: '#5588AA', required: true },
      { type: 'heal', label: '치유소', w: 4, h: 3, roof: '#CC4466', required: true },
      { type: 'house', label: '이글루 주택', w: 3, h: 3, roof: '#99BBDD' },
      { type: 'house', label: '이글루 주택', w: 3, h: 3, roof: '#88AACC' },
    ],
    vegetation: { type: 'snow_pine', color: '#446666', trunkColor: '#554433', density: 0.04 },
    decorations: [
      { type: 'snowman', count: 2, icon: '8', color: '#FFF' },
      { type: 'ice_crystal', count: 3, icon: '*', color: '#ADF' },
      { type: 'frozen_lamp', count: 3, icon: 'i', color: '#8BF' },
    ],
    exits: [{ side: 'south', pos: 0.5 }, { side: 'north', pos: 0.5 }],
  },
  town_08: {
    name: '용린시티', tileset: 'T01_grass_dirt',
    description: '용의 전설이 내려오는 고대 도시',
    palette: { road: '#998866', roofMain: '#228866', roofAlt: '#886622', wall: '#CCBB99', wallAlt: '#BBAA88', door: '#443322', window: '#66AA88' },
    buildings: [
      { type: 'gym', label: '용린 수호자 전당', w: 6, h: 5, roof: '#116644', required: true },
      { type: 'shop', label: '고대 상점', w: 4, h: 3, roof: '#448866', required: true },
      { type: 'heal', label: '치유소', w: 4, h: 3, roof: '#CC4466', required: true },
      { type: 'house', label: '용의 사원', w: 5, h: 4, roof: '#336655' },
      { type: 'house', label: '주민 집', w: 3, h: 3, roof: '#557744' },
      { type: 'house', label: '주민 집', w: 3, h: 3, roof: '#668855' },
    ],
    vegetation: { type: 'ancient', color: '#335522', trunkColor: '#443322', density: 0.05 },
    decorations: [
      { type: 'dragon_statue', count: 2, icon: 'D', color: '#4A8' },
      { type: 'pagoda_lamp', count: 4, icon: 'Y', color: '#DA4' },
      { type: 'stone_tablet', count: 2, icon: '#', color: '#888' },
    ],
    exits: [{ side: 'west', pos: 0.5 }, { side: 'east', pos: 0.3 }],
  },
  town_09: {
    name: '암흑성채', tileset: 'T12_corrupted_obsidian',
    description: '어둠에 싸인 고대 성채',
    palette: { road: '#333344', roofMain: '#440033', roofAlt: '#330044', wall: '#222233', wallAlt: '#1A1A2A', door: '#110011', window: '#992266' },
    buildings: [
      { type: 'gym', label: '암흑 수호자 전당', w: 6, h: 5, roof: '#550033', required: true },
      { type: 'shop', label: '어둠 상점', w: 4, h: 3, roof: '#332244', required: true },
      { type: 'heal', label: '치유소', w: 4, h: 3, roof: '#663355', required: true },
      { type: 'house', label: '탑', w: 3, h: 4, roof: '#440044' },
      { type: 'house', label: '탑', w: 3, h: 4, roof: '#330033' },
    ],
    vegetation: { type: 'dead', color: '#333333', trunkColor: '#222222', density: 0.02 },
    decorations: [
      { type: 'dark_torch', count: 6, icon: 'T', color: '#A4F' },
      { type: 'gargoyle', count: 2, icon: 'G', color: '#555' },
      { type: 'magic_circle', count: 1, icon: '@', color: '#F4A' },
      { type: 'skull', count: 3, icon: 'x', color: '#AAA' },
    ],
    exits: [{ side: 'south', pos: 0.5 }],
  },
};

// ============================================================
// MAP GENERATOR v2 — Direct terrain painting (Wang autotiling handled by renderer)
// ============================================================
class MapGenerator {
  constructor() {}

  generateTown(w, h, biome) {
    // Start with all-lower (grass/natural)
    const terrain = Array(h).fill(null).map(() => Array(w).fill(0));

    // 1) Paint roads
    this._paintRoads(terrain, w, h, biome.exits);

    // 2) Place buildings
    const buildings = this._placeBuildings(terrain, w, h, biome.buildings);

    // 3) Connect buildings to roads
    this._connectBuildings(terrain, w, h, buildings);

    // 4) Place vegetation
    const trees = this._placeVegetation(w, h, terrain, buildings, biome.vegetation);

    // 5) Place decorations
    const decorations = this._placeDecorations(w, h, terrain, buildings, trees, biome.decorations);

    // 6) Collision map
    const collision = this._buildCollision(w, h, buildings, trees);

    return { width: w, height: h, terrain, buildings, trees, decorations, collision, biome, exits: biome.exits };
  }

  _paintRoads(terrain, w, h, exits) {
    const midX = Math.floor(w / 2);
    const midY = Math.floor(h / 2);

    // Main horizontal road (2 tiles wide)
    for (let x = 2; x < w - 2; x++) {
      terrain[midY][x] = 1;
      if (midY + 1 < h) terrain[midY + 1][x] = 1;
    }

    // Main vertical road (2 tiles wide)
    for (let y = 2; y < h - 2; y++) {
      terrain[y][midX] = 1;
      if (midX + 1 < w) terrain[y][midX + 1] = 1;
    }

    // Side roads
    const sideY1 = Math.max(3, Math.floor(h * 0.3));
    const sideY2 = Math.min(h - 4, Math.floor(h * 0.7));
    for (let x = Math.floor(w * 0.2); x < Math.floor(w * 0.8); x++) {
      terrain[sideY1][x] = 1;
      terrain[sideY2][x] = 1;
    }

    // Exit paths — connect to map edges
    for (const exit of exits) {
      const pos = this._exitPos(w, h, exit);
      let px = pos.x, py = pos.y;
      const tx = midX, ty = midY;

      while (px !== tx || py !== ty) {
        if (px >= 0 && px < w && py >= 0 && py < h) {
          terrain[py][px] = 1;
          // Make 2 wide
          if (exit.side === 'east' || exit.side === 'west') {
            if (py + 1 < h) terrain[py + 1][px] = 1;
          } else {
            if (px + 1 < w) terrain[py][px + 1] = 1;
          }
        }
        if (Math.abs(px - tx) > Math.abs(py - ty)) {
          px += px < tx ? 1 : -1;
        } else {
          py += py < ty ? 1 : -1;
        }
      }
    }
  }

  _placeBuildings(terrain, w, h, buildingDefs) {
    const midX = Math.floor(w / 2);
    const midY = Math.floor(h / 2);
    const buildings = [];
    const occupied = new Set();

    // Mark roads as occupied
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++)
        if (terrain[y][x] === 1) occupied.add(`${x},${y}`);

    const canPlace = (bx, by, bw, bh) => {
      if (bx < 1 || by < 1 || bx + bw >= w - 1 || by + bh >= h - 1) return false;
      for (let dy = -1; dy <= bh; dy++)
        for (let dx = -1; dx <= bw; dx++)
          if (occupied.has(`${bx + dx},${by + dy}`)) return false;
      return true;
    };

    const markOccupied = (bx, by, bw, bh) => {
      for (let dy = -1; dy <= bh; dy++)
        for (let dx = -1; dx <= bw; dx++)
          occupied.add(`${bx + dx},${by + dy}`);
    };

    // 4 quadrants around the crossroads
    const quads = [
      { x0: 2, y0: 2, x1: midX - 1, y1: midY - 1 },
      { x0: midX + 3, y0: 2, x1: w - 3, y1: midY - 1 },
      { x0: 2, y0: midY + 3, x1: midX - 1, y1: h - 3 },
      { x0: midX + 3, y0: midY + 3, x1: w - 3, y1: h - 3 },
    ];

    // Sort: required first
    const sorted = [...buildingDefs].sort((a, b) => (b.required ? 1 : 0) - (a.required ? 1 : 0));

    for (let bi = 0; bi < sorted.length; bi++) {
      const def = sorted[bi];
      let placed = false;

      // Try each quadrant, cycling through
      for (let qi = 0; qi < quads.length * 3 && !placed; qi++) {
        const q = quads[(bi + qi) % quads.length];
        const spaceW = q.x1 - q.x0 - def.w;
        const spaceH = q.y1 - q.y0 - def.h;
        if (spaceW <= 0 || spaceH <= 0) continue;

        for (let attempt = 0; attempt < 15 && !placed; attempt++) {
          const bx = q.x0 + Math.floor(Math.random() * spaceW);
          const by = q.y0 + Math.floor(Math.random() * spaceH);

          if (canPlace(bx, by, def.w, def.h)) {
            buildings.push({ x: bx, y: by, w: def.w, h: def.h, type: def.type, label: def.label, roof: def.roof });
            markOccupied(bx, by, def.w, def.h);

            // Paint building footprint as upper terrain
            for (let dy = 0; dy < def.h; dy++)
              for (let dx = 0; dx < def.w; dx++)
                terrain[by + dy][bx + dx] = 1;

            placed = true;
          }
        }
      }
    }

    return buildings;
  }

  _connectBuildings(terrain, w, h, buildings) {
    // Draw a road from each building's door to the nearest existing road
    for (const b of buildings) {
      const doorX = b.x + Math.floor(b.w / 2);
      const doorY = b.y + b.h;

      // Walk down/up/left/right until hitting a road
      for (let y = doorY; y < h - 1; y++) {
        if (terrain[y][doorX] === 1) break;
        terrain[y][doorX] = 1;
      }
      // Also try upward
      for (let y = b.y - 1; y > 0; y--) {
        if (terrain[y][doorX] === 1) break;
        terrain[y][doorX] = 1;
      }
    }
  }

  _placeVegetation(w, h, terrain, buildings, veg) {
    const trees = [];
    const isBuilding = (x, y) => buildings.some(b => x >= b.x - 1 && x <= b.x + b.w && y >= b.y - 1 && y <= b.y + b.h);

    for (let y = 2; y < h - 2; y++) {
      for (let x = 2; x < w - 2; x++) {
        if (terrain[y][x] === 1) continue; // Skip roads
        if (isBuilding(x, y)) continue;
        if (Math.random() < veg.density) {
          trees.push({ x, y, type: veg.type, color: veg.color, trunkColor: veg.trunkColor });
        }
      }
    }
    return trees;
  }

  _placeDecorations(w, h, terrain, buildings, trees, decoDefs) {
    const decos = [];
    const occupied = new Set();
    buildings.forEach(b => { for (let dy = -1; dy <= b.h; dy++) for (let dx = -1; dx <= b.w; dx++) occupied.add(`${b.x+dx},${b.y+dy}`); });
    trees.forEach(t => occupied.add(`${t.x},${t.y}`));

    for (const def of decoDefs) {
      let placed = 0;
      for (let attempt = 0; attempt < def.count * 30 && placed < def.count; attempt++) {
        const x = 2 + Math.floor(Math.random() * (w - 4));
        const y = 2 + Math.floor(Math.random() * (h - 4));
        if (occupied.has(`${x},${y}`)) continue;
        // Prefer placing near roads for some types
        const nearRoad = terrain[y]?.[x] === 1 || terrain[y]?.[x-1] === 1 || terrain[y]?.[x+1] === 1;
        if (['lamp', 'lantern', 'sign', 'torch', 'dark_torch', 'frozen_lamp', 'pagoda_lamp', 'bench'].includes(def.type) && !nearRoad) continue;

        decos.push({ x, y, type: def.type, icon: def.icon, color: def.color });
        occupied.add(`${x},${y}`);
        placed++;
      }
    }
    return decos;
  }

  _buildCollision(w, h, buildings, trees) {
    const col = Array(h).fill(null).map(() => Array(w).fill(0));
    for (const b of buildings) {
      for (let dy = 0; dy < b.h; dy++)
        for (let dx = 0; dx < b.w; dx++)
          if (b.y + dy < h && b.x + dx < w) col[b.y + dy][b.x + dx] = 1;
      // Door opening
      const doorX = b.x + Math.floor(b.w / 2);
      const doorY = b.y + b.h - 1;
      if (doorY < h && doorX < w) col[doorY][doorX] = 0;
    }
    for (const t of trees) {
      if (t.y < h && t.x < w) col[t.y][t.x] = 1;
    }
    return col;
  }

  _exitPos(w, h, exit) {
    const p = exit.pos || 0.5;
    switch (exit.side) {
      case 'north': return { x: Math.floor(w * p), y: 0 };
      case 'south': return { x: Math.floor(w * p), y: h - 1 };
      case 'east':  return { x: w - 1, y: Math.floor(h * p) };
      case 'west':  return { x: 0, y: Math.floor(h * p) };
      default: return { x: 0, y: 0 };
    }
  }
}

if (typeof module !== 'undefined') module.exports = { WFC, MapGenerator, TOWN_BIOMES };
