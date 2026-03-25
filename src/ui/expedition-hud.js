// 탐험 HUD — AP바, 시간대 표시, 마기농도, 캠핑 메뉴
// 맵 화면 위에 오버레이로 렌더링

const TIME_COLORS = {
  morning: { sky: 'rgba(255,200,100,0.08)', label: '아침', icon: '☀', color: '#FFD700' },
  day:     { sky: 'rgba(255,255,200,0.03)', label: '낮',   icon: '☀', color: '#FFFFFF' },
  evening: { sky: 'rgba(200,100,50,0.12)',  label: '저녁', icon: '🌅', color: '#FF8844' },
  night:   { sky: 'rgba(0,0,40,0.35)',      label: '밤',   icon: '🌙', color: '#8888CC' },
};

export class ExpeditionHUD {
  constructor(renderer) {
    this.renderer = renderer;
    this.visible = false;

    // 외부에서 설정
    this.currentAP = 240;
    this.maxAP = 240;
    this.timeOfDay = 'morning';
    this.magiDensity = 0.1;
    this.hourOfDay = 6;
    this.isExpeditionActive = false;
    this.objectiveText = '';
    this.objectiveComplete = false;

    // 캠핑 메뉴
    this.showCampMenu = false;
    this.campCursor = 0;
    this.campOptions = [
      { id: 'quick', label: '간이 휴식 (4AP)', ap: 4, healRatio: 0.25, ppRatio: 0, cureStatus: false },
      { id: 'basic', label: '기본 야영 (8AP)', ap: 8, healRatio: 0.5, ppRatio: 0.5, cureStatus: false },
      { id: 'full',  label: '완전 야영 (16AP)', ap: 16, healRatio: 1.0, ppRatio: 1.0, cureStatus: true },
      { id: 'cancel', label: '취소', ap: 0 },
    ];

    // 경고 플래시
    this._warningFlash = 0;

    // 콜백
    this.onCamp = null;  // (campOption) => void
  }

  update(dt) {
    // AP 경고 플래시
    if (this.currentAP <= 30) {
      this._warningFlash += dt * 4;
    }
  }

  render(ctx) {
    if (!this.isExpeditionActive) return;

    const r = this.renderer;

    // ─── 시간대 오버레이 (전체 화면) ───
    const timeInfo = TIME_COLORS[this.timeOfDay] || TIME_COLORS.day;
    if (timeInfo.sky) {
      ctx.fillStyle = timeInfo.sky;
      ctx.fillRect(0, 0, 800, 600);
    }

    // 밤 시야 제한 (가장자리 어둡게)
    if (this.timeOfDay === 'night') {
      const grad = ctx.createRadialGradient(400, 300, 100, 400, 300, 400);
      grad.addColorStop(0, 'rgba(0,0,0,0)');
      grad.addColorStop(0.6, 'rgba(0,0,20,0.3)');
      grad.addColorStop(1, 'rgba(0,0,30,0.6)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 800, 600);
    }

    // ─── 상단 HUD 바 ───
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, 800, 32);

    // AP 바
    const apRatio = this.currentAP / this.maxAP;
    const apBarX = 10, apBarY = 6, apBarW = 200, apBarH = 14;

    // AP 바 배경
    ctx.fillStyle = '#222';
    ctx.fillRect(apBarX, apBarY, apBarW, apBarH);

    // AP 바 (잔량 색상)
    const apColor = apRatio > 0.5 ? '#44cc66' : apRatio > 0.2 ? '#cccc44' : '#cc4444';

    // 경고 깜빡임
    if (this.currentAP <= 30 && Math.sin(this._warningFlash) > 0) {
      ctx.fillStyle = '#ff2222';
    } else {
      ctx.fillStyle = apColor;
    }
    ctx.fillRect(apBarX, apBarY, apBarW * apRatio, apBarH);

    // AP 텍스트
    r.drawPixelText(`AP ${this.currentAP}/${this.maxAP}`, apBarX + apBarW + 8, apBarY, '#ffffff', 1);

    // 시간대 표시
    r.drawPixelText(`${timeInfo.label} ${this.hourOfDay}시`, 400, 8, timeInfo.color, 2);

    // 마기 농도 바
    const magiX = 550, magiW = 80;
    ctx.fillStyle = '#222';
    ctx.fillRect(magiX, apBarY, magiW, apBarH);
    ctx.fillStyle = this.magiDensity > 0.7 ? '#8844cc' : this.magiDensity > 0.4 ? '#6644aa' : '#443388';
    ctx.fillRect(magiX, apBarY, magiW * this.magiDensity, apBarH);
    r.drawPixelText('마기', magiX + magiW + 5, apBarY, '#aa88dd', 1);

    // 목표 표시
    if (this.objectiveText) {
      const objColor = this.objectiveComplete ? '#44cc66' : '#ffcc44';
      const prefix = this.objectiveComplete ? '✓ ' : '▶ ';
      r.drawPixelText(`${prefix}${this.objectiveText}`, 10, 22, objColor, 1);
    }

    // ─── 캠핑 메뉴 ───
    if (this.showCampMenu) {
      this._renderCampMenu(ctx, r);
    }
  }

  _renderCampMenu(ctx, r) {
    // 반투명 배경
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, 800, 600);

    // 메뉴 패널
    r.drawPanel(200, 150, 400, 300, '#0d0d1e', '#4a4a6a');
    r.drawPixelText('야영', 250, 170, '#ffcc44', 3);
    r.drawPixelText(`잔여 AP: ${this.currentAP}`, 250, 200, '#aaaacc', 2);

    for (let i = 0; i < this.campOptions.length; i++) {
      const opt = this.campOptions[i];
      const y = 235 + i * 45;
      const selected = this.campCursor === i;
      const canAfford = this.currentAP >= opt.ap;

      if (selected) {
        ctx.fillStyle = 'rgba(100,100,200,0.2)';
        ctx.fillRect(215, y - 5, 370, 38);
        ctx.fillStyle = '#ffcc44';
        ctx.fillRect(222, y + 8, 6, 6);
      }

      const textColor = !canAfford && opt.ap > 0 ? '#664444' : selected ? '#ffffff' : '#aaaacc';
      r.drawPixelText(opt.label, 240, y, textColor, 2);

      if (opt.healRatio > 0) {
        r.drawPixelText(`HP ${Math.floor(opt.healRatio * 100)}%`, 460, y, '#88cc88', 1);
      }
    }

    r.drawPixelText('[Enter] 선택  [ESC] 취소', 250, 420, '#666688', 1);
  }

  // ─── 입력 ───

  handleInput(key) {
    if (this.showCampMenu) {
      return this._handleCampInput(key);
    }

    // C키로 캠핑 메뉴 열기
    if (key === 'c' || key === 'C') {
      if (this.isExpeditionActive) {
        this.showCampMenu = true;
        this.campCursor = 0;
        return true;
      }
    }
    return false;
  }

  _handleCampInput(key) {
    switch (key) {
      case 'ArrowUp':
        this.campCursor = Math.max(0, this.campCursor - 1);
        return true;
      case 'ArrowDown':
        this.campCursor = Math.min(this.campOptions.length - 1, this.campCursor + 1);
        return true;
      case 'Enter':
      case ' ': {
        const opt = this.campOptions[this.campCursor];
        if (opt.id === 'cancel') {
          this.showCampMenu = false;
        } else if (this.currentAP >= opt.ap && this.onCamp) {
          this.showCampMenu = false;
          this.onCamp(opt);
        }
        return true;
      }
      case 'Escape':
        this.showCampMenu = false;
        return true;
    }
    return true;
  }
}
