/**
 * generate-tilemaps-ch23.mjs
 * Generates 6 tilemap JSON files for Chapter 2-3 story locations.
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
/*  Helper: create a flat array filled with a value                    */
/* ------------------------------------------------------------------ */
function fill(w, h, v) {
  return new Array(w * h).fill(v);
}

/* set a tile at (x, y) in a flat array of width w */
function set(arr, w, x, y, v) {
  arr[y * w + x] = v;
}
function get(arr, w, x, y) {
  return arr[y * w + x];
}

/* fill a rectangle */
function rect(arr, w, x1, y1, x2, y2, v) {
  for (let y = y1; y <= y2; y++)
    for (let x = x1; x <= x2; x++) set(arr, w, x, y, v);
}

/* horizontal line */
function hline(arr, w, x1, x2, y, v) {
  for (let x = x1; x <= x2; x++) set(arr, w, x, y, v);
}

/* vertical line */
function vline(arr, w, x, y1, y2, v) {
  for (let y = y1; y <= y2; y++) set(arr, w, x, y, v);
}

/* ================================================================== */
/*  1. route_02  — 2번 도로 (25×10)                                    */
/* ================================================================== */
function makeRoute02() {
  const W = 25, H = 10;
  const ground = fill(W, H, 1); // grass base
  const objects = fill(W, H, 0);
  const collision = fill(W, H, 0);

  // Top & bottom tree borders
  for (let x = 0; x < W; x++) {
    set(objects, W, x, 0, 7); set(collision, W, x, 0, 1);
    set(objects, W, x, H - 1, 7); set(collision, W, x, H - 1, 1);
  }

  // Dirt/stone path winding through the middle
  hline(ground, W, 0, 5, 5, 2);
  hline(ground, W, 4, 8, 4, 2);
  hline(ground, W, 8, 15, 5, 2);
  hline(ground, W, 14, 18, 4, 4);
  hline(ground, W, 18, 24, 5, 2);

  // Stone patches (rocky outcrops)
  rect(ground, W, 10, 2, 12, 3, 4);
  rect(objects, W, 10, 2, 12, 3, 15);
  rect(collision, W, 10, 2, 12, 3, 1);

  rect(ground, W, 19, 7, 21, 8, 4);
  rect(objects, W, 19, 7, 21, 8, 15);
  rect(collision, W, 19, 7, 21, 8, 1);

  // Scattered trees
  const trees = [[2,2],[3,7],[6,2],[7,7],[15,2],[16,7],[22,2],[23,7],[17,2],[8,8]];
  for (const [tx, ty] of trees) {
    set(objects, W, tx, ty, 7); set(collision, W, tx, ty, 1);
  }

  // Bushes
  const bushes = [[5,3],[9,7],[14,7],[20,3]];
  for (const [bx, by] of bushes) {
    set(objects, W, bx, by, 8); set(collision, W, bx, by, 1);
  }

  // Grass alt patches
  rect(ground, W, 1, 6, 3, 8, 9);
  rect(ground, W, 21, 1, 23, 3, 9);

  // Ensure exit tiles are walkable
  set(collision, W, 0, 5, 0); set(objects, W, 0, 5, 0);
  set(collision, W, 24, 5, 0); set(objects, W, 24, 5, 0);

  return {
    width: W, height: H, tileSize: 64, tileset: "rpg_base",
    layers: { ground, objects, collision },
    npcs: [
      { id: "trainer_r2_1", x: 6, y: 5, name: "훈련생 태호", sprite: "trainer", type: "trainer", trainerId: "route2_t1", dialog: "바위 사이를 지나려면 나를 이겨!" },
      { id: "trainer_r2_2", x: 16, y: 5, name: "훈련생 소라", sprite: "trainer", type: "trainer", trainerId: "route2_t2", dialog: "동굴 앞에서 기다리고 있었어!" },
      { id: "boss_route02", x: 22, y: 5, name: "바위의 파수꾼", sprite: "boss", type: "boss", dialog: "이 바위를 넘으려면 내 힘을 이겨라!" }
    ],
    exits: [
      { x: 0, y: 5, to: "town_02", spawnX: 14, spawnY: 6 },
      { x: 24, y: 5, to: "cave_01", spawnX: 1, spawnY: 7 }
    ],
    playerSpawn: { x: 1, y: 5 },
    hiddenEvents: [
      { x: 13, y: 3, type: "ancient_chest", requiredLevel: 10, description: "바위 틈 속에 고대의 보물상자가 숨겨져 있다!" }
    ]
  };
}

/* ================================================================== */
/*  2. cave_01  — 바위동굴 (18×14)                                     */
/* ================================================================== */
function makeCave01() {
  const W = 18, H = 14;
  const ground = fill(W, H, 15); // dark stone floor
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

  // Interior walls (winding path)
  // Horizontal wall segment top area
  hline(objects, W, 3, 10, 3, 6); hline(collision, W, 3, 10, 3, 1);
  // gap at x=6
  set(objects, W, 6, 3, 0); set(collision, W, 6, 3, 0);

  // Horizontal wall mid-left
  hline(objects, W, 1, 8, 6, 6); hline(collision, W, 1, 8, 6, 1);
  // gap at x=8
  set(objects, W, 8, 6, 0); set(collision, W, 8, 6, 0);

  // Horizontal wall mid-right
  hline(objects, W, 9, 16, 9, 6); hline(collision, W, 9, 16, 9, 1);
  // gap at x=12
  set(objects, W, 12, 9, 0); set(collision, W, 12, 9, 0);

  // Vertical wall segment
  vline(objects, W, 13, 3, 8, 6); vline(collision, W, 13, 3, 8, 1);
  // gap at y=5
  set(objects, W, 13, 5, 0); set(collision, W, 13, 5, 0);

  // Water pools (blocked)
  rect(ground, W, 2, 8, 4, 10, 3);
  rect(collision, W, 2, 8, 4, 10, 1);

  rect(ground, W, 14, 4, 16, 5, 3);
  rect(collision, W, 14, 4, 16, 5, 1);

  // Stone patches on ground for variety
  rect(ground, W, 5, 1, 8, 2, 4);
  rect(ground, W, 9, 10, 11, 12, 4);

  // Ensure exit tiles walkable
  // West exit
  set(objects, W, 0, 7, 0); set(collision, W, 0, 7, 0);
  // East exit
  set(objects, W, W - 1, 7, 0); set(collision, W, W - 1, 7, 0);

  return {
    width: W, height: H, tileSize: 64, tileset: "rpg_base",
    layers: { ground, objects, collision },
    npcs: [
      { id: "trainer_cave_1", x: 5, y: 5, name: "그림자단 수련생", sprite: "trainer", type: "trainer", trainerId: "cave1_t1", dialog: "그림자의 힘을 보여주마!" },
      { id: "trainer_cave_2", x: 10, y: 8, name: "그림자단 전사", sprite: "trainer", type: "trainer", trainerId: "cave1_t2", dialog: "이 동굴에서 나갈 수 없다!" }
    ],
    exits: [
      { x: 0, y: 7, to: "route_02", spawnX: 23, spawnY: 5 },
      { x: 17, y: 7, to: "town_03", spawnX: 1, spawnY: 6 }
    ],
    playerSpawn: { x: 1, y: 7 },
    hiddenEvents: [
      { x: 9, y: 11, type: "spirit_spring", requiredLevel: 12, description: "동굴 깊은 곳에서 영혼의 샘이 빛나고 있다. AP가 회복된다." }
    ]
  };
}

/* ================================================================== */
/*  3. town_03  — 해류항 (16×12)                                       */
/* ================================================================== */
function makeTown03() {
  const W = 16, H = 12;
  const ground = fill(W, H, 4); // stone base
  const objects = fill(W, H, 0);
  const collision = fill(W, H, 0);

  // Water tiles on east side (ocean) — rightmost 4 columns
  rect(ground, W, 12, 0, 15, 11, 3);
  rect(collision, W, 12, 0, 15, 11, 1);

  // Bridge over water at row 6
  hline(ground, W, 12, 15, 6, 5); // wood bridge
  hline(collision, W, 12, 15, 6, 0); // walkable

  // Dock wood tiles
  rect(ground, W, 10, 4, 11, 8, 5);

  // Left border trees
  for (let y = 0; y < H; y++) {
    if (y !== 6) { set(objects, W, 0, y, 7); set(collision, W, 0, y, 1); }
  }
  // Top/bottom borders
  for (let x = 0; x < 12; x++) {
    set(objects, W, x, 0, 7); set(collision, W, x, 0, 1);
    if (x < 12) { set(objects, W, x, H - 1, 7); set(collision, W, x, H - 1, 1); }
  }

  // Building 1: Shop (top-left area)
  rect(objects, W, 2, 2, 4, 4, 6); rect(collision, W, 2, 2, 4, 4, 1);
  set(objects, W, 3, 4, 14); set(collision, W, 3, 4, 0); // door
  hline(objects, W, 2, 4, 1, 13); // roof

  // Building 2: Healer (mid-left)
  rect(objects, W, 2, 7, 4, 9, 6); rect(collision, W, 2, 7, 4, 9, 1);
  set(objects, W, 3, 9, 14); set(collision, W, 3, 9, 0); // door
  hline(objects, W, 2, 4, 6, 13); // roof — but row 6 is exit row, place on objects only
  // Adjust: roof on row 6 for building visual, keep walkable on the path
  set(objects, W, 2, 6, 13); set(collision, W, 2, 6, 1);
  set(objects, W, 4, 6, 13); set(collision, W, 4, 6, 1);
  // x=3, y=6 stays walkable

  // Building 3: House (center)
  rect(objects, W, 6, 2, 8, 4, 6); rect(collision, W, 6, 2, 8, 4, 1);
  set(objects, W, 7, 4, 14); set(collision, W, 7, 4, 0); // door
  hline(objects, W, 6, 8, 1, 13);

  // Walkable ground in front of buildings
  // Ensure path from west exit (0,6) to south exit
  set(collision, W, 0, 6, 0); set(objects, W, 0, 6, 0);

  // South exit at bottom
  set(objects, W, 8, H - 1, 0); set(collision, W, 8, H - 1, 0);

  return {
    width: W, height: H, tileSize: 64, tileset: "rpg_base",
    layers: { ground, objects, collision },
    npcs: [
      { id: "shop_03", x: 3, y: 5, name: "항구 상점 주인", sprite: "shopkeeper", type: "shop", dialog: "항구에서 잡은 신선한 물건들이야!" },
      { id: "heal_03", x: 3, y: 10, name: "항구 치유사", sprite: "healer", type: "heal", dialog: "바다 바람이 치유해줄 거야." },
      { id: "citizen_03", x: 9, y: 6, name: "선원", sprite: "citizen", type: "dialog", dialog: "해류항에 온 걸 환영해! 남쪽에 체육관이 있어." },
      { id: "citizen_04", x: 6, y: 8, name: "어부", sprite: "citizen", type: "dialog", dialog: "바다 건너편에서 이상한 기운이 느껴져..." }
    ],
    exits: [
      { x: 0, y: 6, to: "cave_01", spawnX: 16, spawnY: 7 },
      { x: 8, y: 11, to: "gym_02", spawnX: 6, spawnY: 8 }
    ],
    playerSpawn: { x: 1, y: 6 },
    hiddenEvents: [
      { x: 11, y: 5, type: "memory_fragment", requiredLevel: 13, description: "부두 끝에서 바다의 기억이 떠오른다... 경험치를 얻었다." }
    ]
  };
}

/* ================================================================== */
/*  4. gym_02  — 해류 체육관 (12×10)                                    */
/* ================================================================== */
function makeGym02() {
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

  // Water pools on sides
  rect(ground, W, 1, 2, 3, 5, 3); rect(collision, W, 1, 2, 3, 5, 1);
  rect(ground, W, 8, 2, 10, 5, 3); rect(collision, W, 8, 2, 10, 5, 1);

  // Bookshelves at top
  hline(objects, W, 1, 4, 1, 20); hline(collision, W, 1, 4, 1, 1);
  hline(objects, W, 7, 10, 1, 20); hline(collision, W, 7, 10, 1, 1);

  // Exit at south center (2 tiles wide)
  set(objects, W, 5, H - 1, 0); set(collision, W, 5, H - 1, 0);
  set(objects, W, 6, H - 1, 0); set(collision, W, 6, H - 1, 0);

  return {
    width: W, height: H, tileSize: 64, tileset: "rpg_base",
    layers: { ground, objects, collision },
    npcs: [
      { id: "gym2_t1", x: 3, y: 7, name: "수련생 파도", sprite: "trainer", type: "trainer", trainerId: "gym2_t1", dialog: "물의 힘을 느껴봐라!" },
      { id: "gym2_t2", x: 8, y: 7, name: "수련생 해일", sprite: "trainer", type: "trainer", trainerId: "gym2_t2", dialog: "해류 체육관의 힘을 보여주마!" },
      { id: "gym_leader_02", x: 5, y: 2, name: "수호자 해류", sprite: "gym_leader", type: "gym_leader", trainerId: "gym_leader_02", dialog: "바다의 시련에 도전하는가? 파도를 이겨라!" }
    ],
    exits: [
      { x: 5, y: 9, to: "town_03", spawnX: 8, spawnY: 10 },
      { x: 6, y: 9, to: "town_03", spawnX: 8, spawnY: 10 }
    ],
    playerSpawn: { x: 5, y: 8 },
    hiddenEvents: []
  };
}

/* ================================================================== */
/*  5. route_03  — 3번 도로 (30×10)                                    */
/* ================================================================== */
function makeRoute03() {
  const W = 30, H = 10;
  const ground = fill(W, H, 1); // grass
  const objects = fill(W, H, 0);
  const collision = fill(W, H, 0);

  // Top & bottom tree borders
  for (let x = 0; x < W; x++) {
    set(objects, W, x, 0, 7); set(collision, W, x, 0, 1);
    set(objects, W, x, H - 1, 7); set(collision, W, x, H - 1, 1);
  }

  // Main dirt path
  hline(ground, W, 0, 6, 5, 2);
  hline(ground, W, 5, 10, 4, 2);
  hline(ground, W, 10, 18, 5, 2);
  hline(ground, W, 18, 22, 4, 2);
  hline(ground, W, 22, 29, 5, 2);

  // Water crossing 1 (with bridge)
  rect(ground, W, 8, 3, 9, 7, 3); rect(collision, W, 8, 3, 9, 7, 1);
  // Bridge across water
  hline(ground, W, 8, 9, 5, 5); hline(collision, W, 8, 9, 5, 0);

  // Water crossing 2
  rect(ground, W, 20, 2, 21, 7, 3); rect(collision, W, 20, 2, 21, 7, 1);
  // Bridge
  hline(ground, W, 20, 21, 4, 5); hline(collision, W, 20, 21, 4, 0);

  // Grass alt patches
  rect(ground, W, 2, 2, 4, 3, 9);
  rect(ground, W, 14, 7, 16, 8, 9);
  rect(ground, W, 26, 2, 28, 3, 9);

  // Scattered trees
  const trees = [[3,7],[6,2],[12,2],[13,7],[17,2],[24,2],[25,7],[28,7]];
  for (const [tx, ty] of trees) {
    set(objects, W, tx, ty, 7); set(collision, W, tx, ty, 1);
  }

  // Bushes
  const bushes = [[5,7],[11,7],[16,3],[23,7],[27,3]];
  for (const [bx, by] of bushes) {
    set(objects, W, bx, by, 8); set(collision, W, bx, by, 1);
  }

  // Ensure exits walkable
  set(collision, W, 0, 5, 0); set(objects, W, 0, 5, 0);
  set(collision, W, 29, 5, 0); set(objects, W, 29, 5, 0);

  return {
    width: W, height: H, tileSize: 64, tileset: "rpg_base",
    layers: { ground, objects, collision },
    npcs: [
      { id: "trainer_r3_1", x: 4, y: 5, name: "훈련생 현수", sprite: "trainer", type: "trainer", trainerId: "route3_t1", dialog: "여기서 쉬어갈 생각이야? 안 돼!" },
      { id: "trainer_r3_2", x: 13, y: 5, name: "훈련생 유나", sprite: "trainer", type: "trainer", trainerId: "route3_t2", dialog: "다리 위에서 한판 붙자!" },
      { id: "trainer_r3_3", x: 23, y: 5, name: "훈련생 지훈", sprite: "trainer", type: "trainer", trainerId: "route3_t3", dialog: "전격시티까지 갈 수 있을까?" },
      { id: "boss_route03", x: 27, y: 5, name: "폭풍의 사냥꾼", sprite: "boss", type: "boss", dialog: "폭풍이 온다! 살아남아 봐라!" }
    ],
    exits: [
      { x: 0, y: 5, to: "town_03", spawnX: 14, spawnY: 6 },
      { x: 29, y: 5, to: "town_04", spawnX: 1, spawnY: 6 }
    ],
    playerSpawn: { x: 1, y: 5 },
    hiddenEvents: [
      { x: 7, y: 3, type: "fairy_tea_party", requiredLevel: 14, description: "숲속에서 요정들의 다과회를 발견했다! 특별한 보상을 얻었다." },
      { x: 25, y: 3, type: "dark_altar", requiredLevel: 16, description: "어둠의 제단이 나타났다... 위험하지만 강해질 수 있다." }
    ]
  };
}

/* ================================================================== */
/*  6. town_04  — 전격시티 (16×12)                                     */
/* ================================================================== */
function makeTown04() {
  const W = 16, H = 12;
  const ground = fill(W, H, 4); // stone floors
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

  // Building 1: Shop (top area, left)
  rect(objects, W, 2, 2, 5, 4, 6); rect(collision, W, 2, 2, 5, 4, 1);
  set(objects, W, 3, 4, 14); set(collision, W, 3, 4, 0); // door
  hline(objects, W, 2, 5, 1, 13); hline(collision, W, 2, 5, 1, 1);

  // Building 2: Healer (top area, right)
  rect(objects, W, 8, 2, 11, 4, 6); rect(collision, W, 8, 2, 11, 4, 1);
  set(objects, W, 9, 4, 14); set(collision, W, 9, 4, 0); // door
  hline(objects, W, 8, 11, 1, 13); hline(collision, W, 8, 11, 1, 1);

  // Building 3: House (bottom area)
  rect(objects, W, 3, 8, 6, 10, 6); rect(collision, W, 3, 8, 6, 10, 1);
  set(objects, W, 4, 8, 14); set(collision, W, 4, 8, 0); // door
  hline(objects, W, 3, 6, 7, 13); hline(collision, W, 3, 6, 7, 1);

  // Building 4: House (bottom-right)
  rect(objects, W, 9, 8, 12, 10, 6); rect(collision, W, 9, 8, 12, 10, 1);
  set(objects, W, 10, 8, 14); set(collision, W, 10, 8, 0); // door
  hline(objects, W, 9, 12, 7, 13); hline(collision, W, 9, 12, 7, 1);

  // West exit
  set(objects, W, 0, 6, 0); set(collision, W, 0, 6, 0);
  // North exit (gym_03)
  set(objects, W, 7, 0, 0); set(collision, W, 7, 0, 0);

  return {
    width: W, height: H, tileSize: 64, tileset: "rpg_base",
    layers: { ground, objects, collision },
    npcs: [
      { id: "shop_04", x: 3, y: 5, name: "전격시티 상점", sprite: "shopkeeper", type: "shop", dialog: "전격시티에 온 걸 환영해! 최신 장비가 있어." },
      { id: "heal_04", x: 9, y: 5, name: "전격시티 치유사", sprite: "healer", type: "heal", dialog: "전기 에너지로 회복시켜줄게." },
      { id: "citizen_05", x: 7, y: 8, name: "발명가", sprite: "citizen", type: "dialog", dialog: "전격시티의 에너지는 번개에서 온다구!" },
      { id: "citizen_06", x: 12, y: 6, name: "기술자", sprite: "citizen", type: "dialog", dialog: "북쪽에 전격 체육관이 있어. 전기 타입을 조심해!" }
    ],
    exits: [
      { x: 0, y: 6, to: "route_03", spawnX: 28, spawnY: 5 },
      { x: 7, y: 0, to: "gym_03", spawnX: 5, spawnY: 8 }
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
    if (gnd === 3 && col !== 1 && obj !== 5) { // water blocked unless bridge (wood)
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
  route_02: makeRoute02(),
  cave_01: makeCave01(),
  town_03: makeTown03(),
  gym_02: makeGym02(),
  route_03: makeRoute03(),
  town_04: makeTown04(),
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

console.log("\nDone! 6 tilemaps generated for Chapter 2-3.");
