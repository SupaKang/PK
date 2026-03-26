export class AchievementManager {
  constructor() {
    this.unlocked = new Set();
    this._definitions = ACHIEVEMENTS;
  }

  check(eventType, value, gameState) {
    for (const ach of this._definitions) {
      if (this.unlocked.has(ach.id)) continue;
      if (ach.condition(eventType, value, gameState)) {
        this.unlocked.add(ach.id);
        return ach; // return newly unlocked achievement
      }
    }
    return null;
  }

  getAll() { return this._definitions; }
  getUnlocked() { return this._definitions.filter(a => this.unlocked.has(a.id)); }

  serialize() { return { unlocked: [...this.unlocked] }; }
  static deserialize(data) {
    const am = new AchievementManager();
    am.unlocked = new Set(data?.unlocked || []);
    return am;
  }
}

const ACHIEVEMENTS = [
  { id: 'first_contract', name: '첫 계약', description: '첫 번째 야생 몬스터와 계약했다.', icon: '🤝',
    condition: (type) => type === 'contract' },
  { id: 'badge_1', name: '첫 인장', description: '첫 번째 수호자의 인장을 획득했다.', icon: '🏅',
    condition: (type, val) => type === 'badge' && val >= 1 },
  { id: 'badge_4', name: '절반의 여정', description: '인장 4개를 모았다.', icon: '⭐',
    condition: (type, val) => type === 'badge' && val >= 4 },
  { id: 'badge_8', name: '완전한 인장', description: '8개의 인장을 모두 모았다.', icon: '👑',
    condition: (type, val) => type === 'badge' && val >= 8 },
  { id: 'level_10', name: '성장의 시작', description: '계약자가 레벨 10에 도달했다.', icon: '📈',
    condition: (type, val) => type === 'level' && val >= 10 },
  { id: 'level_30', name: '강해지는 중', description: '계약자가 레벨 30에 도달했다.', icon: '💪',
    condition: (type, val) => type === 'level' && val >= 30 },
  { id: 'level_50', name: '최강의 계약자', description: '계약자가 레벨 50에 도달했다.', icon: '🔥',
    condition: (type, val) => type === 'level' && val >= 50 },
  { id: 'dex_10', name: '도감 수집가', description: '10종의 몬스터와 계약했다.', icon: '📖',
    condition: (type, val) => type === 'dex' && val >= 10 },
  { id: 'dex_50', name: '반쪽 도감', description: '50종의 몬스터와 계약했다.', icon: '📚',
    condition: (type, val) => type === 'dex' && val >= 50 },
  { id: 'dex_100', name: '완전한 도감', description: '100종 이상의 몬스터와 계약했다.', icon: '🏆',
    condition: (type, val) => type === 'dex' && val >= 100 },
  { id: 'boss_first', name: '첫 보스 격파', description: '첫 번째 구역 보스를 쓰러뜨렸다.', icon: '⚔️',
    condition: (type) => type === 'boss_defeat' },
  { id: 'expedition_10', name: '숙련된 탐험가', description: '10번의 탐험을 성공했다.', icon: '🗺️',
    condition: (type, val) => type === 'expedition_success' && val >= 10 },
  { id: 'camping_5', name: '야영의 달인', description: '5번 캠핑했다.', icon: '🏕️',
    condition: (type, val) => type === 'camp' && val >= 5 },
  { id: 'legendary', name: '전설과의 만남', description: '전설의 몬스터를 만났다.', icon: '✨',
    condition: (type) => type === 'legendary_encounter' },
  { id: 'champion', name: '세계의 구원자', description: '마왕 카오스를 쓰러뜨렸다.', icon: '🌟',
    condition: (type) => type === 'champion_defeat' },
];

export { ACHIEVEMENTS };
