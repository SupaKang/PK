/**
 * generate-tilemaps.mjs
 * Generates tilemap JSON files for Chapter 1 locations of Pocket Kingdom.
 */

import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const OUT_DIR = join(import.meta.dirname, '..', 'public', 'data', 'tilemaps');
mkdirSync(OUT_DIR, { recursive: true });

// Tile IDs
const T = {
  EMPTY: 0, GRASS: 1, DIRT: 2, WATER: 3, STONE: 4, WOOD: 5, WALL: 6,
  TREE: 7, BUSH: 8, FLOWER: 9, SAND: 10, ICE: 11, LAVA: 12, ROOF: 13,
  DOOR: 14, FENCE: 15, BRIDGE: 16, GYM_FLOOR: 17, DARK_STONE: 18,
  CARPET: 19, BOOKSHELF: 20
};

// Helper: create a flat array filled with a value
function fill(w, h, val) { return new Array(w * h).fill(val); }

// Helper: set tile at (x,y) in a flat array of width w
function set(arr, w, x, y, val) { arr[y * w + x] = val; }
function get(arr, w, x, y) { return arr[y * w + x]; }

// Helper: fill a rectangle
function rect(arr, w, x1, y1, x2, y2, val) {
  for (let y = y1; y <= y2; y++)
    for (let x = x1; x <= x2; x++)
      set(arr, w, x, y, val);
}

// Helper: draw rectangle outline
function rectOutline(arr, w, x1, y1, x2, y2, val) {
  for (let x = x1; x <= x2; x++) { set(arr, w, x, y1, val); set(arr, w, x, y2, val); }
  for (let y = y1; y <= y2; y++) { set(arr, w, x1, y, val); set(arr, w, x2, y, val); }
}

// ============================================================
// 1. town_01.json — 시작의 마을 (30x20)
// ============================================================
function generateTown01() {
  const W = 30, H = 20;
  const ground = fill(W, H, T.GRASS);
  const objects = fill(W, H, T.EMPTY);
  const collision = fill(W, H, 0);

  // Dirt paths — horizontal main road
  for (let x = 0; x < W; x++) {
    set(ground, W, x, 10, T.DIRT);
    set(ground, W, x, 11, T.DIRT);
  }
  // Vertical path from center-bottom to main road
  for (let y = 10; y < H; y++) {
    set(ground, W, 15, y, T.DIRT);
    set(ground, W, 14, y, T.DIRT);
  }
  // Path branching north from main road
  for (let y = 4; y <= 10; y++) {
    set(ground, W, 8, y, T.DIRT);
    set(ground, W, 22, y, T.DIRT);
  }

  // --- Building helper ---
  function placeBuilding(bx, by, bw, bh, doorOffX) {
    // Roof row (top)
    for (let x = bx; x < bx + bw; x++) {
      set(objects, W, x, by, T.ROOF);
      set(collision, W, x, by, 1);
    }
    // Walls
    for (let y = by + 1; y < by + bh; y++) {
      for (let x = bx; x < bx + bw; x++) {
        set(objects, W, x, y, T.WALL);
        set(collision, W, x, y, 1);
      }
    }
    // Door
    const dx = bx + doorOffX;
    const dy = by + bh - 1;
    set(objects, W, dx, dy, T.DOOR);
    set(collision, W, dx, dy, 0);
  }

  // Building 1 — House top-left (5x3)
  placeBuilding(3, 3, 5, 3, 2);
  // Building 2 — Shop (5x3)
  placeBuilding(10, 3, 5, 3, 2);
  // Building 3 — Healing house (5x3)
  placeBuilding(19, 3, 5, 3, 2);
  // Building 4 — House bottom-right (4x3)
  placeBuilding(22, 13, 4, 3, 1);

  // Fences around garden areas (below houses)
  // Garden left of shop
  for (let x = 3; x <= 7; x++) { set(objects, W, x, 7, T.FENCE); set(collision, W, x, 7, 1); }
  for (let y = 7; y <= 9; y++) { set(objects, W, 3, y, T.FENCE); set(collision, W, 3, y, 1); set(objects, W, 7, y, T.FENCE); set(collision, W, 7, y, 1); }
  // Flowers inside garden
  set(objects, W, 4, 8, T.FLOWER); set(objects, W, 5, 8, T.FLOWER); set(objects, W, 6, 8, T.FLOWER);

  // Trees around edges
  const treePositions = [
    [0,0],[1,0],[2,0],[0,1],[0,2],
    [27,0],[28,0],[29,0],[29,1],[29,2],
    [0,17],[0,18],[0,19],[1,19],[2,19],
    [27,19],[28,19],[29,19],[29,17],[29,18],
    [0,5],[0,8],[0,12],[0,15],
    [29,5],[29,8],[29,12],[29,15],
    [5,19],[10,19],[20,19],[25,19],
    [3,0],[10,0],[18,0],[25,0],
  ];
  for (const [tx, ty] of treePositions) {
    set(objects, W, tx, ty, T.TREE);
    set(collision, W, tx, ty, 1);
  }

  // Bushes
  const bushPositions = [[1,1],[28,1],[1,18],[28,18],[6,18],[11,18],[17,0],[26,0],[9,13],[16,13]];
  for (const [bx, by] of bushPositions) {
    set(objects, W, bx, by, T.BUSH);
    set(collision, W, bx, by, 1);
  }

  // Exit EAST at x=29 — make a walkable gap
  for (let y = 9; y <= 12; y++) {
    set(objects, W, 29, y, T.EMPTY);
    set(collision, W, 29, y, 0);
  }

  const npcs = [
    { id: "town01_shop", x: 12, y: 5, name: "상인 복돌", sprite: "shopkeeper", type: "shop", dialog: "어서오세요! 필요한 물건을 골라보세요." },
    { id: "town01_heal", x: 21, y: 5, name: "치유사 은혜", sprite: "healer", type: "heal", dialog: "몬스터들을 치료해 드릴게요. 잠시만요..." },
    { id: "town01_citizen1", x: 15, y: 14, name: "마을 주민", sprite: "citizen", type: "dialog", dialog: "이 마을은 참 평화롭지. 동쪽으로 가면 1번 도로가 나온다네." },
    { id: "town01_citizen2", x: 6, y: 10, name: "소녀 하늘", sprite: "citizen", type: "dialog", dialog: "화염도시에는 체육관이 있대! 도전해 봐!" },
    { id: "town01_citizen3", x: 25, y: 10, name: "노인 장수", sprite: "citizen", type: "dialog", dialog: "몬스터를 잘 키우면 훌륭한 트레이너가 될 수 있단다." },
  ];

  const exits = [
    { x: 29, y: 10, to: "route_01", spawnX: 1, spawnY: 7 },
    { x: 29, y: 11, to: "route_01", spawnX: 1, spawnY: 8 },
  ];

  return {
    width: W, height: H, tileSize: 16, tileset: "town",
    layers: { ground, objects, collision },
    npcs, exits,
    playerSpawn: { x: 15, y: 18 }
  };
}

// ============================================================
// 2. route_01.json — 1번 도로 (40x15)
// ============================================================
function generateRoute01() {
  const W = 40, H = 15;
  const ground = fill(W, H, T.GRASS);
  const objects = fill(W, H, T.EMPTY);
  const collision = fill(W, H, 0);

  // Winding dirt path across the route
  // Path generally goes from left to right, meandering vertically
  const pathY = [7, 7, 7, 7, 7, 6, 6, 6, 5, 5, 5, 5, 6, 6, 7, 7, 8, 8, 8, 9, 9, 9, 8, 8, 7, 7, 7, 6, 6, 6, 6, 7, 7, 8, 8, 8, 7, 7, 7, 7];
  for (let x = 0; x < W; x++) {
    const cy = pathY[x];
    set(ground, W, x, cy, T.DIRT);
    set(ground, W, x, cy - 1, T.DIRT);
    set(ground, W, x, cy + 1, T.DIRT);
  }

  // Tall grass patches (encounter zones) — use GRASS tile ID 1 in ground, but mark with
  // a special objects layer approach. Actually, tall grass is ground=1 and we mark encounter
  // zones by regions. We'll leave ground as GRASS (1) in those patches and the game uses
  // encounter rate from maps.json. Just make them visually distinct patches.
  // Patch 1: left area
  for (let y = 2; y <= 5; y++)
    for (let x = 5; x <= 12; x++)
      set(ground, W, x, y, T.GRASS); // already grass, encounters come from maps.json

  // Patch 2: middle area
  for (let y = 9; y <= 12; y++)
    for (let x = 16; x <= 24; x++)
      set(ground, W, x, y, T.GRASS);

  // Patch 3: right area
  for (let y = 2; y <= 5; y++)
    for (let x = 28; x <= 35; x++)
      set(ground, W, x, y, T.GRASS);

  // Trees scattered
  const trees = [
    [0,0],[1,0],[2,0],[0,1],[0,14],[1,14],[2,14],[0,13],
    [37,0],[38,0],[39,0],[39,1],[39,14],[38,14],[37,14],[39,13],
    [14,0],[15,0],[14,1],
    [25,14],[26,14],[25,13],
    [4,13],[4,14],[35,0],[36,0],
    [20,0],[21,0],[20,1],
    [30,13],[31,14],[31,13],
  ];
  for (const [tx, ty] of trees) {
    set(objects, W, tx, ty, T.TREE);
    set(collision, W, tx, ty, 1);
  }

  // Bushes
  const bushes = [[3,0],[3,14],[36,14],[36,0],[15,13],[14,14],[26,0],[27,0]];
  for (const [bx, by] of bushes) {
    set(objects, W, bx, by, T.BUSH);
    set(collision, W, bx, by, 1);
  }

  // Exits — WEST and EAST edges, make walkable
  for (let y = 6; y <= 9; y++) {
    set(collision, W, 0, y, 0);
    set(collision, W, 39, y, 0);
    set(objects, W, 0, y, T.EMPTY);
    set(objects, W, 39, y, T.EMPTY);
  }

  const npcs = [
    { id: "route01_trainer1", x: 10, y: 7, name: "훈련생 민수", sprite: "trainer", type: "trainer", trainerId: "trainer_r1_1", dialog: "내 몬스터가 얼마나 강한지 보여줄게!" },
    { id: "route01_trainer2", x: 30, y: 8, name: "훈련생 수지", sprite: "trainer", type: "trainer", trainerId: "trainer_r1_2", dialog: "트레이너라면 승부를 피할 수 없지!" },
  ];

  const exits = [
    { x: 0, y: 7, to: "town_01", spawnX: 28, spawnY: 10 },
    { x: 0, y: 8, to: "town_01", spawnX: 28, spawnY: 11 },
    { x: 39, y: 7, to: "town_02", spawnX: 1, spawnY: 10 },
    { x: 39, y: 8, to: "town_02", spawnX: 1, spawnY: 11 },
  ];

  return {
    width: W, height: H, tileSize: 16, tileset: "route",
    layers: { ground, objects, collision },
    npcs, exits,
    playerSpawn: { x: 1, y: 7 }
  };
}

// ============================================================
// 3. town_02.json — 화염촌 (30x20)
// ============================================================
function generateTown02() {
  const W = 30, H = 20;
  const ground = fill(W, H, T.STONE);  // stone/dirt ground for fire theme
  const objects = fill(W, H, T.EMPTY);
  const collision = fill(W, H, 0);

  // Dirt paths
  for (let x = 0; x < W; x++) {
    set(ground, W, x, 10, T.DIRT);
    set(ground, W, x, 11, T.DIRT);
  }
  // Vertical path to gym
  for (let y = 0; y < 12; y++) {
    set(ground, W, 14, y, T.DIRT);
    set(ground, W, 15, y, T.DIRT);
  }
  // Some warm sand patches
  for (let y = 14; y <= 17; y++)
    for (let x = 10; x <= 20; x++)
      set(ground, W, x, y, T.SAND);

  // --- Buildings ---
  function placeBuilding(bx, by, bw, bh, doorOffX, roofTile = T.ROOF) {
    for (let x = bx; x < bx + bw; x++) {
      set(objects, W, x, by, roofTile);
      set(collision, W, x, by, 1);
    }
    for (let y = by + 1; y < by + bh; y++) {
      for (let x = bx; x < bx + bw; x++) {
        set(objects, W, x, y, T.WALL);
        set(collision, W, x, y, 1);
      }
    }
    const dx = bx + doorOffX;
    const dy = by + bh - 1;
    set(objects, W, dx, dy, T.DOOR);
    set(collision, W, dx, dy, 0);
  }

  // Shop building (left side)
  placeBuilding(3, 5, 5, 3, 2);
  // Healing house (right side)
  placeBuilding(22, 5, 5, 3, 2);
  // House bottom-left
  placeBuilding(3, 14, 4, 3, 1);
  // Gym entrance — large building on north side
  placeBuilding(12, 1, 6, 3, 2);

  // Volcanic rocks (dark stone objects)
  const rocks = [
    [0,0],[1,0],[2,0],[27,0],[28,0],[29,0],
    [0,19],[1,19],[29,19],[28,19],
    [7,15],[8,16],[25,14],[26,15],
    [0,5],[0,10],[0,15],[29,5],[29,10],[29,15],
  ];
  for (const [rx, ry] of rocks) {
    set(objects, W, rx, ry, T.DARK_STONE);
    set(collision, W, rx, ry, 1);
  }

  // Lava decorative pools (not walkable)
  for (let x = 2; x <= 4; x++) {
    set(ground, W, x, 19, T.LAVA);
    set(collision, W, x, 19, 1);
  }
  for (let x = 25; x <= 27; x++) {
    set(ground, W, x, 19, T.LAVA);
    set(collision, W, x, 19, 1);
  }

  // Trees (fewer, fire theme)
  const trees = [[0,1],[0,2],[29,1],[29,2],[0,18],[29,18],[10,18],[20,18]];
  for (const [tx, ty] of trees) {
    set(objects, W, tx, ty, T.TREE);
    set(collision, W, tx, ty, 1);
  }

  // Exit WEST
  for (let y = 9; y <= 12; y++) {
    set(objects, W, 0, y, T.EMPTY);
    set(collision, W, 0, y, 0);
  }

  const npcs = [
    { id: "town02_shop", x: 5, y: 7, name: "상인 화백", sprite: "shopkeeper", type: "shop", dialog: "화염도시 상점에 오신 것을 환영합니다!" },
    { id: "town02_heal", x: 24, y: 7, name: "치유사 온기", sprite: "healer", type: "heal", dialog: "몬스터들을 치료해 드릴게요. 편히 쉬세요." },
    { id: "town02_citizen1", x: 15, y: 14, name: "주민 화랑", sprite: "citizen", type: "dialog", dialog: "체육관 관장은 화염 타입을 쓴다네. 물 타입 몬스터가 있으면 유리할 거야!" },
    { id: "town02_citizen2", x: 8, y: 10, name: "소년 불꽃", sprite: "citizen", type: "dialog", dialog: "이 마을은 화산 옆에 있어서 항상 따뜻해." },
  ];

  const exits = [
    { x: 0, y: 10, to: "route_01", spawnX: 38, spawnY: 7 },
    { x: 0, y: 11, to: "route_01", spawnX: 38, spawnY: 8 },
    // Gym entrance door
    { x: 14, y: 3, to: "gym_01", spawnX: 9, spawnY: 13 },
  ];

  return {
    width: W, height: H, tileSize: 16, tileset: "fire_town",
    layers: { ground, objects, collision },
    npcs, exits,
    playerSpawn: { x: 1, y: 10 }
  };
}

// ============================================================
// 4. gym_01.json — 화염 체육관 (20x15)
// ============================================================
function generateGym01() {
  const W = 20, H = 15;
  const ground = fill(W, H, T.GYM_FLOOR);
  const objects = fill(W, H, T.EMPTY);
  const collision = fill(W, H, 0);

  // Walls around edges
  for (let x = 0; x < W; x++) {
    set(objects, W, x, 0, T.WALL); set(collision, W, x, 0, 1);
    set(objects, W, x, 14, T.WALL); set(collision, W, x, 14, 1);
  }
  for (let y = 0; y < H; y++) {
    set(objects, W, 0, y, T.WALL); set(collision, W, 0, y, 1);
    set(objects, W, 19, y, T.WALL); set(collision, W, 19, y, 1);
  }

  // Exit door at south wall center
  set(objects, W, 9, 14, T.DOOR); set(collision, W, 9, 14, 0);
  set(objects, W, 10, 14, T.DOOR); set(collision, W, 10, 14, 0);

  // Carpet path from door to leader
  for (let y = 2; y <= 13; y++) {
    set(ground, W, 9, y, T.CARPET);
    set(ground, W, 10, y, T.CARPET);
  }
  // Horizontal carpet at leader platform
  for (let x = 7; x <= 12; x++) {
    set(ground, W, x, 2, T.CARPET);
    set(ground, W, x, 3, T.CARPET);
  }

  // Lava decorative tiles on left and right sides
  for (let y = 2; y <= 12; y++) {
    set(ground, W, 1, y, T.LAVA); set(collision, W, 1, y, 1);
    set(ground, W, 2, y, T.LAVA); set(collision, W, 2, y, 1);
    set(ground, W, 17, y, T.LAVA); set(collision, W, 17, y, 1);
    set(ground, W, 18, y, T.LAVA); set(collision, W, 18, y, 1);
  }

  // Bookshelves along inner walls
  for (let x = 3; x <= 6; x++) {
    set(objects, W, x, 1, T.BOOKSHELF); set(collision, W, x, 1, 1);
  }
  for (let x = 13; x <= 16; x++) {
    set(objects, W, x, 1, T.BOOKSHELF); set(collision, W, x, 1, 1);
  }

  // Decorative stone pillars
  const pillars = [[4, 4], [15, 4], [4, 10], [15, 10]];
  for (const [px, py] of pillars) {
    set(objects, W, px, py, T.DARK_STONE);
    set(collision, W, px, py, 1);
  }

  const npcs = [
    { id: "gym01_trainer1", x: 8, y: 8, name: "화염훈련생 강호", sprite: "trainer", type: "trainer", trainerId: "gym1_t1", dialog: "관장님에게 도전하려면 먼저 나를 이겨야 해!" },
    { id: "gym01_trainer2", x: 11, y: 5, name: "화염훈련생 미라", sprite: "trainer", type: "trainer", trainerId: "gym1_t2", dialog: "화염의 힘을 보여줄게!" },
    { id: "gym01_leader", x: 9, y: 2, name: "관장 불꽃", sprite: "gym_leader", type: "gym_leader", trainerId: "gym_leader_01", dialog: "화염 체육관에 온 것을 환영한다! 나의 불꽃을 꺼뜨릴 수 있겠나?" },
  ];

  const exits = [
    { x: 9, y: 14, to: "town_02", spawnX: 14, spawnY: 4 },
    { x: 10, y: 14, to: "town_02", spawnX: 15, spawnY: 4 },
  ];

  return {
    width: W, height: H, tileSize: 16, tileset: "gym_fire",
    layers: { ground, objects, collision },
    npcs, exits,
    playerSpawn: { x: 9, y: 13 }
  };
}

// ============================================================
// Validation
// ============================================================
function validate(name, map) {
  const { width: W, height: H, layers, npcs, exits, playerSpawn } = map;
  const errors = [];

  // Check ground has no zeros
  const zeroGround = layers.ground.filter(v => v === 0).length;
  if (zeroGround > 0) errors.push(`Ground layer has ${zeroGround} empty (0) tiles`);

  // Check array lengths
  for (const [lname, arr] of Object.entries(layers)) {
    if (arr.length !== W * H) errors.push(`${lname} layer length ${arr.length} !== ${W}*${H}=${W * H}`);
  }

  // Check NPC positions are walkable
  for (const npc of npcs) {
    const col = layers.collision[npc.y * W + npc.x];
    if (col !== 0) errors.push(`NPC "${npc.id}" at (${npc.x},${npc.y}) is on blocked tile`);
  }

  // Check exits are on walkable edge tiles
  for (const exit of exits) {
    const col = layers.collision[exit.y * W + exit.x];
    if (col !== 0) errors.push(`Exit to "${exit.to}" at (${exit.x},${exit.y}) is on blocked tile`);
  }

  // Check player spawn is walkable
  {
    const col = layers.collision[playerSpawn.y * W + playerSpawn.x];
    if (col !== 0) errors.push(`Player spawn at (${playerSpawn.x},${playerSpawn.y}) is on blocked tile`);
  }

  return errors;
}

// ============================================================
// Main
// ============================================================
const maps = {
  'town_01.json': generateTown01(),
  'route_01.json': generateRoute01(),
  'town_02.json': generateTown02(),
  'gym_01.json': generateGym01(),
};

let allValid = true;
for (const [filename, data] of Object.entries(maps)) {
  const errors = validate(filename, data);
  if (errors.length > 0) {
    console.error(`[ERRORS] ${filename}:`);
    errors.forEach(e => console.error(`  - ${e}`));
    allValid = false;
  }

  const path = join(OUT_DIR, filename);
  writeFileSync(path, JSON.stringify(data, null, 2), 'utf-8');
  console.log(`[OK] ${filename} — ${data.width}x${data.height} tiles, ${data.npcs.length} NPCs, ${data.exits.length} exits`);
}

console.log('');
if (allValid) {
  console.log('All tilemaps generated and validated successfully.');
} else {
  console.log('Some tilemaps have validation errors (see above).');
}
console.log(`Output directory: ${OUT_DIR}`);
