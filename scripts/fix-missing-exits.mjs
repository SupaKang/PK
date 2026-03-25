/**
 * fix-missing-exits.mjs
 * Finds connections declared in maps.json that have no matching exit tile
 * in the source tilemap, then adds exit tiles at logical edge positions.
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const TILEMAP_DIR = join(ROOT, 'public', 'data', 'tilemaps');
const MAPS_JSON = join(ROOT, 'data', 'maps.json');

// Also update dist copy if it exists
const DIST_TILEMAP_DIR = join(ROOT, 'dist', 'data', 'tilemaps');

// ── helpers ──────────────────────────────────────────────────────────────────

function readTilemap(id) {
  const p = join(TILEMAP_DIR, `${id}.json`);
  if (!existsSync(p)) return null;
  return JSON.parse(readFileSync(p, 'utf8'));
}

function writeTilemap(id, data) {
  const p = join(TILEMAP_DIR, `${id}.json`);
  writeFileSync(p, JSON.stringify(data), 'utf8');
  // mirror to dist if present
  const dp = join(DIST_TILEMAP_DIR, `${id}.json`);
  if (existsSync(DIST_TILEMAP_DIR)) {
    writeFileSync(dp, JSON.stringify(data), 'utf8');
  }
}

function idx(x, y, w) {
  return y * w + x;
}

/**
 * Determine which edge to place the exit on based on which edges are free
 * and a heuristic about which direction the target is in.
 */
function pickEdge(srcId, targetId, tilemap, usedEdges) {
  // Ordered map progression for directional hinting
  const mapOrder = [
    'town_01', 'route_01', 'town_02', 'gym_01', 'route_02', 'cave_01',
    'town_03', 'gym_02', 'route_03', 'town_04', 'gym_03', 'route_04',
    'forest_01', 'town_05', 'gym_04', 'route_05', 'town_06', 'gym_05',
    'route_06', 'cave_02', 'town_07', 'gym_06', 'route_07', 'town_08',
    'gym_07', 'route_08', 'shadow_base', 'town_09', 'gym_08', 'route_09',
    'elite_four'
  ];

  const srcIdx = mapOrder.indexOf(srcId);
  const tgtIdx = mapOrder.indexOf(targetId);

  // For gyms, prefer north (top) entry
  const isGym = targetId.startsWith('gym_');
  const isCave = targetId.startsWith('cave_') || targetId === 'shadow_base';

  // Determine preferred direction: later in order => east/south, earlier => west/north
  let preferred;
  if (isGym) {
    preferred = ['north', 'south', 'east', 'west'];
  } else if (tgtIdx > srcIdx) {
    // Target is later in progression => east or south
    preferred = ['east', 'south', 'north', 'west'];
  } else {
    // Target is earlier => west or north
    preferred = ['west', 'north', 'south', 'east'];
  }

  for (const dir of preferred) {
    if (!usedEdges.has(dir)) {
      return dir;
    }
  }

  // All edges used, just pick first available of any
  for (const dir of ['east', 'west', 'south', 'north']) {
    if (!usedEdges.has(dir)) return dir;
  }

  // Fallback: reuse east
  return 'east';
}

function edgePosition(dir, w, h) {
  switch (dir) {
    case 'east':  return { x: w - 1, y: Math.floor(h / 2) };
    case 'west':  return { x: 0,     y: Math.floor(h / 2) };
    case 'north': return { x: Math.floor(w / 2), y: 0 };
    case 'south': return { x: Math.floor(w / 2), y: h - 1 };
  }
}

function oppositeDir(dir) {
  switch (dir) {
    case 'east':  return 'west';
    case 'west':  return 'east';
    case 'north': return 'south';
    case 'south': return 'north';
  }
}

function spawnPosition(dir, targetTilemap) {
  if (!targetTilemap) return { spawnX: 1, spawnY: 1 };
  const tw = targetTilemap.width;
  const th = targetTilemap.height;
  // Spawn near the opposite edge of the target map (1 tile in from edge)
  const opp = oppositeDir(dir);
  switch (opp) {
    case 'east':  return { spawnX: tw - 2, spawnY: Math.floor(th / 2) };
    case 'west':  return { spawnX: 1,      spawnY: Math.floor(th / 2) };
    case 'north': return { spawnX: Math.floor(tw / 2), spawnY: 1 };
    case 'south': return { spawnX: Math.floor(tw / 2), spawnY: th - 2 };
  }
}

function getUsedEdges(tilemap) {
  const edges = new Set();
  const w = tilemap.width;
  const h = tilemap.height;
  for (const exit of (tilemap.exits || [])) {
    if (exit.x === 0)         edges.add('west');
    if (exit.x === w - 1)     edges.add('east');
    if (exit.y === 0)         edges.add('north');
    if (exit.y === h - 1)     edges.add('south');
  }
  return edges;
}

// ── main ─────────────────────────────────────────────────────────────────────

const mapsData = JSON.parse(readFileSync(MAPS_JSON, 'utf8'));
const maps = mapsData.maps;

// Build lookup of map connections
const mapById = {};
maps.forEach(m => { mapById[m.id] = m; });

// Find all missing exits
const missing = [];
const tilemapCache = {};

function getTilemap(id) {
  if (!(id in tilemapCache)) {
    tilemapCache[id] = readTilemap(id);
  }
  return tilemapCache[id];
}

for (const map of maps) {
  const tilemap = getTilemap(map.id);
  if (!tilemap) continue; // no tilemap file

  const exitTargets = new Set((tilemap.exits || []).map(e => e.to));

  for (const conn of (map.connections || [])) {
    if (!exitTargets.has(conn)) {
      // Only add if target tilemap exists
      if (getTilemap(conn) !== null) {
        missing.push({ from: map.id, to: conn });
      }
    }
  }
}

console.log(`Found ${missing.length} missing exits.\n`);

// Group by source map so we can allocate edges properly
const bySource = {};
for (const m of missing) {
  if (!bySource[m.from]) bySource[m.from] = [];
  bySource[m.from].push(m.to);
}

const summary = [];

for (const [srcId, targets] of Object.entries(bySource)) {
  const tilemap = getTilemap(srcId);
  const usedEdges = getUsedEdges(tilemap);
  const w = tilemap.width;
  const h = tilemap.height;

  if (!tilemap.exits) tilemap.exits = [];

  for (const targetId of targets) {
    const dir = pickEdge(srcId, targetId, tilemap, usedEdges);
    usedEdges.add(dir);

    const pos = edgePosition(dir, w, h);
    const targetTilemap = getTilemap(targetId);
    const spawn = spawnPosition(dir, targetTilemap);

    const i = idx(pos.x, pos.y, w);

    // Make tile walkable
    tilemap.layers.collision[i] = 0;
    // Set ground to dirt path (tile 2)
    tilemap.layers.ground[i] = 2;
    // Clear objects
    tilemap.layers.objects[i] = 0;

    // Also clear the adjacent tile (1 in from edge) to ensure path is accessible
    let adjX = pos.x, adjY = pos.y;
    switch (dir) {
      case 'east':  adjX = pos.x - 1; break;
      case 'west':  adjX = pos.x + 1; break;
      case 'north': adjY = pos.y + 1; break;
      case 'south': adjY = pos.y - 1; break;
    }
    if (adjX >= 0 && adjX < w && adjY >= 0 && adjY < h) {
      const adjI = idx(adjX, adjY, w);
      tilemap.layers.collision[adjI] = 0;
      tilemap.layers.ground[adjI] = 2;
      tilemap.layers.objects[adjI] = 0;
    }

    // Add exit entry
    tilemap.exits.push({
      x: pos.x,
      y: pos.y,
      to: targetId,
      spawnX: spawn.spawnX,
      spawnY: spawn.spawnY
    });

    const msg = `  [${srcId}] -> ${targetId}  edge=${dir}  tile=(${pos.x},${pos.y})  spawn=(${spawn.spawnX},${spawn.spawnY})`;
    summary.push(msg);
    console.log(msg);
  }

  writeTilemap(srcId, tilemap);
}

console.log(`\n========== SUMMARY ==========`);
console.log(`Total missing exits fixed: ${summary.length}`);
console.log(`Maps modified: ${Object.keys(bySource).length}`);
console.log(`\nAll added exits:`);
summary.forEach(s => console.log(s));
console.log(`\nDone.`);
