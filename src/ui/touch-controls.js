/**
 * touch-controls.js — Mobile touch input: virtual D-pad + A/B buttons
 * Overlays transparent touch areas on the canvas
 */

export class TouchControls {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {Object} keysRef - Reference to game.keys object
   * @param {Object} keysJustPressedRef - Reference to game.keysJustPressed
   */
  constructor(canvas, keysRef, keysJustPressedRef) {
    this.canvas = canvas;
    this.keys = keysRef;
    this.keysJustPressed = keysJustPressedRef;
    this.enabled = false;
    this.activeDir = null;
    this.dpadImages = { dpad: null, buttons: null };

    // D-pad layout (bottom-left, 480×270 coords)
    this.dpadX = 10;
    this.dpadY = 190;
    this.dpadSize = 70;

    // Action buttons (bottom-right)
    this.btnAX = 420;
    this.btnAY = 210;
    this.btnBX = 390;
    this.btnBY = 235;
    this.btnSize = 25;

    // Detect touch device
    this.enabled = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    if (this.enabled) {
      this._setupTouchListeners();
    }
  }

  _setupTouchListeners() {
    const canvas = this.canvas;

    canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this._handleTouches(e.touches, true);
    }, { passive: false });

    canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      this._handleTouches(e.touches, false);
    }, { passive: false });

    canvas.addEventListener('touchend', (e) => {
      e.preventDefault();
      // Clear all directions
      this.keys.ArrowUp = false;
      this.keys.ArrowDown = false;
      this.keys.ArrowLeft = false;
      this.keys.ArrowRight = false;
      this.activeDir = null;

      // Re-check remaining touches
      if (e.touches.length > 0) {
        this._handleTouches(e.touches, false);
      }
    }, { passive: false });
  }

  _handleTouches(touches, isStart) {
    const rect = this.canvas.getBoundingClientRect();
    // Convert screen coords to 480×270 internal coords
    const scaleX = 480 / rect.width;
    const scaleY = 270 / rect.height;

    // Clear directional keys first
    this.keys.ArrowUp = false;
    this.keys.ArrowDown = false;
    this.keys.ArrowLeft = false;
    this.keys.ArrowRight = false;

    for (let i = 0; i < touches.length; i++) {
      const tx = (touches[i].clientX - rect.left) * scaleX;
      const ty = (touches[i].clientY - rect.top) * scaleY;

      // Check D-pad
      const dCx = this.dpadX + this.dpadSize / 2;
      const dCy = this.dpadY + this.dpadSize / 2;
      const dx = tx - dCx;
      const dy = ty - dCy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < this.dpadSize * 0.7) {
        // Inside D-pad area
        const angle = Math.atan2(dy, dx);
        if (angle > -0.785 && angle <= 0.785) {
          this.keys.ArrowRight = true;
          if (isStart) this.keysJustPressed.ArrowRight = true;
        } else if (angle > 0.785 && angle <= 2.356) {
          this.keys.ArrowDown = true;
          if (isStart) this.keysJustPressed.ArrowDown = true;
        } else if (angle > -2.356 && angle <= -0.785) {
          this.keys.ArrowUp = true;
          if (isStart) this.keysJustPressed.ArrowUp = true;
        } else {
          this.keys.ArrowLeft = true;
          if (isStart) this.keysJustPressed.ArrowLeft = true;
        }
      }

      // Check A button (confirm/Z)
      if (Math.abs(tx - this.btnAX - this.btnSize/2) < this.btnSize &&
          Math.abs(ty - this.btnAY - this.btnSize/2) < this.btnSize) {
        if (isStart) {
          this.keysJustPressed.KeyZ = true;
          this.keysJustPressed.Enter = true;
          this.keys.KeyZ = true;
        }
      }

      // Check B button (cancel/X)
      if (Math.abs(tx - this.btnBX - this.btnSize/2) < this.btnSize &&
          Math.abs(ty - this.btnBY - this.btnSize/2) < this.btnSize) {
        if (isStart) {
          this.keysJustPressed.KeyX = true;
          this.keysJustPressed.Escape = true;
          this.keys.KeyX = true;
        }
      }
    }
  }

  resize(vw, vh) {
    // Reposition controls based on viewport size (no-op for now; layout is in internal coords)
  }

  /**
   * Render touch controls overlay
   * @param {CanvasRenderingContext2D} ctx
   */
  render(ctx) {
    if (!this.enabled) return;

    ctx.save();
    ctx.globalAlpha = 0.3;

    // D-pad
    const cx = this.dpadX + this.dpadSize / 2;
    const cy = this.dpadY + this.dpadSize / 2;
    const armW = this.dpadSize * 0.3;
    const armL = this.dpadSize * 0.4;

    ctx.fillStyle = '#444444';
    // Vertical arm
    ctx.fillRect(cx - armW/2, cy - armL, armW, armL * 2);
    // Horizontal arm
    ctx.fillRect(cx - armL, cy - armW/2, armL * 2, armW);

    // Arrow indicators
    ctx.fillStyle = '#FFFFFF';
    // Up arrow
    ctx.beginPath(); ctx.moveTo(cx, cy - armL + 5); ctx.lineTo(cx - 8, cy - armL + 18); ctx.lineTo(cx + 8, cy - armL + 18); ctx.fill();
    // Down arrow
    ctx.beginPath(); ctx.moveTo(cx, cy + armL - 5); ctx.lineTo(cx - 8, cy + armL - 18); ctx.lineTo(cx + 8, cy + armL - 18); ctx.fill();
    // Left arrow
    ctx.beginPath(); ctx.moveTo(cx - armL + 5, cy); ctx.lineTo(cx - armL + 18, cy - 8); ctx.lineTo(cx - armL + 18, cy + 8); ctx.fill();
    // Right arrow
    ctx.beginPath(); ctx.moveTo(cx + armL - 5, cy); ctx.lineTo(cx + armL - 18, cy - 8); ctx.lineTo(cx + armL - 18, cy + 8); ctx.fill();

    // A button (red)
    ctx.fillStyle = '#CC3333';
    ctx.beginPath();
    ctx.arc(this.btnAX + this.btnSize/2, this.btnAY + this.btnSize/2, this.btnSize/2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '16px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('A', this.btnAX + this.btnSize/2, this.btnAY + this.btnSize/2 + 5);

    // B button (blue)
    ctx.fillStyle = '#3333CC';
    ctx.beginPath();
    ctx.arc(this.btnBX + this.btnSize/2, this.btnBY + this.btnSize/2, this.btnSize/2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText('B', this.btnBX + this.btnSize/2, this.btnBY + this.btnSize/2 + 5);

    ctx.restore();
  }
}
