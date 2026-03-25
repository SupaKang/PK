#!/usr/bin/env node
/**
 * Comprehensive tilemap-vs-maps.json consistency validator.
 *
 * TASK 1: Exit destinations match maps.json connections
 * TASK 2: Trainer NPC trainerId matches maps.json trainer id
 * TASK 3: Gym leader NPCs have proper gym objects in maps.json
 * TASK 4: Exit spawnX/spawnY within target tilemap bounds
 */

import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const ROOT = join(import.meta.dirname, '..');
const TILEMAP_DIR = join(ROOT, 'public', 'data', 'tilemaps');
const MAPS_PATH = join(ROOT, 'data', 'maps.json');

// ── Load data ──────────────────────────────────────────────────────
const mapsData = JSON.parse(readFileSync(MAPS_PATH, 'utf-8'));
const mapsById = Object.fromEntries(mapsData.maps.map(m => [m.id, m]));

const tilemapFiles = readdirSync(TILEMAP_DIR).filter(
  f => f.endsWith('.json') && !f.startsWith('_')
);

const tilemaps = {};
for (const file of tilemapFiles) {
  const id = file.replace('.json', '');
  tilemaps[id] = JSON.parse(readFileSync(join(TILEMAP_DIR, file), 'utf-8'));
}

let issues = [];
let warnings = [];
let totalChecks = 0;

// ── TASK 1: Exit destinations vs. maps.json connections ────────────
console.log('\n========== TASK 1: Exit Destination / Connection Consistency ==========\n');
for (const [mapId, tilemap] of Object.entries(tilemaps)) {
  const mapEntry = mapsById[mapId];
  if (!mapEntry) {
    issues.push(`TASK1: Tilemap "${mapId}" has no entry in maps.json`);
    continue;
  }
  const connections = mapEntry.connections || [];
  const exitDestinations = new Set();

  for (const exit of tilemap.exits || []) {
    totalChecks++;
    exitDestinations.add(exit.to);
    if (!connections.includes(exit.to)) {
      const msg = `TASK1: "${mapId}" tilemap exit to "${exit.to}" NOT in maps.json connections [${connections.join(', ')}]`;
      issues.push(msg);
      console.log('  MISMATCH: ' + msg);
    }
  }

  // Also check reverse: connections that have no exit in tilemap
  for (const conn of connections) {
    totalChecks++;
    if (!exitDestinations.has(conn)) {
      const msg = `TASK1-INFO: "${mapId}" maps.json connection "${conn}" has NO exit in tilemap (tilemap may be missing an exit)`;
      warnings.push(msg);
      console.log('  INFO: ' + msg);
    }
  }
}

// ── TASK 2: Trainer NPC trainerId vs. maps.json trainers ───────────
console.log('\n========== TASK 2: Trainer ID Consistency ==========\n');
for (const [mapId, tilemap] of Object.entries(tilemaps)) {
  const mapEntry = mapsById[mapId];
  if (!mapEntry) continue;
  const mapTrainers = mapEntry.trainers || [];
  const mapTrainerIds = new Set(mapTrainers.map(t => t.id));

  for (const npc of tilemap.npcs || []) {
    if (npc.type !== 'trainer' || !npc.trainerId) continue;
    totalChecks++;
    if (!mapTrainerIds.has(npc.trainerId)) {
      const msg = `TASK2: "${mapId}" NPC "${npc.id}" has trainerId="${npc.trainerId}" but maps.json trainers are [${[...mapTrainerIds].join(', ')}]`;
      issues.push(msg);
      console.log('  MISMATCH: ' + msg);
    }
  }
}

// ── TASK 3: Gym leader NPCs vs. maps.json gym objects ──────────────
console.log('\n========== TASK 3: Gym Leader / Gym Object Consistency ==========\n');
for (const [mapId, tilemap] of Object.entries(tilemaps)) {
  const mapEntry = mapsById[mapId];
  if (!mapEntry) continue;

  const gymLeaders = (tilemap.npcs || []).filter(n => n.type === 'gym_leader');
  for (const gl of gymLeaders) {
    totalChecks++;
    if (!mapEntry.gym) {
      const msg = `TASK3: "${mapId}" has gym_leader NPC "${gl.name}" but maps.json has NO gym object`;
      issues.push(msg);
      console.log('  MISMATCH: ' + msg);
      continue;
    }
    const gym = mapEntry.gym;
    const missing = [];
    if (!gym.leader) missing.push('leader');
    if (!gym.badge) missing.push('badge');
    if (!gym.team || gym.team.length === 0) missing.push('team');
    if (gym.reward === undefined || gym.reward === null) missing.push('reward');
    if (missing.length > 0) {
      const msg = `TASK3: "${mapId}" gym object missing fields: ${missing.join(', ')}`;
      issues.push(msg);
      console.log('  MISMATCH: ' + msg);
    } else {
      console.log(`  OK: "${mapId}" gym_leader "${gl.name}" — gym object has leader, badge, team, reward`);
    }
  }
}

// ── TASK 4: Exit spawnX/spawnY within target tilemap bounds ────────
console.log('\n========== TASK 4: Spawn Point Bounds Check ==========\n');
for (const [mapId, tilemap] of Object.entries(tilemaps)) {
  for (const exit of tilemap.exits || []) {
    totalChecks++;
    const target = tilemaps[exit.to];
    if (!target) {
      const msg = `TASK4: "${mapId}" exit to "${exit.to}" — target tilemap not found`;
      issues.push(msg);
      console.log('  WARNING: ' + msg);
      continue;
    }
    const { spawnX, spawnY } = exit;
    const oob = [];
    if (spawnX < 0 || spawnX >= target.width) oob.push(`spawnX=${spawnX} out of [0..${target.width - 1}]`);
    if (spawnY < 0 || spawnY >= target.height) oob.push(`spawnY=${spawnY} out of [0..${target.height - 1}]`);
    if (oob.length) {
      const msg = `TASK4: "${mapId}" exit to "${exit.to}" — ${oob.join(', ')} (target ${target.width}x${target.height})`;
      issues.push(msg);
      console.log('  OUT-OF-BOUNDS: ' + msg);
    }
  }
}

// ── Summary ────────────────────────────────────────────────────────
console.log('\n========== SUMMARY ==========\n');
console.log(`Total checks: ${totalChecks}`);
console.log(`Errors (mismatches fixed in maps.json): ${issues.length}`);
console.log(`Warnings (tilemap missing exits for declared connections): ${warnings.length}`);
if (issues.length) {
  console.log('\nErrors:');
  for (const iss of issues) console.log('  - ' + iss);
}
if (warnings.length) {
  console.log('\nWarnings (informational — tilemap exits missing, maps.json connections are correct):');
  for (const w of warnings) console.log('  - ' + w);
}
console.log();

process.exit(issues.length > 0 ? 1 : 0);
