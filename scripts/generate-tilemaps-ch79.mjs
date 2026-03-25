/**
 * generate-tilemaps-ch79.mjs
 * Generates 8 tilemap JSON files for Chapter 7-9 story locations.
 *
 * Tile IDs:
 *   1=grass, 2=dirt, 3=water, 4=stone, 5=wood, 6=wall, 7=tree, 8=bush,
 *   9=grass_alt, 10=sand, 11=ice, 12=lava, 13=roof, 14=door, 15=dark_stone,
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

/* ================================================================== */
/*  1. town_06  — 투지시티 (16×12)                                     */
/*  Fighting city. Stone buildings, training grounds.                  */
/* ================================================================== */
function makeTown06() {
  const W = 16, H = 12;
  const ground = fill(W, H, 4); // stone base
  const objects = fill(W, H, 0);
  const collision = fill(W, H, 0);

  // Border walls (dark_stone)
  for (let x = 0; x < W; x++) {
    set(objects, W, x, 0, 15); set(collision, W, x, 0, 1);
    set(objects, W, x, H - 1, 15); set(collision, W, x, H - 1, 1);
  }
  for (let y = 0; y < H; y++) {
    set(objects, W, 0, y, 15); set(collision, W, 0, y, 1);
    set(objects, W, W - 1, y, 15); set(collision, W, W - 1, y, 1);
  }

  // Main road (dirt)
  hline(ground, W, 0, 15, 6, 2);

  // Training grounds — sand/dirt area in the center
  rect(ground, W, 6, 8, 10, 10, 10); // sand training ground

  // Building 1: Shop (top-left)
  rect(objects, W, 2, 2, 5, 4, 6); rect(collision, W, 2, 2, 5, 4, 1);
  set(objects, W, 3, 4, 14); set(collision, W, 3, 4, 0); // door
  hline(objects, W, 2, 5, 1, 13); hline(collision, W, 2, 5, 1, 1);

  // Building 2: Healer (top-right)
  rect(objects, W, 9, 2, 12, 4, 6); rect(collision, W, 9, 2, 12, 4, 1);
  set(objects, W, 10, 4, 14); set(collision, W, 10, 4, 0); // door
  hline(objects, W, 9, 12, 1, 13); hline(collision, W, 9, 12, 1, 1);

  // Training equipment (stone objects around training ground)
  set(objects, W, 5, 8, 15); set(collision, W, 5, 8, 1);
  set(objects, W, 11, 8, 15); set(collision, W, 11, 8, 1);
  set(objects, W, 5, 10, 15); set(collision, W, 5, 10, 1);
  set(objects, W, 11, 10, 15); set(collision, W, 11, 10, 1);

  // West exit → route_05
  set(objects, W, 0, 6, 0); set(collision, W, 0, 6, 0);
  // North exit → gym_05
  set(objects, W, 7, 0, 0); set(collision, W, 7, 0, 0);

  return {
    width: W, height: H, tileSize: 64, tileset: "rpg_base",
    layers: { ground, objects, collision },
    npcs: [
      { id: "shop_06", x: 3, y: 5, name: "투지시티 상점", sprite: "shopkeeper", type: "shop", dialog: "투지시티의 최고 장비를 가져가!" },
      { id: "heal_06", x: 10, y: 5, name: "투지시티 치유사", sprite: "healer", type: "heal", dialog: "싸움 후엔 회복이 필수야." },
      { id: "citizen_t6_1", x: 7, y: 9, name: "격투가", sprite: "citizen", type: "dialog", dialog: "이 수련장에서 매일 훈련해! 북쪽에 투지 체육관이 있어." },
      { id: "citizen_t6_2", x: 13, y: 6, name: "무술 사범", sprite: "citizen", type: "dialog", dialog: "투지시티는 격투의 도시다. 강해지고 싶다면 도전해!" }
    ],
    exits: [
      { x: 0, y: 6, to: "route_05", spawnX: 28, spawnY: 5 },
      { x: 7, y: 0, to: "gym_05", spawnX: 5, spawnY: 8 }
    ],
    playerSpawn: { x: 1, y: 6 },
    hiddenEvents: []
  };
}

/* ================================================================== */
/*  2. gym_05  — 투지 체육관 (12×10)                                    */
/*  Fighting gym. Stone floor, training equipment.                    */
/* ================================================================== */
function makeGym05() {
  const W = 12, H = 10;
  const ground = fill(W, H, 17); // gym floor
  const objects = fill(W, H, 0);
  const collision = fill(W, H, 0);

  // Walls on all edges
  for (let x = 0; x < W; x++) {
    set(objects, W, x, 0, 6); set(collision, W, x, 0, 1);
    set(objects, W, x, H - 1, 6); set(collision, W, x, H - 1, 1);
  }
  for (let y = 0; y < H; y++) {
    set(objects, W, 0, y, 6); set(collision, W, 0, y, 1);
    set(objects, W, W - 1, y, 6); set(collision, W, W - 1, y, 1);
  }

  // Carpet path down the center
  vline(ground, W, 5, 1, 9, 19);
  vline(ground, W, 6, 1, 9, 19);

  // Training stone blocks on sides
  rect(ground, W, 1, 2, 3, 4, 4); // stone training area left
  rect(ground, W, 8, 2, 10, 4, 4); // stone training area right

  // Stone equipment obstacles
  set(objects, W, 2, 3, 15); set(collision, W, 2, 3, 1);
  set(objects, W, 9, 3, 15); set(collision, W, 9, 3, 1);
  set(objects, W, 2, 6, 15); set(collision, W, 2, 6, 1);
  set(objects, W, 9, 6, 15); set(collision, W, 9, 6, 1);

  // Sand training floor patches
  rect(ground, W, 1, 6, 3, 8, 10);
  rect(ground, W, 8, 6, 10, 8, 10);

  // Exit at south center
  set(objects, W, 5, H - 1, 0); set(collision, W, 5, H - 1, 0);
  set(objects, W, 6, H - 1, 0); set(collision, W, 6, H - 1, 0);

  return {
    width: W, height: H, tileSize: 64, tileset: "rpg_base",
    layers: { ground, objects, collision },
    npcs: [
      { id: "gym5_t1", x: 3, y: 7, name: "수련생 강호", sprite: "trainer", type: "trainer", trainerId: "gym5_t1", dialog: "주먹의 힘을 보여주마!" },
      { id: "gym5_t2", x: 8, y: 7, name: "수련생 미라", sprite: "trainer", type: "trainer", trainerId: "gym5_t2", dialog: "격투의 정신을 느껴봐!" },
      { id: "gym_leader_05", x: 5, y: 2, name: "관장 무현", sprite: "gym_leader", type: "gym_leader", trainerId: "gym_leader_05", dialog: "투지 체육관에 도전하는가! 네 격투 정신을 보여줘!" }
    ],
    exits: [
      { x: 5, y: 9, to: "town_06", spawnX: 7, spawnY: 1 },
      { x: 6, y: 9, to: "town_06", spawnX: 7, spawnY: 1 }
    ],
    playerSpawn: { x: 5, y: 8 },
    hiddenEvents: []
  };
}

/* ================================================================== */
/*  3. route_06  — 6번 도로 (20×10)                                    */
/*  Mountain route. Rocky terrain.                                    */
/* ================================================================== */
function makeRoute06() {
  const W = 20, H = 10;
  const ground = fill(W, H, 1); // grass base
  const objects = fill(W, H, 0);
  const collision = fill(W, H, 0);

  // Top & bottom stone borders (mountain walls)
  for (let x = 0; x < W; x++) {
    set(objects, W, x, 0, 15); set(collision, W, x, 0, 1);
    set(objects, W, x, H - 1, 15); set(collision, W, x, H - 1, 1);
  }

  // Main dirt/stone path
  hline(ground, W, 0, 5, 5, 2);
  hline(ground, W, 4, 8, 4, 4); // stone path up
  hline(ground, W, 8, 13, 5, 2);
  hline(ground, W, 12, 16, 4, 4);
  hline(ground, W, 16, 19, 5, 2);

  // Rocky outcrops (stone blocks)
  rect(ground, W, 6, 2, 8, 3, 4);
  rect(objects, W, 6, 2, 8, 3, 15);
  rect(collision, W, 6, 2, 8, 3, 1);

  rect(ground, W, 14, 7, 16, 8, 4);
  rect(objects, W, 14, 7, 16, 8, 15);
  rect(collision, W, 14, 7, 8, 8, 1);
  // fix: redo collision for second rock
  rect(collision, W, 14, 7, 16, 8, 1);

  // Scattered trees on mountainside
  const trees = [[2, 2], [3, 7], [10, 2], [11, 7], [17, 2], [18, 7]];
  for (const [tx, ty] of trees) {
    set(objects, W, tx, ty, 7); set(collision, W, tx, ty, 1);
  }

  // Bushes
  const bushes = [[4, 7], [9, 3], [13, 7]];
  for (const [bx, by] of bushes) {
    set(objects, W, bx, by, 8); set(collision, W, bx, by, 1);
  }

  // Stone ground patches
  rect(ground, W, 1, 3, 3, 4, 4);
  rect(ground, W, 16, 2, 18, 3, 4);

  // Ensure exits walkable
  set(collision, W, 0, 5, 0); set(objects, W, 0, 5, 0);
  set(collision, W, 19, 5, 0); set(objects, W, 19, 5, 0);

  return {
    width: W, height: H, tileSize: 64, tileset: "rpg_base",
    layers: { ground, objects, collision },
    npcs: [
      { id: "trainer_r6_1", x: 5, y: 5, name: "산악 훈련생 태산", sprite: "trainer", type: "trainer", trainerId: "route6_t1", dialog: "산을 넘으려면 나를 이겨라!" },
      { id: "trainer_r6_2", x: 11, y: 5, name: "산악 훈련생 바위", sprite: "trainer", type: "trainer", trainerId: "route6_t2", dialog: "바위처럼 단단한 내 팀을 봐!" },
      { id: "trainer_r6_3", x: 17, y: 5, name: "산악 전사 석진", sprite: "trainer", type: "trainer", trainerId: "route6_t3", dialog: "동굴 입구를 지키고 있다!" }
    ],
    exits: [
      { x: 0, y: 5, to: "town_06", spawnX: 14, spawnY: 6 },
      { x: 19, y: 5, to: "cave_02", spawnX: 1, spawnY: 7 }
    ],
    playerSpawn: { x: 1, y: 5 },
    hiddenEvents: [
      { x: 9, y: 2, type: "mountain_shrine", requiredLevel: 22, description: "산 중턱에 숨겨진 사당을 발견했다! 특별한 보상을 얻었다." }
    ]
  };
}

/* ================================================================== */
/*  4. cave_02  — 빙하동굴 (18×14)                                     */
/*  Ice cave. Ice tiles, frozen water.                                */
/* ================================================================== */
function makeCave02() {
  const W = 18, H = 14;
  const ground = fill(W, H, 11); // ice floor
  const objects = fill(W, H, 0);
  const collision = fill(W, H, 0);

  // Walls on all edges
  for (let x = 0; x < W; x++) {
    set(objects, W, x, 0, 6); set(collision, W, x, 0, 1);
    set(objects, W, x, H - 1, 6); set(collision, W, x, H - 1, 1);
  }
  for (let y = 0; y < H; y++) {
    set(objects, W, 0, y, 6); set(collision, W, 0, y, 1);
    set(objects, W, W - 1, y, 6); set(collision, W, W - 1, y, 1);
  }

  // Interior ice walls (winding path)
  hline(objects, W, 3, 10, 3, 6); hline(collision, W, 3, 10, 3, 1);
  // gap at x=7
  set(objects, W, 7, 3, 0); set(collision, W, 7, 3, 0);

  hline(objects, W, 1, 9, 6, 6); hline(collision, W, 1, 9, 6, 1);
  // gap at x=5
  set(objects, W, 5, 6, 0); set(collision, W, 5, 6, 0);

  hline(objects, W, 8, 16, 9, 6); hline(collision, W, 8, 16, 9, 1);
  // gap at x=12
  set(objects, W, 12, 9, 0); set(collision, W, 12, 9, 0);

  // Vertical wall segment
  vline(objects, W, 13, 3, 8, 6); vline(collision, W, 13, 3, 8, 1);
  // gap at y=5
  set(objects, W, 13, 5, 0); set(collision, W, 13, 5, 0);

  // Frozen water pools (blocked)
  rect(ground, W, 2, 8, 4, 10, 3);
  rect(collision, W, 2, 8, 4, 10, 1);

  rect(ground, W, 14, 4, 16, 5, 3);
  rect(collision, W, 14, 4, 16, 5, 1);

  // Stone patches for variety
  rect(ground, W, 5, 1, 8, 2, 15); // dark stone patches
  rect(ground, W, 9, 10, 11, 12, 15);

  // West exit
  set(objects, W, 0, 7, 0); set(collision, W, 0, 7, 0);
  // East exit
  set(objects, W, W - 1, 7, 0); set(collision, W, W - 1, 7, 0);

  return {
    width: W, height: H, tileSize: 64, tileset: "rpg_base",
    layers: { ground, objects, collision },
    npcs: [
      { id: "trainer_cave2_1", x: 6, y: 5, name: "빙하 탐험가 설아", sprite: "trainer", type: "trainer", trainerId: "cave2_t1", dialog: "이 얼음 동굴에서 살아남을 수 있을까?" },
      { id: "trainer_cave2_2", x: 10, y: 8, name: "빙하 전사 동빙", sprite: "trainer", type: "trainer", trainerId: "cave2_t2", dialog: "얼음의 힘을 느껴봐라!" }
    ],
    exits: [
      { x: 0, y: 7, to: "route_06", spawnX: 18, spawnY: 5 },
      { x: 17, y: 7, to: "town_07", spawnX: 1, spawnY: 6 }
    ],
    playerSpawn: { x: 1, y: 7 },
    hiddenEvents: [
      { x: 9, y: 11, type: "frozen_spring", requiredLevel: 24, description: "얼어붙은 샘에서 차가운 에너지가 흘러나온다. AP가 회복된다." }
    ]
  };
}

/* ================================================================== */
/*  5. town_07  — 빙결마을 (16×12)                                     */
/*  Snow village. Ice/white tiles.                                    */
/* ================================================================== */
function makeTown07() {
  const W = 16, H = 12;
  const ground = fill(W, H, 11); // ice base
  const objects = fill(W, H, 0);
  const collision = fill(W, H, 0);

  // Border walls (ice walls)
  for (let x = 0; x < W; x++) {
    set(objects, W, x, 0, 6); set(collision, W, x, 0, 1);
    set(objects, W, x, H - 1, 6); set(collision, W, x, H - 1, 1);
  }
  for (let y = 0; y < H; y++) {
    set(objects, W, 0, y, 6); set(collision, W, 0, y, 1);
    set(objects, W, W - 1, y, 6); set(collision, W, W - 1, y, 1);
  }

  // Main road (stone path through snow)
  hline(ground, W, 0, 15, 6, 4);

  // Building 1: Shop (top-left)
  rect(objects, W, 2, 2, 5, 4, 6); rect(collision, W, 2, 2, 5, 4, 1);
  set(objects, W, 3, 4, 14); set(collision, W, 3, 4, 0); // door
  hline(objects, W, 2, 5, 1, 13); hline(collision, W, 2, 5, 1, 1);

  // Building 2: Healer (top-right)
  rect(objects, W, 9, 2, 12, 4, 6); rect(collision, W, 9, 2, 12, 4, 1);
  set(objects, W, 10, 4, 14); set(collision, W, 10, 4, 0); // door
  hline(objects, W, 9, 12, 1, 13); hline(collision, W, 9, 12, 1, 1);

  // Building 3: House (bottom)
  rect(objects, W, 3, 8, 6, 10, 6); rect(collision, W, 3, 8, 6, 10, 1);
  set(objects, W, 4, 8, 14); set(collision, W, 4, 8, 0); // door
  hline(objects, W, 3, 6, 7, 13); hline(collision, W, 3, 6, 7, 1);

  // Frozen water decorations
  rect(ground, W, 10, 8, 12, 10, 3);
  rect(collision, W, 10, 8, 12, 10, 1);

  // Trees (frozen/snowy)
  const trees = [[7, 3], [7, 9], [13, 3], [13, 9]];
  for (const [tx, ty] of trees) {
    set(objects, W, tx, ty, 7); set(collision, W, tx, ty, 1);
  }

  // West exit → cave_02
  set(objects, W, 0, 6, 0); set(collision, W, 0, 6, 0);
  // East exit → route_07
  set(objects, W, W - 1, 6, 0); set(collision, W, W - 1, 6, 0);
  // North exit → gym_06
  set(objects, W, 7, 0, 0); set(collision, W, 7, 0, 0);

  return {
    width: W, height: H, tileSize: 64, tileset: "rpg_base",
    layers: { ground, objects, collision },
    npcs: [
      { id: "shop_07", x: 3, y: 5, name: "빙결마을 상점", sprite: "shopkeeper", type: "shop", dialog: "추운 곳에서 쓸 물건들이야!" },
      { id: "heal_07", x: 10, y: 5, name: "빙결마을 치유사", sprite: "healer", type: "heal", dialog: "따뜻한 치유의 빛으로 회복시켜줄게." },
      { id: "citizen_t7_1", x: 7, y: 6, name: "눈사람 할아버지", sprite: "citizen", type: "dialog", dialog: "빙결마을에 온 걸 환영해! 북쪽에 빙결 체육관이 있단다." },
      { id: "citizen_t7_2", x: 13, y: 6, name: "얼음 조각가", sprite: "citizen", type: "dialog", dialog: "동쪽으로 가면 어둠의 길이 시작돼. 조심해!" }
    ],
    exits: [
      { x: 0, y: 6, to: "cave_02", spawnX: 16, spawnY: 7 },
      { x: 15, y: 6, to: "route_07", spawnX: 1, spawnY: 5 },
      { x: 7, y: 0, to: "gym_06", spawnX: 5, spawnY: 8 }
    ],
    playerSpawn: { x: 1, y: 6 },
    hiddenEvents: []
  };
}

/* ================================================================== */
/*  6. gym_06  — 빙결 체육관 (12×10)                                    */
/*  Ice gym. Ice floor, frozen decorations.                           */
/* ================================================================== */
function makeGym06() {
  const W = 12, H = 10;
  const ground = fill(W, H, 11); // ice floor
  const objects = fill(W, H, 0);
  const collision = fill(W, H, 0);

  // Walls on all edges
  for (let x = 0; x < W; x++) {
    set(objects, W, x, 0, 6); set(collision, W, x, 0, 1);
    set(objects, W, x, H - 1, 6); set(collision, W, x, H - 1, 1);
  }
  for (let y = 0; y < H; y++) {
    set(objects, W, 0, y, 6); set(collision, W, 0, y, 1);
    set(objects, W, W - 1, y, 6); set(collision, W, W - 1, y, 1);
  }

  // Carpet path down the center
  vline(ground, W, 5, 1, 9, 19);
  vline(ground, W, 6, 1, 9, 19);

  // Frozen water pools on sides
  rect(ground, W, 1, 2, 3, 4, 3); rect(collision, W, 1, 2, 3, 4, 1);
  rect(ground, W, 8, 2, 10, 4, 3); rect(collision, W, 8, 2, 10, 4, 1);

  // Frozen decorations (dark stone pillars)
  set(objects, W, 2, 6, 15); set(collision, W, 2, 6, 1);
  set(objects, W, 9, 6, 15); set(collision, W, 9, 6, 1);
  set(objects, W, 4, 4, 15); set(collision, W, 4, 4, 1);
  set(objects, W, 7, 4, 15); set(collision, W, 7, 4, 1);

  // Bookshelves at top
  hline(objects, W, 1, 4, 1, 20); hline(collision, W, 1, 4, 1, 1);
  hline(objects, W, 7, 10, 1, 20); hline(collision, W, 7, 10, 1, 1);

  // Exit at south center
  set(objects, W, 5, H - 1, 0); set(collision, W, 5, H - 1, 0);
  set(objects, W, 6, H - 1, 0); set(collision, W, 6, H - 1, 0);

  return {
    width: W, height: H, tileSize: 64, tileset: "rpg_base",
    layers: { ground, objects, collision },
    npcs: [
      { id: "gym6_t1", x: 3, y: 7, name: "수련생 빙하", sprite: "trainer", type: "trainer", trainerId: "gym6_t1", dialog: "얼음의 힘을 느껴봐라!" },
      { id: "gym6_t2", x: 8, y: 7, name: "수련생 설화", sprite: "trainer", type: "trainer", trainerId: "gym6_t2", dialog: "빙결 체육관의 추위를 견딜 수 있겠어?" },
      { id: "gym_leader_06", x: 5, y: 2, name: "관장 빙결", sprite: "gym_leader", type: "gym_leader", trainerId: "gym_leader_06", dialog: "빙결 체육관에 도전하는가! 얼음의 시련을 이겨봐!" }
    ],
    exits: [
      { x: 5, y: 9, to: "town_07", spawnX: 7, spawnY: 1 },
      { x: 6, y: 9, to: "town_07", spawnX: 7, spawnY: 1 }
    ],
    playerSpawn: { x: 5, y: 8 },
    hiddenEvents: []
  };
}

/* ================================================================== */
/*  7. route_07  — 7번 도로 (25×10)                                    */
/*  Dark route to dragon city.                                        */
/* ================================================================== */
function makeRoute07() {
  const W = 25, H = 10;
  const ground = fill(W, H, 15); // dark stone base
  const objects = fill(W, H, 0);
  const collision = fill(W, H, 0);

  // Top & bottom dark stone borders
  for (let x = 0; x < W; x++) {
    set(objects, W, x, 0, 7); set(collision, W, x, 0, 1);
    set(objects, W, x, H - 1, 7); set(collision, W, x, H - 1, 1);
  }

  // Main dirt path
  hline(ground, W, 0, 6, 5, 2);
  hline(ground, W, 5, 10, 4, 2);
  hline(ground, W, 10, 16, 5, 2);
  hline(ground, W, 16, 20, 4, 2);
  hline(ground, W, 20, 24, 5, 2);

  // Grass alt patches (dark undergrowth)
  rect(ground, W, 2, 2, 4, 3, 9);
  rect(ground, W, 12, 7, 14, 8, 9);
  rect(ground, W, 21, 2, 23, 3, 9);

  // Dark stone outcrops
  rect(objects, W, 7, 2, 9, 3, 15);
  rect(collision, W, 7, 2, 9, 3, 1);

  rect(objects, W, 17, 7, 19, 8, 15);
  rect(collision, W, 17, 7, 19, 8, 1);

  // Trees (dark forest)
  const trees = [[3, 7], [6, 2], [11, 2], [13, 3], [16, 7], [22, 2], [23, 7]];
  for (const [tx, ty] of trees) {
    set(objects, W, tx, ty, 7); set(collision, W, tx, ty, 1);
  }

  // Bushes
  const bushes = [[5, 7], [10, 7], [15, 3], [20, 7]];
  for (const [bx, by] of bushes) {
    set(objects, W, bx, by, 8); set(collision, W, bx, by, 1);
  }

  // Ensure exits walkable
  set(collision, W, 0, 5, 0); set(objects, W, 0, 5, 0);
  set(collision, W, 24, 5, 0); set(objects, W, 24, 5, 0);

  return {
    width: W, height: H, tileSize: 64, tileset: "rpg_base",
    layers: { ground, objects, collision },
    npcs: [
      { id: "trainer_r7_1", x: 4, y: 5, name: "어둠의 훈련생 암흑", sprite: "trainer", type: "trainer", trainerId: "route7_t1", dialog: "어둠 속에서 길을 잃을 거야!" },
      { id: "trainer_r7_2", x: 12, y: 5, name: "어둠의 훈련생 야월", sprite: "trainer", type: "trainer", trainerId: "route7_t2", dialog: "이 길은 용의 도시로 가는 길이다!" },
      { id: "trainer_r7_3", x: 21, y: 5, name: "어둠의 전사 용기", sprite: "trainer", type: "trainer", trainerId: "route7_t3", dialog: "용린시티 앞에서 막겠다!" }
    ],
    exits: [
      { x: 0, y: 5, to: "town_07", spawnX: 14, spawnY: 6 },
      { x: 24, y: 5, to: "town_08", spawnX: 1, spawnY: 6 }
    ],
    playerSpawn: { x: 1, y: 5 },
    hiddenEvents: [
      { x: 14, y: 2, type: "dark_altar", requiredLevel: 26, description: "어둠의 제단에서 강력한 기운이 느껴진다..." },
      { x: 8, y: 7, type: "shadow_chest", requiredLevel: 25, description: "그림자 속에 숨겨진 보물상자를 발견했다!" }
    ]
  };
}

/* ================================================================== */
/*  8. town_08  — 용린시티 (16×12)                                     */
/*  Dragon city. Grand stone buildings.                               */
/* ================================================================== */
function makeTown08() {
  const W = 16, H = 12;
  const ground = fill(W, H, 4); // stone base
  const objects = fill(W, H, 0);
  const collision = fill(W, H, 0);

  // Border walls (dark_stone — grand city walls)
  for (let x = 0; x < W; x++) {
    set(objects, W, x, 0, 15); set(collision, W, x, 0, 1);
    set(objects, W, x, H - 1, 15); set(collision, W, x, H - 1, 1);
  }
  for (let y = 0; y < H; y++) {
    set(objects, W, 0, y, 15); set(collision, W, 0, y, 1);
    set(objects, W, W - 1, y, 15); set(collision, W, W - 1, y, 1);
  }

  // Main road (dirt)
  hline(ground, W, 0, 15, 6, 2);

  // Grand carpet path to gym (north)
  vline(ground, W, 7, 0, 6, 19);
  vline(ground, W, 8, 0, 6, 19);

  // Building 1: Shop (top-left)
  rect(objects, W, 2, 2, 5, 4, 6); rect(collision, W, 2, 2, 5, 4, 1);
  set(objects, W, 3, 4, 14); set(collision, W, 3, 4, 0); // door
  hline(objects, W, 2, 5, 1, 13); hline(collision, W, 2, 5, 1, 1);

  // Building 2: Healer (top-right)
  rect(objects, W, 10, 2, 13, 4, 6); rect(collision, W, 10, 2, 13, 4, 1);
  set(objects, W, 11, 4, 14); set(collision, W, 11, 4, 0); // door
  hline(objects, W, 10, 13, 1, 13); hline(collision, W, 10, 13, 1, 1);

  // Building 3: House (bottom-left)
  rect(objects, W, 2, 8, 5, 10, 6); rect(collision, W, 2, 8, 5, 10, 1);
  set(objects, W, 3, 8, 14); set(collision, W, 3, 8, 0); // door
  hline(objects, W, 2, 5, 7, 13); hline(collision, W, 2, 5, 7, 1);

  // Building 4: House (bottom-right)
  rect(objects, W, 10, 8, 13, 10, 6); rect(collision, W, 10, 8, 13, 10, 1);
  set(objects, W, 11, 8, 14); set(collision, W, 11, 8, 0); // door
  hline(objects, W, 10, 13, 7, 13); hline(collision, W, 10, 13, 7, 1);

  // Dark stone pillars for grand decoration
  set(objects, W, 6, 3, 15); set(collision, W, 6, 3, 1);
  set(objects, W, 9, 3, 15); set(collision, W, 9, 3, 1);
  set(objects, W, 6, 9, 15); set(collision, W, 6, 9, 1);
  set(objects, W, 9, 9, 15); set(collision, W, 9, 9, 1);

  // West exit → route_07
  set(objects, W, 0, 6, 0); set(collision, W, 0, 6, 0);
  // North exit → gym_07
  set(objects, W, 7, 0, 0); set(collision, W, 7, 0, 0);
  set(objects, W, 8, 0, 0); set(collision, W, 8, 0, 0);

  return {
    width: W, height: H, tileSize: 64, tileset: "rpg_base",
    layers: { ground, objects, collision },
    npcs: [
      { id: "shop_08", x: 3, y: 5, name: "용린시티 상점", sprite: "shopkeeper", type: "shop", dialog: "용의 도시에서 최고급 장비를 갖춰가!" },
      { id: "heal_08", x: 11, y: 5, name: "용린시티 치유사", sprite: "healer", type: "heal", dialog: "용의 기운으로 회복시켜줄게." },
      { id: "citizen_t8_1", x: 7, y: 8, name: "용 기사", sprite: "citizen", type: "dialog", dialog: "용린시티에 온 걸 환영한다! 북쪽에 드래곤 체육관이 있다." },
      { id: "citizen_t8_2", x: 13, y: 6, name: "고대 학자", sprite: "citizen", type: "dialog", dialog: "이 도시는 전설의 드래곤이 지키고 있다고 전해져..." }
    ],
    exits: [
      { x: 0, y: 6, to: "route_07", spawnX: 23, spawnY: 5 },
      { x: 7, y: 0, to: "gym_07", spawnX: 5, spawnY: 8 },
      { x: 8, y: 0, to: "gym_07", spawnX: 6, spawnY: 8 }
    ],
    playerSpawn: { x: 1, y: 6 },
    hiddenEvents: []
  };
}

/* ================================================================== */
/*  Validation & Write                                                */
/* ================================================================== */
function validate(name, map) {
  const { width: W, height: H, layers, npcs, exits } = map;
  const { ground, objects, collision } = layers;
  const total = W * H;
  const errors = [];

  if (ground.length !== total) errors.push(`ground length ${ground.length} != ${total}`);
  if (objects.length !== total) errors.push(`objects length ${objects.length} != ${total}`);
  if (collision.length !== total) errors.push(`collision length ${collision.length} != ${total}`);

  // No zeros in ground
  for (let i = 0; i < ground.length; i++) {
    if (ground[i] === 0) errors.push(`ground[${i}] is 0 (x=${i % W}, y=${Math.floor(i / W)})`);
  }

  // Collision matches walls/water/trees
  for (let i = 0; i < total; i++) {
    const obj = objects[i];
    const gnd = ground[i];
    const col = collision[i];
    if ((obj === 6 || obj === 7 || obj === 15 || obj === 20) && col !== 1) {
      errors.push(`collision should be 1 at i=${i} (obj=${obj})`);
    }
    if (gnd === 3 && col !== 1 && obj !== 5) {
      errors.push(`water tile at i=${i} should have collision=1 or bridge`);
    }
  }

  // NPCs on walkable tiles
  for (const npc of npcs) {
    const idx = npc.y * W + npc.x;
    if (collision[idx] === 1) errors.push(`NPC ${npc.id} at (${npc.x},${npc.y}) on collision tile`);
  }

  // Exits on map edges, walkable
  for (const exit of exits) {
    const { x, y } = exit;
    if (x !== 0 && x !== W - 1 && y !== 0 && y !== H - 1) {
      errors.push(`Exit at (${x},${y}) not on map edge`);
    }
    const idx = y * W + x;
    if (collision[idx] === 1) errors.push(`Exit at (${x},${y}) on collision tile`);
  }

  if (errors.length > 0) {
    console.error(`[FAIL] ${name}:`);
    errors.forEach(e => console.error(`  - ${e}`));
    return false;
  }
  console.log(`[OK]   ${name} (${W}x${H}, ${npcs.length} NPCs, ${exits.length} exits)`);
  return true;
}

const maps = {
  town_06: makeTown06(),
  gym_05: makeGym05(),
  route_06: makeRoute06(),
  cave_02: makeCave02(),
  town_07: makeTown07(),
  gym_06: makeGym06(),
  route_07: makeRoute07(),
  town_08: makeTown08(),
};

let allOk = true;
for (const [name, data] of Object.entries(maps)) {
  if (!validate(name, data)) allOk = false;
}

if (!allOk) {
  console.error("\nValidation failed! Aborting.");
  process.exit(1);
}

for (const [name, data] of Object.entries(maps)) {
  const path = join(OUT_DIR, `${name}.json`);
  writeFileSync(path, JSON.stringify(data));
  console.log(`Wrote ${path}`);
}

console.log("\nDone! 8 tilemaps generated for Chapter 7-9.");
