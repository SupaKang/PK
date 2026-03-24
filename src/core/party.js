// 파티 & 보관함 관리

const MAX_PARTY_SIZE = 6;
const MAX_BOX_SIZE = 300;

export class PartyManager {
  constructor() {
    this.party = [];
    this.box = []; // 보관함
  }

  /** 파티에 추가. 꽉 차면 보관함으로 */
  addMonster(monster) {
    if (this.party.length < MAX_PARTY_SIZE) {
      this.party.push(monster);
      return { location: 'party', index: this.party.length - 1 };
    }
    this.box.push(monster);
    return { location: 'box', index: this.box.length - 1 };
  }

  /** 파티 내 교체 (순서 변경) */
  swapPartySlots(indexA, indexB) {
    if (indexA < 0 || indexA >= this.party.length) return false;
    if (indexB < 0 || indexB >= this.party.length) return false;
    [this.party[indexA], this.party[indexB]] = [this.party[indexB], this.party[indexA]];
    return true;
  }

  /** 파티 ↔ 보관함 교환 */
  swapWithBox(partyIndex, boxIndex) {
    if (partyIndex < 0 || partyIndex >= this.party.length) return false;
    if (boxIndex < 0 || boxIndex >= this.box.length) return false;
    [this.party[partyIndex], this.box[boxIndex]] = [this.box[boxIndex], this.party[partyIndex]];
    return true;
  }

  /** 보관함에서 파티로 (빈 슬롯 있을 때) */
  withdrawFromBox(boxIndex) {
    if (this.party.length >= MAX_PARTY_SIZE) return false;
    if (boxIndex < 0 || boxIndex >= this.box.length) return false;
    this.party.push(this.box.splice(boxIndex, 1)[0]);
    return true;
  }

  /** 파티에서 보관함으로 (최소 1마리 유지) */
  depositToBox(partyIndex) {
    if (this.party.length <= 1) return false;
    if (partyIndex < 0 || partyIndex >= this.party.length) return false;
    this.box.push(this.party.splice(partyIndex, 1)[0]);
    return true;
  }

  /** 살아있는 파티 몬스터 수 */
  getAliveCount() {
    return this.party.filter(m => m.currentHp > 0).length;
  }

  /** 첫 번째 살아있는 몬스터 */
  getFirstAlive() {
    return this.party.find(m => m.currentHp > 0);
  }

  /** 전체 파티 회복 (몬스터센터) */
  healAll() {
    for (const m of this.party) {
      m.currentHp = m.stats.hp;
      m.status = null;
      m.statusTurns = 0;
      for (const skill of m.skills) {
        skill.pp = skill.maxPp;
      }
    }
  }

  /** 직렬화 */
  serialize() {
    return {
      party: this.party.map(m => ({ ...m })),
      box: this.box.map(m => ({ ...m })),
    };
  }

  /** 역직렬화 */
  static deserialize(data) {
    const pm = new PartyManager();
    pm.party = (data.party || []).map(m => ({ ...m }));
    pm.box = (data.box || []).map(m => ({ ...m }));
    return pm;
  }
}
