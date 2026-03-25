import fs from 'fs';

const OUT = 'public/data/tilemaps';

function fill(w, h, val) { return Array(w * h).fill(val); }
function set(arr, w, x, y, val) { if (x >= 0 && y >= 0 && x < w) arr[y * w + x] = val; }
function fillRect(arr, w, x, y, rw, rh, val) {
  for (let dy = 0; dy < rh; dy++)
    for (let dx = 0; dx < rw; dx++)
      set(arr, w, x + dx, y + dy, val);
}

// ═══════════════════════════════════════════
// town_01 — 시작의 마을 (16x12)
// ═══════════════════════════════════════════
function genTown01() {
  const W = 16, H = 12;
  const ground = fill(W, H, 1); // all grass
  const objects = fill(W, H, 0);
  const collision = fill(W, H, 0);

  // Dirt paths (cross shape)
  for (let x = 0; x < W; x++) { set(ground, W, x, 6, 2); } // horizontal path
  for (let y = 0; y < H; y++) { set(ground, W, 8, y, 2); }  // vertical path

  // Trees along edges
  for (let x = 0; x < W; x++) { set(objects, W, x, 0, 7); set(collision, W, x, 0, 1); }
  for (let x = 0; x < W; x++) { set(objects, W, x, H-1, 7); set(collision, W, x, H-1, 1); }
  for (let y = 0; y < H; y++) { set(objects, W, 0, y, 7); set(collision, W, 0, y, 1); }

  // Clear exit on right edge
  set(objects, W, 0, 6, 0); set(collision, W, 0, 6, 0); // west opening
  set(objects, W, W-1, 6, 0); set(collision, W, W-1, 6, 0); // east exit clear

  // House 1 (top-left)
  fillRect(objects, W, 2, 2, 3, 2, 6); fillRect(collision, W, 2, 2, 3, 2, 1);
  set(objects, W, 3, 3, 14); set(collision, W, 3, 3, 0); // door

  // Shop (top-right)
  fillRect(objects, W, 10, 2, 3, 2, 4); fillRect(collision, W, 10, 2, 3, 2, 1);
  set(objects, W, 11, 3, 14); set(collision, W, 11, 3, 0); // door

  // Healer (bottom-left)
  fillRect(objects, W, 2, 8, 3, 2, 4); fillRect(collision, W, 2, 8, 3, 2, 1);
  set(objects, W, 3, 9, 14); set(collision, W, 3, 9, 0); // door

  // Bushes / flowers
  set(objects, W, 5, 4, 8); set(collision, W, 5, 4, 1);
  set(objects, W, 6, 4, 9); set(collision, W, 6, 4, 1);
  set(objects, W, 13, 4, 8); set(collision, W, 13, 4, 1);
  set(objects, W, 14, 8, 8); set(collision, W, 14, 8, 1);

  return {
    width: W, height: H, tileSize: 64, tileset: 'rpg_base',
    layers: { ground, objects, collision },
    npcs: [
      { id: 'shop_01', x: 11, y: 4, name: '상점 주인', sprite: 'shopkeeper', type: 'shop', dialog: '어서와! 뭐가 필요하니?' },
      { id: 'heal_01', x: 3, y: 10, name: '치유사', sprite: 'healer', type: 'heal', dialog: '쉬어가렴. 회복시켜줄게.' },
      { id: 'citizen_01', x: 6, y: 6, name: '마을 주민', sprite: 'citizen', type: 'dialog', dialog: '동쪽으로 가면 1번 도로가 나와.' },
    ],
    exits: [
      { x: 15, y: 6, to: 'route_01', spawnX: 0, spawnY: 5 },
    ],
    playerSpawn: { x: 8, y: 8 },
  };
}

// ═══════════════════════════════════════════
// route_01 — 1번 도로 (25x10)
// ═══════════════════════════════════════════
function genRoute01() {
  const W = 25, H = 10;
  const ground = fill(W, H, 1); // grass
  const objects = fill(W, H, 0);
  const collision = fill(W, H, 0);

  // Dirt path winding
  for (let x = 0; x < W; x++) { set(ground, W, x, 5, 2); }
  // Path bends
  set(ground, W, 8, 4, 2); set(ground, W, 8, 3, 2);
  set(ground, W, 9, 3, 2); set(ground, W, 10, 3, 2);
  set(ground, W, 16, 4, 2); set(ground, W, 16, 6, 2);
  set(ground, W, 16, 7, 2);

  // Trees top/bottom edges
  for (let x = 0; x < W; x++) {
    set(objects, W, x, 0, 7); set(collision, W, x, 0, 1);
    set(objects, W, x, H-1, 7); set(collision, W, x, H-1, 1);
  }

  // Scattered trees
  [3,7,12,18,22].forEach(x => { set(objects, W, x, 2, 7); set(collision, W, x, 2, 1); });
  [5,11,15,20].forEach(x => { set(objects, W, x, 7, 8); set(collision, W, x, 7, 1); });

  // Tall grass patches (encounter zones)
  [1,2,3,4,5].forEach(x => { set(ground, W, x, 3, 9); });
  [13,14,15].forEach(x => { set(ground, W, x, 7, 9); });
  [20,21,22,23].forEach(x => { set(ground, W, x, 3, 9); });

  return {
    width: W, height: H, tileSize: 64, tileset: 'rpg_base',
    layers: { ground, objects, collision },
    npcs: [
      { id: 'trainer_r1_1', x: 6, y: 5, name: '훈련생 강호', sprite: 'trainer', type: 'trainer', trainerId: 'route1_t1', dialog: '너도 여행자인가? 한번 붙자!' },
      { id: 'trainer_r1_2', x: 17, y: 5, name: '훈련생 미라', sprite: 'trainer', type: 'trainer', trainerId: 'route1_t2', dialog: '도전이다!' },
    ],
    exits: [
      { x: 0, y: 5, to: 'town_01', spawnX: 14, spawnY: 6 },
      { x: 24, y: 5, to: 'town_02', spawnX: 1, spawnY: 6 },
    ],
    playerSpawn: { x: 1, y: 5 },
  };
}

// ═══════════════════════════════════════════
// town_02 — 화염촌 (16x12)
// ═══════════════════════════════════════════
function genTown02() {
  const W = 16, H = 12;
  const ground = fill(W, H, 2); // dirt ground (fire town)
  const objects = fill(W, H, 0);
  const collision = fill(W, H, 0);

  // Stone path
  for (let x = 0; x < W; x++) set(ground, W, x, 6, 4);
  for (let y = 0; y < H; y++) set(ground, W, 8, y, 4);

  // Edges — dark stone
  for (let x = 0; x < W; x++) { set(objects, W, x, 0, 15); set(collision, W, x, 0, 1); }
  for (let x = 0; x < W; x++) { set(objects, W, x, H-1, 15); set(collision, W, x, H-1, 1); }
  for (let y = 0; y < H; y++) { set(objects, W, W-1, y, 15); set(collision, W, W-1, y, 1); }

  // Left exit clear
  set(objects, W, 0, 6, 0); set(collision, W, 0, 6, 0);

  // Shop
  fillRect(objects, W, 10, 2, 3, 2, 13); fillRect(collision, W, 10, 2, 3, 2, 1);
  set(objects, W, 11, 3, 14); set(collision, W, 11, 3, 0);

  // Healer
  fillRect(objects, W, 3, 2, 3, 2, 4); fillRect(collision, W, 3, 2, 3, 2, 1);
  set(objects, W, 4, 3, 14); set(collision, W, 4, 3, 0);

  // Gym entrance (top)
  fillRect(objects, W, 6, 0, 4, 2, 13); fillRect(collision, W, 6, 0, 4, 2, 1);
  set(objects, W, 8, 1, 14); set(collision, W, 8, 1, 0);

  return {
    width: W, height: H, tileSize: 64, tileset: 'rpg_base',
    layers: { ground, objects, collision },
    npcs: [
      { id: 'shop_02', x: 11, y: 4, name: '상점 주인', sprite: 'shopkeeper', type: 'shop', dialog: '화염촌에 온 걸 환영해!' },
      { id: 'heal_02', x: 4, y: 4, name: '치유사', sprite: 'healer', type: 'heal', dialog: '회복시켜줄게.' },
      { id: 'citizen_02', x: 12, y: 8, name: '주민', sprite: 'citizen', type: 'dialog', dialog: '수호자 불꽃은 화염의 전당에 계셔. 물 타입이 유리할 거야.' },
    ],
    exits: [
      { x: 0, y: 6, to: 'route_01', spawnX: 23, spawnY: 5 },
      { x: 8, y: 1, to: 'gym_01', spawnX: 5, spawnY: 8 },
    ],
    playerSpawn: { x: 1, y: 6 },
  };
}

// ═══════════════════════════════════════════
// gym_01 — 화염 체육관 (12x10)
// ═══════════════════════════════════════════
function genGym01() {
  const W = 12, H = 10;
  const ground = fill(W, H, 17); // gym floor
  const objects = fill(W, H, 0);
  const collision = fill(W, H, 0);

  // Carpet path center
  for (let y = 2; y < H; y++) { set(ground, W, 5, y, 19); set(ground, W, 6, y, 19); }

  // Walls
  for (let x = 0; x < W; x++) { set(objects, W, x, 0, 6); set(collision, W, x, 0, 1); }
  for (let y = 0; y < H; y++) { set(objects, W, 0, y, 6); set(collision, W, 0, y, 1); }
  for (let y = 0; y < H; y++) { set(objects, W, W-1, y, 6); set(collision, W, W-1, y, 1); }

  // Bookshelves top inner wall
  for (let x = 1; x < W-1; x++) { set(objects, W, x, 1, 20); set(collision, W, x, 1, 1); }

  // Clear carpet area for leader
  set(objects, W, 5, 1, 0); set(collision, W, 5, 1, 0);
  set(objects, W, 6, 1, 0); set(collision, W, 6, 1, 0);

  // Exit south
  set(objects, W, 5, H-1, 0); set(collision, W, 5, H-1, 0);
  set(objects, W, 6, H-1, 0); set(collision, W, 6, H-1, 0);

  return {
    width: W, height: H, tileSize: 64, tileset: 'rpg_base',
    layers: { ground, objects, collision },
    npcs: [
      { id: 'gym1_t1', x: 3, y: 5, name: '훈련생 1', sprite: 'trainer', type: 'trainer', trainerId: 'gym1_t1', dialog: '체육관장에게 도전하기 전에 나를 이겨!' },
      { id: 'gym1_t2', x: 8, y: 5, name: '훈련생 2', sprite: 'trainer', type: 'trainer', trainerId: 'gym1_t2', dialog: '불꽃의 힘을 보여주마!' },
      { id: 'gym_leader_01', x: 5, y: 2, name: '수호자 불꽃', sprite: 'gym_leader', type: 'gym_leader', trainerId: 'gym_leader_01', dialog: '화염의 시련에 도전하는가? 좋다!' },
    ],
    exits: [
      { x: 5, y: 9, to: 'town_02', spawnX: 8, spawnY: 2 },
      { x: 6, y: 9, to: 'town_02', spawnX: 8, spawnY: 2 },
    ],
    playerSpawn: { x: 5, y: 8 },
  };
}

// ═══════════════════════════════════════════
// Write all
// ═══════════════════════════════════════════
const maps = {
  town_01: genTown01(),
  route_01: genRoute01(),
  town_02: genTown02(),
  gym_01: genGym01(),
};

for (const [id, data] of Object.entries(maps)) {
  const path = `${OUT}/${id}.json`;
  fs.writeFileSync(path, JSON.stringify(data));
  const tiles = data.width * data.height;
  const npcs = data.npcs.length;
  const exits = data.exits.length;
  console.log(`${id}: ${data.width}x${data.height} (${tiles} tiles, ${npcs} NPCs, ${exits} exits)`);
}
console.log('Done!');
