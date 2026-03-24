// 월드 맵 네비게이션 UI

const LOCATION_ICONS = {
  town: { color: '#44aa66', symbol: 'T' },
  city: { color: '#4488cc', symbol: 'C' },
  route: { color: '#886644', symbol: '~' },
  cave: { color: '#666688', symbol: 'M' },
  gym: { color: '#ffcc44', symbol: '*' },
  dungeon: { color: '#884444', symbol: 'D' },
  special: { color: '#aa44cc', symbol: '!' },
};

export class MapUI {
  /**
   * @param {import('./renderer.js').Renderer} renderer
   * @param {import('../world/map.js').MapManager} mapManager
   */
  constructor(renderer, mapManager) {
    this.renderer = renderer;
    this.mapManager = mapManager;

    this.cursor = 0;
    this.connections = [];
    this.currentLocation = null;
    this.visible = false;

    // 위치 배너
    this.banner = null;
    this.bannerTimer = 0;
    this.bannerDuration = 2.5;

    // 미니맵 노드 좌표 캐시 (자동 레이아웃)
    this._nodePositions = new Map();
    this._nodeLayoutDirty = true;

    // 이동 트랜지션
    this.transitioning = false;
    this.transitionTimer = 0;
    this.transitionDuration = 1.0;
    this.transitionTarget = null;

    // 콜백
    this.onMove = null; // (locationId) => void
    this.onEncounter = null; // () => void

    // 뱃지 수 (외부에서 설정)
    this.badgeCount = 0;

    this._refresh();
  }

  _refresh() {
    this.currentLocation = this.mapManager.getCurrentLocation();
    this.connections = this.mapManager.getConnections();
    this.cursor = 0;
    this._nodeLayoutDirty = true;
  }

  /**
   * 미니맵 노드 자동 레이아웃
   */
  _layoutNodes() {
    if (!this._nodeLayoutDirty) return;
    this._nodeLayoutDirty = false;
    this._nodePositions.clear();

    const allLocations = this.mapManager.getAllLocations();
    if (!allLocations || allLocations.length === 0) return;

    // 간단한 방사형 레이아웃: 현재 위치 중심
    const centerX = 600, centerY = 300;
    const visited = this.mapManager.visitedLocations;

    // BFS로 위치 좌표 계산
    const placed = new Map();
    const queue = [{ id: this.mapManager.currentLocation, x: centerX, y: centerY, depth: 0 }];
    placed.set(this.mapManager.currentLocation, { x: centerX, y: centerY });

    const spacing = 70;
    const angleStep = (Math.PI * 2) / 6;
    let childIndex = 0;

    while (queue.length > 0) {
      const { id, x, y, depth } = queue.shift();
      const loc = this.mapManager.getLocation(id);
      if (!loc || !loc.connections) continue;

      const conns = loc.connections;
      let angle = -Math.PI / 2;

      for (const conn of conns) {
        if (placed.has(conn.to)) continue;
        if (!visited.has(conn.to) && !visited.has(id)) continue;

        const nx = x + Math.cos(angle + childIndex * 0.5) * spacing;
        const ny = y + Math.sin(angle + childIndex * 0.5) * spacing;
        placed.set(conn.to, { x: nx, y: ny });
        queue.push({ id: conn.to, x: nx, y: ny, depth: depth + 1 });
        angle += angleStep;
        childIndex++;
      }
    }

    this._nodePositions = placed;
  }

  /**
   * 위치 도착 배너 표시
   */
  showBanner(locationName) {
    this.banner = locationName;
    this.bannerTimer = this.bannerDuration;
  }

  open() {
    this.visible = true;
    this._refresh();
  }

  close() {
    this.visible = false;
  }

  update(dt) {
    // 배너 타이머
    if (this.bannerTimer > 0) {
      this.bannerTimer -= dt;
      if (this.bannerTimer <= 0) {
        this.banner = null;
      }
    }

    // 트랜지션
    if (this.transitioning) {
      this.transitionTimer += dt;
      if (this.transitionTimer >= this.transitionDuration) {
        this.transitioning = false;
        this._finishMove();
      }
    }
  }

  _finishMove() {
    if (!this.transitionTarget) return;

    const result = this.mapManager.moveTo(this.transitionTarget, this.badgeCount);
    this.transitionTarget = null;

    if (result.success) {
      this._refresh();
      this.showBanner(result.location?.name || '???');

      if (this.onMove) {
        this.onMove(this.mapManager.currentLocation);
      }

      // 야생 인카운터 체크 (루트인 경우)
      const loc = this.mapManager.getCurrentLocation();
      if (loc && loc.encounters && loc.encounters.length > 0 && this.onEncounter) {
        // 인카운터 체크는 외부에서 처리
      }
    }
  }

  render() {
    const r = this.renderer;
    const ctx = r.getContext();

    if (!this.visible && !this.banner) return;

    // 배너 (항상 렌더, 맵 열려있든 아니든)
    if (this.banner && this.bannerTimer > 0) {
      this._renderBanner(r, ctx);
    }

    if (!this.visible) return;

    // 맵 전체 화면
    r.clear('#0a0a16');

    // 미니맵 (우측)
    this._layoutNodes();
    this._renderMiniMap(r, ctx);

    // 좌측 - 현재 위치 정보
    this._renderLocationInfo(r, ctx);

    // 하단 - 이동 가능 목적지
    this._renderConnections(r, ctx);

    // 트랜지션 오버레이
    if (this.transitioning) {
      const progress = this.transitionTimer / this.transitionDuration;
      // 페이드아웃 -> 페이드인
      let alpha;
      if (progress < 0.5) {
        alpha = progress * 2;
      } else {
        alpha = (1 - progress) * 2;
      }
      ctx.fillStyle = `rgba(0,0,0,${alpha})`;
      ctx.fillRect(0, 0, 800, 600);

      // 이동 텍스트
      if (progress > 0.3 && progress < 0.7) {
        const moveText = '이동 중...';
        const tw = r.measureText(moveText, 3);
        r.drawPixelText(moveText, (800 - tw) / 2, 280, '#ffffff', 3);
      }
    }
  }

  _renderBanner(r, ctx) {
    // 슬라이드-인 배너
    const progress = 1 - (this.bannerTimer / this.bannerDuration);
    let bannerX;

    if (progress < 0.15) {
      bannerX = -400 + (400 * progress / 0.15);
    } else if (progress > 0.75) {
      bannerX = 800 * ((progress - 0.75) / 0.25);
    } else {
      bannerX = 0;
    }

    const bannerY = 50;
    const bannerH = 60;

    ctx.save();
    ctx.translate(bannerX, 0);

    // 배너 배경
    ctx.fillStyle = 'rgba(10,10,30,0.85)';
    ctx.fillRect(0, bannerY, 800, bannerH);
    ctx.fillStyle = '#ffcc44';
    ctx.fillRect(0, bannerY, 800, 3);
    ctx.fillRect(0, bannerY + bannerH - 3, 800, 3);

    // 위치 이름
    const nameWidth = r.measureText(this.banner, 3);
    r.drawPixelText(this.banner, (800 - nameWidth) / 2, bannerY + 15, '#ffffff', 3);

    ctx.restore();
  }

  _renderLocationInfo(r, ctx) {
    const loc = this.currentLocation;
    if (!loc) return;

    r.drawPanel(20, 20, 380, 250, '#0d0d1e', '#3a3a5a');

    // 위치 타입 아이콘
    const icon = LOCATION_ICONS[loc.type] || LOCATION_ICONS.route;
    ctx.fillStyle = icon.color;
    ctx.fillRect(35, 35, 24, 24);
    r.drawPixelText(icon.symbol, 39, 39, '#ffffff', 2);

    // 이름
    r.drawPixelText(loc.name, 70, 35, '#ffffff', 3);

    // 타입 라벨
    const typeLabels = {
      town: '마을', city: '도시', route: '도로', cave: '동굴',
      gym: '체육관', dungeon: '던전', special: '특수',
    };
    r.drawPixelText(typeLabels[loc.type] || loc.type, 70, 62, '#888899', 2);

    // 설명
    if (loc.description) {
      const desc = loc.description;
      let y = 95;
      // 줄바꿈
      for (let i = 0; i < desc.length; i += 25) {
        r.drawPixelText(desc.substring(i, i + 25), 35, y, '#aaaacc', 2);
        y += 20;
        if (y > 220) break;
      }
    }

    // 야생 인카운터 경고
    if (loc.encounters && loc.encounters.length > 0) {
      ctx.fillStyle = '#442222';
      ctx.fillRect(35, 220, 350, 22);
      r.drawPixelText('! 야생 몬스터 출현 지역', 42, 224, '#ff6644', 2);
    }

    // 시설 정보
    if (loc.facilities) {
      let y = 190;
      for (const fac of loc.facilities) {
        const facLabels = {
          heal: '몬스터 센터', shop: '상점', gym: '체육관',
        };
        r.drawPixelText(`- ${facLabels[fac] || fac}`, 40, y, '#66aa88', 1);
        y += 14;
      }
    }
  }

  _renderMiniMap(r, ctx) {
    r.drawPanel(410, 20, 370, 320, '#0a0a16', '#3a3a5a');
    r.drawPixelText('지도', 425, 30, '#ffcc44', 2);

    // 연결선 그리기
    ctx.strokeStyle = '#334455';
    ctx.lineWidth = 2;

    for (const [id, pos] of this._nodePositions) {
      const loc = this.mapManager.getLocation(id);
      if (!loc || !loc.connections) continue;

      for (const conn of loc.connections) {
        const targetPos = this._nodePositions.get(conn.to);
        if (!targetPos) continue;

        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);
        ctx.lineTo(targetPos.x, targetPos.y);
        ctx.stroke();
      }
    }

    // 노드 그리기
    for (const [id, pos] of this._nodePositions) {
      const loc = this.mapManager.getLocation(id);
      if (!loc) continue;

      const isCurrent = id === this.mapManager.currentLocation;
      const icon = LOCATION_ICONS[loc.type] || LOCATION_ICONS.route;
      const visited = this.mapManager.hasVisited(id);

      // 노드 원
      const nodeSize = isCurrent ? 10 : 7;
      ctx.fillStyle = isCurrent ? '#ffcc44' : visited ? icon.color : '#333355';
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, nodeSize, 0, Math.PI * 2);
      ctx.fill();

      if (isCurrent) {
        // 맥동 효과
        const pulse = Math.sin(Date.now() * 0.005) * 3;
        ctx.strokeStyle = '#ffcc44';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, nodeSize + pulse, 0, Math.PI * 2);
        ctx.stroke();
      }

      // 라벨
      if (visited || isCurrent) {
        const name = loc.name.substring(0, 6);
        const tw = r.measureText(name, 1);
        r.drawPixelText(name, pos.x - tw / 2, pos.y + nodeSize + 4, isCurrent ? '#ffffff' : '#888899', 1);
      }
    }
  }

  _renderConnections(r, ctx) {
    r.drawPanel(20, 350, 760, 230, '#0d0d1e', '#3a3a5a');
    r.drawPixelText('이동 가능한 장소', 40, 365, '#ffcc44', 2);

    if (this.connections.length === 0) {
      r.drawPixelText('이동할 수 있는 장소가 없습니다.', 40, 400, '#888899', 2);
      return;
    }

    for (let i = 0; i < this.connections.length; i++) {
      const conn = this.connections[i];
      const y = 395 + i * 42;
      const selected = this.cursor === i;
      const canAccess = this.mapManager.canAccess(conn.id, this.badgeCount);

      if (selected) {
        ctx.fillStyle = 'rgba(100,100,200,0.15)';
        ctx.fillRect(30, y - 2, 740, 38);
        ctx.fillStyle = '#ffcc44';
        ctx.fillRect(36, y + 10, 6, 6);
      }

      // 위치 타입 아이콘
      const targetLoc = this.mapManager.getLocation(conn.id);
      const locType = targetLoc?.type || 'route';
      const icon = LOCATION_ICONS[locType] || LOCATION_ICONS.route;
      ctx.fillStyle = canAccess ? icon.color : '#444444';
      ctx.fillRect(50, y + 2, 18, 18);
      r.drawPixelText(icon.symbol, 53, y + 5, '#ffffff', 1);

      // 이름
      const nameColor = !canAccess ? '#664444' : selected ? '#ffffff' : '#ccccdd';
      r.drawPixelText(conn.name, 78, y + 2, nameColor, 2);

      // 설명
      if (conn.description) {
        r.drawPixelText(conn.description.substring(0, 40), 78, y + 22, '#777799', 1);
      }

      // 잠김 표시
      if (!canAccess) {
        r.drawPixelText(`[뱃지 ${conn.requiredBadges}개 필요]`, 500, y + 4, '#ff4444', 1);
      }

      // 방문 여부
      if (this.mapManager.hasVisited(conn.id)) {
        r.drawPixelText('[방문함]', 660, y + 4, '#44aa66', 1);
      }
    }

    r.drawPixelText('[Enter] 이동  [ESC] 닫기', 40, 560, '#666688', 1);
  }

  handleInput(key) {
    if (!this.visible) return false;
    if (this.transitioning) return true; // 이동 중 입력 차단

    switch (key) {
      case 'ArrowUp':
        this.cursor = Math.max(0, this.cursor - 1);
        return true;
      case 'ArrowDown':
        this.cursor = Math.min(this.connections.length - 1, this.cursor + 1);
        return true;
      case 'Enter':
      case ' ': {
        if (this.connections.length === 0) return true;
        const conn = this.connections[this.cursor];
        if (!conn) return true;

        if (!this.mapManager.canAccess(conn.id, this.badgeCount)) {
          // 접근 불가 피드백 (외부 다이얼로그 연동 가능)
          return true;
        }

        // 이동 트랜지션 시작
        this.transitioning = true;
        this.transitionTimer = 0;
        this.transitionTarget = conn.id;
        return true;
      }
      case 'Escape':
        this.close();
        return true;
    }
    return true;
  }
}
