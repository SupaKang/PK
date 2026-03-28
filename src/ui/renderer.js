/**
 * renderer.js — Canvas 2D 렌더링 엔진, 커스텀 5x7 비트맵 폰트
 */

// 5x7 bitmap font (ASCII 32-126)
const FONT_W = 5;
const FONT_H = 7;
const FONT_DATA = {};

function defineChar(ch, rows) {
  FONT_DATA[ch] = rows;
}

// Space
defineChar(' ', [0,0,0,0,0,0,0]);
// Digits
defineChar('0', [0b01110,0b10011,0b10101,0b10101,0b11001,0b01110,0]);
defineChar('1', [0b00100,0b01100,0b00100,0b00100,0b00100,0b01110,0]);
defineChar('2', [0b01110,0b10001,0b00010,0b00100,0b01000,0b11111,0]);
defineChar('3', [0b01110,0b10001,0b00110,0b00001,0b10001,0b01110,0]);
defineChar('4', [0b00010,0b00110,0b01010,0b10010,0b11111,0b00010,0]);
defineChar('5', [0b11111,0b10000,0b11110,0b00001,0b10001,0b01110,0]);
defineChar('6', [0b01110,0b10000,0b11110,0b10001,0b10001,0b01110,0]);
defineChar('7', [0b11111,0b00001,0b00010,0b00100,0b01000,0b01000,0]);
defineChar('8', [0b01110,0b10001,0b01110,0b10001,0b10001,0b01110,0]);
defineChar('9', [0b01110,0b10001,0b10001,0b01111,0b00001,0b01110,0]);
// Letters A-Z
defineChar('A', [0b01110,0b10001,0b10001,0b11111,0b10001,0b10001,0]);
defineChar('B', [0b11110,0b10001,0b11110,0b10001,0b10001,0b11110,0]);
defineChar('C', [0b01110,0b10001,0b10000,0b10000,0b10001,0b01110,0]);
defineChar('D', [0b11110,0b10001,0b10001,0b10001,0b10001,0b11110,0]);
defineChar('E', [0b11111,0b10000,0b11110,0b10000,0b10000,0b11111,0]);
defineChar('F', [0b11111,0b10000,0b11110,0b10000,0b10000,0b10000,0]);
defineChar('G', [0b01110,0b10001,0b10000,0b10111,0b10001,0b01110,0]);
defineChar('H', [0b10001,0b10001,0b11111,0b10001,0b10001,0b10001,0]);
defineChar('I', [0b01110,0b00100,0b00100,0b00100,0b00100,0b01110,0]);
defineChar('J', [0b00111,0b00010,0b00010,0b00010,0b10010,0b01100,0]);
defineChar('K', [0b10001,0b10010,0b11100,0b10010,0b10001,0b10001,0]);
defineChar('L', [0b10000,0b10000,0b10000,0b10000,0b10000,0b11111,0]);
defineChar('M', [0b10001,0b11011,0b10101,0b10101,0b10001,0b10001,0]);
defineChar('N', [0b10001,0b11001,0b10101,0b10011,0b10001,0b10001,0]);
defineChar('O', [0b01110,0b10001,0b10001,0b10001,0b10001,0b01110,0]);
defineChar('P', [0b11110,0b10001,0b10001,0b11110,0b10000,0b10000,0]);
defineChar('Q', [0b01110,0b10001,0b10001,0b10101,0b10010,0b01101,0]);
defineChar('R', [0b11110,0b10001,0b10001,0b11110,0b10010,0b10001,0]);
defineChar('S', [0b01110,0b10000,0b01110,0b00001,0b10001,0b01110,0]);
defineChar('T', [0b11111,0b00100,0b00100,0b00100,0b00100,0b00100,0]);
defineChar('U', [0b10001,0b10001,0b10001,0b10001,0b10001,0b01110,0]);
defineChar('V', [0b10001,0b10001,0b10001,0b10001,0b01010,0b00100,0]);
defineChar('W', [0b10001,0b10001,0b10101,0b10101,0b11011,0b10001,0]);
defineChar('X', [0b10001,0b01010,0b00100,0b00100,0b01010,0b10001,0]);
defineChar('Y', [0b10001,0b01010,0b00100,0b00100,0b00100,0b00100,0]);
defineChar('Z', [0b11111,0b00010,0b00100,0b01000,0b10000,0b11111,0]);
// Lowercase a-z (same as uppercase)
'abcdefghijklmnopqrstuvwxyz'.split('').forEach((c, i) => {
  defineChar(c, FONT_DATA[c.toUpperCase()]);
});
// Punctuation
defineChar('!', [0b00100,0b00100,0b00100,0b00100,0b00000,0b00100,0]);
defineChar('?', [0b01110,0b10001,0b00010,0b00100,0b00000,0b00100,0]);
defineChar('.', [0b00000,0b00000,0b00000,0b00000,0b00000,0b00100,0]);
defineChar(',', [0b00000,0b00000,0b00000,0b00000,0b00100,0b01000,0]);
defineChar(':', [0b00000,0b00100,0b00000,0b00000,0b00100,0b00000,0]);
defineChar(';', [0b00000,0b00100,0b00000,0b00000,0b00100,0b01000,0]);
defineChar('-', [0b00000,0b00000,0b11111,0b00000,0b00000,0b00000,0]);
defineChar('+', [0b00000,0b00100,0b01110,0b00100,0b00000,0b00000,0]);
defineChar('=', [0b00000,0b11111,0b00000,0b11111,0b00000,0b00000,0]);
defineChar('/', [0b00001,0b00010,0b00100,0b01000,0b10000,0b00000,0]);
defineChar('(', [0b00010,0b00100,0b00100,0b00100,0b00100,0b00010,0]);
defineChar(')', [0b01000,0b00100,0b00100,0b00100,0b00100,0b01000,0]);
defineChar('[', [0b01110,0b01000,0b01000,0b01000,0b01000,0b01110,0]);
defineChar(']', [0b01110,0b00010,0b00010,0b00010,0b00010,0b01110,0]);
defineChar('*', [0b00000,0b01010,0b00100,0b01010,0b00000,0b00000,0]);
defineChar('#', [0b01010,0b11111,0b01010,0b01010,0b11111,0b01010,0]);
defineChar('%', [0b11001,0b11010,0b00100,0b01011,0b10011,0b00000,0]);
defineChar('\'', [0b00100,0b00100,0b00000,0b00000,0b00000,0b00000,0]);
defineChar('"', [0b01010,0b01010,0b00000,0b00000,0b00000,0b00000,0]);
defineChar('<', [0b00010,0b00100,0b01000,0b00100,0b00010,0b00000,0]);
defineChar('>', [0b01000,0b00100,0b00010,0b00100,0b01000,0b00000,0]);
defineChar('_', [0b00000,0b00000,0b00000,0b00000,0b00000,0b11111,0]);
defineChar('~', [0b00000,0b01000,0b10101,0b00010,0b00000,0b00000,0]);
defineChar('@', [0b01110,0b10001,0b10111,0b10111,0b10000,0b01110,0]);
defineChar('&', [0b01100,0b10010,0b01100,0b10101,0b10010,0b01101,0]);
defineChar('^', [0b00100,0b01010,0b00000,0b00000,0b00000,0b00000,0]);
defineChar('$', [0b00100,0b01111,0b10100,0b01110,0b00101,0b11110,0b00100]);
defineChar('{', [0b00010,0b00100,0b01100,0b00100,0b00100,0b00010,0]);
defineChar('}', [0b01000,0b00100,0b00110,0b00100,0b00100,0b01000,0]);
defineChar('|', [0b00100,0b00100,0b00100,0b00100,0b00100,0b00100,0]);
defineChar('`', [0b01000,0b00100,0b00000,0b00000,0b00000,0b00000,0]);

export function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return { r, g, b };
}

export function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(v => Math.max(0, Math.min(255, v | 0)).toString(16).padStart(2, '0')).join('');
}

export function lightenColor(hex, factor = 0.3) {
  const { r, g, b } = hexToRgb(hex);
  return rgbToHex(
    r + (255 - r) * factor,
    g + (255 - g) * factor,
    b + (255 - b) * factor
  );
}

export function darkenColor(hex, factor = 0.3) {
  const { r, g, b } = hexToRgb(hex);
  return rgbToHex(r * (1 - factor), g * (1 - factor), b * (1 - factor));
}

// Internal resolution constants
export const INTERNAL_W = 480;
export const INTERNAL_H = 270;

export class Renderer {
  /** @param {HTMLCanvasElement} displayCanvas */
  constructor(displayCanvas) {
    // Offscreen canvas at internal resolution (all game rendering happens here)
    this.canvas = document.createElement('canvas');
    this.canvas.width = INTERNAL_W;
    this.canvas.height = INTERNAL_H;
    this.ctx = this.canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;

    // Display canvas (scaled output)
    this.displayCanvas = displayCanvas;
    this.displayCtx = displayCanvas.getContext('2d');
    this.displayCtx.imageSmoothingEnabled = false;

    // Game logic uses internal resolution
    this.width = INTERNAL_W;
    this.height = INTERNAL_H;
    this.scale = 1;

    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  /**
   * Scale display canvas to fill the viewport while maintaining aspect ratio
   */
  resize() {
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // Fill viewport completely (stretches to viewport dimensions)
    this.displayCanvas.width = vw;
    this.displayCanvas.height = vh;
    this.displayCanvas.style.width = `${vw}px`;
    this.displayCanvas.style.height = `${vh}px`;
    this.displayCanvas.style.display = 'block';
    this.displayCanvas.style.position = 'absolute';
    this.displayCanvas.style.left = '0';
    this.displayCanvas.style.top = '0';

    this.scale = Math.min(vw / INTERNAL_W, vh / INTERNAL_H);
    this.displayCtx.imageSmoothingEnabled = false;
  }

  /**
   * Flush offscreen canvas to display canvas (call at end of each frame)
   */
  present() {
    this.displayCtx.drawImage(this.canvas, 0, 0,
      this.displayCanvas.width, this.displayCanvas.height);
  }

  /**
   * Convert screen coordinates to internal game coordinates
   */
  screenToGame(screenX, screenY) {
    const rect = this.displayCanvas.getBoundingClientRect();
    return {
      x: Math.floor((screenX - rect.left) / this.scale),
      y: Math.floor((screenY - rect.top) / this.scale),
    };
  }

  clear(color = '#000000') {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  fillRect(x, y, w, h, color) {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(x | 0, y | 0, w | 0, h | 0);
  }

  strokeRect(x, y, w, h, color, lineWidth = 1) {
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = lineWidth;
    this.ctx.strokeRect((x | 0) + 0.5, (y | 0) + 0.5, w | 0, h | 0);
  }

  drawLine(x1, y1, x2, y2, color, lineWidth = 1) {
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = lineWidth;
    this.ctx.beginPath();
    this.ctx.moveTo(x1, y1);
    this.ctx.lineTo(x2, y2);
    this.ctx.stroke();
  }

  drawCircle(x, y, radius, color, fill = true) {
    this.ctx.beginPath();
    this.ctx.arc(x, y, radius, 0, Math.PI * 2);
    if (fill) {
      this.ctx.fillStyle = color;
      this.ctx.fill();
    } else {
      this.ctx.strokeStyle = color;
      this.ctx.stroke();
    }
  }

  /**
   * Draw pixel text using the 5x7 bitmap font
   * @param {string} text
   * @param {number} x
   * @param {number} y
   * @param {string} color
   * @param {number} scale
   */
  drawText(text, x, y, color = '#FFFFFF', scale = 1) {
    const px = FONT_W * scale;
    const py = FONT_H * scale;
    let curX = x | 0;
    const startY = y | 0;

    for (let ci = 0; ci < text.length; ci++) {
      const ch = text[ci];
      const data = FONT_DATA[ch];
      if (!data) {
        curX += (FONT_W + 1) * scale;
        continue;
      }
      for (let row = 0; row < FONT_H; row++) {
        const bits = data[row] || 0;
        for (let col = 0; col < FONT_W; col++) {
          if (bits & (1 << (FONT_W - 1 - col))) {
            this.ctx.fillStyle = color;
            this.ctx.fillRect(curX + col * scale, startY + row * scale, scale, scale);
          }
        }
      }
      curX += (FONT_W + 1) * scale;
    }
  }

  measureText(text, scale = 1) {
    return text.length * (FONT_W + 1) * scale - scale;
  }

  drawTextCentered(text, y, color = '#FFFFFF', scale = 1) {
    const w = this.measureText(text, scale);
    this.drawText(text, (this.width - w) / 2, y, color, scale);
  }

  drawTextRight(text, x, y, color = '#FFFFFF', scale = 1) {
    const w = this.measureText(text, scale);
    this.drawText(text, x - w, y, color, scale);
  }

  /**
   * Draw an image/canvas at position
   * @param {HTMLCanvasElement|HTMLImageElement} img
   */
  drawImage(img, x, y, w, h) {
    this.ctx.drawImage(img, x | 0, y | 0, w | 0, h | 0);
  }

  /**
   * Draw a filled progress bar
   */
  drawBar(x, y, w, h, ratio, fgColor, bgColor = '#333333') {
    this.fillRect(x, y, w, h, bgColor);
    this.fillRect(x, y, w * Math.max(0, Math.min(1, ratio)), h, fgColor);
  }

  /**
   * Set global alpha
   */
  setAlpha(a) {
    this.ctx.globalAlpha = a;
  }

  resetAlpha() {
    this.ctx.globalAlpha = 1;
  }

  /**
   * Save/restore context state
   */
  save() { this.ctx.save(); }
  restore() { this.ctx.restore(); }
}
