/**
 * add-quests.mjs
 *
 * Adds one quest NPC to each of towns 04-09.
 * For every town it reads the tilemap JSON, verifies the target position is
 * walkable (collision === 0), adds the NPC to the npcs array, and writes
 * the file back.  Both public/ and dist/ copies are updated.
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const QUEST_NPCS = [
  {
    file: 'town_04',
    npc: {
      id: 'quest_04', x: 4, y: 8, name: '의뢰인 볼트', sprite: 'citizen', type: 'quest',
      dialog: '전격 체육관의 수호자를 꼭 만나봐! 그의 힘을 확인하고 와.',
      quest: { id: 'q_thunder', task: 'gym_03 방문', reward: { itemId: 'pp_restore', count: 3, money: 1200 } }
    }
  },
  {
    file: 'town_05',
    npc: {
      id: 'quest_05', x: 12, y: 4, name: '의뢰인 세라', sprite: 'citizen', type: 'quest',
      dialog: '숲속 깊은 곳에 요정왕이 있대. 쓰러뜨려줘!',
      quest: { id: 'q_fairy', task: 'forest_01 보스 격파', reward: { itemId: 'ultra_stone', count: 1, money: 2000 } }
    }
  },
  {
    file: 'town_06',
    npc: {
      id: 'quest_06', x: 3, y: 8, name: '의뢰인 무사', sprite: 'citizen', type: 'quest',
      dialog: '산악의 거인을 쓰러뜨린 자만이 진정한 전사다!',
      quest: { id: 'q_giant', task: 'route_06 보스 격파', reward: { itemId: 'energy_bar', count: 5, money: 2500 } }
    }
  },
  {
    file: 'town_07',
    npc: {
      id: 'quest_07', x: 4, y: 4, name: '의뢰인 유키', sprite: 'citizen', type: 'quest',
      dialog: '빙하동굴의 빙하 군주를 처치해줘!',
      quest: { id: 'q_glacier', task: 'cave_02 보스 격파', reward: { itemId: 'full_revive', count: 2, money: 3000 } }
    }
  },
  {
    file: 'town_08',
    npc: {
      id: 'quest_08', x: 12, y: 8, name: '의뢰인 드래곤', sprite: 'citizen', type: 'quest',
      dialog: '어둠의 파수꾼이 도로를 점거했어. 처리해줘!',
      quest: { id: 'q_dark_guard', task: 'route_07 보스 격파', reward: { itemId: 'return_scroll', count: 3, money: 3500 } }
    }
  },
  {
    file: 'town_09',
    npc: {
      id: 'quest_09', x: 3, y: 4, name: '의뢰인 라스트', sprite: 'citizen', type: 'quest',
      dialog: '챔피언 로드의 수문장... 마왕성 전 마지막 시험이다.',
      quest: { id: 'q_gate', task: 'route_09 보스 격파', reward: { itemId: 'domination_stone', count: 1, money: 5000 } }
    }
  }
];

const dirs = ['public/data/tilemaps', 'dist/data/tilemaps'];

let totalUpdated = 0;

for (const { file, npc } of QUEST_NPCS) {
  for (const dir of dirs) {
    const filepath = resolve(ROOT, dir, `${file}.json`);
    if (!existsSync(filepath)) {
      console.log(`  SKIP  ${dir}/${file}.json (not found)`);
      continue;
    }

    const data = JSON.parse(readFileSync(filepath, 'utf8'));
    const { width } = data;
    const collision = data.layers.collision;

    // Check if quest NPC already exists
    if (data.npcs.some(n => n.id === npc.id)) {
      console.log(`  SKIP  ${dir}/${file}.json (${npc.id} already present)`);
      continue;
    }

    // Verify walkable
    const idx = npc.y * width + npc.x;
    if (collision[idx] !== 0) {
      console.warn(`  WARN  ${dir}/${file}.json — position (${npc.x},${npc.y}) has collision=${collision[idx]}, clearing it`);
      collision[idx] = 0;
    }

    // Also check no other NPC occupies the same tile
    const occupied = data.npcs.find(n => n.x === npc.x && n.y === npc.y);
    if (occupied) {
      console.warn(`  WARN  ${dir}/${file}.json — position (${npc.x},${npc.y}) occupied by ${occupied.id}, adding anyway`);
    }

    data.npcs.push(npc);
    writeFileSync(filepath, JSON.stringify(data), 'utf8');
    console.log(`  OK    ${dir}/${file}.json — added ${npc.id} at (${npc.x},${npc.y})`);
    totalUpdated++;
  }
}

console.log(`\nDone. Updated ${totalUpdated} tilemap files.`);
