// 메인 메뉴 및 게임 내 메뉴 오버레이
import { generateSprite } from './sprite-generator.js';
import { generateItemIcon } from './item-icon-generator.js';
import { TYPE_COLORS, STATUS_COLORS, STATUS_LABELS } from './renderer.js';

// ==========================================
// 타이틀 화면
// ==========================================
export class TitleScreenUI {
  constructor(renderer) {
    this.renderer = renderer;
    this.cursor = 0;
    this.options = ['새 게임', '이어하기', '설정'];
    this.subState = null; // null | 'load_slots' | 'options'
    this.loadSlotCursor = 0;
    this.saveSlots = [null, null, null]; // 세이브 슬롯 데이터 (외부에서 설정)

    // 타이틀 애니메이션
    this.titleY = -80;
    this.titleTargetY = 80;
    this.titleBounce = 0;
    this.starField = [];
    for (let i = 0; i < 60; i++) {
      this.starField.push({
        x: Math.random() * 800,
        y: Math.random() * 600,
        size: Math.random() * 2 + 1,
        speed: Math.random() * 20 + 5,
        brightness: Math.random(),
      });
    }

    // 콜백
    this.onNewGame = null;
    this.onLoadGame = null;
    this.onOptions = null;
  }

  setSaveSlots(slots) {
    this.saveSlots = slots;
  }

  update(dt) {
    // 타이틀 슬라이드
    if (this.titleY < this.titleTargetY) {
      this.titleY = Math.min(this.titleTargetY, this.titleY + 200 * dt);
    }
    this.titleBounce += dt * 2;

    // 별 애니메이션
    for (const star of this.starField) {
      star.y += star.speed * dt;
      if (star.y > 600) {
        star.y = -2;
        star.x = Math.random() * 800;
      }
      star.brightness = 0.5 + Math.sin(Date.now() * 0.003 + star.x) * 0.5;
    }
  }

  render() {
    const r = this.renderer;
    const ctx = r.getContext();

    // 배경
    r.clear('#0a0a1e');

    // 별
    for (const star of this.starField) {
      const alpha = star.brightness;
      ctx.fillStyle = `rgba(200,200,255,${alpha})`;
      ctx.fillRect(Math.floor(star.x), Math.floor(star.y), star.size, star.size);
    }

    // 타이틀
    const bounce = Math.sin(this.titleBounce) * 3;
    const titleText = 'POCKET KINGDOM';
    const titleWidth = r.measureText(titleText, 4);
    r.drawPixelText(titleText, Math.floor((800 - titleWidth) / 2), this.titleY + bounce, '#ffcc44', 4);

    // 부제
    const subText = '포켓 킹덤';
    const subWidth = r.measureText(subText, 2);
    r.drawPixelText(subText, Math.floor((800 - subWidth) / 2), this.titleY + 50, '#aaaacc', 2);

    // 부제2 (서브타이틀)
    const sub2Text = '마석 계약자의 타임어택 탐험';
    const sub2Width = r.measureText(sub2Text, 1);
    r.drawPixelText(sub2Text, Math.floor((800 - sub2Width) / 2), this.titleY + 75, '#7777aa', 1);

    if (this.subState === 'load_slots') {
      this._renderLoadSlots(r, ctx);
    } else if (this.subState === 'options') {
      this._renderOptionsStub(r, ctx);
    } else {
      // 메인 메뉴
      const menuY = 320;
      for (let i = 0; i < this.options.length; i++) {
        const ow = r.measureText(this.options[i], 3);
        const ox = Math.floor((800 - ow) / 2);
        const oy = menuY + i * 60;

        if (this.cursor === i) {
          r.drawPanel(ox - 30, oy - 10, ow + 60, 40, '#2a2a5a', '#6666aa');
          r.drawPixelText(this.options[i], ox, oy, '#ffffff', 3);
        } else {
          r.drawPixelText(this.options[i], ox, oy, '#8888aa', 3);
        }
      }
    }

    // 하단 안내
    r.drawPixelText('Arrow Keys + Enter', 280, 560, '#444466', 2);

    // 터치 안내 (터치 디바이스 전용)
    if ('ontouchstart' in window) {
      r.drawPixelText('터치하여 시작', 300, 530, '#444466', 2);
    }

    // 깜빡이는 Press Enter 안내
    if (Math.floor(Date.now() / 600) % 2 === 0) {
      const pressText = 'Press Enter to Start';
      const pressWidth = r.measureText(pressText, 2);
      r.drawPixelText(pressText, Math.floor((800 - pressWidth) / 2), 500, '#6666aa', 2);
    }

    // 버전 표시
    r.drawPixelText('v0.8.0', 730, 580, '#333355', 1);

    r.renderFade();
  }

  _renderLoadSlots(r, ctx) {
    r.drawPanel(150, 250, 500, 250, '#0d0d1e', '#3a3a5a');
    r.drawPixelText('세이브 슬롯 선택', 200, 265, '#ffcc44', 2);

    for (let i = 0; i < 3; i++) {
      const y = 300 + i * 60;
      const selected = this.loadSlotCursor === i;
      const slot = this.saveSlots[i];

      if (selected) {
        r.drawPanel(170, y, 460, 50, '#2a2a5a', '#6666aa');
      } else {
        r.drawPanel(170, y, 460, 50, '#151528', '#3a3a5a');
      }

      const info = slot?.info;
      if (slot?.exists && info) {
        const classSuffix = info.className ? ` (${info.className})` : '';
        r.drawPixelText(`슬롯 ${i + 1}: ${info.playerName || '???'}${classSuffix}`, 190, y + 8, selected ? '#ffffff' : '#ccccdd', 2);
        r.drawPixelText(
          `Ch${info.chapter || 1} | 뱃지:${info.badgeCount || 0} | ${info.playtimeShort || '0:00'}`,
          190, y + 28, '#888899', 1
        );
      } else {
        r.drawPixelText(`슬롯 ${i + 1}: 비어있음`, 190, y + 14, selected ? '#666688' : '#444466', 2);
      }
    }

    r.drawPixelText('[ESC] 뒤로', 200, 475, '#666688', 1);
  }

  _renderOptionsStub(r, ctx) {
    r.drawPanel(200, 280, 400, 100, '#0d0d1e', '#3a3a5a');
    r.drawPixelText('설정은 게임 내에서 가능합니다', 220, 315, '#aaaacc', 2);
    r.drawPixelText('[ESC] 뒤로', 220, 355, '#666688', 1);
  }

  handleInput(key) {
    if (this.subState === 'load_slots') {
      return this._handleLoadInput(key);
    }
    if (this.subState === 'options') {
      if (key === 'Escape') { this.subState = null; return true; }
      return true;
    }

    switch (key) {
      case 'ArrowUp':
        this.cursor = (this.cursor - 1 + this.options.length) % this.options.length;
        return true;
      case 'ArrowDown':
        this.cursor = (this.cursor + 1) % this.options.length;
        return true;
      case 'Enter':
      case ' ':
        if (this.cursor === 0) {
          if (this.onNewGame) this.onNewGame();
        } else if (this.cursor === 1) {
          this.subState = 'load_slots';
          this.loadSlotCursor = 0;
        } else if (this.cursor === 2) {
          this.subState = 'options';
        }
        return true;
    }
    return false;
  }

  _handleLoadInput(key) {
    switch (key) {
      case 'ArrowUp':
        this.loadSlotCursor = (this.loadSlotCursor - 1 + 3) % 3;
        return true;
      case 'ArrowDown':
        this.loadSlotCursor = (this.loadSlotCursor + 1) % 3;
        return true;
      case 'Enter':
      case ' ':
        if (this.saveSlots[this.loadSlotCursor]?.exists && this.onLoadGame) {
          this.onLoadGame(this.loadSlotCursor);
        }
        return true;
      case 'Escape':
        this.subState = null;
        return true;
    }
    return false;
  }
}


// ==========================================
// 게임 내 메뉴 (Escape로 열기)
// ==========================================
export class GameMenuUI {
  constructor(renderer) {
    this.renderer = renderer;
    this.cursor = 0;
    this.menuItems = [
      { id: 'party', label: '파티' },
      { id: 'bag', label: '가방' },
      { id: 'dex', label: '도감' },
      { id: 'trainer', label: '계약자 카드' },
      { id: 'save', label: '저장' },
      { id: 'settings', label: '설정' },
      { id: 'credits', label: '크레딧' },
    ];
    this.visible = false;
    this.subMenu = null; // 'party' | 'bag' | 'trainer' | 'save' | 'settings'
    this.subUI = null;

    // 데이터 참조 (외부에서 설정)
    this.partyManager = null;
    this.inventory = null;
    this.playerData = null; // { name, badges, playTime }

    // 콜백
    this.onOpenDex = null;
    this.onSave = null;
    this.onShowMessage = null;  // (msg) => show dialog message
    this.onUseEscapeRope = null; // () => handle escape rope
    this.onSettingsChange = null; // (settings) => apply settings
    this.onClassChange = null; // () => handle class change scroll
    this.onCredits = null; // () => show credits

    // 설정
    this.settings = {
      textSpeed: 1, // 0=느림, 1=보통, 2=빠름
      volume: 5,    // 0~10
    };

    // 세이브 슬롯 커서
    this.saveCursor = 0;

    // 가방 서브
    this.bagCategory = 0;
    this.bagCursor = 0;
    this.bagCategories = [
      { id: 'healing', label: '회복' },
      { id: 'consumable', label: '소모품' },
      { id: 'contract', label: '마석' },
      { id: 'battle', label: '전투' },
      { id: 'key', label: '중요' },
    ];

    // 아이템 사용 대상 선택
    this.bagUseTarget = false;  // true when selecting party member to use item on
    this.bagTargetCursor = 0;
    this.bagSelectedItem = null;

    // 설정 서브
    this.settingsCursor = 0;
  }

  open() {
    this.visible = true;
    this.cursor = 0;
    this.subMenu = null;
  }

  close() {
    this.visible = false;
    this.subMenu = null;
  }

  update(dt) {
    if (this.subUI && this.subUI.update) {
      this.subUI.update(dt);
    }
  }

  render() {
    if (!this.visible) return;

    const r = this.renderer;
    const ctx = r.getContext();

    // 반투명 오버레이
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 0, 800, 600);

    if (this.subMenu === 'party') {
      this._renderParty(r, ctx);
      return;
    }
    if (this.subMenu === 'bag') {
      this._renderBag(r, ctx);
      return;
    }
    if (this.subMenu === 'trainer') {
      this._renderTrainer(r, ctx);
      return;
    }
    if (this.subMenu === 'save') {
      this._renderSave(r, ctx);
      return;
    }
    if (this.subMenu === 'settings') {
      this._renderSettings(r, ctx);
      return;
    }

    // 메인 메뉴 패널 (우측)
    r.drawPanel(540, 30, 240, this.menuItems.length * 48 + 30, '#0d0d1e', '#4a4a6a');

    for (let i = 0; i < this.menuItems.length; i++) {
      const item = this.menuItems[i];
      const y = 50 + i * 48;
      const selected = this.cursor === i;

      if (selected) {
        ctx.fillStyle = 'rgba(100,100,200,0.2)';
        ctx.fillRect(550, y - 4, 220, 40);
        ctx.fillStyle = '#ffcc44';
        ctx.fillRect(556, y + 8, 6, 6);
        r.drawPixelText(item.label, 572, y + 2, '#ffffff', 2);
      } else {
        r.drawPixelText(item.label, 572, y + 2, '#aaaacc', 2);
      }
    }

    r.drawPixelText('[ESC] 닫기', 560, 50 + this.menuItems.length * 48, '#666688', 1);
  }

  _renderParty(r, ctx) {
    const contractor = this.partyManager?.contractor;
    const monsters = this.partyManager?.party || [];

    r.drawPanel(50, 30, 700, 540, '#0d0d1e', '#3a3a5a');
    r.drawPixelText('파티', 75, 45, '#ffcc44', 3);

    // Build full display list: contractor + monsters
    const displayList = [];
    if (contractor) displayList.push(contractor);
    displayList.push(...monsters);

    for (let i = 0; i < displayList.length; i++) {
      const mon = displayList[i];
      const y = 85 + i * 72;
      const selected = this.cursor === i;

      if (selected) {
        r.drawPanel(65, y - 5, 670, 67, '#1a1a3e', '#6666aa');
      } else {
        r.drawPanel(65, y - 5, 670, 67, '#111122', '#3a3a5a');
      }

      // 미니 스프라이트
      const sprite = generateSprite(mon.spriteConfig, 32);
      if (sprite) r.drawSprite(sprite, 75, y, 1.5);

      // 이름, 레벨, 직업 표시
      const nameStr = mon.isContractor
        ? `[${mon.className}] ${mon.nickname || mon.name}`
        : (mon.nickname || mon.name);
      r.drawPixelText(nameStr, 135, y + 2, mon.isContractor ? '#ffdd66' : '#ffffff', 2);
      r.drawPixelText(`Lv${mon.level}`, 420, y + 2, '#aaaacc', 2);

      // 타입
      for (let t = 0; t < mon.type.length; t++) {
        const tColor = TYPE_COLORS[mon.type[t]] || '#888';
        ctx.fillStyle = tColor;
        ctx.fillRect(490 + t * 50, y + 2, 44, 16);
        r.drawPixelText(mon.type[t], 493 + t * 50, y + 5, '#ffffff', 1);
      }

      // HP 바
      r.drawPixelText('HP', 135, y + 24, '#ffcc44', 1);
      r.drawHpBar(158, y + 23, 160, 10, mon.currentHp, mon.stats.hp);
      r.drawPixelText(`${mon.currentHp}/${mon.stats.hp}`, 325, y + 24, '#aaaaaa', 1);

      // 상태이상
      if (mon.status) {
        const sColor = STATUS_COLORS[mon.status] || '#888';
        ctx.fillStyle = sColor;
        ctx.fillRect(415, y + 24, 44, 14);
        r.drawPixelText(STATUS_LABELS[mon.status] || '', 418, y + 26, '#fff', 1);
      }

      // 스탯 요약
      r.drawPixelText(
        `공:${mon.stats.atk} 방:${mon.stats.def} 특공:${mon.stats.spAtk} 특방:${mon.stats.spDef} 속:${mon.stats.speed}`,
        135, y + 40, '#777799', 1
      );

      // 기술 목록
      const skillStr = mon.skills.map(s => s.name).join(', ');
      r.drawPixelText(skillStr.substring(0, 60), 135, y + 52, '#666688', 1);
    }

    r.drawPixelText('[ESC] 뒤로  [Enter] 순서 교체 (몬스터만)', 75, 555, '#666688', 1);
  }

  _renderBag(r, ctx) {
    const inv = this.inventory;
    if (!inv) return;

    // If selecting a target party member for item use
    if (this.bagUseTarget) {
      this._renderBagTargetSelect(r, ctx);
      return;
    }

    r.drawPanel(50, 30, 700, 540, '#0d0d1e', '#3a3a5a');
    r.drawPixelText('가방', 75, 45, '#ffcc44', 3);
    r.drawPixelText(`소지금: ${inv.money}원`, 450, 50, '#ffcc44', 2);

    // 카테고리 탭
    for (let i = 0; i < this.bagCategories.length; i++) {
      const cat = this.bagCategories[i];
      const x = 75 + i * 150;
      const selected = this.bagCategory === i;
      if (selected) {
        r.drawPanel(x, 85, 140, 30, '#2a2a5a', '#6666aa');
        r.drawPixelText(cat.label, x + 15, 93, '#ffffff', 2);
      } else {
        r.drawPanel(x, 85, 140, 30, '#151528', '#3a3a5a');
        r.drawPixelText(cat.label, x + 15, 93, '#888899', 2);
      }
    }

    // 아이템 목록
    const items = inv.getItemsByCategory(this.bagCategories[this.bagCategory].id);
    if (items.length === 0) {
      r.drawPixelText('아이템이 없습니다.', 100, 150, '#666688', 2);
    } else {
      const maxVisible = 8;
      const start = Math.max(0, this.bagCursor - maxVisible + 1);
      const end = Math.min(start + maxVisible, items.length);

      for (let i = start; i < end; i++) {
        const item = items[i];
        const y = 130 + (i - start) * 48;
        const selected = this.bagCursor === i;

        if (selected) {
          ctx.fillStyle = 'rgba(100,100,200,0.15)';
          ctx.fillRect(65, y, 670, 44);
          ctx.fillStyle = '#ffcc44';
          ctx.fillRect(72, y + 14, 6, 6);
        }

        // 아이템 아이콘
        try {
          const icon = generateItemIcon(item.category, item.id, 24);
          if (icon) ctx.drawImage(icon, 68, y + 2, 24, 24);
        } catch(e) { /* 아이콘 실패 무시 */ }

        r.drawPixelText(item.name, 98, y + 4, selected ? '#ffffff' : '#ccccdd', 2);
        r.drawPixelText(`x${item.count}`, 360, y + 4, '#aaaacc', 2);
        r.drawPixelText(`${item.price || 0}원`, 460, y + 4, '#888899', 2);
        if (item.description) {
          r.drawPixelText(item.description.substring(0, 50), 98, y + 26, '#777799', 1);
        }
      }
    }

    r.drawPixelText('[ESC] 뒤로  [Tab] 카테고리  [Enter] 사용', 75, 555, '#666688', 1);
  }

  _renderBagTargetSelect(r, ctx) {
    const party = this.partyManager?.party || [];
    const item = this.bagSelectedItem;

    r.drawPanel(50, 30, 700, 540, '#0d0d1e', '#3a3a5a');
    r.drawPixelText(`${item?.name || '아이템'} - 대상 선택`, 75, 45, '#ffcc44', 3);

    for (let i = 0; i < party.length; i++) {
      const mon = party[i];
      const y = 90 + i * 70;
      const selected = this.bagTargetCursor === i;

      if (selected) {
        r.drawPanel(65, y - 5, 670, 65, '#1a1a3e', '#6666aa');
      } else {
        r.drawPanel(65, y - 5, 670, 65, '#111122', '#3a3a5a');
      }

      const isFainted = mon.currentHp <= 0;
      r.drawPixelText(mon.nickname || mon.name, 85, y + 2, isFainted ? '#664444' : '#ffffff', 2);
      r.drawPixelText(`Lv${mon.level}`, 300, y + 2, '#aaaacc', 2);

      r.drawPixelText('HP', 85, y + 24, '#ffcc44', 1);
      r.drawHpBar(108, y + 23, 160, 10, mon.currentHp, mon.stats.hp);
      r.drawPixelText(`${mon.currentHp}/${mon.stats.hp}`, 275, y + 24, '#aaaaaa', 1);

      if (mon.status) {
        const sColor = STATUS_COLORS[mon.status] || '#888';
        ctx.fillStyle = sColor;
        ctx.fillRect(400, y + 22, 44, 14);
        r.drawPixelText(STATUS_LABELS[mon.status] || '', 403, y + 24, '#fff', 1);
      }

      if (isFainted) {
        r.drawPixelText('[기절]', 460, y + 8, '#ff4444', 2);
      }
    }

    r.drawPixelText('[ESC] 뒤로  [Enter] 사용', 75, 555, '#666688', 1);
  }

  _renderTrainer(r, ctx) {
    const pd = this.playerData || {};

    r.drawPanel(150, 80, 500, 440, '#0d0d1e', '#3a3a5a');
    r.drawPixelText('계약자 카드', 200, 100, '#ffcc44', 3);

    const labelX = 190, valX = 400;
    let y = 160;

    const contractor = this.partyManager?.contractor;
    const rows = [
      ['이름', pd.name || '???'],
      ['직업', contractor?.className || '???'],
      ['뱃지', `${pd.badges || 0}개`],
      ['소지금', `${this.inventory?.money || 0}원`],
      ['도감', `${pd.dexCaught || 0} / 100 계약`],
      ['플레이 시간', pd.playTime || '0:00:00'],
      ['파티', `계약자 + ${this.partyManager?.party?.length || 0}마리`],
    ];

    for (const [label, value] of rows) {
      r.drawPixelText(label, labelX, y, '#8888aa', 2);
      r.drawPixelText(value, valX, y, '#ffffff', 2);
      y += 40;
    }

    // 뱃지 아이콘 (간단한 사각형)
    y += 10;
    r.drawPixelText('뱃지 컬렉션', labelX, y, '#ffcc44', 2);
    y += 25;
    const badgeCount = pd.badges || 0;
    for (let i = 0; i < 8; i++) {
      const bx = labelX + i * 50;
      if (i < badgeCount) {
        ctx.fillStyle = '#ffcc44';
        ctx.fillRect(bx, y, 16, 16);
        ctx.fillStyle = '#ffaa00';
        ctx.fillRect(bx + 2, y + 2, 12, 12);
        ctx.fillStyle = '#ffdd66';
        ctx.fillRect(bx + 4, y + 4, 8, 8);
      } else {
        ctx.fillStyle = '#333344';
        ctx.fillRect(bx, y, 16, 16);
        ctx.fillStyle = '#222233';
        ctx.fillRect(bx + 2, y + 2, 12, 12);
      }
    }

    r.drawPixelText('[ESC] 뒤로', 200, 500, '#666688', 1);
  }

  _renderSave(r, ctx) {
    r.drawPanel(200, 150, 400, 300, '#0d0d1e', '#3a3a5a');
    r.drawPixelText('저장', 250, 170, '#ffcc44', 3);

    for (let i = 0; i < 3; i++) {
      const y = 220 + i * 70;
      const selected = this.saveCursor === i;

      if (selected) {
        r.drawPanel(220, y, 360, 55, '#2a2a5a', '#6666aa');
      } else {
        r.drawPanel(220, y, 360, 55, '#151528', '#3a3a5a');
      }

      r.drawPixelText(`슬롯 ${i + 1}`, 240, y + 8, selected ? '#ffffff' : '#ccccdd', 2);
      r.drawPixelText('저장하시겠습니까?', 240, y + 30, '#888899', 1);
    }

    r.drawPixelText('[ESC] 뒤로', 250, 430, '#666688', 1);
  }

  _renderSettings(r, ctx) {
    r.drawPanel(200, 150, 400, 250, '#0d0d1e', '#3a3a5a');
    r.drawPixelText('설정', 250, 170, '#ffcc44', 3);

    const settings = [
      { label: '텍스트 속도', values: ['느림', '보통', '빠름'], current: this.settings.textSpeed },
      { label: '음량', values: null, current: this.settings.volume },
    ];

    for (let i = 0; i < settings.length; i++) {
      const y = 220 + i * 60;
      const s = settings[i];
      const selected = this.settingsCursor === i;

      r.drawPixelText(s.label, 230, y, selected ? '#ffffff' : '#aaaacc', 2);

      if (s.values) {
        r.drawPixelText(`< ${s.values[s.current]} >`, 430, y, '#ffcc44', 2);
      } else {
        // 음량 바
        const barX = 430, barW = 100;
        ctx.fillStyle = '#333344';
        ctx.fillRect(barX, y + 2, barW, 12);
        ctx.fillStyle = '#6688cc';
        ctx.fillRect(barX, y + 2, (barW * s.current) / 10, 12);
        r.drawPixelText(`${s.current}`, barX + barW + 10, y, '#ffcc44', 2);
      }
    }

    r.drawPixelText('[ESC] 뒤로', 250, 380, '#666688', 1);
  }

  handleInput(key) {
    if (!this.visible) return false;

    // 서브 메뉴 처리
    if (this.subMenu) {
      return this._handleSubInput(key);
    }

    switch (key) {
      case 'ArrowUp':
        this.cursor = (this.cursor - 1 + this.menuItems.length) % this.menuItems.length;
        return true;
      case 'ArrowDown':
        this.cursor = (this.cursor + 1) % this.menuItems.length;
        return true;
      case 'Enter':
      case ' ':
        this._selectMenuItem(this.cursor);
        return true;
      case 'Escape':
        this.close();
        return true;
    }
    return true; // 메뉴가 열려있으면 모든 입력 소비
  }

  _selectMenuItem(index) {
    const id = this.menuItems[index].id;
    switch (id) {
      case 'party':
        this.subMenu = 'party';
        this.cursor = 0;
        break;
      case 'bag':
        this.subMenu = 'bag';
        this.bagCategory = 0;
        this.bagCursor = 0;
        break;
      case 'dex':
        if (this.onOpenDex) this.onOpenDex();
        break;
      case 'trainer':
        this.subMenu = 'trainer';
        break;
      case 'save':
        this.subMenu = 'save';
        this.saveCursor = 0;
        break;
      case 'settings':
        this.subMenu = 'settings';
        this.settingsCursor = 0;
        break;
      case 'credits':
        if (this.onCredits) this.onCredits();
        break;
    }
  }

  _handleSubInput(key) {
    switch (this.subMenu) {
      case 'party': return this._handlePartyInput(key);
      case 'bag': return this._handleBagInput(key);
      case 'trainer':
        if (key === 'Escape') { this.subMenu = null; this.cursor = 3; }
        return true;
      case 'save': return this._handleSaveInput(key);
      case 'settings': return this._handleSettingsInput(key);
    }
    return true;
  }

  _handlePartyInput(key) {
    const contractor = this.partyManager?.contractor;
    const monsters = this.partyManager?.party || [];
    const totalLen = (contractor ? 1 : 0) + monsters.length;
    const contractorOffset = contractor ? 1 : 0;

    switch (key) {
      case 'ArrowUp':
        this.cursor = Math.max(0, this.cursor - 1);
        return true;
      case 'ArrowDown':
        this.cursor = Math.min(totalLen - 1, this.cursor + 1);
        return true;
      case 'Enter':
      case ' ':
        // 계약자는 교체 불가, 몬스터만 순서 교체
        if (this.cursor >= contractorOffset + 1 && this.partyManager) {
          const monIdx = this.cursor - contractorOffset;
          if (monIdx > 0) {
            this.partyManager.swapPartySlots(monIdx, monIdx - 1);
            this.cursor--;
          }
        }
        return true;
      case 'Escape':
        this.subMenu = null;
        this.cursor = 0;
        return true;
    }
    return true;
  }

  _handleBagInput(key) {
    // Target selection mode
    if (this.bagUseTarget) {
      return this._handleBagTargetInput(key);
    }

    const items = this.inventory?.getItemsByCategory(this.bagCategories[this.bagCategory].id) || [];
    switch (key) {
      case 'Tab':
        this.bagCategory = (this.bagCategory + 1) % this.bagCategories.length;
        this.bagCursor = 0;
        return true;
      case 'ArrowUp':
        this.bagCursor = Math.max(0, this.bagCursor - 1);
        return true;
      case 'ArrowDown':
        this.bagCursor = Math.min(Math.max(0, items.length - 1), this.bagCursor + 1);
        return true;
      case 'Enter':
      case ' ': {
        if (items.length === 0) return true;
        const item = items[this.bagCursor];
        if (!item) return true;

        const effectType = item.effect?.type;

        // Class change scroll
        if (effectType === 'class_change') {
          if (this.onClassChange) this.onClassChange();
          return true;
        }

        // Non-usable items
        if (!effectType || ['badge', 'map', 'dex', 'key', 'contract'].includes(effectType)) {
          if (this.onShowMessage) this.onShowMessage('이 아이템은 여기서 사용할 수 없다.');
          return true;
        }

        // Escape rope — special handling
        if (effectType === 'escape') {
          if (this.onUseEscapeRope) {
            this.inventory.removeItem(item.id);
            this.onUseEscapeRope();
          }
          return true;
        }

        // Return scroll — same as escape rope
        if (effectType === 'return') {
          if (this.onUseEscapeRope) {
            this.inventory.removeItem(item.id);
            this.onUseEscapeRope();
          }
          return true;
        }

        // Food — camping only
        if (effectType === 'food') {
          if (this.onShowMessage) this.onShowMessage('이 아이템은 캠핑 중에만 사용할 수 있다.');
          return true;
        }

        // Repel
        if (effectType === 'repel') {
          if (this.onShowMessage) this.onShowMessage('퇴치스프레이를 사용했다!');
          this.inventory.removeItem(item.id);
          return true;
        }

        // Stat boost — only usable in battle
        if (effectType === 'stat_boost') {
          if (this.onShowMessage) this.onShowMessage('이 아이템은 전투 중에만 사용할 수 있다.');
          return true;
        }

        // Healing/status/revive/pp — select target
        this.bagSelectedItem = item;
        this.bagUseTarget = true;
        this.bagTargetCursor = 0;
        return true;
      }
      case 'Escape':
        this.subMenu = null;
        this.cursor = 1;
        return true;
    }
    return true;
  }

  _handleBagTargetInput(key) {
    const party = this.partyManager?.party || [];
    switch (key) {
      case 'ArrowUp':
        this.bagTargetCursor = Math.max(0, this.bagTargetCursor - 1);
        return true;
      case 'ArrowDown':
        this.bagTargetCursor = Math.min(party.length - 1, this.bagTargetCursor + 1);
        return true;
      case 'Enter':
      case ' ': {
        const target = party[this.bagTargetCursor];
        if (!target || !this.bagSelectedItem) return true;

        const result = this.inventory.useItem(this.bagSelectedItem.id, target);
        if (result.success) {
          this.bagUseTarget = false;
          this.bagSelectedItem = null;
          if (this.onShowMessage) this.onShowMessage(result.messages.join('\n'));
        } else {
          if (this.onShowMessage) this.onShowMessage(result.messages.join('\n'));
        }
        return true;
      }
      case 'Escape':
        this.bagUseTarget = false;
        this.bagSelectedItem = null;
        return true;
    }
    return true;
  }

  _handleSaveInput(key) {
    switch (key) {
      case 'ArrowUp':
        this.saveCursor = (this.saveCursor - 1 + 3) % 3;
        return true;
      case 'ArrowDown':
        this.saveCursor = (this.saveCursor + 1) % 3;
        return true;
      case 'Enter':
      case ' ':
        if (this.onSave) this.onSave(this.saveCursor);
        this.subMenu = null;
        return true;
      case 'Escape':
        this.subMenu = null;
        this.cursor = 4;
        return true;
    }
    return true;
  }

  _handleSettingsInput(key) {
    let changed = false;
    switch (key) {
      case 'ArrowUp':
        this.settingsCursor = Math.max(0, this.settingsCursor - 1);
        return true;
      case 'ArrowDown':
        this.settingsCursor = Math.min(1, this.settingsCursor + 1);
        return true;
      case 'ArrowLeft':
        if (this.settingsCursor === 0) {
          this.settings.textSpeed = Math.max(0, this.settings.textSpeed - 1);
        } else {
          this.settings.volume = Math.max(0, this.settings.volume - 1);
        }
        changed = true;
        break;
      case 'ArrowRight':
        if (this.settingsCursor === 0) {
          this.settings.textSpeed = Math.min(2, this.settings.textSpeed + 1);
        } else {
          this.settings.volume = Math.min(10, this.settings.volume + 1);
        }
        changed = true;
        break;
      case 'Escape':
        this.subMenu = null;
        this.cursor = 5;
        return true;
    }
    if (changed && this.onSettingsChange) {
      this.onSettingsChange({ ...this.settings });
    }
    return true;
  }
}


// ==========================================
// 상점 UI
// ==========================================
export class ShopUI {
  /**
   * @param {import('./renderer.js').Renderer} renderer
   * @param {import('../core/item.js').Inventory} inventory
   * @param {Array} shopItems - [{id, name, price, description}]
   */
  constructor(renderer, inventory, shopItems = []) {
    this.renderer = renderer;
    this.inventory = inventory;
    this.shopItems = shopItems;

    this.mode = 'select'; // 'select' | 'buy' | 'sell'
    this.cursor = 0;
    this.buyCursor = 0;
    this.sellCursor = 0;
    this.buyCount = 1;
    this.visible = false;

    // 콜백
    this.onClose = null;
    this.onTransaction = null;
  }

  open(shopItems) {
    this.shopItems = shopItems || this.shopItems;
    this.visible = true;
    this.mode = 'select';
    this.cursor = 0;
  }

  close() {
    this.visible = false;
    if (this.onClose) this.onClose();
  }

  update(dt) {}

  render() {
    if (!this.visible) return;
    const r = this.renderer;
    const ctx = r.getContext();

    // 오버레이
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 0, 800, 600);

    // 소지금
    r.drawPanel(500, 20, 280, 40, '#0d0d1e', '#3a3a5a');
    r.drawPixelText(`소지금: ${this.inventory.money}원`, 515, 30, '#ffcc44', 2);

    if (this.mode === 'select') {
      r.drawPanel(250, 200, 300, 200, '#0d0d1e', '#3a3a5a');
      r.drawPixelText('어서오세요!', 290, 220, '#ffffff', 2);

      const opts = ['사기', '팔기', '나가기'];
      for (let i = 0; i < opts.length; i++) {
        const y = 260 + i * 40;
        r.drawButton(280, y, 240, 35, opts[i], this.cursor === i);
      }
    } else if (this.mode === 'buy') {
      this._renderBuy(r, ctx);
    } else if (this.mode === 'sell') {
      this._renderSell(r, ctx);
    }
  }

  _renderBuy(r, ctx) {
    r.drawPanel(50, 80, 700, 450, '#0d0d1e', '#3a3a5a');

    // Buy/Sell tabs
    r.drawPixelText('[구매]', 100, 90, '#ffffff', 2);
    r.drawPixelText('[판매]', 250, 90, '#666688', 2);
    r.drawPixelText('[Tab] 전환', 450, 90, '#444466', 1);

    for (let i = 0; i < this.shopItems.length; i++) {
      const item = this.shopItems[i];
      const y = 130 + i * 45;
      const selected = this.buyCursor === i;

      if (selected) {
        ctx.fillStyle = 'rgba(100,100,200,0.15)';
        ctx.fillRect(60, y, 680, 40);
        ctx.fillStyle = '#ffcc44';
        ctx.fillRect(66, y + 12, 6, 6);
      }

      r.drawPixelText(item.name, 82, y + 4, selected ? '#ffffff' : '#ccccdd', 2);
      r.drawPixelText(`${item.price}원`, 400, y + 4, '#ffcc44', 2);
      r.drawPixelText(`소지: ${this.inventory.getCount(item.id)}개`, 550, y + 4, '#888899', 2);
      if (item.description) {
        r.drawPixelText(item.description.substring(0, 45), 82, y + 24, '#777799', 1);
      }
    }

    r.drawPixelText('[ESC] 뒤로  [Enter] 구매', 75, 510, '#666688', 1);
  }

  _getSellableItems() {
    return this.inventory.getAllItems().filter(item =>
      item.category !== 'key' && (item.price || 0) > 0
    );
  }

  _sellItem(item) {
    const sellPrice = Math.floor(item.price * 0.5);
    this.inventory.removeItem(item.id, 1);
    this.inventory.money += sellPrice;
    if (this.onTransaction) this.onTransaction('sell');
    return { success: true, message: `${item.name}을(를) ${sellPrice}원에 팔았다!` };
  }

  _renderSell(r, ctx) {
    r.drawPanel(50, 80, 700, 450, '#0d0d1e', '#3a3a5a');

    // Buy/Sell tabs
    r.drawPixelText('[구매]', 100, 90, '#666688', 2);
    r.drawPixelText('[판매]', 250, 90, '#ffffff', 2);
    r.drawPixelText('[Tab] 전환', 450, 90, '#444466', 1);

    const items = this._getSellableItems();
    if (items.length === 0) {
      r.drawPixelText('팔 수 있는 아이템이 없다.', 100, 150, '#888899', 2);
    } else {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const y = 130 + i * 45;
        const selected = this.sellCursor === i;

        if (selected) {
          ctx.fillStyle = 'rgba(100,100,200,0.15)';
          ctx.fillRect(60, y, 680, 40);
          ctx.fillStyle = '#ffcc44';
          ctx.fillRect(66, y + 12, 6, 6);
        }

        r.drawPixelText(item.name, 82, y + 4, selected ? '#ffffff' : '#ccccdd', 2);
        r.drawPixelText(`${Math.floor((item.price || 0) / 2)}원`, 400, y + 4, '#ffcc44', 2);
        r.drawPixelText(`x${item.count}`, 550, y + 4, '#aaaacc', 2);
      }
    }

    r.drawPixelText('[ESC] 뒤로  [Enter] 판매', 75, 510, '#666688', 1);
  }

  handleInput(key) {
    if (!this.visible) return false;

    if (this.mode === 'select') {
      switch (key) {
        case 'ArrowUp': this.cursor = (this.cursor - 1 + 3) % 3; return true;
        case 'ArrowDown': this.cursor = (this.cursor + 1) % 3; return true;
        case 'Enter':
        case ' ':
          if (this.cursor === 0) { this.mode = 'buy'; this.buyCursor = 0; }
          else if (this.cursor === 1) { this.mode = 'sell'; this.sellCursor = 0; }
          else { this.close(); }
          return true;
        case 'Escape': this.close(); return true;
      }
    } else if (this.mode === 'buy') {
      switch (key) {
        case 'ArrowUp': this.buyCursor = Math.max(0, this.buyCursor - 1); return true;
        case 'ArrowDown': this.buyCursor = Math.min(this.shopItems.length - 1, this.buyCursor + 1); return true;
        case 'Enter':
        case ' ': {
          const item = this.shopItems[this.buyCursor];
          if (item) {
            const result = this.inventory.buyItem(item.id, 1);
            if (result.success && this.onTransaction) this.onTransaction('buy');
          }
          return true;
        }
        case 'Tab': this.mode = 'sell'; this.sellCursor = 0; return true;
        case 'Escape': this.mode = 'select'; this.cursor = 0; return true;
      }
    } else if (this.mode === 'sell') {
      const items = this._getSellableItems();
      switch (key) {
        case 'ArrowUp': this.sellCursor = Math.max(0, this.sellCursor - 1); return true;
        case 'ArrowDown': this.sellCursor = Math.min(Math.max(0, items.length - 1), this.sellCursor + 1); return true;
        case 'Enter':
        case ' ': {
          const item = items[this.sellCursor];
          if (item) {
            this._sellItem(item);
            const updated = this._getSellableItems();
            if (this.sellCursor >= updated.length) {
              this.sellCursor = Math.max(0, updated.length - 1);
            }
          }
          return true;
        }
        case 'Tab': this.mode = 'buy'; this.buyCursor = 0; return true;
        case 'Escape': this.mode = 'select'; this.cursor = 1; return true;
      }
    }

    return true;
  }
}


// ==========================================
// 파티 보기 UI
// ==========================================
export class PartyViewUI {
  constructor(renderer, partyManager, callbacks) {
    this.renderer = renderer;
    this.party = partyManager;
    this.callbacks = callbacks; // { onClose }
    this.cursor = 0;
    this.swapMode = false;
    this.swapIndex = -1;
  }

  update(dt) {}

  render(ctx) {
    const r = this.renderer;

    // 배경
    ctx.fillStyle = '#0d0d1e';
    ctx.fillRect(0, 0, 800, 600);

    // 헤더
    r.drawPanel(0, 0, 800, 50, '#1a1a2e', '#3a3a5a');
    r.drawPixelText('파티', 20, 15, '#FFD700', 3);
    r.drawPixelText(this.swapMode ? '교체할 몬스터를 선택하세요' : '↑↓: 선택  Enter: 교체모드  Esc: 닫기', 250, 20, '#888', 1);

    // 파티 슬롯
    for (let i = 0; i < 6; i++) {
      const m = this.party.party[i];
      const y = 60 + i * 85;
      const isSelected = this.cursor === i;
      const isSwapTarget = this.swapMode && this.swapIndex === i;

      // 슬롯 배경
      let bgColor = '#1a1a2e';
      if (isSwapTarget) bgColor = '#2a2a1e';
      if (isSelected) bgColor = '#1e1e3e';

      r.drawPanel(20, y, 760, 80, bgColor, isSelected ? '#FFD700' : '#3a3a5a');

      if (!m) {
        r.drawPixelText('--- 빈 슬롯 ---', 100, y + 30, '#444', 2);
        continue;
      }

      // 스프라이트
      try {
        const sprite = generateSprite(m.spriteConfig, 32);
        if (sprite) ctx.drawImage(sprite, 30, y + 8, 64, 64);
      } catch (e) {
        ctx.fillStyle = '#444';
        ctx.font = '32px monospace';
        ctx.fillText('?', 50, y + 45);
      }

      // 이름 & 레벨
      r.drawPixelText(`${m.nickname || m.name}  Lv.${m.level}`, 110, y + 8, '#fff', 2);

      // 타입
      let typeX = 110;
      for (const typeId of m.type) {
        const tc = TYPE_COLORS[typeId] || '#888';
        ctx.fillStyle = tc;
        ctx.fillRect(typeX, y + 32, 50, 14);
        ctx.fillStyle = '#fff';
        ctx.font = '10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(typeId, typeX + 25, y + 43);
        ctx.textAlign = 'left';
        typeX += 56;
      }

      // HP 바
      const hpRatio = m.currentHp / m.stats.hp;
      const hpColor = hpRatio > 0.5 ? '#44DD44' : hpRatio > 0.2 ? '#DDDD44' : '#DD4444';
      r.drawPixelText(`HP`, 350, y + 8, '#aaa', 1);
      ctx.fillStyle = '#333';
      ctx.fillRect(380, y + 8, 200, 12);
      ctx.fillStyle = hpColor;
      ctx.fillRect(380, y + 8, 200 * hpRatio, 12);
      r.drawPixelText(`${m.currentHp}/${m.stats.hp}`, 590, y + 8, '#ccc', 1);

      // 상태이상
      if (m.status) {
        const sc = STATUS_COLORS[m.status] || '#888';
        const sl = STATUS_LABELS[m.status] || m.status;
        ctx.fillStyle = sc;
        ctx.fillRect(350, y + 28, 40, 14);
        ctx.fillStyle = '#fff';
        ctx.font = '10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(sl, 370, y + 39);
        ctx.textAlign = 'left';
      }

      // 스탯 미니 표시
      r.drawPixelText(`공:${m.stats.atk} 방:${m.stats.def} 특공:${m.stats.spAtk} 특방:${m.stats.spDef} 속:${m.stats.speed}`, 350, y + 50, '#777', 1);

      // 기절 표시
      if (m.currentHp <= 0) {
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(20, y, 760, 80);
        r.drawPixelText('기절', 370, y + 30, '#FF4444', 3);
      }
    }
  }

  handleInput(key) {
    const partySize = this.party.party.length;

    switch (key) {
      case 'ArrowUp':
        this.cursor = Math.max(0, this.cursor - 1);
        return true;
      case 'ArrowDown':
        this.cursor = Math.min(Math.max(0, partySize - 1), this.cursor + 1);
        return true;
      case 'Enter':
      case ' ':
        if (this.swapMode) {
          if (this.swapIndex !== this.cursor) {
            this.party.swapPartySlots(this.swapIndex, this.cursor);
          }
          this.swapMode = false;
          this.swapIndex = -1;
        } else {
          this.swapMode = true;
          this.swapIndex = this.cursor;
        }
        return true;
      case 'Escape':
        if (this.swapMode) {
          this.swapMode = false;
          this.swapIndex = -1;
        } else {
          if (this.callbacks.onClose) this.callbacks.onClose();
        }
        return true;
    }
    return false;
  }
}
