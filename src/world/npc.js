/**
 * npc.js — NPC management, placement, interaction
 */

export class NPC {
  /**
   * @param {Object} config
   * @param {string} config.id
   * @param {string} config.name
   * @param {number} config.x - Tile X
   * @param {number} config.y - Tile Y
   * @param {string} config.sprite - Asset key for sprite
   * @param {string} config.facing - 'south'|'north'|'east'|'west'
   * @param {Array} config.dialog - Dialog lines
   */
  constructor(config) {
    this.id = config.id;
    this.name = config.name;
    this.x = config.x;
    this.y = config.y;
    this.sprite = config.sprite || null;
    this.facing = config.facing || 'south';
    this.dialog = config.dialog || [];
    this.shop = config.shop || null; // Array of item IDs for shop NPCs
    this.interacted = false;
  }
}

/**
 * NPC registry for maps
 */
export const MAP_NPCS = {
  town_01: [
    new NPC({
      id: 'professor',
      name: 'PROFESSOR',
      x: 10, y: 5,
      sprite: 'npc_professor',
      facing: 'south',
      dialog: [
        { speaker: 'PROFESSOR', text: 'The world is full of wondrous monsters!' },
        { speaker: 'PROFESSOR', text: 'Go explore and form new contracts.' },
      ],
    }),
    new NPC({
      id: 'shopkeeper_town1',
      name: 'SHOPKEEPER',
      x: 12, y: 7,
      sprite: 'npc_shopkeeper',
      facing: 'south',
      dialog: [
        { speaker: 'SHOPKEEPER', text: 'Welcome! What can I get you?' },
      ],
      shop: ['potion', 'antidote', 'magic_stone'],
    }),
    new NPC({
      id: 'villager1',
      name: 'VILLAGER',
      x: 14, y: 9,
      sprite: 'npc_villager',
      facing: 'south',
      dialog: [
        { speaker: 'VILLAGER', text: 'Welcome to our village!' },
        { speaker: 'VILLAGER', text: 'The route south leads to other towns.' },
      ],
    }),
  ],
  route_01: [
    new NPC({
      id: 'hiker1',
      name: 'HIKER',
      x: 12, y: 6,
      sprite: 'npc_villager',
      facing: 'west',
      dialog: [
        { speaker: 'HIKER', text: 'Watch out for wild monsters in the tall grass!' },
      ],
    }),
  ],
  town_02: [
    new NPC({
      id: 'shopkeeper1',
      name: 'SHOPKEEPER',
      x: 8, y: 5,
      sprite: 'npc_shopkeeper',
      facing: 'south',
      dialog: [
        { speaker: 'SHOPKEEPER', text: 'Welcome! Take a look at my wares.' },
      ],
      shop: ['potion', 'super_potion', 'antidote', 'magic_stone', 'high_stone', 'revive'],
    }),
  ],
};

/**
 * Get NPCs for a map
 */
export function getNPCsForMap(mapId) {
  return (MAP_NPCS[mapId] || []).map(npc => new NPC({ ...npc }));
}
