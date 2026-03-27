// 탐험 결과 화면 — 탐험 완료 후 결과 요약 표시
// 성공/실패, AP, 처치 수, 획득 아이템, 경험치, 골드, 소요 시간

const PANEL_W = 600;
const PANEL_H = 400;
const ROW_DELAY = 0.15; // 각 행 등장 간격 (초)

const TIME_LABELS = {
  morning: '아침',
  day:     '낮',
  evening: '저녁',
  night:   '밤',
};

export class ExpeditionSummary {
  constructor(renderer) {
    this.renderer = renderer;
    this.visible = false;
    this.results = null;
    this.animProgress = 0;
    this.onDismiss = null;
    this._dismissReady = false;
  }

  /**
   * @param {object} results
   * @param {boolean} results.success
   * @param {number}  results.apUsed
   * @param {number}  results.apRemaining
   * @param {number}  results.monstersDefeated
   * @param {Array<{name:string, count:number}>} results.itemsFound
   * @param {number}  results.expGained
   * @param {number}  results.moneyChange
   * @param {number}  results.bonusExp
   * @param {string}  results.timeOfDay
   */
  show(results) {
    this.results = results;
    this.visible = true;
    this.animProgress = 0;
    this._dismissReady = false;
  }

  update(dt) {
    if (!this.visible || !this.results) return;

    this.animProgress += dt;

    // 모든 행이 나타난 후 Enter 허용
    const totalRows = this._getRowCount();
    if (this.animProgress >= totalRows * ROW_DELAY + 0.3) {
      this._dismissReady = true;
    }
  }

  render(ctx) {
    if (!this.visible || !this.results) return;

    const r = this.renderer;
    const res = this.results;

    const cx = 400; // 화면 중앙 (800/2)
    const cy = 300; // 화면 중앙 (600/2)
    const px = cx - PANEL_W / 2;
    const py = cy - PANEL_H / 2;

    // ─── 배경 오버레이 ───
    ctx.fillStyle = res.success ? 'rgba(0,0,0,0.7)' : 'rgba(40,0,0,0.75)';
    ctx.fillRect(0, 0, 800, 600);

    // ─── 메인 패널 ───
    const borderColor = res.success ? '#aa8833' : '#993333';
    r.drawPanel(px, py, PANEL_W, PANEL_H, '#0d0d1e', borderColor);

    // 실패 시 붉은 틴트 오버레이
    if (!res.success) {
      ctx.fillStyle = 'rgba(80,0,0,0.15)';
      ctx.fillRect(px + 2, py + 2, PANEL_W - 4, PANEL_H - 4);
    }

    // ─── 제목 ───
    const titleColor = res.success ? '#FFD700' : '#FF4444';
    const titleText = '탐험 결과';
    r.drawPixelText(titleText, px + 30, py + 20, titleColor, 3);

    // 성공/실패 표시
    const resultText = res.success ? '성공' : '실패';
    const resultColor = res.success ? '#44cc66' : '#ff4444';
    r.drawPixelText(resultText, px + PANEL_W - 120, py + 22, resultColor, 3);

    // 구분선
    ctx.fillStyle = borderColor;
    ctx.fillRect(px + 20, py + 55, PANEL_W - 40, 1);

    // ─── 스탯 행 (스태거드 페이드인) ───
    let rowIndex = 0;
    const rowStartY = py + 70;
    const rowH = 28;
    const leftX = px + 35;
    const valX = px + PANEL_W - 40;

    // AP 사용 / 잔여
    if (this._isRowVisible(rowIndex)) {
      const alpha = this._getRowAlpha(rowIndex);
      ctx.globalAlpha = alpha;
      r.drawPixelText('AP 사용', leftX, rowStartY + rowIndex * rowH, '#aaaacc', 2);
      r.drawPixelText(`${res.apUsed}`, valX - this._textWidth(`${res.apUsed}`, 2), rowStartY + rowIndex * rowH, '#ffffff', 2);
      ctx.globalAlpha = 1;
    }
    rowIndex++;

    // AP 바 시각화
    if (this._isRowVisible(rowIndex)) {
      const alpha = this._getRowAlpha(rowIndex);
      ctx.globalAlpha = alpha;

      const barX = leftX;
      const barY = rowStartY + rowIndex * rowH;
      const barW = PANEL_W - 80;
      const barH = 12;
      const totalAP = res.apUsed + res.apRemaining;

      // 바 배경
      ctx.fillStyle = '#222233';
      ctx.fillRect(barX, barY, barW, barH);

      // 사용한 AP (어두운 색)
      if (totalAP > 0) {
        const usedRatio = res.apUsed / totalAP;
        ctx.fillStyle = '#664444';
        ctx.fillRect(barX, barY, barW * usedRatio, barH);

        // 남은 AP (밝은 색)
        const remainRatio = res.apRemaining / totalAP;
        ctx.fillStyle = '#44cc66';
        ctx.fillRect(barX + barW * usedRatio, barY, barW * remainRatio, barH);
      }

      // AP 수치 텍스트
      r.drawPixelText(`잔여: ${res.apRemaining}`, barX + barW + 5, barY, '#88cc88', 1);
      ctx.globalAlpha = 1;
    }
    rowIndex++;

    // 처치한 몬스터
    if (this._isRowVisible(rowIndex)) {
      const alpha = this._getRowAlpha(rowIndex);
      ctx.globalAlpha = alpha;
      r.drawPixelText('처치한 몬스터', leftX, rowStartY + rowIndex * rowH, '#aaaacc', 2);
      r.drawPixelText(`${res.monstersDefeated}`, valX - this._textWidth(`${res.monstersDefeated}`, 2), rowStartY + rowIndex * rowH, '#ffffff', 2);
      ctx.globalAlpha = 1;
    }
    rowIndex++;

    // 획득 아이템
    if (this._isRowVisible(rowIndex)) {
      const alpha = this._getRowAlpha(rowIndex);
      ctx.globalAlpha = alpha;
      r.drawPixelText('획득 아이템', leftX, rowStartY + rowIndex * rowH, '#aaaacc', 2);

      if (res.itemsFound && res.itemsFound.length > 0) {
        // 아이템이 3개 이하이면 한 줄에, 그 이상이면 개수만 표시
        if (res.itemsFound.length <= 3) {
          const itemTexts = res.itemsFound.map(it => `${it.name}x${it.count}`);
          const itemStr = itemTexts.join(', ');
          r.drawPixelText(itemStr, valX - this._textWidth(itemStr, 1), rowStartY + rowIndex * rowH + 3, '#cccc88', 1);
        } else {
          const itemStr = `${res.itemsFound.length}종`;
          r.drawPixelText(itemStr, valX - this._textWidth(itemStr, 2), rowStartY + rowIndex * rowH, '#cccc88', 2);
        }
      } else {
        r.drawPixelText('없음', valX - this._textWidth('없음', 2), rowStartY + rowIndex * rowH, '#666688', 2);
      }
      ctx.globalAlpha = 1;
    }
    rowIndex++;

    // 아이템이 많을 경우 추가 행들
    if (res.itemsFound && res.itemsFound.length > 3) {
      for (let i = 0; i < res.itemsFound.length; i++) {
        if (this._isRowVisible(rowIndex)) {
          const alpha = this._getRowAlpha(rowIndex);
          ctx.globalAlpha = alpha;
          const item = res.itemsFound[i];
          const itemText = `  ${item.name}`;
          const countText = `x${item.count}`;
          r.drawPixelText(itemText, leftX + 20, rowStartY + rowIndex * rowH, '#cccc88', 1);
          r.drawPixelText(countText, valX - this._textWidth(countText, 1), rowStartY + rowIndex * rowH, '#cccc88', 1);
          ctx.globalAlpha = 1;
        }
        rowIndex++;
      }
    }

    // 구분선
    if (this._isRowVisible(rowIndex)) {
      const alpha = this._getRowAlpha(rowIndex);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#333355';
      ctx.fillRect(px + 30, rowStartY + rowIndex * rowH + 4, PANEL_W - 60, 1);
      ctx.globalAlpha = 1;
    }
    rowIndex++;

    // 경험치 (크게 표시)
    if (this._isRowVisible(rowIndex)) {
      const alpha = this._getRowAlpha(rowIndex);
      ctx.globalAlpha = alpha;
      r.drawPixelText('획득 경험치', leftX, rowStartY + rowIndex * rowH, '#aaaacc', 2);

      const expText = `+${res.expGained}`;
      r.drawPixelText(expText, valX - this._textWidth(expText, 3), rowStartY + rowIndex * rowH - 3, '#44ddff', 3);

      // 보너스 경험치 표시
      if (res.bonusExp && res.bonusExp > 0) {
        const bonusText = `(+${res.bonusExp} 보너스)`;
        r.drawPixelText(bonusText, valX - this._textWidth(bonusText, 1), rowStartY + rowIndex * rowH + 22, '#88aaff', 1);
      }
      ctx.globalAlpha = 1;
    }
    rowIndex++;

    // 골드 변동
    if (this._isRowVisible(rowIndex)) {
      const alpha = this._getRowAlpha(rowIndex);
      ctx.globalAlpha = alpha;
      r.drawPixelText('골드', leftX, rowStartY + rowIndex * rowH, '#aaaacc', 2);

      const moneyPositive = res.moneyChange >= 0;
      const moneyPrefix = moneyPositive ? '+' : '';
      const moneyText = `${moneyPrefix}${res.moneyChange}G`;
      const moneyColor = moneyPositive ? '#FFD700' : '#FF4444';
      r.drawPixelText(moneyText, valX - this._textWidth(moneyText, 2), rowStartY + rowIndex * rowH, moneyColor, 2);

      // 실패 시 패널티 텍스트
      if (!res.success && res.moneyChange < 0) {
        r.drawPixelText('패널티', valX - this._textWidth('패널티', 1) - this._textWidth(moneyText, 2) - 10, rowStartY + rowIndex * rowH + 4, '#ff6666', 1);
      }
      ctx.globalAlpha = 1;
    }
    rowIndex++;

    // 시간대
    if (this._isRowVisible(rowIndex)) {
      const alpha = this._getRowAlpha(rowIndex);
      ctx.globalAlpha = alpha;
      const timeLabel = TIME_LABELS[res.timeOfDay] || res.timeOfDay;
      r.drawPixelText('시간대', leftX, rowStartY + rowIndex * rowH, '#aaaacc', 2);
      r.drawPixelText(timeLabel, valX - this._textWidth(timeLabel, 2), rowStartY + rowIndex * rowH, '#ccccdd', 2);
      ctx.globalAlpha = 1;
    }
    rowIndex++;

    // ─── 하단: Enter로 계속 ───
    if (this._dismissReady) {
      // 깜빡임 효과
      const blinkAlpha = 0.5 + 0.5 * Math.sin(this.animProgress * 4);
      ctx.globalAlpha = blinkAlpha;
      r.drawPixelText('Enter로 계속', cx - this._textWidth('Enter로 계속', 2) / 2, py + PANEL_H - 35, '#aaaacc', 2);
      ctx.globalAlpha = 1;
    }
  }

  handleInput(key) {
    if (!this.visible) return false;

    if (key === 'Enter' && this._dismissReady) {
      this.visible = false;
      if (this.onDismiss) {
        this.onDismiss();
      }
      return true;
    }

    // 아직 애니메이션 진행 중이면 Enter로 스킵
    if (key === 'Enter' && !this._dismissReady) {
      const totalRows = this._getRowCount();
      this.animProgress = totalRows * ROW_DELAY + 0.5;
      this._dismissReady = true;
      return true;
    }

    // 다른 입력 무시 (화면 위에 있으므로 먹어야 함)
    return true;
  }

  // ─── 내부 헬퍼 ───

  _getRowCount() {
    if (!this.results) return 0;
    let count = 8; // 기본 행: AP사용, AP바, 몬스터, 아이템, 구분선, 경험치, 골드, 시간대
    if (this.results.itemsFound && this.results.itemsFound.length > 3) {
      count += this.results.itemsFound.length;
    }
    return count;
  }

  _isRowVisible(index) {
    return this.animProgress >= index * ROW_DELAY;
  }

  _getRowAlpha(index) {
    const elapsed = this.animProgress - index * ROW_DELAY;
    if (elapsed <= 0) return 0;
    if (elapsed >= 0.3) return 1;
    return elapsed / 0.3;
  }

  /**
   * drawPixelText의 5x7 폰트 기준 텍스트 폭 추정
   * 각 문자: (5 * scale) + (1 * scale) 간격
   */
  _textWidth(text, scale) {
    return text.length * 6 * scale;
  }
}
