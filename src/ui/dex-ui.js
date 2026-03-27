// 몬스터 도감 (포켓덱스) UI
import { generateSprite, generateSilhouette, getHybridSprite } from './sprite-generator.js';
import { TYPE_COLORS } from './renderer.js';

// ==========================================
// 도감 추적기 (포획/목격 상태 관리)
// ==========================================
export class DexTracker {
  constructor() {
    this.seen = new Set();    // 목격한 몬스터 ID
    this.caught = new Set();  // 포획한 몬스터 ID
  }

  markSeen(id) {
    this.seen.add(id);
  }

  markCaught(id) {
    this.seen.add(id);
    this.caught.add(id);
  }

  isSeen(id) {
    return this.seen.has(id);
  }

  isCaught(id) {
    return this.caught.has(id);
  }

  getSeenCount() {
    return this.seen.size;
  }

  getCaughtCount() {
    return this.caught.size;
  }

  serialize() {
    return {
      seen: [...this.seen],
      caught: [...this.caught],
    };
  }

  static deserialize(data) {
    const tracker = new DexTracker();
    if (data.seen) tracker.seen = new Set(data.seen);
    if (data.caught) tracker.caught = new Set(data.caught);
    return tracker;
  }
}


// ==========================================
// 도감 UI
// ==========================================
export class DexUI {
  /**
   * @param {import('./renderer.js').Renderer} renderer
   * @param {DexTracker} tracker
   * @param {Array} allMonsters - 전체 몬스터 데이터 배열
   */
  constructor(renderer, tracker, allMonsters = []) {
    this.renderer = renderer;
    this.tracker = tracker;
    this.monsters = allMonsters;
    this.visible = false;

    // 그리드 뷰 상태
    this.gridCursorX = 0;
    this.gridCursorY = 0;
    this.gridCols = 10;
    this.gridRows = 11;
    this.scrollY = 0;
    this.visibleRows = 5;

    // 상세 뷰
    this.detailMode = false;
    this.selectedMonster = null;

    // 스프라이트 캐시
    this._spriteCache = new Map();

    // 콜백
    this.onClose = null;
  }

  open() {
    this.visible = true;
    this.detailMode = false;
    this.gridCursorX = 0;
    this.gridCursorY = 0;
    this.scrollY = 0;
  }

  close() {
    this.visible = false;
    if (this.onClose) this.onClose();
  }

  setMonsters(monsters) {
    this.monsters = monsters;
  }

  _getMonsterIndex() {
    return this.gridCursorY * this.gridCols + this.gridCursorX;
  }

  _getMonster(index) {
    if (index < 0 || index >= this.monsters.length) return null;
    return this.monsters[index];
  }

  _getMiniSprite(monster) {
    if (!monster || !monster.spriteConfig) return null;

    const key = `dex_${monster.id}`;
    if (this._spriteCache.has(key)) return this._spriteCache.get(key);

    const isCaught = this.tracker.isCaught(monster.id);
    const isSeen = this.tracker.isSeen(monster.id);

    let sprite;
    if (isCaught) {
      sprite = getHybridSprite(monster.id, monster.spriteConfig, 'front', 32);
    } else if (isSeen) {
      sprite = generateSilhouette(monster.spriteConfig, 32);
    } else {
      sprite = null; // 미발견 -> ? 표시
    }

    this._spriteCache.set(key, sprite);
    return sprite;
  }

  update(dt) {
    // 도감 UI는 정적이므로 특별한 업데이트 없음
  }

  render() {
    if (!this.visible) return;

    const r = this.renderer;
    const ctx = r.getContext();

    r.clear('#0a0a16');

    if (this.detailMode) {
      this._renderDetail(r, ctx);
    } else {
      this._renderGrid(r, ctx);
    }
  }

  _renderGrid(r, ctx) {
    // 헤더
    r.drawPanel(0, 0, 800, 50, '#0d0d1e', '#3a3a5a');
    r.drawPixelText('몬스터 도감', 20, 12, '#ffcc44', 3);

    const seenCount = this.tracker.getSeenCount();
    const caughtCount = this.tracker.getCaughtCount();
    r.drawPixelText(
      `발견: ${seenCount}/${this.monsters.length}  계약: ${caughtCount}/${this.monsters.length}`,
      450, 18, '#aaaacc', 2
    );

    // 그리드 영역
    const gridStartX = 30;
    const gridStartY = 60;
    const cellSize = 72;
    const cellPadding = 4;

    const startRow = this.scrollY;
    const endRow = Math.min(startRow + this.visibleRows, this.gridRows);

    for (let row = startRow; row < endRow; row++) {
      for (let col = 0; col < this.gridCols; col++) {
        const index = row * this.gridCols + col;
        if (index >= this.monsters.length) continue;

        const monster = this.monsters[index];
        const x = gridStartX + col * (cellSize + cellPadding);
        const y = gridStartY + (row - startRow) * (cellSize + cellPadding);
        const selected = this.gridCursorX === col && this.gridCursorY === row;

        const isCaught = this.tracker.isCaught(monster.id);
        const isSeen = this.tracker.isSeen(monster.id);

        // 셀 배경
        if (selected) {
          r.drawPanel(x, y, cellSize, cellSize, '#1a1a3e', '#ffcc44');
        } else if (isCaught) {
          r.drawPanel(x, y, cellSize, cellSize, '#111122', '#334455');
        } else {
          r.drawPanel(x, y, cellSize, cellSize, '#0a0a14', '#222233');
        }

        // 번호
        const numStr = `${(index + 1).toString().padStart(3, '0')}`;
        r.drawPixelText(numStr, x + 4, y + 4, isCaught ? '#888899' : '#333344', 1);

        // 스프라이트
        if (isCaught || isSeen) {
          const sprite = this._getMiniSprite(monster);
          if (sprite) {
            r.drawSprite(sprite, x + (cellSize - 32) / 2, y + 14, 1);
          }
        } else {
          // 물음표
          r.drawPixelText('?', x + cellSize / 2 - 4, y + 28, '#333344', 3);
        }

        // 이름 (포획한 경우만)
        if (isCaught) {
          const name = monster.name.substring(0, 4);
          const nw = r.measureText(name, 1);
          r.drawPixelText(name, x + (cellSize - nw) / 2, y + cellSize - 12, '#aaaacc', 1);
        } else if (isSeen) {
          const name = monster.name.substring(0, 4);
          const nw = r.measureText(name, 1);
          r.drawPixelText(name, x + (cellSize - nw) / 2, y + cellSize - 12, '#444466', 1);
        }

        // 포획 마크
        if (isCaught) {
          ctx.fillStyle = '#44cc66';
          ctx.fillRect(x + cellSize - 10, y + 4, 6, 6);
        }
      }
    }

    // 스크롤 인디케이터
    if (this.scrollY > 0) {
      r.drawPixelText('^', 770, 65, '#ffcc44', 3);
    }
    if (endRow < this.gridRows) {
      r.drawPixelText('v', 770, gridStartY + this.visibleRows * (cellSize + cellPadding) - 20, '#ffcc44', 3);
    }

    // 하단 - 선택된 몬스터 미리보기
    const previewY = 450;
    r.drawPanel(0, previewY, 800, 150, '#0d0d1e', '#3a3a5a');

    const selIndex = this._getMonsterIndex();
    if (selIndex < this.monsters.length) {
      const mon = this.monsters[selIndex];
      const isCaught = this.tracker.isCaught(mon.id);
      const isSeen = this.tracker.isSeen(mon.id);

      r.drawPixelText(`No.${(selIndex + 1).toString().padStart(3, '0')}`, 20, previewY + 12, '#888899', 2);

      if (isCaught) {
        r.drawPixelText(mon.name, 120, previewY + 12, '#ffffff', 3);

        // 타입
        if (mon.type) {
          for (let t = 0; t < mon.type.length; t++) {
            const tColor = TYPE_COLORS[mon.type[t]] || '#888';
            ctx.fillStyle = tColor;
            ctx.fillRect(120 + t * 60, previewY + 42, 52, 18);
            r.drawPixelText(mon.type[t], 124 + t * 60, previewY + 45, '#ffffff', 1);
          }
        }

        // 설명
        if (mon.description) {
          r.drawPixelText(mon.description.substring(0, 50), 20, previewY + 70, '#aaaacc', 2);
          if (mon.description.length > 50) {
            r.drawPixelText(mon.description.substring(50, 100), 20, previewY + 92, '#aaaacc', 2);
          }
        }

        // 기본 스탯 요약
        if (mon.baseStats) {
          const bs = mon.baseStats;
          r.drawPixelText(
            `HP:${bs.hp} 공:${bs.atk} 방:${bs.def} 특공:${bs.spAtk} 특방:${bs.spDef} 속:${bs.speed}`,
            20, previewY + 118, '#777799', 1
          );
        }
      } else if (isSeen) {
        r.drawPixelText(mon.name, 120, previewY + 12, '#888899', 3);
        r.drawPixelText('아직 계약하지 않았다.', 20, previewY + 50, '#666688', 2);
      } else {
        r.drawPixelText('???', 120, previewY + 12, '#444466', 3);
        r.drawPixelText('아직 발견하지 못한 몬스터.', 20, previewY + 50, '#444466', 2);
      }
    }

    r.drawPixelText('[Enter] 상세  [ESC] 닫기', 550, previewY + 130, '#666688', 1);
  }

  _renderDetail(r, ctx) {
    const mon = this.selectedMonster;
    if (!mon) return;

    const isCaught = this.tracker.isCaught(mon.id);

    // 배경
    r.drawPanel(20, 20, 760, 560, '#0d0d1e', '#3a3a5a');

    // 헤더
    const index = this.monsters.indexOf(mon);
    r.drawPixelText(`No.${((index >= 0 ? index : 0) + 1).toString().padStart(3, '0')}`, 40, 35, '#888899', 2);
    r.drawPixelText(mon.name, 140, 30, '#ffffff', 3);

    // 스프라이트 (큰 버전)
    if (isCaught && mon.spriteConfig) {
      const sprite = getHybridSprite(mon.id, mon.spriteConfig, 'front', 64);
      if (sprite) {
        r.drawPanel(40, 70, 210, 210, '#111122', '#3a3a5a');
        r.drawSprite(sprite, 60, 80, 3);
      }
    } else if (mon.spriteConfig) {
      const sprite = generateSilhouette(mon.spriteConfig, 64);
      if (sprite) {
        r.drawPanel(40, 70, 210, 210, '#111122', '#3a3a5a');
        r.drawSprite(sprite, 60, 80, 3);
      }
    }

    // 우측 정보
    const infoX = 270;

    // 타입
    r.drawPixelText('타입', infoX, 75, '#ffcc44', 2);
    if (isCaught && mon.type) {
      for (let t = 0; t < mon.type.length; t++) {
        const tColor = TYPE_COLORS[mon.type[t]] || '#888';
        ctx.fillStyle = tColor;
        ctx.fillRect(infoX + t * 80, 98, 70, 22);
        r.drawPixelText(mon.type[t], infoX + 4 + t * 80, 103, '#ffffff', 2);
      }
    } else {
      r.drawPixelText('???', infoX, 100, '#555566', 2);
    }

    // 설명
    r.drawPixelText('설명', infoX, 135, '#ffcc44', 2);
    if (isCaught && mon.description) {
      const desc = mon.description;
      for (let i = 0; i < desc.length; i += 30) {
        r.drawPixelText(desc.substring(i, i + 30), infoX, 158 + Math.floor(i / 30) * 18, '#ccccdd', 2);
      }
    } else {
      r.drawPixelText('상세 정보 미확인', infoX, 158, '#555566', 2);
    }

    // Habitat info (based on type)
    if (isCaught && mon.type) {
      const typeHabitats = {
        fire: '화염촌 주변, 화산 지대',
        water: '해류항 주변, 수변 지역',
        grass: '자연마을 주변, 숲',
        electric: '전격시티 주변',
        earth: '바위동굴, 산악 지대',
        ice: '빙결마을, 빙하동굴',
        wind: '고지대, 루트',
        poison: '독 늪, 어둠 지역',
        metal: '도시, 유적',
        light: '성지, 고원',
        dark: '그림자단 기지, 동굴 심부',
        spirit: '유적, 밤의 숲',
        dragon: '용린시티 주변, 산맥',
        fighting: '투지시티, 격투 도장',
        rock: '바위동굴, 사막',
        sound: '울리는 계곡',
        cosmic: '별의 고원',
        normal: '초원, 일반 루트',
      };
      const habitat = mon.type.map(t => typeHabitats[t] || '알 수 없음').join(' / ');
      r.drawPixelText('서식지', infoX, 210, '#ffcc44', 2);
      r.drawPixelText(habitat.substring(0, 35), infoX, 230, '#aaaacc', 1);
    }

    // 기본 스탯 (레이더 차트 스타일 -> 바 그래프)
    if (isCaught && mon.baseStats) {
      r.drawPixelText('기본 스탯', 40, 300, '#ffcc44', 2);
      const stats = [
        { label: 'HP', val: mon.baseStats.hp },
        { label: '공격', val: mon.baseStats.atk },
        { label: '방어', val: mon.baseStats.def },
        { label: '특공', val: mon.baseStats.spAtk },
        { label: '특방', val: mon.baseStats.spDef },
        { label: '속도', val: mon.baseStats.speed },
      ];

      const barX = 140;
      const barMaxW = 400;
      const maxStat = 200; // 스탯 최대값 기준

      for (let i = 0; i < stats.length; i++) {
        const y = 325 + i * 30;
        const stat = stats[i];

        r.drawPixelText(stat.label, 45, y + 2, '#aaaacc', 2);

        // 바 배경
        ctx.fillStyle = '#1a1a2a';
        ctx.fillRect(barX, y, barMaxW, 16);

        // 바
        const barW = Math.min(barMaxW, (stat.val / maxStat) * barMaxW);
        const barColor = stat.val > 120 ? '#44cc66' : stat.val > 80 ? '#88cc44' : stat.val > 50 ? '#cccc44' : '#cc6644';
        ctx.fillStyle = barColor;
        ctx.fillRect(barX, y, barW, 16);

        // 광택
        ctx.fillStyle = 'rgba(255,255,255,0.1)';
        ctx.fillRect(barX, y, barW, 8);

        // 숫자
        r.drawPixelText(`${stat.val}`, barX + barMaxW + 10, y + 2, '#ffffff', 2);
      }

      // 합계
      const total = Object.values(mon.baseStats).reduce((a, b) => a + b, 0);
      r.drawPixelText(`합계: ${total}`, 45, 510, '#ffcc44', 2);
    }

    // 레이더 차트 (우측)
    if (isCaught && mon.baseStats) {
      this._renderRadarChart(r, ctx, 630, 400, 100, mon.baseStats);
    }

    r.drawPixelText('[ESC] 뒤로', 40, 555, '#666688', 1);
  }

  /**
   * 간단한 레이더 차트
   */
  _renderRadarChart(r, ctx, cx, cy, radius, stats) {
    const labels = ['HP', '공격', '방어', '특공', '특방', '속도'];
    const values = [stats.hp, stats.atk, stats.def, stats.spAtk, stats.spDef, stats.speed];
    const maxStat = 200;
    const sides = 6;

    // 배경 육각형
    for (let ring = 4; ring >= 1; ring--) {
      const ringR = (radius * ring) / 4;
      ctx.beginPath();
      for (let i = 0; i < sides; i++) {
        const angle = (Math.PI * 2 * i) / sides - Math.PI / 2;
        const x = cx + Math.cos(angle) * ringR;
        const y = cy + Math.sin(angle) * ringR;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.strokeStyle = ring === 4 ? '#334455' : '#222233';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // 축선
    for (let i = 0; i < sides; i++) {
      const angle = (Math.PI * 2 * i) / sides - Math.PI / 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius);
      ctx.strokeStyle = '#222233';
      ctx.stroke();
    }

    // 데이터 다각형
    ctx.beginPath();
    for (let i = 0; i < sides; i++) {
      const angle = (Math.PI * 2 * i) / sides - Math.PI / 2;
      const val = Math.min(1, values[i] / maxStat);
      const x = cx + Math.cos(angle) * radius * val;
      const y = cy + Math.sin(angle) * radius * val;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = 'rgba(68,136,255,0.25)';
    ctx.fill();
    ctx.strokeStyle = '#4488ff';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 꼭짓점 점
    for (let i = 0; i < sides; i++) {
      const angle = (Math.PI * 2 * i) / sides - Math.PI / 2;
      const val = Math.min(1, values[i] / maxStat);
      const x = cx + Math.cos(angle) * radius * val;
      const y = cy + Math.sin(angle) * radius * val;
      ctx.fillStyle = '#4488ff';
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // 라벨
    for (let i = 0; i < sides; i++) {
      const angle = (Math.PI * 2 * i) / sides - Math.PI / 2;
      const lx = cx + Math.cos(angle) * (radius + 18);
      const ly = cy + Math.sin(angle) * (radius + 18);
      const tw = r.measureText(labels[i], 1);
      r.drawPixelText(labels[i], lx - tw / 2, ly - 4, '#888899', 1);
    }
  }

  handleInput(key) {
    if (!this.visible) return false;

    if (this.detailMode) {
      if (key === 'Escape') {
        this.detailMode = false;
        // 스프라이트 캐시 키가 바뀌지 않으므로 무효화 불필요
        return true;
      }
      return true;
    }

    const totalMonsters = this.monsters.length;
    const totalRows = Math.ceil(totalMonsters / this.gridCols);

    switch (key) {
      case 'ArrowUp':
        if (this.gridCursorY > 0) {
          this.gridCursorY--;
          if (this.gridCursorY < this.scrollY) this.scrollY = this.gridCursorY;
        }
        return true;
      case 'ArrowDown':
        if (this.gridCursorY < totalRows - 1) {
          this.gridCursorY++;
          if (this.gridCursorY >= this.scrollY + this.visibleRows) {
            this.scrollY = this.gridCursorY - this.visibleRows + 1;
          }
          // 범위 초과 방지
          const idx = this._getMonsterIndex();
          if (idx >= totalMonsters) {
            this.gridCursorY--;
          }
        }
        return true;
      case 'ArrowLeft':
        if (this.gridCursorX > 0) this.gridCursorX--;
        return true;
      case 'ArrowRight':
        if (this.gridCursorX < this.gridCols - 1) {
          const nextIdx = this.gridCursorY * this.gridCols + this.gridCursorX + 1;
          if (nextIdx < totalMonsters) this.gridCursorX++;
        }
        return true;
      case 'Enter':
      case ' ': {
        const idx = this._getMonsterIndex();
        const mon = this._getMonster(idx);
        if (mon && (this.tracker.isSeen(mon.id) || this.tracker.isCaught(mon.id))) {
          this.selectedMonster = mon;
          this.detailMode = true;
        }
        return true;
      }
      case 'Escape':
        this.close();
        return true;
    }
    return true;
  }
}
