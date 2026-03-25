/**
 * add-boss-npcs.mjs
 *
 * Reads ZONE_BOSSES from src/core/zone-boss.js, then for every zone that has
 * a boss definition it checks the corresponding tilemap JSON.  If the tilemap
 * does not already contain a boss-type NPC, one is inserted at the boss's
 * declared position. The script also verifies the position is walkable
 * (collision === 0) and clears it if not.
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// ---------------------------------------------------------------------------
// 1. Parse ZONE_BOSSES from zone-boss.js (simple regex extraction)
// ---------------------------------------------------------------------------
const zoneBossSrc = readFileSync(
  resolve(ROOT, 'src/core/zone-boss.js'),
  'utf8',
);

// We dynamically evaluate the ZONE_BOSSES object.  The file uses `export`
// and `export function` but we only need the data literal, so we isolate
// the object between `const ZONE_BOSSES = {` and the matching `};`.
function extractZoneBosses(src) {
  const start = src.indexOf('const ZONE_BOSSES = {');
  if (start === -1) throw new Error('Cannot find ZONE_BOSSES in zone-boss.js');

  let depth = 0;
  let i = src.indexOf('{', start);
  const begin = i;
  for (; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') {
      depth--;
      if (depth === 0) break;
    }
  }
  const objStr = src.slice(begin, i + 1);
  // Evaluate safely – the string is pure data (no functions).
  // eslint-disable-next-line no-eval
  return eval(`(${objStr})`);
}

const ZONE_BOSSES = extractZoneBosses(zoneBossSrc);

console.log(
  `Found ${Object.keys(ZONE_BOSSES).length} zone boss entries:`,
  Object.keys(ZONE_BOSSES).join(', '),
);

// ---------------------------------------------------------------------------
// 2-6. For each zone, check / update the tilemap
// ---------------------------------------------------------------------------
const tilemapDir = resolve(ROOT, 'public/data/tilemaps');

let updated = 0;
let skipped = 0;
let missing = 0;

for (const [zoneId, boss] of Object.entries(ZONE_BOSSES)) {
  const filePath = resolve(tilemapDir, `${zoneId}.json`);

  if (!existsSync(filePath)) {
    console.log(`  [SKIP] ${zoneId}: tilemap file not found`);
    missing++;
    continue;
  }

  const tilemap = JSON.parse(readFileSync(filePath, 'utf8'));

  // Check if a boss NPC already exists
  const hasBoss = (tilemap.npcs || []).some(
    (npc) => npc.type === 'boss',
  );

  if (hasBoss) {
    console.log(`  [OK]   ${zoneId}: boss NPC already present`);
    skipped++;
    continue;
  }

  // Build the boss NPC entry
  const { x, y } = boss.position;
  const bossNpc = {
    id: `boss_${zoneId.replace('_', '')}`,
    x,
    y,
    name: boss.name,
    sprite: 'boss',
    type: 'boss',
    dialog: boss.description,
  };

  // Ensure the position is walkable
  const idx = y * tilemap.width + x;
  if (tilemap.layers.collision[idx] !== 0) {
    console.log(
      `  [FIX]  ${zoneId}: clearing collision at (${x}, ${y})`,
    );
    tilemap.layers.collision[idx] = 0;
  }

  // Add the boss NPC
  if (!tilemap.npcs) tilemap.npcs = [];
  tilemap.npcs.push(bossNpc);

  // Write back
  writeFileSync(filePath, JSON.stringify(tilemap), 'utf8');
  console.log(
    `  [ADD]  ${zoneId}: added boss "${boss.name}" at (${x}, ${y})`,
  );
  updated++;
}

console.log('\nDone.');
console.log(`  Updated: ${updated}`);
console.log(`  Already had boss: ${skipped}`);
console.log(`  Tilemap not found: ${missing}`);
