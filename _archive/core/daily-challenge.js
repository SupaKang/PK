// 일일 도전 던전 — 매일 바뀌는 특수 전투
export class DailyChallenge {
  constructor() {
    this._lastDate = null;
    this._completed = false;
  }

  getTodaysSeed() {
    const d = new Date();
    return d.getFullYear() * 10000 + (d.getMonth()+1) * 100 + d.getDate();
  }

  isCompleted() {
    return this._completed && this._lastDate === this.getTodaysSeed();
  }

  markCompleted() {
    this._completed = true;
    this._lastDate = this.getTodaysSeed();
  }

  getChallenge() {
    const seed = this.getTodaysSeed();
    const r = (n) => ((seed * 16807 + n * 48271) % 2147483647);

    // Generate today's challenge
    const monsterPool = [1,4,7,10,14,21,28,31,33,39,47,51,59,64,73,83,88,89,97];
    const teamSize = 3 + (r(1) % 3); // 3-5 monsters
    const baseLevel = 20 + (r(2) % 30); // level 20-50

    const team = [];
    for (let i = 0; i < teamSize; i++) {
      const idx = r(10 + i) % monsterPool.length;
      team.push({ monsterId: monsterPool[idx], level: baseLevel + (r(20+i) % 5) });
    }

    const names = ['불의 시련', '얼음의 시련', '어둠의 시련', '용의 시련', '혼돈의 시련',
                   '강철의 시련', '독의 시련', '바람의 시련', '대지의 시련', '빛의 시련'];
    const name = names[r(3) % names.length];

    const rewardMoney = 1000 + (r(4) % 5000);
    const rewardItems = ['ultra_stone', 'full_revive', 'pp_restore_full', 'energy_bar', 'return_scroll'];
    const rewardItem = rewardItems[r(5) % rewardItems.length];

    return {
      name,
      team,
      reward: { money: rewardMoney, itemId: rewardItem, count: 1 + (r(6) % 3) },
      description: `오늘의 도전: ${name} (Lv${baseLevel}~${baseLevel+5}, ${teamSize}마리)`,
    };
  }

  serialize() { return { lastDate: this._lastDate, completed: this._completed }; }
  static deserialize(data) {
    const dc = new DailyChallenge();
    dc._lastDate = data?.lastDate || null;
    dc._completed = data?.completed || false;
    return dc;
  }
}
