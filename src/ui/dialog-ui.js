/**
 * dialog-ui.js — Dialog engine with typewriter effect, choices, speaker name
 */

export class DialogUI {
  constructor() {
    this.active = false;
    this.lines = [];        // [{speaker, text, choices}]
    this.lineIndex = 0;
    this.charIndex = 0;     // Typewriter position
    this.typeSpeed = 0.03;  // Seconds per character
    this.typeTimer = 0;
    this.finished = false;  // Current line fully displayed

    // Choice state
    this.selectedChoice = 0;
    this.choiceResult = null; // Set when a choice is made

    // Callback when dialog ends
    this.onEnd = null;
    this.onChoice = null;
  }

  /**
   * Start a dialog sequence
   * @param {Array} lines - [{speaker: 'NAME', text: '...', choices: ['A','B']}]
   * @param {Function} [onEnd] - Called when dialog completes
   * @param {Function} [onChoice] - Called with (lineIndex, choiceIndex)
   */
  start(lines, onEnd, onChoice) {
    this.lines = lines;
    this.lineIndex = 0;
    this.charIndex = 0;
    this.typeTimer = 0;
    this.finished = false;
    this.active = true;
    this.selectedChoice = 0;
    this.choiceResult = null;
    this.onEnd = onEnd || null;
    this.onChoice = onChoice || null;
  }

  /**
   * Update dialog state
   * @param {number} dt
   * @param {Object} keysJustPressed
   * @returns {string|null} 'done' when dialog ends
   */
  update(dt, keysJustPressed) {
    if (!this.active || this.lines.length === 0) return null;

    const line = this.lines[this.lineIndex];
    if (!line) { this._end(); return 'done'; }

    // Typewriter effect
    if (!this.finished) {
      this.typeTimer += dt;
      while (this.typeTimer >= this.typeSpeed && this.charIndex < line.text.length) {
        this.typeTimer -= this.typeSpeed;
        this.charIndex++;
      }
      if (this.charIndex >= line.text.length) {
        this.finished = true;
      }
    }

    // Input handling
    if (keysJustPressed.Enter || keysJustPressed.Space || keysJustPressed.KeyZ) {
      if (!this.finished) {
        // Skip typewriter — show full text
        this.charIndex = line.text.length;
        this.finished = true;
      } else if (line.choices && line.choices.length > 0) {
        // Select choice
        this.choiceResult = this.selectedChoice;
        if (this.onChoice) this.onChoice(this.lineIndex, this.selectedChoice);
        this._advance();
      } else {
        // Next line
        this._advance();
      }
    }

    // Choice navigation
    if (this.finished && line.choices && line.choices.length > 0) {
      if (keysJustPressed.ArrowUp || keysJustPressed.KeyW) {
        this.selectedChoice = (this.selectedChoice - 1 + line.choices.length) % line.choices.length;
      }
      if (keysJustPressed.ArrowDown || keysJustPressed.KeyS) {
        this.selectedChoice = (this.selectedChoice + 1) % line.choices.length;
      }
    }

    return null;
  }

  /**
   * Render dialog box
   * @param {import('./renderer.js').Renderer} renderer
   */
  render(renderer) {
    if (!this.active || this.lines.length === 0) return;

    const line = this.lines[this.lineIndex];
    if (!line) return;

    const W = renderer.width;  // 480
    const boxH = 60;
    const boxY = renderer.height - boxH - 5; // 205
    const boxX = 5;
    const boxW = W - 10;  // 470

    // Dialog box background
    renderer.setAlpha(0.9);
    renderer.fillRect(boxX, boxY, boxW, boxH, '#0a0a2e');
    renderer.resetAlpha();
    renderer.strokeRect(boxX, boxY, boxW, boxH, '#4466aa');

    // Speaker name
    if (line.speaker) {
      renderer.fillRect(boxX + 10, boxY - 14, renderer.measureText(line.speaker, 1) + 16, 16, '#0a0a2e');
      renderer.strokeRect(boxX + 10, boxY - 14, renderer.measureText(line.speaker, 1) + 16, 16, '#4466aa');
      renderer.drawText(line.speaker, boxX + 18, boxY - 12, '#FFD700', 1);
    }

    // Text with typewriter
    const displayText = line.text.substring(0, this.charIndex);
    this._drawWrappedText(renderer, displayText, boxX + 20, boxY + 15, boxW - 40, '#FFFFFF', 2);

    // Choices
    if (this.finished && line.choices && line.choices.length > 0) {
      const choiceX = boxX + boxW - 160;
      const choiceY = boxY - line.choices.length * 12 - 5;

      renderer.fillRect(choiceX, choiceY, 155, line.choices.length * 12 + 5, '#0a0a2e');
      renderer.strokeRect(choiceX, choiceY, 155, line.choices.length * 12 + 5, '#FFD700');

      for (let i = 0; i < line.choices.length; i++) {
        const selected = i === this.selectedChoice;
        const cy = choiceY + 4 + i * 12;
        if (selected) {
          renderer.fillRect(choiceX + 3, cy - 1, 149, 10, '#222244');
        }
        const prefix = selected ? '> ' : '  ';
        const color = selected ? '#FFD700' : '#AAAAAA';
        renderer.drawText(prefix + line.choices[i], choiceX + 6, cy, color, 1);
      }
    }

    // Continue indicator
    if (this.finished && (!line.choices || line.choices.length === 0)) {
      const blink = Math.sin(performance.now() / 300) > 0;
      if (blink) {
        renderer.drawText('V', boxX + boxW - 25, boxY + boxH - 20, '#FFD700', 2);
      }
    }
  }

  _advance() {
    this.lineIndex++;
    this.charIndex = 0;
    this.typeTimer = 0;
    this.finished = false;
    this.selectedChoice = 0;
    this.choiceResult = null;

    if (this.lineIndex >= this.lines.length) {
      this._end();
    }
  }

  _end() {
    this.active = false;
    if (this.onEnd) this.onEnd();
  }

  /**
   * Word-wrapped text rendering
   */
  _drawWrappedText(renderer, text, x, y, maxWidth, color, scale) {
    const charW = 6 * scale; // 5px font + 1px gap at scale
    const lineH = 8 * scale + 4;
    const maxChars = Math.floor(maxWidth / charW);
    let curY = y;

    // Simple character-based wrapping
    for (let i = 0; i < text.length; i += maxChars) {
      const segment = text.substring(i, i + maxChars);
      renderer.drawText(segment, x, curY, color, scale);
      curY += lineH;
    }
  }
}
