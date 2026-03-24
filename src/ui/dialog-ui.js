// 다이얼로그 / 텍스트 박스 시스템
import { generateSprite } from './sprite-generator.js';

/**
 * 다이얼로그 씬 정의
 * @typedef {Object} DialogScene
 * @property {string} text - 대사 텍스트
 * @property {string} [speaker] - 화자 이름
 * @property {Object} [portrait] - spriteConfig (초상화용)
 * @property {Array<{text:string, value:*}>} [choices] - 선택지
 * @property {Function} [onComplete] - 완료 콜백
 * @property {Function} [onChoice] - 선택 콜백 (choiceValue)
 */

export class DialogUI {
  /**
   * @param {import('./renderer.js').Renderer} renderer
   */
  constructor(renderer) {
    this.renderer = renderer;
    this.active = false;

    // 씬 큐
    this.sceneQueue = [];
    this.currentScene = null;

    // 타이프라이터 상태
    this.displayedChars = 0;
    this.typewriterTimer = 0;
    this.typewriterSpeeds = [15, 30, 60]; // 느림/보통/빠름
    this.speedSetting = 1; // 0=느림, 1=보통, 2=빠름
    this.textComplete = false;

    // 선택지 상태
    this.choiceCursor = 0;
    this.showingChoices = false;

    // 초상화 캐시
    this._portraitCache = new Map();

    // 레이아웃
    this.boxX = 20;
    this.boxY = 430;
    this.boxW = 760;
    this.boxH = 150;
    this.textX = 30;
    this.textY = 465;
    this.portraitSize = 80;
    this.maxCharsPerLine = 38;
    this.maxLines = 3;

    // 콜백
    this.onAllComplete = null;
  }

  /**
   * 텍스트 속도 설정
   */
  setSpeed(speed) {
    this.speedSetting = Math.max(0, Math.min(2, speed));
  }

  /**
   * 다이얼로그 씬 큐에 추가
   */
  queue(scenes) {
    if (!Array.isArray(scenes)) scenes = [scenes];
    for (const scene of scenes) {
      this.sceneQueue.push(scene);
    }
    if (!this.active) {
      this._advanceScene();
    }
  }

  /**
   * 단일 메시지 (편의 메서드)
   */
  show(text, speaker = null, onComplete = null) {
    this.queue([{ text, speaker, onComplete }]);
  }

  /**
   * 선택지 다이얼로그
   */
  showChoice(text, choices, speaker = null, onChoice = null) {
    this.queue([{ text, speaker, choices, onChoice }]);
  }

  /**
   * 활성 여부
   */
  isActive() {
    return this.active;
  }

  /**
   * 씬 진행
   */
  _advanceScene() {
    if (this.sceneQueue.length === 0) {
      this.active = false;
      this.currentScene = null;
      if (this.onAllComplete) {
        this.onAllComplete();
        this.onAllComplete = null;
      }
      return;
    }

    this.currentScene = this.sceneQueue.shift();
    this.active = true;
    this.displayedChars = 0;
    this.typewriterTimer = 0;
    this.textComplete = false;
    this.showingChoices = false;
    this.choiceCursor = 0;

    // 초상화 텍스트 오프셋 조정
    if (this.currentScene.portrait) {
      this.textX = this.boxX + this.portraitSize + 20;
    } else {
      this.textX = this.boxX + 15;
    }
  }

  /**
   * 텍스트 줄바꿈 처리
   */
  _wrapText(text) {
    const lines = [];
    let currentLine = '';
    const maxW = this.currentScene?.portrait ? this.maxCharsPerLine - 8 : this.maxCharsPerLine;

    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (ch === '\n') {
        lines.push(currentLine);
        currentLine = '';
        continue;
      }

      currentLine += ch;
      // 간단한 문자폭 추정 (한글은 약 1.5배)
      const isK = ch.charCodeAt(0) >= 0xAC00;
      const lineLen = [...currentLine].reduce((acc, c) => acc + (c.charCodeAt(0) >= 0xAC00 ? 1.5 : 1), 0);

      if (lineLen >= maxW) {
        lines.push(currentLine);
        currentLine = '';
      }
    }
    if (currentLine) lines.push(currentLine);
    return lines;
  }

  /**
   * 업데이트
   */
  update(dt) {
    if (!this.active || !this.currentScene) return;

    if (!this.textComplete) {
      this.typewriterTimer += dt;
      const speed = this.typewriterSpeeds[this.speedSetting];
      const charsToShow = Math.floor(this.typewriterTimer * speed);

      if (charsToShow >= this.currentScene.text.length) {
        this.displayedChars = this.currentScene.text.length;
        this.textComplete = true;
        // 선택지가 있으면 표시
        if (this.currentScene.choices) {
          this.showingChoices = true;
          this.choiceCursor = 0;
        }
      } else {
        this.displayedChars = charsToShow;
      }
    }
  }

  /**
   * 렌더링
   */
  render() {
    if (!this.active || !this.currentScene) return;

    const r = this.renderer;
    const ctx = r.getContext();
    const scene = this.currentScene;

    // 반투명 상단 오버레이 (선택적)
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.fillRect(0, 0, 800, this.boxY);

    // 다이얼로그 박스
    r.drawPanel(this.boxX, this.boxY, this.boxW, this.boxH, '#0d0d1e', '#4a4a6a');

    // 화자 이름 라벨
    if (scene.speaker) {
      const nameW = r.measureText(scene.speaker, 2) + 20;
      r.drawPanel(this.boxX + 10, this.boxY - 22, nameW, 28, '#1a1a3e', '#6666aa');
      r.drawPixelText(scene.speaker, this.boxX + 20, this.boxY - 16, '#ffcc44', 2);
    }

    // 초상화
    if (scene.portrait) {
      const key = JSON.stringify(scene.portrait);
      let portrait = this._portraitCache.get(key);
      if (!portrait) {
        portrait = generateSprite(scene.portrait, 64);
        this._portraitCache.set(key, portrait);
      }
      if (portrait) {
        // 초상화 배경
        r.drawPanel(this.boxX + 8, this.boxY + 10, this.portraitSize + 8, this.portraitSize + 8, '#111122', '#3a3a5a');
        r.drawSprite(portrait, this.boxX + 12, this.boxY + 14, this.portraitSize / 64);
      }
    }

    // 텍스트 (타이프라이터)
    const displayText = scene.text.substring(0, this.displayedChars);
    const lines = this._wrapText(displayText);
    const lineHeight = 20;
    const startY = this.boxY + 18;

    for (let i = 0; i < Math.min(lines.length, this.maxLines); i++) {
      r.drawPixelText(lines[i], this.textX, startY + i * lineHeight, '#ffffff', 2);
    }

    // 선택지
    if (this.showingChoices && scene.choices) {
      const choiceX = this.boxX + this.boxW - 200;
      const choiceY = this.boxY - scene.choices.length * 35 - 10;

      r.drawPanel(choiceX - 10, choiceY - 5, 210, scene.choices.length * 35 + 15, '#0d0d1e', '#4a4a6a');

      for (let i = 0; i < scene.choices.length; i++) {
        const cy = choiceY + i * 35;
        const selected = this.choiceCursor === i;

        if (selected) {
          ctx.fillStyle = 'rgba(100,100,200,0.2)';
          ctx.fillRect(choiceX, cy, 190, 30);
          ctx.fillStyle = '#ffcc44';
          ctx.fillRect(choiceX + 6, cy + 10, 6, 6);
          r.drawPixelText(scene.choices[i].text, choiceX + 18, cy + 6, '#ffffff', 2);
        } else {
          r.drawPixelText(scene.choices[i].text, choiceX + 18, cy + 6, '#aaaacc', 2);
        }
      }
    }

    // 진행 인디케이터
    if (this.textComplete && !this.showingChoices) {
      const blink = Math.floor(Date.now() / 400) % 2;
      if (blink) {
        const indX = this.boxX + this.boxW - 30;
        const indY = this.boxY + this.boxH - 25;
        ctx.fillStyle = '#ffcc44';
        ctx.fillRect(indX, indY, 8, 4);
        ctx.fillRect(indX + 2, indY + 4, 4, 4);
      }
    }
  }

  /**
   * 입력 처리
   * @returns {boolean} consumed
   */
  handleInput(key) {
    if (!this.active) return false;

    if (this.showingChoices) {
      return this._handleChoiceInput(key);
    }

    switch (key) {
      case 'Enter':
      case ' ':
        if (!this.textComplete) {
          // 즉시 전체 표시
          this.displayedChars = this.currentScene.text.length;
          this.textComplete = true;
          if (this.currentScene.choices) {
            this.showingChoices = true;
            this.choiceCursor = 0;
          }
        } else {
          // 다음 씬으로
          if (this.currentScene.onComplete) {
            this.currentScene.onComplete();
          }
          this._advanceScene();
        }
        return true;
    }
    return true; // 다이얼로그 활성 시 모든 입력 소비
  }

  _handleChoiceInput(key) {
    const choices = this.currentScene.choices;
    if (!choices) return true;

    switch (key) {
      case 'ArrowUp':
        this.choiceCursor = (this.choiceCursor - 1 + choices.length) % choices.length;
        return true;
      case 'ArrowDown':
        this.choiceCursor = (this.choiceCursor + 1) % choices.length;
        return true;
      case 'Enter':
      case ' ':
        const choice = choices[this.choiceCursor];
        if (this.currentScene.onChoice) {
          this.currentScene.onChoice(choice.value);
        }
        this._advanceScene();
        return true;
    }
    return true;
  }

  /**
   * 큐 비우기
   */
  clear() {
    this.sceneQueue = [];
    this.active = false;
    this.currentScene = null;
  }
}
