/**
 * add-hidden-events.mjs
 *
 * Reads every tilemap in public/data/tilemaps/ and ensures non-gym maps
 * have at least 2 hidden events. Also applies special overrides for
 * shadow_base and elite_four.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TILEMAP_DIR = path.resolve(__dirname, '..', 'public', 'data', 'tilemaps');

const EVENT_POOL = [
  { type: 'ancient_chest', requiredLevel: 0, description: '고대의 보물상자를 발견했다!' },
  { type: 'spirit_spring', requiredLevel: 8, description: '영혼의 샘을 발견했다. AP가 회복된다.' },
  { type: 'memory_fragment', requiredLevel: 3, description: '할아버지의 기억 조각을 발견했다.' },
  { type: 'fairy_tea_party', requiredLevel: 12, description: '요정의 다과회를 발견했다!' },
  { type: 'dark_altar', requiredLevel: 15, description: '어둠의 제단. 위험하지만 강해질 수 있다.' },
  { type: 'wandering_merchant', requiredLevel: 5, description: '떠돌이 상인을 만났다!' },
];

// Extract a numeric "progression level" from the map name to scale requiredLevel
function getMapLevel(name) {
  const levelMap = {
    town_01: 1, route_01: 2, town_02: 3, route_02: 5,
    cave_01: 7, town_03: 8, route_03: 10, town_04: 12,
    route_04: 14, forest_01: 16, town_05: 17, route_05: 19,
    town_06: 21, route_06: 23, cave_02: 25, town_07: 26,
    route_07: 27, town_08: 28, route_08: 30, shadow_base: 32,
    town_09: 33, route_09: 34, elite_four: 35,
  };
  return levelMap[name] || 15;
}

function getWalkablePositions(map) {
  const { width, height } = map;
  const collision = map.layers.collision;
  const positions = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (collision[y * width + x] === 0) {
        positions.push({ x, y });
      }
    }
  }
  return positions;
}

function getOccupiedPositions(map) {
  const occupied = new Set();
  // NPC positions
  for (const npc of (map.npcs || [])) {
    occupied.add(`${npc.x},${npc.y}`);
  }
  // Exit positions
  for (const exit of (map.exits || [])) {
    occupied.add(`${exit.x},${exit.y}`);
  }
  // Player spawn
  if (map.playerSpawn) {
    occupied.add(`${map.playerSpawn.x},${map.playerSpawn.y}`);
  }
  // Existing hidden event positions
  for (const ev of (map.hiddenEvents || [])) {
    occupied.add(`${ev.x},${ev.y}`);
  }
  return occupied;
}

function pickRandomFrom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function addEventsToMap(map, mapName, count) {
  const walkable = getWalkablePositions(map);
  const occupied = getOccupiedPositions(map);
  const available = walkable.filter(p => !occupied.has(`${p.x},${p.y}`));
  const mapLevel = getMapLevel(mapName);

  const added = [];
  for (let i = 0; i < count && available.length > 0; i++) {
    const posIdx = Math.floor(Math.random() * available.length);
    const pos = available.splice(posIdx, 1)[0];
    const template = pickRandomFrom(EVENT_POOL);
    // Scale requiredLevel: base + map progression offset
    const scaledLevel = Math.max(1, template.requiredLevel + Math.floor(mapLevel * 0.8));
    const event = {
      x: pos.x,
      y: pos.y,
      type: template.type,
      requiredLevel: scaledLevel,
      description: template.description,
    };
    map.hiddenEvents.push(event);
    added.push(event);
  }
  return added;
}

// --- Main ---
const files = fs.readdirSync(TILEMAP_DIR).filter(f => f.endsWith('.json') && !f.startsWith('_'));
const summary = [];

for (const file of files) {
  const mapName = file.replace('.json', '');

  // Skip gym maps (they are excluded from the 2-event minimum)
  if (mapName.startsWith('gym_')) continue;

  const filePath = path.join(TILEMAP_DIR, file);
  const map = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

  if (!map.hiddenEvents) map.hiddenEvents = [];

  const before = map.hiddenEvents.length;

  // --- Special handling: shadow_base ---
  if (mapName === 'shadow_base') {
    // Add 2 specific high-level events
    const walkable = getWalkablePositions(map);
    const occupied = getOccupiedPositions(map);
    const available = walkable.filter(p => !occupied.has(`${p.x},${p.y}`));

    const shadowEvents = [
      { type: 'dark_altar', requiredLevel: 28, description: '어둠의 제단. 위험하지만 강해질 수 있다.' },
      { type: 'ancient_chest', requiredLevel: 25, description: '고대의 보물상자를 발견했다!' },
    ];
    for (const tmpl of shadowEvents) {
      if (available.length === 0) break;
      const posIdx = Math.floor(Math.random() * available.length);
      const pos = available.splice(posIdx, 1)[0];
      map.hiddenEvents.push({ x: pos.x, y: pos.y, ...tmpl });
    }
    const after = map.hiddenEvents.length;
    fs.writeFileSync(filePath, JSON.stringify(map), 'utf-8');
    summary.push(`${mapName}: ${before} -> ${after} (+${after - before} added: dark_altar, ancient_chest)`);
    continue;
  }

  // --- Special handling: elite_four ---
  if (mapName === 'elite_four') {
    const walkable = getWalkablePositions(map);
    const occupied = getOccupiedPositions(map);
    const available = walkable.filter(p => !occupied.has(`${p.x},${p.y}`));

    if (available.length > 0) {
      const posIdx = Math.floor(Math.random() * available.length);
      const pos = available.splice(posIdx, 1)[0];
      map.hiddenEvents.push({
        x: pos.x,
        y: pos.y,
        type: 'memory_fragment',
        requiredLevel: 25,
        description: '마왕의 기억... 이 세계의 진실',
      });
    }
    const after = map.hiddenEvents.length;
    fs.writeFileSync(filePath, JSON.stringify(map), 'utf-8');
    summary.push(`${mapName}: ${before} -> ${after} (+${after - before} added: memory_fragment)`);
    continue;
  }

  // --- General: ensure at least 2 hidden events ---
  if (before >= 2) {
    summary.push(`${mapName}: ${before} (already sufficient)`);
    continue;
  }

  const needed = 2 - before;
  const added = addEventsToMap(map, mapName, needed);
  const after = map.hiddenEvents.length;
  fs.writeFileSync(filePath, JSON.stringify(map), 'utf-8');
  const types = added.map(e => e.type).join(', ');
  summary.push(`${mapName}: ${before} -> ${after} (+${needed} added: ${types})`);
}

console.log('\n=== Hidden Events Summary ===\n');
for (const line of summary) {
  console.log(line);
}
console.log('\nDone.');
