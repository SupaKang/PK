// 로어/기억 조각 시스템
export const LORE_ENTRIES = [
  { id: 'lore_01', title: '대전쟁의 시작', text: '마족이 처음 나타난 것은 어둠의 틈이 열린 날이었다. 하늘이 갈라지고 마기가 세상을 뒤덮었다.', trigger: 'memory_fragment' },
  { id: 'lore_02', title: '마석의 기원', text: '마석은 고대 인간이 몬스터와 공존하기 위해 만든 계약의 결정체다. 마기를 정화하는 힘이 있다.', trigger: 'memory_fragment' },
  { id: 'lore_03', title: '수호자의 맹세', text: '8명의 수호자는 대전쟁 후 남은 최후의 전사들이었다. 그들은 결계를 세워 인류를 지키기로 맹세했다.', trigger: 'memory_fragment' },
  { id: 'lore_04', title: '마왕 카오스', text: '카오스는 마족 중에서도 가장 강력한 존재. 시간과 공간을 다루는 힘을 가졌다고 전해진다.', trigger: 'dark_altar' },
  { id: 'lore_05', title: '예언의 비밀', text: '예언서에는 계약의 빛이 다시 깨어나는 조건이 적혀 있었다. 할아버지만이 그 비밀을 알고 있었다.', trigger: 'memory_fragment' },
  { id: 'lore_06', title: '그림자단의 목적', text: '그림자단은 마왕의 부활을 위해 마석 광맥을 찾고 있었다. 순수한 마석은 봉인을 깨는 열쇠.', trigger: 'dark_altar' },
  { id: 'lore_07', title: '근원신의 존재', text: '전설에 의하면, 세계가 만들어질 때 근원신이 모든 몬스터를 창조했다. 근원신은 아직 이 세계 어딘가에 잠들어 있다.', trigger: 'spirit_spring' },
  { id: 'lore_08', title: '할아버지의 과거', text: '할아버지는 젊은 시절 수호자 중 한 명이었다. 대전쟁에서 부상을 입고 은퇴한 후, 손주에게 희망을 걸었다.', trigger: 'memory_fragment' },
];

export class LoreManager {
  constructor() {
    this.unlocked = new Set();
  }

  unlock(triggerId) {
    const entries = LORE_ENTRIES.filter(e => e.trigger === triggerId && !this.unlocked.has(e.id));
    for (const e of entries) {
      this.unlocked.add(e.id);
    }
    return entries; // newly unlocked
  }

  getAll() { return LORE_ENTRIES; }
  getUnlocked() { return LORE_ENTRIES.filter(e => this.unlocked.has(e.id)); }

  serialize() { return { unlocked: [...this.unlocked] }; }
  static deserialize(data) {
    const lm = new LoreManager();
    lm.unlocked = new Set(data?.unlocked || []);
    return lm;
  }
}
