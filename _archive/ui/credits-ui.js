export class CreditsUI {
  constructor(renderer) {
    this.renderer = renderer;
    this.visible = false;
    this.scrollY = 0;
    this.scrollSpeed = 30; // pixels per second
    this.onClose = null;
  }

  show() { this.visible = true; this.scrollY = 600; }

  update(dt) {
    if (!this.visible) return;
    this.scrollY -= this.scrollSpeed * dt;
  }

  render(ctx) {
    if (!this.visible) return;
    const r = this.renderer;
    r.clear('#0a0a16');

    const lines = [
      { text: 'POCKET KINGDOM', scale: 4, color: '#ffcc44', gap: 40 },
      { text: '마석 계약자의 타임어택 탐험', scale: 2, color: '#aaaacc', gap: 30 },
      { text: '', gap: 30 },
      { text: '── 제작 ──', scale: 2, color: '#ffcc44', gap: 20 },
      { text: 'Game Design & Programming', scale: 2, color: '#ffffff', gap: 15 },
      { text: 'AI Agent Team (Claude Opus 4.6)', scale: 2, color: '#aaaacc', gap: 30 },
      { text: '', gap: 20 },
      { text: '── 에셋 ──', scale: 2, color: '#ffcc44', gap: 20 },
      { text: 'Tile Art: Kenney RPG Base Pack', scale: 2, color: '#ffffff', gap: 15 },
      { text: 'License: CC0 (Public Domain)', scale: 1, color: '#888899', gap: 15 },
      { text: 'https://kenney.nl', scale: 1, color: '#4488cc', gap: 30 },
      { text: '', gap: 20 },
      { text: '── 음악 & 사운드 ──', scale: 2, color: '#ffcc44', gap: 20 },
      { text: 'Procedural Chiptune (Web Audio API)', scale: 2, color: '#ffffff', gap: 30 },
      { text: '', gap: 20 },
      { text: '── 세계관 ──', scale: 2, color: '#ffcc44', gap: 20 },
      { text: '마족이 지배하는 세계에서', scale: 2, color: '#ccccdd', gap: 15 },
      { text: '마석의 빛으로 세계를 되찾는 이야기', scale: 2, color: '#ccccdd', gap: 30 },
      { text: '', gap: 40 },
      { text: '감사합니다', scale: 3, color: '#ffcc44', gap: 20 },
      { text: 'Thank you for playing!', scale: 2, color: '#aaaacc', gap: 40 },
      { text: '', gap: 20 },
      { text: '[ESC] 돌아가기', scale: 1, color: '#666688', gap: 0 },
    ];

    let y = this.scrollY;
    for (const line of lines) {
      if (y > -30 && y < 630) {
        const tw = r.measureText(line.text, line.scale || 2);
        r.drawPixelText(line.text, (800 - tw) / 2, y, line.color || '#ffffff', line.scale || 2);
      }
      y += (line.gap || 20);
    }

    // Auto-close when scroll past end
    if (y < -50) {
      if (this.onClose) this.onClose();
    }
  }

  handleInput(key) {
    if (key === 'Escape' || key === 'Enter') {
      if (this.onClose) this.onClose();
      return true;
    }
    return true;
  }
}
