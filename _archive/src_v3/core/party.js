// 파티 & 보관함 관리
// 파티 구성: 계약자(주인) 1명 + 몬스터 최대 5마리

const MAX_MONSTER_SLOTS = 5;
const MAX_BOX_SIZE = 300;

export class PartyManager {
  constructor() {
    this.contractor = null;  // 계약자 (플레이어 캐릭터)
    this.party = [];         // 몬스터 파티 (최대 5)
    this.box = [];           // 보관함
  }

  /** 계약자 설정 */
  setContractor(contractor) {
    this.contractor = contractor;
  }

  /** 전투용 전체 파티 (계약자 + 몬스터) */
  getBattleParty() {
    const result = [];
    if (this.contractor) result.push(this.contractor);
    result.push(...this.party);
    return result;
  }

  /** 파티에 몬스터 추가. 5마리 이상이면 보관함으로 */
  addMonster(monster) {
    if (this.party.length < MAX_MONSTER_SLOTS) {
      this.party.push(monster);
      return { location: 'party', index: this.party.length - 1 };
    }
    this.box.push(monster);
    return { location: 'box', index: this.box.length - 1 };
  }

  /** 파티 내 몬스터 교체 (순서 변경) */
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
    if (this.party.length >= MAX_MONSTER_SLOTS) return false;
    if (boxIndex < 0 || boxIndex >= this.box.length) return false;
    this.party.push(this.box.splice(boxIndex, 1)[0]);
    return true;
  }

  /** 파티에서 보관함으로 */
  depositToBox(partyIndex) {
    if (this.party.length <= 0) return false;
    if (partyIndex < 0 || partyIndex >= this.party.length) return false;
    this.box.push(this.party.splice(partyIndex, 1)[0]);
    return true;
  }

  /** 살아있는 전투 멤버 수 (계약자 포함) */
  getAliveCount() {
    let count = 0;
    if (this.contractor && this.contractor.currentHp > 0) count++;
    count += this.party.filter(m => m.currentHp > 0).length;
    return count;
  }

  /** 첫 번째 살아있는 전투 멤버 (계약자 우선) */
  getFirstAlive() {
    if (this.contractor && this.contractor.currentHp > 0) return this.contractor;
    return this.party.find(m => m.currentHp > 0);
  }

  /** 전체 파티 회복 (계약자 포함) */
  healAll() {
    const all = this.getBattleParty();
    for (const m of all) {
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
      contractor: this.contractor ? JSON.parse(JSON.stringify(this.contractor)) : null,
      party: this.party.map(m => JSON.parse(JSON.stringify(m))),
      box: this.box.map(m => JSON.parse(JSON.stringify(m))),
    };
  }

  /** 역직렬화 */
  static deserialize(data) {
    const pm = new PartyManager();
    pm.contractor = data.contractor ? JSON.parse(JSON.stringify(data.contractor)) : null;
    pm.party = (data.party || []).map(m => JSON.parse(JSON.stringify(m)));
    pm.box = (data.box || []).map(m => JSON.parse(JSON.stringify(m)));
    return pm;
  }
}
