// 코어 캔버스 렌더링 엔진

/**
 * 5x7 비트맵 폰트 - ASCII 32~126
 * 각 문자: 5열 x 7행, 비트마스크로 저장 (5비트 x 7행)
 */
const FONT_CHARS = {};

// 폰트 데이터 (5x7, 각 행은 5비트)
const FONT_DATA = {
  32: [0,0,0,0,0,0,0],             // space
  33: [4,4,4,4,4,0,4],             // !
  34: [10,10,0,0,0,0,0],           // "
  35: [10,31,10,10,31,10,0],       // #
  36: [4,15,20,14,5,30,4],         // $
  37: [24,25,2,4,8,19,3],          // %
  38: [12,18,12,13,18,13,0],       // &
  39: [4,4,0,0,0,0,0],             // '
  40: [2,4,8,8,8,4,2],             // (
  41: [8,4,2,2,2,4,8],             // )
  42: [0,4,21,14,21,4,0],          // *
  43: [0,4,4,31,4,4,0],            // +
  44: [0,0,0,0,0,4,8],             // ,
  45: [0,0,0,31,0,0,0],            // -
  46: [0,0,0,0,0,0,4],             // .
  47: [1,1,2,4,8,16,16],           // /
  48: [14,17,19,21,25,17,14],      // 0
  49: [4,12,4,4,4,4,14],           // 1
  50: [14,17,1,6,8,16,31],         // 2
  51: [14,17,1,6,1,17,14],         // 3
  52: [2,6,10,18,31,2,2],          // 4
  53: [31,16,30,1,1,17,14],        // 5
  54: [6,8,16,30,17,17,14],        // 6
  55: [31,1,2,4,8,8,8],            // 7
  56: [14,17,17,14,17,17,14],      // 8
  57: [14,17,17,15,1,2,12],        // 9
  58: [0,0,4,0,0,4,0],             // :
  59: [0,0,4,0,0,4,8],             // ;
  60: [1,2,4,8,4,2,1],             // <
  61: [0,0,31,0,31,0,0],           // =
  62: [16,8,4,2,4,8,16],           // >
  63: [14,17,1,2,4,0,4],           // ?
  64: [14,17,23,21,22,16,14],      // @
  65: [14,17,17,31,17,17,17],      // A
  66: [30,17,17,30,17,17,30],      // B
  67: [14,17,16,16,16,17,14],      // C
  68: [30,17,17,17,17,17,30],      // D
  69: [31,16,16,30,16,16,31],      // E
  70: [31,16,16,30,16,16,16],      // F
  71: [14,17,16,19,17,17,15],      // G
  72: [17,17,17,31,17,17,17],      // H
  73: [14,4,4,4,4,4,14],           // I
  74: [7,2,2,2,2,18,12],           // J
  75: [17,18,20,24,20,18,17],      // K
  76: [16,16,16,16,16,16,31],      // L
  77: [17,27,21,17,17,17,17],      // M
  78: [17,17,25,21,19,17,17],      // N
  79: [14,17,17,17,17,17,14],      // O
  80: [30,17,17,30,16,16,16],      // P
  81: [14,17,17,17,21,18,13],      // Q
  82: [30,17,17,30,20,18,17],      // R
  83: [14,17,16,14,1,17,14],       // S
  84: [31,4,4,4,4,4,4],            // T
  85: [17,17,17,17,17,17,14],      // U
  86: [17,17,17,17,10,10,4],       // V
  87: [17,17,17,21,21,27,17],      // W
  88: [17,17,10,4,10,17,17],       // X
  89: [17,17,10,4,4,4,4],          // Y
  90: [31,1,2,4,8,16,31],          // Z
  91: [14,8,8,8,8,8,14],           // [
  92: [16,16,8,4,2,1,1],           // backslash
  93: [14,2,2,2,2,2,14],           // ]
  94: [4,10,17,0,0,0,0],           // ^
  95: [0,0,0,0,0,0,31],            // _
  96: [8,4,0,0,0,0,0],             // `
  97: [0,0,14,1,15,17,15],         // a
  98: [16,16,30,17,17,17,30],      // b
  99: [0,0,14,16,16,17,14],        // c
  100: [1,1,15,17,17,17,15],       // d
  101: [0,0,14,17,31,16,14],       // e
  102: [6,9,8,28,8,8,8],           // f
  103: [0,0,15,17,15,1,14],        // g
  104: [16,16,22,25,17,17,17],     // h
  105: [4,0,12,4,4,4,14],          // i
  106: [2,0,6,2,2,18,12],          // j
  107: [16,16,18,20,24,20,18],     // k
  108: [12,4,4,4,4,4,14],          // l
  109: [0,0,26,21,21,17,17],       // m
  110: [0,0,22,25,17,17,17],       // n
  111: [0,0,14,17,17,17,14],       // o
  112: [0,0,30,17,30,16,16],       // p
  113: [0,0,15,17,15,1,1],         // q
  114: [0,0,22,25,16,16,16],       // r
  115: [0,0,15,16,14,1,30],        // s
  116: [8,8,28,8,8,9,6],           // t
  117: [0,0,17,17,17,19,13],       // u
  118: [0,0,17,17,17,10,4],        // v
  119: [0,0,17,17,21,21,10],       // w
  120: [0,0,17,10,4,10,17],        // x
  121: [0,0,17,17,15,1,14],        // y
  122: [0,0,31,2,4,8,31],          // z
  123: [2,4,4,8,4,4,2],            // {
  124: [4,4,4,4,4,4,4],            // |
  125: [8,4,4,2,4,4,8],            // }
  126: [0,0,8,21,2,0,0],           // ~
};

/**
 * 한글 문자 감지
 */
function isKorean(ch) {
  const code = ch.charCodeAt(0);
  return (code >= 0xAC00 && code <= 0xD7AF) || // 완성형
    (code >= 0x3131 && code <= 0x318E) ||       // 호환 자모
    (code >= 0x1100 && code <= 0x11FF);         // 자모
}

/**
 * 타입 컬러 맵 (UI 전역에서 사용)
 */
export const TYPE_COLORS = {
  fire: '#FF4422',
  water: '#3399FF',
  grass: '#44BB44',
  electric: '#FFCC00',
  earth: '#BB8844',
  ice: '#66CCEE',
  wind: '#99DDBB',
  poison: '#AA44CC',
  metal: '#AAAACC',
  light: '#FFEE88',
  dark: '#554466',
  spirit: '#7766CC',
  dragon: '#6644BB',
  fighting: '#CC4444',
  rock: '#887744',
  sound: '#DD77AA',
  cosmic: '#222255',
  normal: '#BBBBAA',
};

export const STATUS_COLORS = {
  burn: '#FF6622',
  poison: '#AA44CC',
  paralyze: '#FFCC00',
  sleep: '#8888AA',
  confuse: '#DD77AA',
  freeze: '#66CCEE',
};

export const STATUS_LABELS = {
  burn: '화상',
  poison: '독',
  paralyze: '마비',
  sleep: '수면',
  confuse: '혼란',
  freeze: '빙결',
};

/**
 * 렌더러 클래스
 */
export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.width = canvas.width;
    this.height = canvas.height;

    // 픽셀 렌더링 설정
    this.ctx.imageSmoothingEnabled = false;
    canvas.style.imageRendering = 'pixelated';

    // 트랜지션 상태
    this._fadeAlpha = 0;
    this._fadeTarget = 0;
    this._fadeSpeed = 0;
    this._fadingIn = false;
    this._fadingOut = false;
    this._fadeCallback = null;

    // 화면 흔들림
    this._shakeTime = 0;
    this._shakeDuration = 0;
    this._shakeIntensity = 0;
    this._shakeOffsetX = 0;
    this._shakeOffsetY = 0;

    // 한글 폰트 설정
    this._koreanFontLoaded = false;
  }

  getCanvas() { return this.canvas; }
  getContext() { return this.ctx; }

  /**
   * 화면 클리어
   */
  clear(color = '#000000') {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  /**
   * 화면 흔들림 업데이트
   */
  updateShake(dt) {
    if (this._shakeDuration > 0) {
      this._shakeTime += dt;
      if (this._shakeTime >= this._shakeDuration) {
        this._shakeDuration = 0;
        this._shakeOffsetX = 0;
        this._shakeOffsetY = 0;
      } else {
        const progress = 1 - (this._shakeTime / this._shakeDuration);
        const intensity = this._shakeIntensity * progress;
        this._shakeOffsetX = (Math.random() - 0.5) * 2 * intensity;
        this._shakeOffsetY = (Math.random() - 0.5) * 2 * intensity;
      }
    }
  }

  /**
   * 화면 흔들림 시작
   */
  screenShake(duration = 300, intensity = 4) {
    this._shakeDuration = duration;
    this._shakeTime = 0;
    this._shakeIntensity = intensity;
  }

  /**
   * 흔들림 offset 적용 (렌더 전 호출)
   */
  applyShake() {
    if (this._shakeOffsetX !== 0 || this._shakeOffsetY !== 0) {
      this.ctx.save();
      this.ctx.translate(this._shakeOffsetX, this._shakeOffsetY);
    }
  }

  /**
   * 흔들림 offset 해제 (렌더 후 호출)
   */
  restoreShake() {
    if (this._shakeOffsetX !== 0 || this._shakeOffsetY !== 0) {
      this.ctx.restore();
    }
  }

  /**
   * 비트맵 픽셀 텍스트 렌더링
   * ASCII는 내장 비트맵 폰트, 한글은 Canvas fillText 폴백
   */
  drawPixelText(text, x, y, color = '#ffffff', size = 1) {
    const ctx = this.ctx;
    const charWidth = 6 * size; // 5px + 1px spacing
    const charHeight = 7 * size;
    let curX = x;

    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      const code = ch.charCodeAt(0);

      if (isKorean(ch)) {
        // 한글: Canvas fillText 사용 (pixel-ish 스타일)
        ctx.save();
        ctx.fillStyle = color;
        ctx.font = `bold ${charHeight + size}px monospace`;
        ctx.textBaseline = 'top';
        ctx.fillText(ch, curX, y - size);
        ctx.restore();
        curX += charHeight + size;
      } else if (FONT_DATA[code]) {
        // ASCII 비트맵 폰트
        const rows = FONT_DATA[code];
        ctx.fillStyle = color;
        for (let row = 0; row < 7; row++) {
          const bits = rows[row];
          for (let col = 0; col < 5; col++) {
            if (bits & (1 << (4 - col))) {
              ctx.fillRect(
                curX + col * size,
                y + row * size,
                size, size
              );
            }
          }
        }
        curX += charWidth;
      } else {
        // 미지원 문자 - 공백 처리
        curX += charWidth;
      }
    }

    return curX - x; // 렌더된 총 너비
  }

  /**
   * 텍스트 너비 측정
   */
  measureText(text, size = 1) {
    const charWidth = 6 * size;
    const charHeight = 7 * size;
    let width = 0;

    for (let i = 0; i < text.length; i++) {
      if (isKorean(text[i])) {
        width += charHeight + size;
      } else {
        width += charWidth;
      }
    }
    return width;
  }

  /**
   * 사각형 그리기
   */
  drawRect(x, y, w, h, color = '#ffffff', filled = true) {
    if (filled) {
      this.ctx.fillStyle = color;
      this.ctx.fillRect(x, y, w, h);
    } else {
      this.ctx.strokeStyle = color;
      this.ctx.lineWidth = 2;
      this.ctx.strokeRect(x, y, w, h);
    }
  }

  /**
   * RPG 스타일 패널 (이중 테두리)
   */
  drawPanel(x, y, w, h, bgColor = '#1a1a2e', borderColor = '#4a4a6a') {
    const ctx = this.ctx;
    // 외곽 테두리
    ctx.fillStyle = borderColor;
    ctx.fillRect(x, y, w, h);
    // 내부 배경
    ctx.fillStyle = bgColor;
    ctx.fillRect(x + 3, y + 3, w - 6, h - 6);
    // 밝은 하이라이트 (좌측, 상단)
    ctx.fillStyle = lightenColor(borderColor, 0.3);
    ctx.fillRect(x + 1, y + 1, w - 2, 1);
    ctx.fillRect(x + 1, y + 1, 1, h - 2);
    // 어두운 그림자 (우측, 하단)
    ctx.fillStyle = darkenColor(borderColor, 0.3);
    ctx.fillRect(x + 1, y + h - 2, w - 2, 1);
    ctx.fillRect(x + w - 2, y + 1, 1, h - 2);
  }

  /**
   * HP 바 (초록 > 노랑 > 빨강 그라디언트)
   */
  drawHpBar(x, y, w, h, current, max) {
    const ctx = this.ctx;
    const ratio = Math.max(0, Math.min(1, current / max));

    // 배경
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#333333';
    ctx.fillRect(x + 1, y + 1, w - 2, h - 2);

    // HP 바
    const barW = Math.floor((w - 2) * ratio);
    if (barW > 0) {
      let color;
      if (ratio > 0.5) {
        // 초록 -> 노랑
        const t = (ratio - 0.5) * 2;
        const r = Math.round(255 * (1 - t) + 68 * t);
        const g = Math.round(204 * (1 - t) + 204 * t);
        color = `rgb(${r},${g},68)`;
      } else {
        // 노랑 -> 빨강
        const t = ratio * 2;
        const r = 255;
        const g = Math.round(204 * t);
        color = `rgb(${r},${g},68)`;
      }

      ctx.fillStyle = color;
      ctx.fillRect(x + 1, y + 1, barW, h - 2);

      // 광택 효과
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      ctx.fillRect(x + 1, y + 1, barW, Math.floor((h - 2) / 2));
    }
  }

  /**
   * EXP 바
   */
  drawExpBar(x, y, w, h, current, max) {
    const ctx = this.ctx;
    const ratio = max > 0 ? Math.max(0, Math.min(1, current / max)) : 0;

    // 배경
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#222244';
    ctx.fillRect(x + 1, y + 1, w - 2, h - 2);

    // EXP 바 (gradient: dark blue → light blue)
    const barW = Math.floor((w - 2) * ratio);
    if (barW > 0) {
      const grad = ctx.createLinearGradient(x + 1, y, x + 1 + barW, y);
      grad.addColorStop(0, '#2255aa');
      grad.addColorStop(1, '#66bbff');
      ctx.fillStyle = grad;
      ctx.fillRect(x + 1, y + 1, barW, h - 2);
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      ctx.fillRect(x + 1, y + 1, barW, Math.floor((h - 2) / 2));
    }
  }

  /**
   * 스프라이트 그리기 (OffscreenCanvas)
   */
  drawSprite(sprite, x, y, scale = 1) {
    if (!sprite) return;
    const ctx = this.ctx;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(sprite, x, y, sprite.width * scale, sprite.height * scale);
  }

  /**
   * RPG 스타일 버튼
   */
  drawButton(x, y, w, h, text, isSelected = false, isDisabled = false) {
    const ctx = this.ctx;

    if (isDisabled) {
      this.drawPanel(x, y, w, h, '#222233', '#333344');
      this.drawPixelText(text, x + 12, y + Math.floor(h / 2) - 5, '#555566', 2);
    } else if (isSelected) {
      this.drawPanel(x, y, w, h, '#2a2a5a', '#6666aa');
      // 선택 인디케이터 (삼각형)
      ctx.fillStyle = '#ffcc44';
      ctx.fillRect(x + 8, y + Math.floor(h / 2) - 3, 2, 2);
      ctx.fillRect(x + 10, y + Math.floor(h / 2) - 5, 2, 6);
      ctx.fillRect(x + 12, y + Math.floor(h / 2) - 7, 2, 10);
      this.drawPixelText(text, x + 20, y + Math.floor(h / 2) - 7, '#ffffff', 2);
    } else {
      this.drawPanel(x, y, w, h, '#1a1a2e', '#4a4a6a');
      this.drawPixelText(text, x + 20, y + Math.floor(h / 2) - 7, '#ccccdd', 2);
    }
  }

  /**
   * 페이드 인 시작
   */
  fadeIn(duration = 500, callback = null) {
    this._fadeAlpha = 1;
    this._fadeTarget = 0;
    this._fadeSpeed = 1 / (duration / 1000);
    this._fadingIn = true;
    this._fadingOut = false;
    this._fadeCallback = callback;
  }

  /**
   * 페이드 아웃 시작
   */
  fadeOut(duration = 500, callback = null) {
    this._fadeAlpha = 0;
    this._fadeTarget = 1;
    this._fadeSpeed = 1 / (duration / 1000);
    this._fadingOut = true;
    this._fadingIn = false;
    this._fadeCallback = callback;
  }

  /**
   * 페이드 업데이트 (update 루프에서 호출)
   */
  updateFade(dt) {
    if (!this._fadingIn && !this._fadingOut) return;

    if (this._fadingIn) {
      this._fadeAlpha = Math.max(0, this._fadeAlpha - this._fadeSpeed * dt);
      if (this._fadeAlpha <= 0) {
        this._fadeAlpha = 0;
        this._fadingIn = false;
        if (this._fadeCallback) {
          this._fadeCallback();
          this._fadeCallback = null;
        }
      }
    } else if (this._fadingOut) {
      this._fadeAlpha = Math.min(1, this._fadeAlpha + this._fadeSpeed * dt);
      if (this._fadeAlpha >= 1) {
        this._fadeAlpha = 1;
        this._fadingOut = false;
        if (this._fadeCallback) {
          this._fadeCallback();
          this._fadeCallback = null;
        }
      }
    }
  }

  /**
   * 페이드 오버레이 렌더링 (렌더 마지막에 호출)
   */
  renderFade() {
    if (this._fadeAlpha > 0) {
      this.ctx.fillStyle = `rgba(0,0,0,${this._fadeAlpha})`;
      this.ctx.fillRect(0, 0, this.width, this.height);
    }
  }

  /**
   * 페이드 진행 중인지
   */
  isFading() {
    return this._fadingIn || this._fadingOut;
  }

  /**
   * 업데이트 (dt: 초 단위)
   */
  update(dt) {
    this.updateFade(dt);
    this.updateShake(dt * 1000); // 밀리초 단위
  }
}

/**
 * 색상 유틸 (패널 렌더링용)
 */
function lightenColor(hex, amount) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return '#' + [r, g, b].map(c =>
    Math.min(255, Math.round(c + (255 - c) * amount)).toString(16).padStart(2, '0')
  ).join('');
}

function darkenColor(hex, amount) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return '#' + [r, g, b].map(c =>
    Math.max(0, Math.round(c * (1 - amount))).toString(16).padStart(2, '0')
  ).join('');
}
