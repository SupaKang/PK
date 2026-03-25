#!/usr/bin/env node
/**
 * Add 보관함 관리자 (box manager) NPC to each town tilemap.
 * Picks a walkable position near the heal NPC.
 * Skips towns that already have a box NPC.
 * Updates both public/ and dist/ copies.
 */
const fs = require('fs');
const path = require('path');

const BASE = path.resolve(__dirname, '..');
const dirs = [
  path.join(BASE, 'public', 'data', 'tilemaps'),
  path.join(BASE, 'dist', 'data', 'tilemaps'),
];

for (let townNum = 1; townNum <= 9; townNum++) {
  const filename = `town_${String(townNum).padStart(2, '0')}.json`;

  for (const dir of dirs) {
    const filePath = path.join(dir, filename);
    if (!fs.existsSync(filePath)) {
      console.log(`SKIP ${filePath} (not found)`);
      continue;
    }

    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

    // Check if box NPC already exists
    if (data.npcs && data.npcs.some(n => n.type === 'box')) {
      console.log(`SKIP ${filename} in ${path.basename(dir)} (already has box NPC)`);
      continue;
    }

    // Find heal NPC position to place box NPC nearby
    const healNpc = (data.npcs || []).find(n => n.type === 'heal');
    const width = data.width || 16;
    const height = data.height || 12;
    const collision = data.layers?.collision || [];

    function isWalkable(x, y) {
      if (x < 0 || y < 0 || x >= width || y >= height) return false;
      return !collision[y * width + x];
    }

    function isOccupied(x, y) {
      if (!data.npcs) return false;
      return data.npcs.some(n => n.x === x && n.y === y);
    }

    // Try positions near heal NPC, or fallback to center-area search
    let boxX = -1, boxY = -1;
    const anchor = healNpc || { x: Math.floor(width / 2), y: Math.floor(height / 2) };

    // Search in expanding rings around anchor
    const offsets = [
      [1, 0], [-1, 0], [0, 1], [0, -1],
      [2, 0], [-2, 0], [0, 2], [0, -2],
      [1, 1], [-1, 1], [1, -1], [-1, -1],
      [2, 1], [-2, 1], [2, -1], [-2, -1],
      [1, 2], [-1, 2], [1, -2], [-1, -2],
      [3, 0], [-3, 0], [0, 3], [0, -3],
    ];

    for (const [dx, dy] of offsets) {
      const nx = anchor.x + dx;
      const ny = anchor.y + dy;
      if (isWalkable(nx, ny) && !isOccupied(nx, ny)) {
        // Also check it's not an exit tile
        const isExit = (data.exits || []).some(e => e.x === nx && e.y === ny);
        if (!isExit) {
          boxX = nx;
          boxY = ny;
          break;
        }
      }
    }

    if (boxX === -1) {
      console.log(`WARN ${filename}: could not find walkable spot for box NPC`);
      continue;
    }

    const townId = `town_${String(townNum).padStart(2, '0')}`;
    const boxNpc = {
      id: `box_${townId}`,
      x: boxX,
      y: boxY,
      name: '보관함 관리자',
      sprite: 'citizen',
      type: 'box',
      dialog: '보관함에 접근하시겠습니까?',
    };

    if (!data.npcs) data.npcs = [];
    data.npcs.push(boxNpc);

    // Mark position as blocked in collision layer so player can't walk through NPC
    // (NPCs are typically blocking — but the tilemap engine handles NPC collision separately)

    fs.writeFileSync(filePath, JSON.stringify(data), 'utf-8');
    console.log(`ADDED box NPC to ${filename} in ${path.basename(dir)} at (${boxX}, ${boxY})`);
  }
}

console.log('Done.');
