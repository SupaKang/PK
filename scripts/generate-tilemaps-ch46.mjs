/**
 * generate-tilemaps-ch46.mjs
 * Generates 6 tilemap JSON files for Chapter 4-6 story locations.
 *
 * Tile IDs:
 *   1=grass, 2=dirt, 3=water, 4=stone, 5=wood, 6=wall, 7=tree, 8=bush,
 *   9=grass_alt, 10=sand, 13=roof, 14=door, 15=dark_stone,
 *   17=gym_floor, 18=dark_stone, 19=carpet, 20=bookshelf
 */

import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";

const OUT_DIR = join(import.meta.dirname, "..", "public", "data", "tilemaps");
mkdirSync(OUT_DIR, { recursive: true });

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */
function fill(w, h, v) {
  return new Array(w * h).fill(v);
}

function set(arr, w, x, y, v) {
  arr[y * w + x] = v;
}

function get(arr, w, x, y) {
  return arr[y * w + x];
}

function rect(arr, w, x1, y1, x2, y2, v) {
  for (let y = y1; y <= y2; y++)
    for (let x = x1; x <= x2; x++) set(arr, w, x, y, v);
}

function hline(arr, w, x1, x2, y, v) {
  for (let x = x1; x <= x2; x++) set(arr, w, x, y, v);
}

function vline(arr, w, x, y1, y2, v) {
  for (let y = y1; y <= y2; y++) set(arr, w, x, y, v);
}

function save(name, data) {
  const path = join(OUT_DIR, name);
  writeFileSync(path, JSON.stringify(data), "utf-8");
  console.log(`  ✔ ${name}  (${data.width}×${data.height})`);
}

/* ================================================================== */
/*  1. gym_03.json — 전격 체육관 (12×10)                                */
/*  Electric gym. Yellow/gold gym_floor, metallic walls.               */
/*  2 trainers + gym leader. Exit south.                               */
/* ================================================================== */
function makeGym03() {
  const W = 12, H = 10;

  // Ground: gym_floor (17) everywhere, carpet (19) down center aisle
  const ground = fill(W, H, 17);
  // Central carpet aisle (columns 5-6)
  vline(ground, W, 5, 0, H - 1, 19);
  vline(ground, W, 6, 0, H - 1, 19);

  // Objects: walls around edges, interior open
  const objects = fill(W, H, 0);
  // Top wall
  hline(objects, W, 0, W - 1, 0, 6);
  // Bottom wall with exit gap at 5,6
  hline(objects, W, 0, 4, H - 1, 6);
  hline(objects, W, 7, W - 1, H - 1, 6);
  // Left and right walls
  vline(objects, W, 0, 0, H - 1, 6);
  vline(objects, W, W - 1, 0, H - 1, 6);
  // Bookshelves / decorations along top interior
  hline(objects, W, 1, 4, 1, 20);
  hline(objects, W, 7, 10, 1, 20);
  // Electric pillars (stone) at intervals
  set(objects, W, 3, 3, 4);
  set(objects, W, 8, 3, 4);
  set(objects, W, 3, 6, 4);
  set(objects, W, 8, 6, 4);

  // Collision: 1 where objects block
  const collision = fill(W, H, 0);
  for (let i = 0; i < W * H; i++) {
    if (objects[i] !== 0) collision[i] = 1;
  }

  return {
    width: W, height: H, tileSize: 64, tileset: "rpg_base",
    layers: { ground, objects, collision },
    npcs: [
      { id: "gym3_t1", x: 3, y: 5, name: "전격 훈련생 스파크", sprite: "trainer", type: "trainer", trainerId: "gym3_t1", dialog: "전기의 힘을 느껴봐!" },
      { id: "gym3_t2", x: 8, y: 5, name: "전격 훈련생 볼트", sprite: "trainer", type: "trainer", trainerId: "gym3_t2", dialog: "번개처럼 빠르게 쓰러뜨려주마!" },
      { id: "gym_leader_03", x: 5, y: 2, name: "번개장 라이트", sprite: "gym_leader", type: "gym_leader", trainerId: "gym_leader_03", dialog: "전격 체육관에 온 걸 환영한다! 번개의 시련을 이겨봐!" }
    ],
    exits: [
      { x: 5, y: 9, to: "town_04", spawnX: 7, spawnY: 1 },
      { x: 6, y: 9, to: "town_04", spawnX: 7, spawnY: 1 }
    ],
    playerSpawn: { x: 5, y: 8 },
    hiddenEvents: []
  };
}

/* ================================================================== */
/*  2. route_04.json — 4번 도로 (25×12)                                 */
/*  Forest route. Dense trees, narrow paths. 2 trainers + boss.        */
/*  Exits: west→town_04, east→forest_01.                               */
/* ================================================================== */
function makeRoute04() {
  const W = 25, H = 12;

  // Ground: grass with grass_alt patches
  const ground = fill(W, H, 1);
  // Grass alt patches
  rect(ground, W, 5, 2, 8, 4, 9);
  rect(ground, W, 14, 7, 17, 9, 9);
  rect(ground, W, 20, 2, 22, 3, 9);
  // Dirt path running roughly through center
  hline(ground, W, 0, W - 1, 5, 2);
  hline(ground, W, 0, W - 1, 6, 2);
  // Some vertical connectors
  vline(ground, W, 10, 3, 6, 2);
  vline(ground, W, 18, 5, 8, 2);

  // Objects: tree border top/bottom, dense interior trees
  const objects = fill(W, H, 0);
  // Top tree border
  hline(objects, W, 0, W - 1, 0, 7);
  // Bottom tree border
  hline(objects, W, 0, W - 1, H - 1, 7);
  // Scattered dense trees
  // Left cluster
  set(objects, W, 2, 2, 7); set(objects, W, 3, 3, 7); set(objects, W, 1, 4, 7);
  set(objects, W, 4, 2, 7); set(objects, W, 2, 8, 7); set(objects, W, 3, 9, 7);
  // Mid cluster
  set(objects, W, 8, 3, 7); set(objects, W, 9, 2, 7); set(objects, W, 9, 4, 7);
  set(objects, W, 11, 8, 7); set(objects, W, 12, 9, 7); set(objects, W, 10, 9, 7);
  // Right cluster
  set(objects, W, 15, 2, 7); set(objects, W, 16, 3, 7); set(objects, W, 17, 2, 7);
  set(objects, W, 20, 8, 7); set(objects, W, 21, 9, 7); set(objects, W, 22, 8, 7);
  // Bushes
  set(objects, W, 5, 8, 8); set(objects, W, 6, 3, 8); set(objects, W, 13, 3, 8);
  set(objects, W, 19, 3, 8); set(objects, W, 23, 4, 8);

  // Collision
  const collision = fill(W, H, 0);
  for (let i = 0; i < W * H; i++) {
    if (objects[i] !== 0) collision[i] = 1;
  }

  return {
    width: W, height: H, tileSize: 64, tileset: "rpg_base",
    layers: { ground, objects, collision },
    npcs: [
      { id: "trainer_r4_1", x: 7, y: 5, name: "숲의 탐험가 민호", sprite: "trainer", type: "trainer", trainerId: "route4_t1", dialog: "숲길을 지나려면 나를 이겨야 해!" },
      { id: "trainer_r4_2", x: 15, y: 6, name: "숲의 탐험가 수진", sprite: "trainer", type: "trainer", trainerId: "route4_t2", dialog: "이 숲에서 길을 잃으면 안 돼!" },
      { id: "boss_route04", x: 22, y: 5, name: "숲의 수호자", sprite: "boss", type: "boss", dialog: "숲의 주인으로서 길을 막겠다!" }
    ],
    exits: [
      { x: 0, y: 5, to: "town_04", spawnX: 14, spawnY: 6 },
      { x: 0, y: 6, to: "town_04", spawnX: 14, spawnY: 6 },
      { x: 24, y: 5, to: "forest_01", spawnX: 1, spawnY: 8 },
      { x: 24, y: 6, to: "forest_01", spawnX: 1, spawnY: 8 }
    ],
    playerSpawn: { x: 1, y: 5 },
    hiddenEvents: []
  };
}

/* ================================================================== */
/*  3. forest_01.json — 수수께끼의 숲 (20×16)                           */
/*  Dense forest maze. Dark, mysterious. 2 shadow clan trainers.       */
/*  Exits: west→route_04, east→town_05. Hidden events: 2.             */
/* ================================================================== */
function makeForest01() {
  const W = 20, H = 16;

  // Ground: grass base with grass_alt creating a mossy feel
  const ground = fill(W, H, 1);
  // Patches of grass_alt for dark/mysterious feel
  rect(ground, W, 3, 2, 6, 5, 9);
  rect(ground, W, 12, 3, 16, 6, 9);
  rect(ground, W, 5, 10, 9, 13, 9);
  rect(ground, W, 13, 10, 17, 13, 9);
  // Dirt paths (maze corridors)
  // Main horizontal corridors
  hline(ground, W, 0, 7, 8, 2);
  hline(ground, W, 5, 19, 8, 2);
  // Vertical connectors
  vline(ground, W, 5, 4, 8, 2);
  vline(ground, W, 10, 2, 12, 2);
  vline(ground, W, 14, 8, 13, 2);
  // Entry/exit corridors
  hline(ground, W, 0, 3, 7, 2);
  hline(ground, W, 0, 3, 9, 2);
  hline(ground, W, 16, 19, 7, 2);
  hline(ground, W, 16, 19, 9, 2);

  // Objects: dense tree maze
  const objects = fill(W, H, 0);
  // Border trees
  hline(objects, W, 0, W - 1, 0, 7);
  hline(objects, W, 0, W - 1, H - 1, 7);
  vline(objects, W, 0, 0, H - 1, 7);
  vline(objects, W, W - 1, 0, H - 1, 7);
  // Open west exit at y=7,8,9
  set(objects, W, 0, 7, 0); set(objects, W, 0, 8, 0); set(objects, W, 0, 9, 0);
  // Open east exit at y=7,8,9
  set(objects, W, 19, 7, 0); set(objects, W, 19, 8, 0); set(objects, W, 19, 9, 0);

  // Interior maze walls (tree blocks)
  // Upper section walls
  rect(objects, W, 2, 2, 4, 3, 7);
  rect(objects, W, 7, 1, 9, 3, 7);
  rect(objects, W, 12, 1, 13, 3, 7);
  rect(objects, W, 15, 2, 17, 4, 7);
  // Middle section
  rect(objects, W, 2, 5, 3, 6, 7);
  rect(objects, W, 7, 5, 9, 7, 7);
  rect(objects, W, 11, 5, 13, 7, 7);
  rect(objects, W, 16, 5, 17, 6, 7);
  // Lower section
  rect(objects, W, 2, 10, 4, 12, 7);
  rect(objects, W, 6, 10, 8, 11, 7);
  rect(objects, W, 11, 10, 13, 12, 7);
  rect(objects, W, 16, 10, 17, 12, 7);
  // Bottom walls
  rect(objects, W, 3, 13, 5, 14, 7);
  rect(objects, W, 8, 13, 9, 14, 7);
  rect(objects, W, 14, 13, 16, 14, 7);
  // Bushes as soft obstacles
  set(objects, W, 5, 3, 8); set(objects, W, 10, 4, 8);
  set(objects, W, 14, 9, 8); set(objects, W, 9, 12, 8);

  // Open corridor paths through the maze
  // Make sure path from west(y=8) through to east(y=8) is clear
  hline(objects, W, 1, 18, 8, 0); // clear main horizontal
  vline(objects, W, 5, 4, 9, 0);  // clear vertical connector
  vline(objects, W, 10, 2, 13, 0); // clear vertical connector
  vline(objects, W, 14, 8, 14, 0); // clear connector
  // Additional paths
  hline(objects, W, 1, 5, 4, 0);
  hline(objects, W, 10, 14, 4, 0);
  hline(objects, W, 1, 4, 9, 0);
  hline(objects, W, 10, 18, 9, 0);
  hline(objects, W, 5, 10, 12, 0);

  // Collision
  const collision = fill(W, H, 0);
  for (let i = 0; i < W * H; i++) {
    if (objects[i] !== 0) collision[i] = 1;
  }

  return {
    width: W, height: H, tileSize: 64, tileset: "rpg_base",
    layers: { ground, objects, collision },
    npcs: [
      { id: "shadow_f1_1", x: 6, y: 8, name: "그림자단 암살자", sprite: "trainer", type: "trainer", trainerId: "forest1_t1", dialog: "그림자 속에서 나타났다... 도망칠 수 없어!" },
      { id: "shadow_f1_2", x: 15, y: 8, name: "그림자단 정찰병", sprite: "trainer", type: "trainer", trainerId: "forest1_t2", dialog: "이 숲은 우리의 영역이다. 돌아가!" }
    ],
    exits: [
      { x: 0, y: 8, to: "route_04", spawnX: 23, spawnY: 5 },
      { x: 19, y: 8, to: "town_05", spawnX: 1, spawnY: 6 }
    ],
    playerSpawn: { x: 1, y: 8 },
    hiddenEvents: [
      { x: 10, y: 6, type: "shadow_cache", requiredLevel: 18, description: "숲 깊은 곳에서 그림자단의 비밀 보급품을 발견했다! 특별한 아이템을 얻었다." },
      { x: 3, y: 12, type: "ancient_shrine", requiredLevel: 20, description: "고대의 사당을 발견했다. 신비한 힘이 느껴진다..." }
    ]
  };
}

/* ================================================================== */
/*  4. town_05.json — 자연마을 (16×12)                                  */
/*  Nature village. Greenery, wooden buildings. Shop, healer.          */
/*  Exits: west→forest_01, north→gym_04.                               */
/* ================================================================== */
function makeTown05() {
  const W = 16, H = 12;

  // Ground: grass with dirt roads
  const ground = fill(W, H, 1);
  // Dirt roads
  hline(ground, W, 0, W - 1, 6, 2);
  hline(ground, W, 0, W - 1, 7, 2);
  vline(ground, W, 7, 0, H - 1, 2);
  vline(ground, W, 8, 0, H - 1, 2);
  // Grass alt patches for garden feel
  rect(ground, W, 1, 1, 3, 3, 9);
  rect(ground, W, 11, 1, 14, 3, 9);
  rect(ground, W, 1, 9, 4, 10, 9);
  rect(ground, W, 11, 9, 14, 10, 9);

  // Objects: wooden buildings, trees, bushes
  const objects = fill(W, H, 0);
  // Border trees/bushes (sparse, natural feel)
  hline(objects, W, 0, W - 1, 0, 7);
  hline(objects, W, 0, W - 1, H - 1, 7);
  vline(objects, W, 0, 0, H - 1, 7);
  vline(objects, W, W - 1, 0, H - 1, 7);
  // Open exit west y=6,7
  set(objects, W, 0, 6, 0); set(objects, W, 0, 7, 0);
  // Open exit north x=7,8
  set(objects, W, 7, 0, 0); set(objects, W, 8, 0, 0);

  // Building 1: Shop (top-left) - wood walls with door
  rect(objects, W, 2, 2, 5, 4, 5);  // wood walls
  set(objects, W, 2, 2, 13); set(objects, W, 3, 2, 13); set(objects, W, 4, 2, 13); set(objects, W, 5, 2, 13); // roof
  set(objects, W, 4, 4, 14); // door

  // Building 2: Healer (top-right) - wood walls with door
  rect(objects, W, 10, 2, 13, 4, 5);
  set(objects, W, 10, 2, 13); set(objects, W, 11, 2, 13); set(objects, W, 12, 2, 13); set(objects, W, 13, 2, 13);
  set(objects, W, 11, 4, 14); // door

  // Building 3 (bottom-left) - house
  rect(objects, W, 2, 9, 5, 10, 5);
  set(objects, W, 2, 9, 13); set(objects, W, 3, 9, 13); set(objects, W, 4, 9, 13); set(objects, W, 5, 9, 13);
  set(objects, W, 3, 10, 14);

  // Building 4 (bottom-right) - house
  rect(objects, W, 11, 9, 14, 10, 5);
  set(objects, W, 11, 9, 13); set(objects, W, 12, 9, 13); set(objects, W, 13, 9, 13); set(objects, W, 14, 9, 13);
  set(objects, W, 12, 10, 14);

  // Decorative bushes/trees
  set(objects, W, 6, 3, 8); set(objects, W, 9, 3, 8);
  set(objects, W, 6, 9, 8); set(objects, W, 9, 9, 8);

  // Collision
  const collision = fill(W, H, 0);
  for (let i = 0; i < W * H; i++) {
    if (objects[i] !== 0 && objects[i] !== 14) collision[i] = 1;
    // Doors are walkable triggers, keep collision 0
  }
  // But doors on buildings that are just facades should be blocked
  // Actually in the existing format, doors (14) have collision 0 to enter
  // Let's keep doors with collision 0

  return {
    width: W, height: H, tileSize: 64, tileset: "rpg_base",
    layers: { ground, objects, collision },
    npcs: [
      { id: "shop_05", x: 4, y: 5, name: "자연마을 상점", sprite: "shopkeeper", type: "shop", dialog: "자연의 선물로 가득한 상점이야! 필요한 거 있어?" },
      { id: "heal_05", x: 11, y: 5, name: "자연마을 치유사", sprite: "healer", type: "heal", dialog: "자연의 힘으로 회복시켜줄게." },
      { id: "citizen_07", x: 8, y: 8, name: "마을 장로", sprite: "citizen", type: "dialog", dialog: "북쪽에 자연 체육관이 있단다. 자연의 힘을 존중해야 해." },
      { id: "citizen_08", x: 5, y: 6, name: "정원사", sprite: "citizen", type: "dialog", dialog: "이 마을은 자연과 하나가 되어 살고 있어." }
    ],
    exits: [
      { x: 0, y: 6, to: "forest_01", spawnX: 18, spawnY: 8 },
      { x: 7, y: 0, to: "gym_04", spawnX: 5, spawnY: 8 },
      { x: 8, y: 0, to: "gym_04", spawnX: 6, spawnY: 8 }
    ],
    playerSpawn: { x: 1, y: 6 },
    hiddenEvents: []
  };
}

/* ================================================================== */
/*  5. gym_04.json — 자연 체육관 (12×10)                                */
/*  Grass/nature themed gym. Grass floor with flower decorations.      */
/*  2 trainers + gym leader. Exit south.                               */
/* ================================================================== */
function makeGym04() {
  const W = 12, H = 10;

  // Ground: grass (1) and grass_alt (9) mix for nature feel
  const ground = fill(W, H, 1);
  // Grass alt checkerboard-ish pattern
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if ((x + y) % 3 === 0) set(ground, W, x, y, 9);
    }
  }
  // Central carpet aisle
  vline(ground, W, 5, 0, H - 1, 2);
  vline(ground, W, 6, 0, H - 1, 2);

  // Objects: walls around edges, bush/tree decorations inside
  const objects = fill(W, H, 0);
  // Walls
  hline(objects, W, 0, W - 1, 0, 6);
  hline(objects, W, 0, 4, H - 1, 6);
  hline(objects, W, 7, W - 1, H - 1, 6);
  vline(objects, W, 0, 0, H - 1, 6);
  vline(objects, W, W - 1, 0, H - 1, 6);
  // Interior bush decorations (nature themed)
  set(objects, W, 2, 2, 8); set(objects, W, 9, 2, 8);
  set(objects, W, 2, 4, 8); set(objects, W, 9, 4, 8);
  set(objects, W, 2, 6, 7); set(objects, W, 9, 6, 7);
  set(objects, W, 4, 3, 8); set(objects, W, 7, 3, 8);
  set(objects, W, 4, 7, 8); set(objects, W, 7, 7, 8);

  // Collision
  const collision = fill(W, H, 0);
  for (let i = 0; i < W * H; i++) {
    if (objects[i] !== 0) collision[i] = 1;
  }

  return {
    width: W, height: H, tileSize: 64, tileset: "rpg_base",
    layers: { ground, objects, collision },
    npcs: [
      { id: "gym4_t1", x: 3, y: 5, name: "자연 수련생 리프", sprite: "trainer", type: "trainer", trainerId: "gym4_t1", dialog: "자연의 힘은 강하다! 도전해봐!" },
      { id: "gym4_t2", x: 8, y: 5, name: "자연 수련생 블룸", sprite: "trainer", type: "trainer", trainerId: "gym4_t2", dialog: "꽃의 힘을 보여주마!" },
      { id: "gym_leader_04", x: 5, y: 2, name: "숲의 현자 가이아", sprite: "gym_leader", type: "gym_leader", trainerId: "gym_leader_04", dialog: "자연의 시련에 도전하는가? 대지의 힘을 느껴봐!" }
    ],
    exits: [
      { x: 5, y: 9, to: "town_05", spawnX: 7, spawnY: 1 },
      { x: 6, y: 9, to: "town_05", spawnX: 8, spawnY: 1 }
    ],
    playerSpawn: { x: 5, y: 8 },
    hiddenEvents: []
  };
}

/* ================================================================== */
/*  6. route_05.json — 5번 도로 (25×10)                                 */
/*  Sandy/dusty route. Mix of dirt and sand. 3 trainers + boss.        */
/*  Exits: west→town_05, east→town_06.                                 */
/* ================================================================== */
function makeRoute05() {
  const W = 25, H = 10;

  // Ground: mix of dirt (2) and sand (10)
  const ground = fill(W, H, 10); // sand base
  // Dirt path through center
  hline(ground, W, 0, W - 1, 4, 2);
  hline(ground, W, 0, W - 1, 5, 2);
  // Dirt patches
  rect(ground, W, 3, 2, 6, 3, 2);
  rect(ground, W, 10, 6, 13, 7, 2);
  rect(ground, W, 18, 2, 21, 3, 2);
  // Some grass spots (oasis-like)
  rect(ground, W, 7, 1, 8, 2, 1);
  rect(ground, W, 15, 7, 16, 8, 1);

  // Objects: sparse trees, rocks
  const objects = fill(W, H, 0);
  // Top and bottom borders
  hline(objects, W, 0, W - 1, 0, 7);
  hline(objects, W, 0, W - 1, H - 1, 7);
  // Scattered rocks (stone)
  set(objects, W, 4, 3, 4); set(objects, W, 9, 2, 4);
  set(objects, W, 14, 7, 4); set(objects, W, 20, 3, 4);
  set(objects, W, 6, 7, 4); set(objects, W, 17, 2, 4);
  // Scattered bushes
  set(objects, W, 2, 2, 8); set(objects, W, 11, 2, 8);
  set(objects, W, 7, 7, 8); set(objects, W, 19, 7, 8);
  set(objects, W, 22, 3, 8);
  // A few trees near grass spots
  set(objects, W, 7, 1, 7); set(objects, W, 15, 7, 7);

  // Collision
  const collision = fill(W, H, 0);
  for (let i = 0; i < W * H; i++) {
    if (objects[i] !== 0) collision[i] = 1;
  }

  return {
    width: W, height: H, tileSize: 64, tileset: "rpg_base",
    layers: { ground, objects, collision },
    npcs: [
      { id: "trainer_r5_1", x: 5, y: 4, name: "사막 탐험가 하나", sprite: "trainer", type: "trainer", trainerId: "route5_t1", dialog: "모래바람 속에서 단련했다!" },
      { id: "trainer_r5_2", x: 12, y: 5, name: "사막 탐험가 준서", sprite: "trainer", type: "trainer", trainerId: "route5_t2", dialog: "이 길을 통과하려면 실력을 보여줘!" },
      { id: "trainer_r5_3", x: 18, y: 4, name: "사막 전사 세라", sprite: "trainer", type: "trainer", trainerId: "route5_t3", dialog: "사막의 전사를 이길 수 있을까?" },
      { id: "boss_route05", x: 22, y: 5, name: "사막의 폭군", sprite: "boss", type: "boss", dialog: "모래폭풍이 몰려온다! 살아남아 봐라!" }
    ],
    exits: [
      { x: 0, y: 4, to: "town_05", spawnX: 14, spawnY: 6 },
      { x: 0, y: 5, to: "town_05", spawnX: 14, spawnY: 6 },
      { x: 24, y: 4, to: "town_06", spawnX: 1, spawnY: 6 },
      { x: 24, y: 5, to: "town_06", spawnX: 1, spawnY: 6 }
    ],
    playerSpawn: { x: 1, y: 4 },
    hiddenEvents: [
      { x: 8, y: 2, type: "desert_mirage", requiredLevel: 22, description: "사막의 신기루 속에서 보물을 발견했다!" },
      { x: 16, y: 8, type: "buried_relic", requiredLevel: 24, description: "모래 속에 묻힌 고대 유물을 발견했다. 강력한 힘이 깃들어 있다." }
    ]
  };
}

/* ================================================================== */
/*  Validate & write all maps                                          */
/* ================================================================== */
function validate(name, map) {
  const { width: W, height: H } = map;
  const total = W * H;
  const { ground, objects, collision } = map.layers;

  // Check array sizes
  if (ground.length !== total) throw new Error(`${name}: ground length ${ground.length} != ${total}`);
  if (objects.length !== total) throw new Error(`${name}: objects length ${objects.length} != ${total}`);
  if (collision.length !== total) throw new Error(`${name}: collision length ${collision.length} != ${total}`);

  // No zeros in ground
  for (let i = 0; i < total; i++) {
    if (ground[i] === 0) throw new Error(`${name}: ground has 0 at index ${i} (x=${i % W}, y=${Math.floor(i / W)})`);
  }

  // Collision matches blocked tiles (objects != 0 should have collision 1, except doors)
  for (let i = 0; i < total; i++) {
    if (objects[i] !== 0 && objects[i] !== 14 && collision[i] !== 1) {
      throw new Error(`${name}: object tile ${objects[i]} at index ${i} but collision is 0`);
    }
  }

  // NPCs on walkable tiles
  for (const npc of map.npcs) {
    const idx = npc.y * W + npc.x;
    if (collision[idx] !== 0) {
      throw new Error(`${name}: NPC "${npc.id}" at (${npc.x},${npc.y}) is on a blocked tile`);
    }
  }

  // Exits on walkable tiles
  for (const exit of map.exits) {
    const idx = exit.y * W + exit.x;
    if (collision[idx] !== 0) {
      throw new Error(`${name}: exit to "${exit.to}" at (${exit.x},${exit.y}) is on a blocked tile`);
    }
  }

  // Player spawn on walkable tile
  const spIdx = map.playerSpawn.y * W + map.playerSpawn.x;
  if (collision[spIdx] !== 0) {
    throw new Error(`${name}: playerSpawn at (${map.playerSpawn.x},${map.playerSpawn.y}) is on a blocked tile`);
  }

  console.log(`  ✓ ${name} validated`);
}

console.log("Generating Chapter 4-6 tilemaps...\n");

const maps = [
  ["gym_03.json", makeGym03()],
  ["route_04.json", makeRoute04()],
  ["forest_01.json", makeForest01()],
  ["town_05.json", makeTown05()],
  ["gym_04.json", makeGym04()],
  ["route_05.json", makeRoute05()],
];

for (const [name, data] of maps) {
  validate(name, data);
  save(name, data);
}

console.log("\nDone! All 6 tilemaps generated.");
