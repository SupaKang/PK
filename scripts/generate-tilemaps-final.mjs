/**
 * generate-tilemaps-final.mjs
 * Generates 7 final tilemap JSON files for the endgame content.
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

function border(objects, collision, W, H, tile) {
  for (let x = 0; x < W; x++) {
    set(objects, W, x, 0, tile); set(collision, W, x, 0, 1);
    set(objects, W, x, H - 1, tile); set(collision, W, x, H - 1, 1);
  }
  for (let y = 0; y < H; y++) {
    set(objects, W, 0, y, tile); set(collision, W, 0, y, 1);
    set(objects, W, W - 1, y, tile); set(collision, W, W - 1, y, 1);
  }
}

function writeMap(name, data) {
  const path = join(OUT_DIR, `${name}.json`);
  writeFileSync(path, JSON.stringify(data));
  console.log(`  ✓ ${name}.json  (${data.width}×${data.height})`);
}

/* ================================================================== */
/*  1. gym_07  — 용린 체육관 (14×12)                                    */
/*  Dragon gym. Dark stone floor, lava decorations. Grand.             */
/* ================================================================== */
function makeGym07() {
  const W = 14, H = 12;
  const ground = fill(W, H, 15); // dark stone floor
  const objects = fill(W, H, 0);
  const collision = fill(W, H, 0);

  // Border walls
  border(objects, collision, W, H, 6);

  // Lava decorations on sides
  vline(ground, W, 1, 1, 10, 12); vline(collision, W, 1, 1, 10, 1);
  vline(ground, W, 12, 1, 10, 12); vline(collision, W, 12, 1, 10, 1);

  // Additional lava pools
  set(ground, W, 3, 2, 12); set(collision, W, 3, 2, 1);
  set(ground, W, 10, 2, 12); set(collision, W, 10, 2, 1);
  set(ground, W, 3, 8, 12); set(collision, W, 3, 8, 1);
  set(ground, W, 10, 8, 12); set(collision, W, 10, 8, 1);

  // Carpet path to leader
  vline(ground, W, 6, 1, 10, 19);
  vline(ground, W, 7, 1, 10, 19);

  // Gym leader platform at top
  rect(objects, W, 4, 1, 9, 2, 15); rect(collision, W, 4, 1, 9, 2, 1);
  // Openings for leader and carpet path
  set(objects, W, 6, 1, 0); set(collision, W, 6, 1, 0);
  set(objects, W, 7, 1, 0); set(collision, W, 7, 1, 0);
  set(objects, W, 6, 2, 0); set(collision, W, 6, 2, 0);
  set(objects, W, 7, 2, 0); set(collision, W, 7, 2, 0);

  // Pillar decorations
  set(objects, W, 4, 5, 15); set(collision, W, 4, 5, 1);
  set(objects, W, 9, 5, 15); set(collision, W, 9, 5, 1);
  set(objects, W, 4, 8, 15); set(collision, W, 4, 8, 1);
  set(objects, W, 9, 8, 15); set(collision, W, 9, 8, 1);

  // Exit opening south
  set(objects, W, 6, 11, 0); set(collision, W, 6, 11, 0);
  set(objects, W, 7, 11, 0); set(collision, W, 7, 11, 0);

  return {
    width: W, height: H, tileSize: 64, tileset: "rpg_base",
    layers: { ground, objects, collision },
    npcs: [
      { id: "gym7_t1", x: 5, y: 7, name: "용기사 화염", sprite: "trainer", type: "trainer", trainerId: "gym7_t1", dialog: "드래곤의 화염을 맛봐라!" },
      { id: "gym7_t2", x: 8, y: 5, name: "용기사 비늘", sprite: "trainer", type: "trainer", trainerId: "gym7_t2", dialog: "용의 비늘만큼 단단한 방어를 보여주지!" },
      { id: "gym_leader_07", x: 6, y: 1, name: "관장 용린", sprite: "gym_leader", type: "gym_leader", trainerId: "gym_leader_07", dialog: "용린 체육관에 온 것을 환영한다! 드래곤의 위엄을 보여주마!" },
    ],
    exits: [
      { x: 6, y: 11, to: "town_08", spawnX: 7, spawnY: 1 },
      { x: 7, y: 11, to: "town_08", spawnX: 8, spawnY: 1 },
    ],
    playerSpawn: { x: 6, y: 10 },
    hiddenEvents: [],
  };
}

/* ================================================================== */
/*  2. route_08  — 8번 도로 (20×10)                                     */
/*  Dark path to shadow base. Dark stone ground, dead trees.           */
/* ================================================================== */
function makeRoute08() {
  const W = 20, H = 10;
  const ground = fill(W, H, 15); // dark stone
  const objects = fill(W, H, 0);
  const collision = fill(W, H, 0);

  // Border walls (trees top/bottom)
  for (let x = 0; x < W; x++) {
    set(objects, W, x, 0, 7); set(collision, W, x, 0, 1);
    set(objects, W, x, H - 1, 7); set(collision, W, x, H - 1, 1);
  }

  // Dirt path through center
  hline(ground, W, 0, 19, 4, 2);
  hline(ground, W, 0, 19, 5, 2);

  // Sparse dead trees (bushes)
  const deadTrees = [[3, 2], [7, 1], [12, 2], [16, 1], [5, 7], [10, 8], [14, 7], [18, 8]];
  for (const [tx, ty] of deadTrees) {
    set(objects, W, tx, ty, 8); set(collision, W, tx, ty, 1);
  }

  // Dark stone boulders
  set(objects, W, 9, 3, 15); set(collision, W, 9, 3, 1);
  set(objects, W, 15, 6, 15); set(collision, W, 15, 6, 1);

  // Exit openings
  set(objects, W, 0, 4, 0); set(objects, W, 0, 5, 0);
  set(objects, W, 19, 4, 0); set(objects, W, 19, 5, 0);

  return {
    width: W, height: H, tileSize: 64, tileset: "rpg_base",
    layers: { ground, objects, collision },
    npcs: [
      { id: "route8_t1", x: 6, y: 4, name: "그림자 정찰병 암영", sprite: "trainer", type: "trainer", trainerId: "route8_t1", dialog: "이 길 너머에는 그림자단의 비밀기지가 있다!" },
      { id: "route8_t2", x: 14, y: 5, name: "그림자 정찰병 흑월", sprite: "trainer", type: "trainer", trainerId: "route8_t2", dialog: "여기서 더 이상 전진할 수 없을 거야!" },
    ],
    exits: [
      { x: 0, y: 4, to: "town_08", spawnX: 14, spawnY: 6 },
      { x: 0, y: 5, to: "town_08", spawnX: 14, spawnY: 6 },
      { x: 19, y: 4, to: "shadow_base", spawnX: 1, spawnY: 8 },
      { x: 19, y: 5, to: "shadow_base", spawnX: 1, spawnY: 8 },
    ],
    playerSpawn: { x: 1, y: 4 },
    hiddenEvents: [],
  };
}

/* ================================================================== */
/*  3. shadow_base  — 그림자단 비밀기지 (20×16)                          */
/*  Underground base. Dark stone, carpet paths, bookshelves. Maze.     */
/* ================================================================== */
function makeShadowBase() {
  const W = 20, H = 16;
  const ground = fill(W, H, 15); // dark stone
  const objects = fill(W, H, 0);
  const collision = fill(W, H, 0);

  // Border walls
  border(objects, collision, W, H, 6);

  // Carpet main corridors
  hline(ground, W, 1, 18, 8, 19);
  vline(ground, W, 10, 1, 14, 19);

  // Inner maze walls
  // Horizontal walls
  rect(objects, W, 2, 3, 7, 3, 6); rect(collision, W, 2, 3, 7, 3, 1);
  rect(objects, W, 12, 3, 17, 3, 6); rect(collision, W, 12, 3, 17, 3, 1);
  rect(objects, W, 4, 6, 8, 6, 6); rect(collision, W, 4, 6, 8, 6, 1);
  rect(objects, W, 12, 6, 16, 6, 6); rect(collision, W, 12, 6, 16, 6, 1);
  rect(objects, W, 2, 10, 7, 10, 6); rect(collision, W, 2, 10, 7, 10, 1);
  rect(objects, W, 12, 10, 17, 10, 6); rect(collision, W, 12, 10, 17, 10, 1);
  rect(objects, W, 4, 13, 8, 13, 6); rect(collision, W, 4, 13, 8, 13, 1);
  rect(objects, W, 12, 13, 16, 13, 6); rect(collision, W, 12, 13, 16, 13, 1);

  // Openings in walls for navigation
  set(objects, W, 5, 3, 0); set(collision, W, 5, 3, 0);
  set(objects, W, 14, 3, 0); set(collision, W, 14, 3, 0);
  set(objects, W, 6, 6, 0); set(collision, W, 6, 6, 0);
  set(objects, W, 14, 6, 0); set(collision, W, 14, 6, 0);
  set(objects, W, 4, 10, 0); set(collision, W, 4, 10, 0);
  set(objects, W, 15, 10, 0); set(collision, W, 15, 10, 0);
  set(objects, W, 6, 13, 0); set(collision, W, 6, 13, 0);
  set(objects, W, 14, 13, 0); set(collision, W, 14, 13, 0);

  // Bookshelves in rooms
  rect(objects, W, 2, 1, 4, 1, 20); rect(collision, W, 2, 1, 4, 1, 1);
  rect(objects, W, 15, 1, 17, 1, 20); rect(collision, W, 15, 1, 17, 1, 1);
  rect(objects, W, 2, 11, 3, 11, 20); rect(collision, W, 2, 11, 3, 11, 1);
  rect(objects, W, 16, 11, 17, 11, 20); rect(collision, W, 16, 11, 17, 11, 1);

  // Exit openings
  set(objects, W, 0, 8, 0); set(collision, W, 0, 8, 0);
  set(objects, W, 19, 8, 0); set(collision, W, 19, 8, 0);

  return {
    width: W, height: H, tileSize: 64, tileset: "rpg_base",
    layers: { ground, objects, collision },
    npcs: [
      { id: "shadow_t1", x: 4, y: 2, name: "그림자단원 암흑", sprite: "trainer", type: "trainer", trainerId: "shadow_t1", dialog: "침입자다! 여기서 막아라!" },
      { id: "shadow_t2", x: 15, y: 5, name: "그림자단원 흑영", sprite: "trainer", type: "trainer", trainerId: "shadow_t2", dialog: "비밀기지에서 벗어날 수 없다!" },
      { id: "shadow_t3", x: 3, y: 12, name: "그림자 간부 명월", sprite: "trainer", type: "trainer", trainerId: "shadow_t3", dialog: "그림자단의 힘을 보여주겠다!" },
      { id: "shadow_t4", x: 16, y: 14, name: "그림자 간부 암살", sprite: "trainer", type: "trainer", trainerId: "shadow_t4", dialog: "마지막 관문이다. 통과할 수 없을 것이다!" },
    ],
    exits: [
      { x: 0, y: 8, to: "route_08", spawnX: 18, spawnY: 4 },
      { x: 19, y: 8, to: "town_09", spawnX: 1, spawnY: 6 },
    ],
    playerSpawn: { x: 1, y: 8 },
    hiddenEvents: [
      { x: 8, y: 2, type: "shadow_document", requiredLevel: 30, description: "그림자단의 비밀 문서를 발견했다! 그들의 계획이 적혀있다..." },
      { x: 16, y: 12, type: "shadow_cache", requiredLevel: 31, description: "그림자단의 비밀 보급품을 발견했다!" },
    ],
  };
}

/* ================================================================== */
/*  4. town_09  — 암흑성채 (16×12)                                      */
/*  Dark fortress town. Stone/dark stone. Shop, healer.                */
/* ================================================================== */
function makeTown09() {
  const W = 16, H = 12;
  const ground = fill(W, H, 4); // stone
  const objects = fill(W, H, 0);
  const collision = fill(W, H, 0);

  // Border walls (dark stone)
  border(objects, collision, W, H, 15);

  // Main road (carpet)
  hline(ground, W, 0, 15, 6, 19);

  // Dark stone areas
  rect(ground, W, 0, 0, 15, 2, 15);
  rect(ground, W, 0, 9, 15, 11, 15);

  // Building 1: Shop (top-left)
  rect(objects, W, 2, 2, 5, 4, 6); rect(collision, W, 2, 2, 5, 4, 1);
  set(objects, W, 3, 4, 14); set(collision, W, 3, 4, 0);
  hline(objects, W, 2, 5, 1, 13); hline(collision, W, 2, 5, 1, 1);

  // Building 2: Healer (top-right)
  rect(objects, W, 10, 2, 13, 4, 6); rect(collision, W, 10, 2, 13, 4, 1);
  set(objects, W, 11, 4, 14); set(collision, W, 11, 4, 0);
  hline(objects, W, 10, 13, 1, 13); hline(collision, W, 10, 13, 1, 1);

  // Fortress towers (dark stone pillars)
  set(objects, W, 4, 8, 15); set(collision, W, 4, 8, 1);
  set(objects, W, 11, 8, 15); set(collision, W, 11, 8, 1);
  set(objects, W, 4, 10, 15); set(collision, W, 4, 10, 1);
  set(objects, W, 11, 10, 15); set(collision, W, 11, 10, 1);

  // Exit openings
  set(objects, W, 0, 6, 0); set(collision, W, 0, 6, 0);
  set(objects, W, 7, 0, 0); set(collision, W, 7, 0, 0);
  set(objects, W, 8, 0, 0); set(collision, W, 8, 0, 0);

  return {
    width: W, height: H, tileSize: 64, tileset: "rpg_base",
    layers: { ground, objects, collision },
    npcs: [
      { id: "shop_09", x: 3, y: 5, name: "암흑성채 상점", sprite: "shopkeeper", type: "shop", dialog: "최후의 전투를 위한 장비를 갖춰가!" },
      { id: "heal_09", x: 11, y: 5, name: "암흑성채 치유사", sprite: "healer", type: "heal", dialog: "어둠 속에서도 치유의 빛은 있다." },
      { id: "citizen_t9_1", x: 7, y: 8, name: "암흑 기사", sprite: "citizen", type: "dialog", dialog: "북쪽에 마지막 체육관이 있다. 최강의 관장이 기다리고 있지." },
      { id: "citizen_t9_2", x: 13, y: 6, name: "방랑 학자", sprite: "citizen", type: "dialog", dialog: "이 성채 너머에 챔피언 로드가 있다고 한다..." },
    ],
    exits: [
      { x: 0, y: 6, to: "shadow_base", spawnX: 18, spawnY: 8 },
      { x: 7, y: 0, to: "gym_08", spawnX: 6, spawnY: 10 },
      { x: 8, y: 0, to: "gym_08", spawnX: 7, spawnY: 10 },
    ],
    playerSpawn: { x: 1, y: 6 },
    hiddenEvents: [],
  };
}

/* ================================================================== */
/*  5. gym_08  — 암흑 체육관 (14×12)                                    */
/*  Final gym. Dark, grand. Dark stone + carpet + lava.                */
/* ================================================================== */
function makeGym08() {
  const W = 14, H = 12;
  const ground = fill(W, H, 15); // dark stone
  const objects = fill(W, H, 0);
  const collision = fill(W, H, 0);

  // Border walls
  border(objects, collision, W, H, 6);

  // Lava moats on sides
  vline(ground, W, 1, 1, 10, 12); vline(collision, W, 1, 1, 10, 1);
  vline(ground, W, 2, 1, 10, 12); vline(collision, W, 2, 1, 10, 1);
  vline(ground, W, 11, 1, 10, 12); vline(collision, W, 11, 1, 10, 1);
  vline(ground, W, 12, 1, 10, 12); vline(collision, W, 12, 1, 10, 1);

  // Carpet path center
  vline(ground, W, 6, 1, 10, 19);
  vline(ground, W, 7, 1, 10, 19);

  // Dark stone platforms
  rect(ground, W, 4, 1, 9, 2, 15);
  set(objects, W, 4, 3, 15); set(collision, W, 4, 3, 1);
  set(objects, W, 9, 3, 15); set(collision, W, 9, 3, 1);

  // Pillars
  set(objects, W, 4, 5, 15); set(collision, W, 4, 5, 1);
  set(objects, W, 9, 5, 15); set(collision, W, 9, 5, 1);
  set(objects, W, 4, 8, 15); set(collision, W, 4, 8, 1);
  set(objects, W, 9, 8, 15); set(collision, W, 9, 8, 1);

  // Additional lava pools
  set(ground, W, 5, 5, 12); set(collision, W, 5, 5, 1);
  set(ground, W, 8, 5, 12); set(collision, W, 8, 5, 1);
  set(ground, W, 5, 8, 12); set(collision, W, 5, 8, 1);
  set(ground, W, 8, 8, 12); set(collision, W, 8, 8, 1);

  // Exit openings south
  set(objects, W, 6, 11, 0); set(collision, W, 6, 11, 0);
  set(objects, W, 7, 11, 0); set(collision, W, 7, 11, 0);

  return {
    width: W, height: H, tileSize: 64, tileset: "rpg_base",
    layers: { ground, objects, collision },
    npcs: [
      { id: "gym8_t1", x: 5, y: 7, name: "암흑 전사 야광", sprite: "trainer", type: "trainer", trainerId: "gym8_t1", dialog: "어둠의 힘 앞에 무릎을 꿇어라!" },
      { id: "gym8_t2", x: 8, y: 4, name: "암흑 전사 명암", sprite: "trainer", type: "trainer", trainerId: "gym8_t2", dialog: "빛은 어둠 앞에서 무력하다!" },
      { id: "gym_leader_08", x: 6, y: 1, name: "관장 암흑", sprite: "gym_leader", type: "gym_leader", trainerId: "gym_leader_08", dialog: "마지막 체육관에 온 것을 환영한다! 암흑의 시련을 이겨봐라!" },
    ],
    exits: [
      { x: 6, y: 11, to: "town_09", spawnX: 7, spawnY: 1 },
      { x: 7, y: 11, to: "town_09", spawnX: 8, spawnY: 1 },
    ],
    playerSpawn: { x: 6, y: 10 },
    hiddenEvents: [],
  };
}

/* ================================================================== */
/*  6. route_09  — 챔피언 로드 (30×12)                                   */
/*  Champion's road. Long, challenging. Stone/dark paths.              */
/* ================================================================== */
function makeRoute09() {
  const W = 30, H = 12;
  const ground = fill(W, H, 4); // stone
  const objects = fill(W, H, 0);
  const collision = fill(W, H, 0);

  // Border walls (dark stone top/bottom)
  for (let x = 0; x < W; x++) {
    set(objects, W, x, 0, 15); set(collision, W, x, 0, 1);
    set(objects, W, x, H - 1, 15); set(collision, W, x, H - 1, 1);
  }

  // Dark stone path sections
  rect(ground, W, 0, 4, 29, 7, 15);

  // Carpet highlights on the road
  hline(ground, W, 0, 29, 5, 19);
  hline(ground, W, 0, 29, 6, 19);

  // Stone obstacles (walls creating challenge)
  rect(objects, W, 5, 2, 6, 4, 6); rect(collision, W, 5, 2, 6, 4, 1);
  rect(objects, W, 5, 7, 6, 9, 6); rect(collision, W, 5, 7, 6, 9, 1);

  rect(objects, W, 12, 1, 13, 5, 6); rect(collision, W, 12, 1, 13, 5, 1);
  rect(objects, W, 12, 7, 13, 10, 6); rect(collision, W, 12, 7, 13, 10, 1);

  rect(objects, W, 19, 2, 20, 4, 6); rect(collision, W, 19, 2, 20, 4, 1);
  rect(objects, W, 19, 7, 20, 9, 6); rect(collision, W, 19, 7, 20, 9, 1);

  rect(objects, W, 25, 1, 26, 5, 6); rect(collision, W, 25, 1, 26, 5, 1);
  rect(objects, W, 25, 7, 26, 10, 6); rect(collision, W, 25, 7, 26, 10, 1);

  // Lava decorations
  set(ground, W, 8, 2, 12); set(collision, W, 8, 2, 1);
  set(ground, W, 8, 9, 12); set(collision, W, 8, 9, 1);
  set(ground, W, 16, 2, 12); set(collision, W, 16, 2, 1);
  set(ground, W, 16, 9, 12); set(collision, W, 16, 9, 1);
  set(ground, W, 23, 2, 12); set(collision, W, 23, 2, 1);
  set(ground, W, 23, 9, 12); set(collision, W, 23, 9, 1);

  return {
    width: W, height: H, tileSize: 64, tileset: "rpg_base",
    layers: { ground, objects, collision },
    npcs: [
      { id: "route9_t1", x: 8, y: 5, name: "에이스 트레이너 진격", sprite: "trainer", type: "trainer", trainerId: "route9_t1", dialog: "챔피언 로드를 통과하려면 나를 이겨야 한다!" },
      { id: "route9_t2", x: 16, y: 6, name: "에이스 트레이너 최강", sprite: "trainer", type: "trainer", trainerId: "route9_t2", dialog: "여기까지 온 건 대단하지만, 여기서 끝이다!" },
      { id: "route9_t3", x: 23, y: 5, name: "에이스 트레이너 전설", sprite: "trainer", type: "trainer", trainerId: "route9_t3", dialog: "마왕성 앞의 마지막 관문이다! 각오해라!" },
    ],
    exits: [
      { x: 0, y: 5, to: "town_09", spawnX: 14, spawnY: 6 },
      { x: 0, y: 6, to: "town_09", spawnX: 14, spawnY: 6 },
      { x: 29, y: 5, to: "elite_four", spawnX: 1, spawnY: 18 },
      { x: 29, y: 6, to: "elite_four", spawnX: 1, spawnY: 18 },
    ],
    playerSpawn: { x: 1, y: 5 },
    hiddenEvents: [],
  };
}

/* ================================================================== */
/*  7. elite_four  — 마왕성 (20×20)                                     */
/*  Final area. Grand dark castle. Carpet path, lava moats, throne.    */
/* ================================================================== */
function makeEliteFour() {
  const W = 20, H = 20;
  const ground = fill(W, H, 15); // dark stone
  const objects = fill(W, H, 0);
  const collision = fill(W, H, 0);

  // Border walls
  border(objects, collision, W, H, 6);

  // Lava moats along inner walls
  hline(ground, W, 2, 17, 1, 12); hline(collision, W, 2, 17, 1, 1);
  hline(ground, W, 2, 17, 18, 12); hline(collision, W, 2, 17, 18, 1);
  vline(ground, W, 1, 2, 17, 12); vline(collision, W, 1, 2, 17, 1);
  vline(ground, W, 18, 2, 17, 12); vline(collision, W, 18, 2, 17, 1);

  // Open lava moat at entrance
  set(ground, W, 1, 18, 15); set(collision, W, 1, 18, 0);

  // Grand carpet path from entrance to throne
  vline(ground, W, 9, 2, 18, 19);
  vline(ground, W, 10, 2, 18, 19);

  // Cross carpet at midpoint
  hline(ground, W, 3, 16, 10, 19);

  // Throne area at top
  rect(ground, W, 6, 2, 13, 4, 19);
  rect(objects, W, 6, 2, 8, 3, 15); rect(collision, W, 6, 2, 8, 3, 1);
  rect(objects, W, 11, 2, 13, 3, 15); rect(collision, W, 11, 2, 13, 3, 1);
  // Throne center opening
  set(objects, W, 9, 2, 0); set(collision, W, 9, 2, 0);
  set(objects, W, 10, 2, 0); set(collision, W, 10, 2, 0);
  set(objects, W, 9, 3, 0); set(collision, W, 9, 3, 0);
  set(objects, W, 10, 3, 0); set(collision, W, 10, 3, 0);

  // Pillars along carpet path
  const pillarPositions = [[5, 6], [14, 6], [5, 10], [14, 10], [5, 14], [14, 14]];
  for (const [px, py] of pillarPositions) {
    set(objects, W, px, py, 15); set(collision, W, px, py, 1);
  }

  // Lava decoration pools in corners of rooms
  rect(ground, W, 3, 3, 4, 4, 12); rect(collision, W, 3, 3, 4, 4, 1);
  rect(ground, W, 15, 3, 16, 4, 12); rect(collision, W, 15, 3, 16, 4, 1);
  rect(ground, W, 3, 15, 4, 16, 12); rect(collision, W, 3, 15, 4, 16, 1);
  rect(ground, W, 15, 15, 16, 16, 12); rect(collision, W, 15, 15, 16, 16, 1);

  // Exit opening south
  set(objects, W, 9, 19, 0); set(collision, W, 9, 19, 0);
  set(objects, W, 10, 19, 0); set(collision, W, 10, 19, 0);

  return {
    width: W, height: H, tileSize: 64, tileset: "rpg_base",
    layers: { ground, objects, collision },
    npcs: [
      { id: "elite_1", x: 7, y: 14, name: "사천왕 화룡", sprite: "trainer", type: "trainer", trainerId: "elite_1", dialog: "사천왕 첫 번째 관문이다! 불꽃의 시련을 받아라!" },
      { id: "elite_2", x: 12, y: 14, name: "사천왕 빙결", sprite: "trainer", type: "trainer", trainerId: "elite_2", dialog: "얼음의 심판이 너를 기다린다!" },
      { id: "elite_3", x: 7, y: 8, name: "사천왕 뇌광", sprite: "trainer", type: "trainer", trainerId: "elite_3", dialog: "번개의 속도를 따라올 수 있겠나!" },
      { id: "elite_4", x: 12, y: 8, name: "사천왕 암흑", sprite: "trainer", type: "trainer", trainerId: "elite_4", dialog: "마지막 사천왕! 어둠의 끝을 보여주마!" },
      { id: "champion", x: 9, y: 2, name: "챔피언 마왕", sprite: "gym_leader", type: "gym_leader", trainerId: "champion", dialog: "드디어 여기까지 왔구나! 포켓 킹덤 최강의 챔피언, 마왕에게 도전하는가!" },
    ],
    exits: [
      { x: 9, y: 19, to: "route_09", spawnX: 28, spawnY: 5 },
      { x: 10, y: 19, to: "route_09", spawnX: 28, spawnY: 6 },
    ],
    playerSpawn: { x: 9, y: 17 },
    hiddenEvents: [
      { x: 9, y: 5, type: "champion_aura", requiredLevel: 35, description: "챔피언의 기운이 느껴진다... 최후의 전투가 가까워지고 있다!" },
    ],
  };
}

/* ================================================================== */
/*  Validation                                                         */
/* ================================================================== */
function validate(name, map) {
  const { width: W, height: H, layers } = map;
  const size = W * H;
  const errors = [];

  for (const layerName of ["ground", "objects", "collision"]) {
    if (!layers[layerName]) {
      errors.push(`Missing layer: ${layerName}`);
    } else if (layers[layerName].length !== size) {
      errors.push(`Layer "${layerName}" size ${layers[layerName].length} != expected ${size} (${W}×${H})`);
    }
  }

  if (!map.playerSpawn) errors.push("Missing playerSpawn");
  if (!map.exits || map.exits.length === 0) errors.push("Missing exits");
  if (!map.npcs) errors.push("Missing npcs");
  if (!Array.isArray(map.hiddenEvents)) errors.push("Missing hiddenEvents array");

  // Validate player spawn is walkable
  if (map.playerSpawn) {
    const idx = map.playerSpawn.y * W + map.playerSpawn.x;
    if (layers.collision[idx] === 1) {
      errors.push(`Player spawn (${map.playerSpawn.x},${map.playerSpawn.y}) is on a collision tile`);
    }
  }

  // Validate NPC positions are walkable
  for (const npc of map.npcs) {
    const idx = npc.y * W + npc.x;
    if (layers.collision[idx] === 1) {
      errors.push(`NPC "${npc.id}" at (${npc.x},${npc.y}) is on a collision tile`);
    }
  }

  // Validate exit positions
  for (const exit of map.exits) {
    if (exit.x < 0 || exit.x >= W || exit.y < 0 || exit.y >= H) {
      errors.push(`Exit to "${exit.to}" at (${exit.x},${exit.y}) is out of bounds`);
    }
  }

  if (errors.length > 0) {
    console.error(`  ✗ ${name}: VALIDATION FAILED`);
    for (const e of errors) console.error(`      - ${e}`);
    return false;
  }
  console.log(`  ✓ ${name}: valid`);
  return true;
}

/* ================================================================== */
/*  Main                                                               */
/* ================================================================== */
console.log("Generating final tilemaps...\n");

const maps = {
  gym_07: makeGym07(),
  route_08: makeRoute08(),
  shadow_base: makeShadowBase(),
  town_09: makeTown09(),
  gym_08: makeGym08(),
  route_09: makeRoute09(),
  elite_four: makeEliteFour(),
};

console.log("\nWriting files...");
for (const [name, data] of Object.entries(maps)) {
  writeMap(name, data);
}

console.log("\nValidating...");
let allValid = true;
for (const [name, data] of Object.entries(maps)) {
  if (!validate(name, data)) allValid = false;
}

if (!allValid) {
  console.error("\n✗ Some maps failed validation!");
  process.exit(1);
} else {
  console.log("\n✓ All 7 maps generated and validated successfully!");
}
