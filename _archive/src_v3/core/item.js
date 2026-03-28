// 아이템 시스템

let itemsDB = null;

export async function loadItems() {
  const res = await fetch('./data/items.json');
  const data = await res.json();
  itemsDB = Array.isArray(data) ? data : data.items || [];
  return itemsDB;
}

export function getItemData(id) {
  return itemsDB?.find(i => i.id === id);
}

export function getAllItems() {
  return itemsDB || [];
}

/**
 * 인벤토리 관리
 */
export class Inventory {
  constructor() {
    this.items = {}; // { itemId: count }
    this.money = 3000;
  }

  addItem(itemId, count = 1) {
    this.items[itemId] = (this.items[itemId] || 0) + count;
  }

  removeItem(itemId, count = 1) {
    if (!this.items[itemId] || this.items[itemId] < count) return false;
    this.items[itemId] -= count;
    if (this.items[itemId] <= 0) delete this.items[itemId];
    return true;
  }

  getCount(itemId) {
    return this.items[itemId] || 0;
  }

  hasItem(itemId) {
    return (this.items[itemId] || 0) > 0;
  }

  /** 아이템 목록 (카테고리별) */
  getItemsByCategory(category) {
    const result = [];
    for (const [id, count] of Object.entries(this.items)) {
      if (count <= 0) continue;
      const data = getItemData(id);
      if (data && data.category === category) {
        result.push({ ...data, count });
      }
    }
    return result;
  }

  /** 모든 아이템 목록 */
  getAllItems() {
    const result = [];
    for (const [id, count] of Object.entries(this.items)) {
      if (count <= 0) continue;
      const data = getItemData(id);
      if (data) result.push({ ...data, count });
    }
    return result;
  }

  /** 아이템 사용 */
  useItem(itemId, target) {
    const data = getItemData(itemId);
    if (!data) return { success: false, messages: ['아이템을 찾을 수 없다.'] };
    if (!this.hasItem(itemId)) return { success: false, messages: ['아이템이 없다!'] };

    const messages = [];
    let success = false;

    switch (data.effect?.type) {
      case 'heal_hp': {
        if (target.currentHp <= 0) {
          return { success: false, messages: ['기절한 몬스터에게는 사용할 수 없다!'] };
        }
        if (target.currentHp >= target.stats.hp) {
          return { success: false, messages: ['이미 HP가 최대다!'] };
        }
        const heal = data.effect.value === -1 || data.effect.value >= 9999 ? target.stats.hp : data.effect.value;
        target.currentHp = Math.min(target.stats.hp, target.currentHp + heal);
        messages.push(`${target.name}의 HP가 회복되었다!`);
        success = true;
        break;
      }
      case 'cure_status':
      case 'heal_status': {
        if (!target.status) {
          return { success: false, messages: ['상태이상이 아니다!'] };
        }
        // 특정 상태만 치료하는 아이템 체크
        if (data.effect.value && data.effect.value !== 'all' && data.effect.value !== target.status) {
          return { success: false, messages: [`${target.name}은(는) 해당 상태이상이 아니다!`] };
        }
        target.status = null;
        target.statusTurns = 0;
        messages.push(`${target.name}의 상태이상이 나았다!`);
        success = true;
        break;
      }
      case 'revive': {
        if (target.currentHp > 0) {
          return { success: false, messages: ['기절하지 않았다!'] };
        }
        const reviveHp = data.effect.value === -1 || data.effect.value >= 1 ? target.stats.hp : Math.floor(target.stats.hp * data.effect.value);
        target.currentHp = reviveHp;
        target.status = null;
        target.statusTurns = 0;
        messages.push(`${target.name}이(가) 되살아났다!`);
        success = true;
        break;
      }
      case 'restore_pp':
      case 'heal_pp': {
        if (target.currentHp <= 0) {
          return { success: false, messages: ['기절한 몬스터에게는 사용할 수 없다!'] };
        }
        const ppVal = data.effect.value >= 9999 ? Infinity : data.effect.value;
        for (const skill of target.skills) {
          skill.pp = Math.min(skill.maxPp, skill.pp + ppVal);
        }
        messages.push(`${target.name}의 PP가 회복되었다!`);
        success = true;
        break;
      }
      case 'stat_boost': {
        if (target.currentHp <= 0) {
          return { success: false, messages: ['기절한 몬스터에게는 사용할 수 없다!'] };
        }
        if (!target._statStages) {
          target._statStages = { atk: 0, def: 0, spAtk: 0, spDef: 0, speed: 0 };
        }
        const stat = data.effect.stat;
        const boostVal = data.effect.value || 1;
        target._statStages[stat] = Math.min(6, (target._statStages[stat] || 0) + boostVal);
        const statNames = { atk: '공격', def: '방어', spAtk: '특수공격', spDef: '특수방어', speed: '스피드', accuracy: '명중률', critical: '급소율' };
        messages.push(`${target.name}의 ${statNames[stat] || stat}이(가) 올랐다!`);
        success = true;
        break;
      }
      case 'escape': {
        // Handled by battle/field layer
        messages.push('탈출로프를 사용했다!');
        success = true;
        break;
      }
      default:
        return { success: false, messages: ['이 아이템은 여기서 사용할 수 없다.'] };
    }

    if (success) {
      this.removeItem(itemId);
    }
    return { success, messages };
  }

  /** 상점 구매 */
  buyItem(itemId, count = 1) {
    const data = getItemData(itemId);
    if (!data) return { success: false, message: '아이템을 찾을 수 없다.' };
    const totalCost = data.price * count;
    if (this.money < totalCost) return { success: false, message: '돈이 부족하다!' };
    this.money -= totalCost;
    this.addItem(itemId, count);
    return { success: true, message: `${data.name}을(를) ${count}개 구매했다!` };
  }

  /** 직렬화 */
  serialize() {
    return { items: { ...this.items }, money: this.money };
  }

  static deserialize(data) {
    const inv = new Inventory();
    inv.items = { ...data.items };
    inv.money = data.money || 0;
    return inv;
  }
}
