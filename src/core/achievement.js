/**
 * achievement.js — Achievement system with 15 achievements
 * Tracks conditions, unlocks, toast notifications
 */

const ACHIEVEMENTS = [
  { id: 'first_catch', name: 'FIRST CONTRACT', desc: 'Catch your first monster', tier: 'bronze', check: (g) => g.dex.caught.size >= 1 },
  { id: 'catch_10', name: 'COLLECTOR', desc: 'Catch 10 different monsters', tier: 'silver', check: (g) => g.dex.caught.size >= 10 },
  { id: 'catch_50', name: 'MASTER COLLECTOR', desc: 'Catch 50 different monsters', tier: 'gold', check: (g) => g.dex.caught.size >= 50 },
  { id: 'first_battle', name: 'FIRST BATTLE', desc: 'Win your first battle', tier: 'bronze', check: (g) => g._battleWins >= 1 },
  { id: 'win_10', name: 'WARRIOR', desc: 'Win 10 battles', tier: 'silver', check: (g) => g._battleWins >= 10 },
  { id: 'win_100', name: 'CHAMPION', desc: 'Win 100 battles', tier: 'gold', check: (g) => g._battleWins >= 100 },
  { id: 'first_evolve', name: 'EVOLUTION', desc: 'Evolve a monster for the first time', tier: 'bronze', check: (g) => g._evolveCount >= 1 },
  { id: 'full_party', name: 'FULL TEAM', desc: 'Have 6 monsters in party', tier: 'bronze', check: (g) => g.party.length >= 6 },
  { id: 'rich', name: 'WEALTHY', desc: 'Have 10000 gold', tier: 'silver', check: (g) => g.gold >= 10000 },
  { id: 'gym_1', name: 'FIRST SEAL', desc: 'Earn your first guardian seal', tier: 'bronze', check: (g) => (g.storyEngine?.gymsDefeated?.length || 0) >= 1 },
  { id: 'gym_4', name: 'HALF SEALS', desc: 'Earn 4 guardian seals', tier: 'silver', check: (g) => (g.storyEngine?.gymsDefeated?.length || 0) >= 4 },
  { id: 'gym_8', name: 'ALL SEALS', desc: 'Earn all 8 guardian seals', tier: 'gold', check: (g) => (g.storyEngine?.gymsDefeated?.length || 0) >= 8 },
  { id: 'level_30', name: 'VETERAN', desc: 'Raise a monster to Lv.30', tier: 'silver', check: (g) => g.party.some(m => m.level >= 30) },
  { id: 'karma_light', name: 'SAINT', desc: 'Achieve maximum light karma', tier: 'gold', check: (g) => (g.storyEngine?.karma || 0) >= 80 },
  { id: 'karma_dark', name: 'SHADOW', desc: 'Achieve maximum dark karma', tier: 'gold', check: (g) => (g.storyEngine?.karma || 0) <= -80 },
];

export class AchievementSystem {
  constructor() {
    this.unlocked = new Set();
    this.toastQueue = []; // [{name, desc, tier}]
    this.toastTimer = 0;
    this.currentToast = null;
  }

  /**
   * Check all achievements against current game state
   * @param {Object} game - Game instance
   */
  check(game) {
    for (const ach of ACHIEVEMENTS) {
      if (this.unlocked.has(ach.id)) continue;
      try {
        if (ach.check(game)) {
          this.unlocked.add(ach.id);
          this.toastQueue.push({ name: ach.name, desc: ach.desc, tier: ach.tier });
          console.log(`[PK] Achievement unlocked: ${ach.name}`);
        }
      } catch {
        // Ignore check errors
      }
    }
  }

  /**
   * Update toast display
   */
  update(dt) {
    if (this.currentToast) {
      this.toastTimer -= dt;
      if (this.toastTimer <= 0) {
        this.currentToast = null;
      }
    }
    if (!this.currentToast && this.toastQueue.length > 0) {
      this.currentToast = this.toastQueue.shift();
      this.toastTimer = 3.0;
    }
  }

  /**
   * Render toast notification
   * @param {import('../ui/renderer.js').Renderer} renderer
   */
  renderToast(renderer) {
    if (!this.currentToast) return;

    const alpha = Math.min(1, this.toastTimer * 2);
    renderer.setAlpha(alpha);

    const w = 350;
    const h = 50;
    const x = (renderer.width - w) / 2;
    const y = 10;

    const tierColors = { bronze: '#CD7F32', silver: '#C0C0C0', gold: '#FFD700' };
    const borderColor = tierColors[this.currentToast.tier] || '#FFD700';

    renderer.fillRect(x, y, w, h, '#0a0a2e');
    renderer.strokeRect(x, y, w, h, borderColor);
    renderer.drawText('ACHIEVEMENT UNLOCKED!', x + 10, y + 6, borderColor, 1);
    renderer.drawText(this.currentToast.name, x + 10, y + 20, '#FFFFFF', 2);
    renderer.drawText(this.currentToast.desc, x + 10, y + 38, '#AAAAAA', 1);

    renderer.resetAlpha();
  }

  /**
   * Get all achievements with status
   */
  getAll() {
    return ACHIEVEMENTS.map(a => ({
      ...a,
      unlocked: this.unlocked.has(a.id),
    }));
  }

  serialize() {
    return [...this.unlocked];
  }

  deserialize(data) {
    this.unlocked = new Set(data || []);
  }
}
