export class TouchControls {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = {};  // simulated key state, same format as keyboard keys
    this.visible = false;
    this._touches = {};

    // Auto-detect mobile
    this.visible = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    // Button definitions (screen positions)
    this.dpad = { x: 80, y: 480, size: 50 }; // left side
    this.buttons = {
      a: { x: 700, y: 480, size: 40, key: 'Enter', label: 'A' },
      b: { x: 650, y: 520, size: 40, key: 'Escape', label: 'B' },
    };

    this._setupListeners();
  }

  _setupListeners() {
    const canvas = this.canvas;

    canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this._handleTouches(e.touches);
    }, { passive: false });

    canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      this._handleTouches(e.touches);
    }, { passive: false });

    canvas.addEventListener('touchend', (e) => {
      e.preventDefault();
      this._handleTouches(e.touches);
    }, { passive: false });
  }

  _handleTouches(touches) {
    // Reset all
    this.keys = {};

    const rect = this.canvas.getBoundingClientRect();
    const scaleX = 800 / rect.width;
    const scaleY = 600 / rect.height;

    for (let i = 0; i < touches.length; i++) {
      const tx = (touches[i].clientX - rect.left) * scaleX;
      const ty = (touches[i].clientY - rect.top) * scaleY;

      // D-pad detection
      const dx = tx - this.dpad.x;
      const dy = ty - this.dpad.y;
      const dist = Math.sqrt(dx*dx + dy*dy);

      if (dist < this.dpad.size * 2) {
        const angle = Math.atan2(dy, dx);
        if (angle > -Math.PI/4 && angle < Math.PI/4) this.keys['ArrowRight'] = true;
        else if (angle > Math.PI/4 && angle < 3*Math.PI/4) this.keys['ArrowDown'] = true;
        else if (angle < -Math.PI/4 && angle > -3*Math.PI/4) this.keys['ArrowUp'] = true;
        else this.keys['ArrowLeft'] = true;
      }

      // Button detection
      for (const [id, btn] of Object.entries(this.buttons)) {
        const bx = tx - btn.x;
        const by = ty - btn.y;
        if (Math.sqrt(bx*bx + by*by) < btn.size) {
          this.keys[btn.key] = true;
        }
      }
    }
  }

  render(ctx) {
    if (!this.visible) return;

    ctx.save();
    ctx.globalAlpha = 0.3;

    // D-pad
    const d = this.dpad;
    ctx.fillStyle = '#ffffff';
    // Up
    ctx.beginPath(); ctx.arc(d.x, d.y - d.size, 20, 0, Math.PI*2); ctx.fill();
    // Down
    ctx.beginPath(); ctx.arc(d.x, d.y + d.size, 20, 0, Math.PI*2); ctx.fill();
    // Left
    ctx.beginPath(); ctx.arc(d.x - d.size, d.y, 20, 0, Math.PI*2); ctx.fill();
    // Right
    ctx.beginPath(); ctx.arc(d.x + d.size, d.y, 20, 0, Math.PI*2); ctx.fill();
    // Center
    ctx.fillStyle = '#888888';
    ctx.beginPath(); ctx.arc(d.x, d.y, 15, 0, Math.PI*2); ctx.fill();

    // A/B buttons
    for (const [id, btn] of Object.entries(this.buttons)) {
      ctx.fillStyle = this.keys[btn.key] ? '#ffcc44' : '#ffffff';
      ctx.beginPath(); ctx.arc(btn.x, btn.y, btn.size, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#000000';
      ctx.font = '16px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(btn.label, btn.x, btn.y + 5);
    }

    ctx.restore();
  }
}
