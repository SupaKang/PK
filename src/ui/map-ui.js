// 타일 기반 월드 맵 UI
import { TilemapEngine } from './tilemap-engine.js';
import { CharacterController, NpcSprite } from './character-controller.js';

// 타일맵 데이터 캐시
const tilemapCache = new Map();

async function loadTilemap(locationId) {
  if (tilemapCache.has(locationId)) return tilemapCache.get(locationId);
  try {
    const res = await fetch(`./data/tilemaps/${locationId}.json`);
    if (!res.ok) return null;
    const data = await res.json();
    tilemapCache.set(locationId, data);
    return data;
  } catch { return null; }
}

export class MapUI {
  constructor(renderer, mapManager) {
    this.renderer = renderer;
    this.mapManager = mapManager;
    this.canvas = renderer.getContext().canvas;
    this.visible = false;
    this.showMinimap = false;
    this.showHelp = false;

    // 타일 엔진
    this.tileEngine = new TilemapEngine(this.canvas);

    // 플레이어 캐릭터
    this.player = new CharacterController();
    this.player.setCollisionChecker((tx, ty) => this.tileEngine.isBlocked(tx, ty));

    // NPC 스프라이트
    this.npcSprites = [];

    // 현재 맵 데이터
    this.currentMapData = null;
    this.currentLocationId = null;
    this.mapLoaded = false;

    // 트랜지션
    this.transitioning = false;
    this.transitionTimer = 0;
    this.transitionDuration = 0.6;
    this.transitionTarget = null;
    this.transitionSpawn = null;
    this.fadeAlpha = 0;

    // 배너
    this.banner = null;
    this.bannerTimer = 0;
    this.bannerDuration = 2.5;

    // 인카운터 쿨다운 (이동할 때마다 체크)
    this._lastTileX = -1;
    this._lastTileY = -1;
    this._stepCount = 0;

    // 키 상태 (지속 입력 감지용)
    this._keys = {};

    // 콜백
    this.onMove = null;
    this.onInteract = null; // (npc) => void
    this.onEncounterCheck = null; // () => boolean — 인카운터 발생 여부
    this.onShop = null;
    this.onHeal = null;
    this.onBox = null;
    this.onBoss = null;
    this.onQuest = null;
    this.onHiddenEvent = null;

    // 계약자 레벨 (감응 타일용)
    this._contractorLevel = 0;

    // 뱃지 수
    this.badgeCount = 0;

    // 폴백 맵 커서
    this._fallbackCursor = 0;

    // 시간대 시각 효과
    this.expeditionTimeOfDay = null;

    // 파티 HP 위험 경고
    this._partyLowHP = false;

    // 파티 HP 요약 데이터
    this._partyData = [];

    // 플레이어 외형 (직업)
    this.playerAppearance = { classId: 'warrior', baseColor: '#CC4444', accentColor: '#882222' };

    // 이동 파티클 트레일
    this._moveTrail = []; // {x, y, timer, maxTimer, color}

    // Fog of war
    this._explored = new Set(); // 'x,y' strings of explored tiles
    this._exploreRadius = 3;    // tiles around player that get revealed
  }

  setPlayerAppearance(classId, baseColor, accentColor) {
    this.playerAppearance = { classId, baseColor, accentColor };
    this.player.setAppearance(classId, baseColor, accentColor);
  }

  /** 현재 위치의 타일맵 로드 */
  async loadCurrentMap() {
    const locId = this.mapManager.currentLocation;
    if (locId === this.currentLocationId && this.mapLoaded) return;

    const mapData = await loadTilemap(locId);
    if (mapData) {
      this.tileEngine.loadMap(mapData);
      this.currentMapData = mapData;
      this.currentLocationId = locId;
      this.mapLoaded = true;
      this._explored = new Set();

      // 플레이어 위치 설정
      if (this.transitionSpawn) {
        this.player.setPosition(this.transitionSpawn.x, this.transitionSpawn.y);
        this.transitionSpawn = null;
      } else if (mapData.playerSpawn) {
        this.player.setPosition(mapData.playerSpawn.x, mapData.playerSpawn.y);
      }

      this.player.setMapSize(mapData.width, mapData.height);

      // NPC 스프라이트 생성
      this.npcSprites = (mapData.npcs || []).map(npc => new NpcSprite(npc));

      this._lastTileX = this.player.getTileX();
      this._lastTileY = this.player.getTileY();
    } else {
      // 타일맵 없으면 폴백 (빈 맵)
      this.mapLoaded = false;
      this.currentMapData = null;
    }
  }

  showBanner(name) {
    this.banner = name;
    this.bannerTimer = this.bannerDuration;
  }

  _refresh() {
    // 맵 로드 트리거
    this.loadCurrentMap();
  }

  update(dt) {
    if (!this.visible) return;

    // 배너
    if (this.bannerTimer > 0) {
      this.bannerTimer -= dt;
      if (this.bannerTimer <= 0) this.banner = null;
    }

    // 트랜지션
    if (this.transitioning) {
      this.transitionTimer += dt;
      const half = this.transitionDuration / 2;
      if (this.transitionTimer < half) {
        this.fadeAlpha = this.transitionTimer / half;
      } else {
        // 중간 지점에서 맵 전환
        if (this.transitionTarget && this.fadeAlpha >= 0.95) {
          this._executeTransition();
          this.transitionTarget = null;
        }
        this.fadeAlpha = 1 - (this.transitionTimer - half) / half;
      }
      if (this.transitionTimer >= this.transitionDuration) {
        this.transitioning = false;
        this.fadeAlpha = 0;
      }
      return; // 트랜지션 중 이동 불가
    }

    // 타일맵 미로드 시 로드 시도
    if (!this.mapLoaded) {
      this.loadCurrentMap();
      return;
    }

    // 플레이어 이동
    this.player.update(dt, this._keys);

    // Move trail particles
    if (this.player?.isMoving()) {
      const wx = this.player.getWorldX();
      const wy = this.player.getWorldY();
      const trailColor = this.playerAppearance?.baseColor || '#ffffff';
      this._moveTrail.push({ x: wx + 24, y: wy + 48, timer: 0, maxTimer: 0.4, color: trailColor });
    }
    for (let i = this._moveTrail.length - 1; i >= 0; i--) {
      this._moveTrail[i].timer += dt;
      if (this._moveTrail[i].timer >= this._moveTrail[i].maxTimer) {
        this._moveTrail.splice(i, 1);
      }
    }
    if (this._moveTrail.length > 20) this._moveTrail.splice(0, this._moveTrail.length - 20);

    // Reveal fog of war
    if (this.player && this.currentMapData) {
      const px = this.player.getTileX();
      const py = this.player.getTileY();
      for (let dy = -this._exploreRadius; dy <= this._exploreRadius; dy++) {
        for (let dx = -this._exploreRadius; dx <= this._exploreRadius; dx++) {
          if (dx*dx + dy*dy <= this._exploreRadius * this._exploreRadius) {
            this._explored.add(`${px+dx},${py+dy}`);
          }
        }
      }
    }

    // 카메라 추적
    this.tileEngine.setCamera(this.player.getWorldX(), this.player.getWorldY());

    // 타일 이동 감지
    const tx = this.player.getTileX();
    const ty = this.player.getTileY();
    if (tx !== this._lastTileX || ty !== this._lastTileY) {
      this._lastTileX = tx;
      this._lastTileY = ty;
      this._onTileChange(tx, ty);
    }
  }

  /** 타일 이동 시 체크 */
  _onTileChange(tx, ty) {
    // 출구 체크
    const exit = this.tileEngine.getExitAt(tx, ty);
    if (exit) {
      this._startTransition(exit.to, exit.spawnX, exit.spawnY);
      return;
    }

    // Hidden event check
    if (this.currentMapData?.hiddenEvents) {
      const hiddenEvent = this.currentMapData.hiddenEvents.find(e => e.x === tx && e.y === ty);
      if (hiddenEvent && !hiddenEvent._triggered) {
        hiddenEvent._triggered = true;
        if (this.onHiddenEvent) this.onHiddenEvent(hiddenEvent);
        return;
      }
    }

    // 야생 인카운터 체크 (풀밭 타일 위를 걸을 때)
    const groundTile = this.tileEngine.getTileAt('ground', tx, ty);
    if (groundTile === 1) { // 1 = grass (인카운터 가능 지역)
      this._stepCount++;
      if (this._stepCount >= 4 && this.onEncounterCheck) {
        this._stepCount = 0;
        this.onEncounterCheck();
      }
    }
  }

  _startTransition(targetLocationId, spawnX, spawnY) {
    this.transitioning = true;
    this.transitionTimer = 0;
    this.transitionTarget = targetLocationId;
    this.transitionSpawn = { x: spawnX ?? 1, y: spawnY ?? 1 };
    this.fadeAlpha = 0;
  }

  _executeTransition() {
    if (!this.transitionTarget) return;
    const targetId = this.transitionTarget;

    // MapManager 이동
    const result = this.mapManager.moveTo(targetId, this.badgeCount);
    if (result.success) {
      this.currentLocationId = null; // 리로드 강제
      this.mapLoaded = false;
      this.loadCurrentMap();
      this.showBanner(result.location?.name || targetId);

      if (this.onMove) {
        this.onMove(targetId);
      }
    } else {
      // 이동 실패 (뱃지 부족 등) — 원래 위치로
      this.transitionSpawn = null;
    }
  }

  render() {
    if (!this.visible) return;

    const ctx = this.renderer.getContext();

    if (!this.mapLoaded || !this.currentMapData) {
      // Fallback: simple location info screen
      const r = this.renderer;
      const ctx2 = r.getContext();
      r.clear('#1a2a1a');

      const loc = this.mapManager?.getCurrentLocation();
      if (loc) {
        // Simple background based on location type
        const bgColors = { town: '#2a3a2a', route: '#1a2a1a', cave: '#1a1a2a', gym: '#2a2a1a', dungeon: '#1a1a1a', elite_four: '#2a1a2a' };
        r.clear(bgColors[loc.type] || '#1a2a1a');

        // Location name
        const nameW = r.measureText(loc.name, 3);
        r.drawPixelText(loc.name, (800 - nameW) / 2, 30, '#ffffff', 3);

        // Description
        if (loc.description) {
          for (let i = 0; i < loc.description.length; i += 40) {
            r.drawPixelText(loc.description.substring(i, i + 40), 50, 80 + Math.floor(i/40) * 22, '#aaaacc', 2);
          }
        }

        // Connections as menu
        const conns = this.mapManager.getConnections();
        r.drawPixelText('이동 가능:', 50, 200, '#ffcc44', 2);
        for (let i = 0; i < conns.length; i++) {
          const selected = this._fallbackCursor === i;
          const y = 230 + i * 35;
          if (selected) {
            ctx2.fillStyle = 'rgba(100,100,200,0.2)';
            ctx2.fillRect(45, y - 5, 710, 30);
            r.drawPixelText('\u25b6 ' + conns[i].name, 60, y, '#ffffff', 2);
          } else {
            r.drawPixelText('  ' + conns[i].name, 60, y, '#aaaacc', 2);
          }
        }

        // Facilities
        let fy = 450;
        if (loc.type === 'town') {
          r.drawPixelText('[자동 회복됨]', 50, fy, '#44cc66', 2);
          fy += 25;
        }
        if (loc.shop) r.drawPixelText('[S] 상점', 50, fy, '#44aa55', 2);

        r.drawPixelText('[Enter] 이동  [Esc] 메뉴  [S] 상점', 50, 560, '#666688', 1);
      }
      return;
    }

    // 타일맵 하단 레이어 (바닥 + 오브젝트)
    this.tileEngine.renderBelow(ctx);

    // Time-of-day map tinting
    if (this.expeditionTimeOfDay) {
      const tints = {
        morning: { color: 'rgba(255,200,100,0.08)', blend: 'source-over' },
        day: null,
        evening: { color: 'rgba(200,80,30,0.12)', blend: 'source-over' },
        night: { color: 'rgba(0,0,40,0.35)', blend: 'source-over' },
      };
      const tint = tints[this.expeditionTimeOfDay];
      if (tint) {
        ctx.fillStyle = tint.color;
        ctx.fillRect(0, 0, 800, 600);
      }
    }

    // Weather effects based on location type
    if (this.currentMapData?.tileset) {
      const ctx2 = ctx; // already have ctx
      const time = Date.now() * 0.001;
      const locType = this.mapManager?.getCurrentLocation()?.type;

      if (locType === 'cave' || locType === 'dungeon') {
        // Dripping water particles
        for (let i = 0; i < 5; i++) {
          const dx = (i * 173 + Math.floor(time * 50)) % 800;
          const dy = (time * 40 + i * 97) % 600;
          ctx2.fillStyle = 'rgba(100,150,200,0.3)';
          ctx2.fillRect(dx, dy, 1, 4);
        }
      } else if (this.expeditionTimeOfDay === 'night') {
        // Firefly particles at night
        for (let i = 0; i < 8; i++) {
          const fx = 400 + Math.sin(time * 0.7 + i * 1.3) * 350;
          const fy = 300 + Math.cos(time * 0.5 + i * 1.7) * 250;
          const fa = 0.2 + Math.sin(time * 2 + i) * 0.2;
          ctx2.fillStyle = `rgba(200,255,100,${fa})`;
          ctx2.beginPath();
          ctx2.arc(fx, fy, 2, 0, Math.PI * 2);
          ctx2.fill();
        }
      }

      // Snow for ice locations
      const locId = this.mapManager?.currentLocation || '';
      if (locId.includes('cave_02') || locId.includes('town_07') || locId.includes('gym_06')) {
        for (let i = 0; i < 15; i++) {
          const sx = (i * 57 + Math.floor(time * 20 + i * 30)) % 820 - 10;
          const sy = (time * 30 + i * 43) % 620 - 10;
          const sa = 0.3 + Math.sin(time + i) * 0.15;
          ctx2.fillStyle = `rgba(220,230,255,${sa})`;
          ctx2.fillRect(sx, sy, 3, 3);
        }
      }
    }

    // NPC 렌더링
    for (const npc of this.npcSprites) {
      const screen = this.tileEngine.worldToScreen(npc.x * 64, npc.y * 64);
      if (screen.x > -64 && screen.x < 864 && screen.y > -64 && screen.y < 664) {
        npc.render(ctx, screen.x, screen.y);
      }
    }

    // NPC proximity speech bubbles
    if (this.currentMapData?.npcs) {
      const px = this.player.getTileX();
      const py = this.player.getTileY();

      for (const npc of this.npcSprites) {
        const dx = Math.abs(npc.x - px);
        const dy = Math.abs(npc.y - py);
        const dist = dx + dy; // Manhattan distance

        if (dist <= 2 && dist > 0) {
          const screen = this.tileEngine.worldToScreen(npc.x * 64, npc.y * 64);

          // Determine bubble text based on NPC type
          let bubbleText = '...';
          let bubbleColor = '#ffffff';
          if (npc.type === 'shop') { bubbleText = '$'; bubbleColor = '#44aa55'; }
          else if (npc.type === 'box') { bubbleText = '□'; bubbleColor = '#cc88ff'; }
          else if (npc.type === 'heal') { bubbleText = '+'; bubbleColor = '#88aaff'; }
          else if (npc.type === 'trainer') { bubbleText = '!'; bubbleColor = '#cc4444'; }
          else if (npc.type === 'gym_leader') { bubbleText = '!!'; bubbleColor = '#ddaa22'; }
          else if (npc.type === 'boss') { bubbleText = '!!!'; bubbleColor = '#992266'; }

          // Draw bubble
          const bx = screen.x + 20;
          const by = screen.y - 20;
          const r = this.renderer;

          // Bubble background
          ctx.fillStyle = 'rgba(0,0,0,0.7)';
          const tw = r.measureText(bubbleText, 1);
          ctx.fillRect(bx - 2, by - 2, tw + 8, 14);

          // Bubble text
          r.drawPixelText(bubbleText, bx + 2, by, bubbleColor, 1);

          // Bubble tail (small triangle)
          ctx.fillStyle = 'rgba(0,0,0,0.7)';
          ctx.beginPath();
          ctx.moveTo(bx + 4, by + 12);
          ctx.lineTo(bx + 10, by + 18);
          ctx.lineTo(bx + 12, by + 12);
          ctx.fill();
        }
      }
    }

    // Exit tile arrows
    if (this.currentMapData?.exits) {
      const time = Date.now() * 0.003;
      for (const exit of this.currentMapData.exits) {
        const screen = this.tileEngine.worldToScreen(exit.x * 64, exit.y * 64);
        if (screen.x > -64 && screen.x < 864 && screen.y > -64 && screen.y < 664) {
          // Pulsing arrow
          const pulse = 0.5 + Math.sin(time * 2) * 0.3;
          ctx.fillStyle = `rgba(255,204,68,${pulse})`;

          // Determine arrow direction based on position
          const mx = this.currentMapData.width;
          const my = this.currentMapData.height;
          let ax = screen.x + 28, ay = screen.y + 28;

          ctx.beginPath();
          if (exit.x === 0) { // left exit
            ctx.moveTo(ax - 16, ay);
            ctx.lineTo(ax - 4, ay - 8);
            ctx.lineTo(ax - 4, ay + 8);
          } else if (exit.x >= mx - 1) { // right exit
            ctx.moveTo(ax + 16, ay);
            ctx.lineTo(ax + 4, ay - 8);
            ctx.lineTo(ax + 4, ay + 8);
          } else if (exit.y === 0) { // top exit
            ctx.moveTo(ax, ay - 16);
            ctx.lineTo(ax - 8, ay - 4);
            ctx.lineTo(ax + 8, ay - 4);
          } else { // bottom exit
            ctx.moveTo(ax, ay + 16);
            ctx.lineTo(ax - 8, ay + 4);
            ctx.lineTo(ax + 8, ay + 4);
          }
          ctx.fill();
        }
      }
    }

    // Hidden event glow (감응 타일)
    if (this.currentMapData?.hiddenEvents && this._contractorLevel > 0) {
      const time = Date.now() * 0.003;
      for (const event of this.currentMapData.hiddenEvents) {
        if (this._contractorLevel >= event.requiredLevel) {
          const screen = this.tileEngine.worldToScreen(event.x * 64, event.y * 64);
          if (screen.x > -64 && screen.x < 864 && screen.y > -64 && screen.y < 664) {
            const alpha = 0.3 + Math.sin(time + event.x * 2 + event.y * 3) * 0.2;
            ctx.fillStyle = `rgba(200,180,255,${alpha})`;
            ctx.beginPath();
            ctx.arc(screen.x + 32, screen.y + 32, 20 + Math.sin(time * 1.5) * 5, 0, Math.PI * 2);
            ctx.fill();

            // Sparkle particles
            for (let i = 0; i < 3; i++) {
              const px = screen.x + 16 + Math.sin(time * 2 + i * 2.1) * 24;
              const py = screen.y + 16 + Math.cos(time * 1.7 + i * 1.8) * 24;
              const sa = 0.5 + Math.sin(time * 3 + i) * 0.5;
              ctx.fillStyle = `rgba(255,255,200,${sa * 0.6})`;
              ctx.fillRect(px, py, 3, 3);
            }
          }
        }
      }
    }

    // Player move trail
    for (const t of this._moveTrail) {
      const screen = this.tileEngine.worldToScreen(t.x, t.y);
      const alpha = 0.3 * (1 - t.timer / t.maxTimer);
      ctx.fillStyle = t.color;
      ctx.globalAlpha = alpha;
      ctx.fillRect(screen.x, screen.y, 4, 4);
    }
    ctx.globalAlpha = 1;

    // 플레이어 렌더링
    const playerScreen = this.tileEngine.worldToScreen(this.player.getWorldX(), this.player.getWorldY());
    this.player.render(ctx, playerScreen.x, playerScreen.y);

    // Compass indicator (top-left when no minimap)
    if (!this.showMinimap) {
      const cx = 760, cy = 50;
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.beginPath();
      ctx.arc(cx, cy, 18, 0, Math.PI * 2);
      ctx.fill();

      const dirs = [
        { label: 'N', x: cx, y: cy - 12 },
        { label: 'S', x: cx, y: cy + 12 },
        { label: 'E', x: cx + 12, y: cy },
        { label: 'W', x: cx - 12, y: cy },
      ];
      for (const d of dirs) {
        const r2 = this.renderer;
        r2.drawPixelText(d.label, d.x - 3, d.y - 3, d.label === 'N' ? '#ff4444' : '#888899', 1);
      }
    }

    // 타일맵 상단 레이어 (플레이어 위에 그려질 것)
    this.tileEngine.renderAbove(ctx);

    // Night vision cone
    if (this.expeditionTimeOfDay === 'night') {
      const playerScreen = this.tileEngine.worldToScreen(this.player.getWorldX(), this.player.getWorldY());
      const px = playerScreen.x + 32;
      const py = playerScreen.y + 32;
      const grad = ctx.createRadialGradient(px, py, 60, px, py, 280);
      grad.addColorStop(0, 'rgba(0,0,0,0)');
      grad.addColorStop(0.5, 'rgba(0,0,20,0.2)');
      grad.addColorStop(1, 'rgba(0,0,30,0.7)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 800, 600);
    }

    // Fog of war overlay
    if (this.currentMapData && this._explored.size > 0) {
      for (let y = 0; y < this.currentMapData.height; y++) {
        for (let x = 0; x < this.currentMapData.width; x++) {
          if (!this._explored.has(`${x},${y}`)) {
            const screen = this.tileEngine.worldToScreen(x * 64, y * 64);
            if (screen.x > -64 && screen.x < 864 && screen.y > -64 && screen.y < 664) {
              ctx.fillStyle = 'rgba(0,0,10,0.6)';
              ctx.fillRect(screen.x, screen.y, 64, 64);
            }
          }
        }
      }
    }

    // 미니 HUD (위치 이름)
    const loc = this.mapManager.getCurrentLocation();
    const hudR = this.renderer;
    if (loc) {
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(0, 0, 800, 28);
      hudR.drawPixelText(loc.name, 10, 6, '#ffffff', 2);
      hudR.drawPixelText(`인장: ${this.badgeCount}/8`, 650, 6, '#ffcc44', 2);
    }

    // Encounter zone indicator
    if (this.currentMapData && this.player) {
      const tx = this.player.getTileX();
      const ty = this.player.getTileY();
      const groundTile = this.tileEngine.getTileAt('ground', tx, ty);
      if (groundTile === 1 || groundTile === 9) { // grass tiles = encounter zone
        const blink = Math.floor(Date.now() / 600) % 2;
        if (blink) {
          hudR.drawPixelText('⚠ 마물 출현 지역', 250, 8, '#ff8844', 1);
        }
      }
    }

    // Low HP warning
    if (this._partyLowHP) {
      const blink = Math.floor(Date.now() / 500) % 2;
      if (blink) {
        hudR.drawPixelText('! HP 위험', 300, 8, '#ff4444', 2);
      }
    }

    // Minimap overlay
    if (this.showMinimap && this.currentMapData) {
      const mmX = 580, mmY = 40;
      const mmScale = 4; // each tile = 4px on minimap
      const mmW = this.currentMapData.width * mmScale;
      const mmH = this.currentMapData.height * mmScale;

      // Background
      ctx.fillStyle = 'rgba(0,0,0,0.75)';
      ctx.fillRect(mmX - 5, mmY - 5, mmW + 10, mmH + 30);

      // Title
      const r = this.renderer;
      r.drawPixelText('지도 [M]', mmX, mmY - 2, '#ffcc44', 1);

      const mapY = mmY + 12;

      // Draw tiles
      const ground = this.currentMapData.layers?.ground;
      const collision = this.currentMapData.layers?.collision;
      if (ground) {
        for (let y = 0; y < this.currentMapData.height; y++) {
          for (let x = 0; x < this.currentMapData.width; x++) {
            const idx = y * this.currentMapData.width + x;
            const blocked = collision && collision[idx];
            const tileId = ground[idx];

            let color;
            if (blocked) color = '#333';
            else if (tileId === 1 || tileId === 9) color = '#4a8c3f'; // grass
            else if (tileId === 2) color = '#9c7a4a'; // dirt
            else if (tileId === 3) color = '#4a7aac'; // water
            else if (tileId === 4 || tileId === 17) color = '#8a8a6a'; // stone/gym
            else if (tileId === 5) color = '#8a6a4a'; // wood
            else if (tileId === 19) color = '#8a3030'; // carpet
            else color = '#555';

            ctx.fillStyle = color;
            ctx.fillRect(mmX + x * mmScale, mapY + y * mmScale, mmScale - 1, mmScale - 1);
          }
        }
      }

      // NPCs as colored dots
      if (this.currentMapData.npcs) {
        for (const npc of this.currentMapData.npcs) {
          const npcColors = { shop: '#44aa55', heal: '#88aaff', box: '#cc88ff', trainer: '#cc4444', gym_leader: '#ddaa22', boss: '#992266', dialog: '#4488cc' };
          ctx.fillStyle = npcColors[npc.type] || '#ffffff';
          ctx.fillRect(mmX + npc.x * mmScale, mapY + npc.y * mmScale, mmScale, mmScale);
        }
      }

      // Exits as yellow arrows
      if (this.currentMapData.exits) {
        for (const exit of this.currentMapData.exits) {
          ctx.fillStyle = '#ffcc44';
          ctx.fillRect(mmX + exit.x * mmScale, mapY + exit.y * mmScale, mmScale, mmScale);
        }
      }

      // Player position (blinking)
      const blink = Math.floor(Date.now() / 300) % 2;
      if (blink) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(mmX + this.player.getTileX() * mmScale - 1, mapY + this.player.getTileY() * mmScale - 1, mmScale + 2, mmScale + 2);
      }

      // Hidden events (if detected)
      if (this.currentMapData.hiddenEvents) {
        for (const ev of this.currentMapData.hiddenEvents) {
          if (this._contractorLevel >= ev.requiredLevel && !ev._triggered) {
            const sparkle = 0.5 + Math.sin(Date.now() * 0.005 + ev.x) * 0.5;
            ctx.fillStyle = 'rgba(200,180,255,' + sparkle + ')';
            ctx.fillRect(mmX + ev.x * mmScale, mapY + ev.y * mmScale, mmScale, mmScale);
          }
        }
      }

      // Minimap legend
      const legendY = mapY + this.currentMapData.height * mmScale + 5;
      r.drawPixelText('범례:', mmX, legendY, '#888899', 1);
      const legends = [
        { color: '#44aa55', label: '상점' },
        { color: '#88aaff', label: '치유' },
        { color: '#cc4444', label: '전투' },
        { color: '#ddaa22', label: '수호자' },
        { color: '#ffcc44', label: '출구' },
        { color: 'rgba(200,180,255,0.7)', label: '감응' },
      ];
      let lx = mmX + 35;
      for (const lg of legends) {
        ctx.fillStyle = lg.color;
        ctx.fillRect(lx, legendY, 6, 6);
        r.drawPixelText(lg.label, lx + 8, legendY, '#777788', 1);
        lx += 45;
      }
    }

    // 도움말 오버레이
    if (this.showHelp) {
      const r = this.renderer;
      ctx.fillStyle = 'rgba(0,0,0,0.8)';
      ctx.fillRect(0, 0, 800, 600);

      r.drawPanel(150, 50, 500, 500, '#0d0d1e', '#4a4a6a');
      r.drawPixelText('조작법', 320, 70, '#ffcc44', 3);

      const controls = [
        ['방향키', '이동'],
        ['Enter / Space', 'NPC 대화 / 상호작용'],
        ['Escape', '메뉴 열기'],
        ['C', '캠핑 (탐험 중)'],
        ['M / Tab', '미니맵 토글'],
        ['H', '도움말 토글'],
        ['', ''],
        ['── 전투 중 ──', ''],
        ['방향키', '메뉴 탐색'],
        ['Enter', '선택 / 확인'],
        ['Escape', '뒤로'],
        ['', ''],
        ['── 탐험 ──', ''],
        ['마을 밖으로 나가면', '탐험 시작 (240AP)'],
        ['마을로 돌아오면', '귀환 성공 + 보너스'],
        ['AP 소진 시', '강제 귀환 (패널티)'],
      ];

      let y = 120;
      for (const [key, desc] of controls) {
        if (key === '') { y += 10; continue; }
        if (key.startsWith('──')) {
          r.drawPixelText(key, 200, y, '#888899', 2);
          y += 25;
          continue;
        }
        r.drawPixelText(key, 200, y, '#ffcc44', 2);
        r.drawPixelText(desc, 420, y, '#ccccdd', 2);
        y += 22;
      }

      // 타입 상성 차트
      r.drawPixelText('── 타입 상성 (간략) ──', 200, y, '#888899', 2);
      y += 25;
      const typeHints = [
        '화염 > 자연,빙결,강철 | 약: 해류,대지,암석',
        '해류 > 화염,대지,암석 | 약: 자연,전격',
        '자연 > 해류,대지,암석 | 약: 화염,빙결,맹독',
        '전격 > 해류,질풍 | 약: 대지',
        '용린 > 용린 | 약: 빙결,용린',
      ];
      for (const hint of typeHints) {
        r.drawPixelText(hint, 180, y, '#aaaacc', 1);
        y += 16;
      }

      r.drawPixelText('[H] 닫기', 350, 520, '#666688', 2);
    }

    // Party HP summary (bottom bar)
    if (this._partyData.length > 0) {
      const barY = 570;
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(0, barY - 5, 800, 35);

      const count = Math.min(6, this._partyData.length);
      const barW = Math.floor(700 / count);

      for (let i = 0; i < count; i++) {
        const m = this._partyData[i];
        const x = 50 + i * barW;

        // Name (truncated)
        const name = (m.isContractor ? '[C]' : '') + (m.nickname || m.name || '?').substring(0, 4);
        const r = this.renderer;
        r.drawPixelText(name, x, barY - 2, m.currentHp <= 0 ? '#664444' : '#ccccdd', 1);

        // HP bar
        const hpRatio = m.currentHp / (m.stats?.hp || 1);
        const hpColor = hpRatio > 0.5 ? '#44cc44' : hpRatio > 0.2 ? '#cccc44' : '#cc4444';
        ctx.fillStyle = '#222';
        ctx.fillRect(x, barY + 10, barW - 10, 6);
        ctx.fillStyle = m.currentHp <= 0 ? '#333' : hpColor;
        ctx.fillRect(x, barY + 10, (barW - 10) * Math.max(0, hpRatio), 6);

        // Status dot
        if (m.status) {
          ctx.fillStyle = '#ff4444';
          ctx.fillRect(x + barW - 14, barY + 10, 4, 4);
        }
      }
    }

    // 배너
    if (this.banner && this.bannerTimer > 0) {
      this._renderBanner(ctx);
    }

    // Transition effect
    if (this.fadeAlpha > 0) {
      const locType = this.mapManager?.getCurrentLocation()?.type;

      if (locType === 'cave' || locType === 'dungeon') {
        // Cave: circular iris close/open
        const radius = (1 - this.fadeAlpha) * 500;
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, 800, 600);
        ctx.globalCompositeOperation = 'destination-out';
        ctx.beginPath();
        ctx.arc(400, 300, Math.max(0, radius), 0, Math.PI * 2);
        ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
      } else if (locType === 'gym' || locType === 'elite_four') {
        // Gym: horizontal wipe
        const wipeX = this.fadeAlpha * 800;
        ctx.fillStyle = 'rgba(0,0,0,1)';
        ctx.fillRect(0, 0, wipeX, 600);
      } else {
        // Default: fade to black
        ctx.fillStyle = `rgba(0,0,0,${Math.min(1, this.fadeAlpha)})`;
        ctx.fillRect(0, 0, 800, 600);
      }
    }
  }

  _renderBanner(ctx) {
    const r = this.renderer;
    const progress = 1 - (this.bannerTimer / this.bannerDuration);
    let alpha = 1;
    if (progress < 0.1) alpha = progress / 0.1;
    else if (progress > 0.7) alpha = (1 - progress) / 0.3;

    ctx.fillStyle = `rgba(10,10,30,${0.85 * alpha})`;
    ctx.fillRect(0, 250, 800, 70);
    ctx.fillStyle = `rgba(255,204,68,${alpha})`;
    ctx.fillRect(0, 250, 800, 3);
    ctx.fillRect(0, 317, 800, 3);

    const tw = r.measureText(this.banner, 3);
    r.drawPixelText(this.banner, (800 - tw) / 2, 270, `rgba(255,255,255,${alpha})`, 3);

    // Location description (below name)
    const loc = this.mapManager?.getCurrentLocation();
    if (loc?.description && this.bannerTimer > 0) {
      const descAlpha = alpha * 0.8;
      ctx.fillStyle = `rgba(10,10,30,${0.7 * descAlpha})`;
      ctx.fillRect(0, 320, 800, 30);
      const desc = loc.description.substring(0, 50);
      const dw = r.measureText(desc, 1);
      r.drawPixelText(desc, (800 - dw) / 2, 328, `rgba(170,170,204,${descAlpha})`, 1);
    }
  }

  handleInput(key) {
    if (!this.visible) return false;
    if (this.transitioning) return true;

    // 타일맵 미로드 시 폴백 입력 처리
    if (!this.mapLoaded) {
      const conns = this.mapManager?.getConnections() || [];
      if (key === 'ArrowUp') this._fallbackCursor = Math.max(0, this._fallbackCursor - 1);
      if (key === 'ArrowDown') this._fallbackCursor = Math.min(conns.length - 1, this._fallbackCursor + 1);
      if (key === 'Enter' || key === ' ') {
        if (conns[this._fallbackCursor]) {
          this._startTransition(conns[this._fallbackCursor].id);
        }
      }
      if (key === 's' || key === 'S') {
        if (this.onShop) this.onShop(null); // null NPC triggers loc.shop lookup in main.js
      }
      return true;
    }

    // 도움말 오버레이가 열려 있으면 H/Escape 외 모든 입력 소비
    if (this.showHelp) {
      if (key === 'h' || key === 'H' || key === 'Escape') {
        this.showHelp = false;
      }
      return true; // consume all input while help is open
    }

    // 도움말 토글
    if (key === 'h' || key === 'H') {
      this.showHelp = !this.showHelp;
      return true;
    }

    // 방향키 → 지속 입력으로 처리
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(key)) {
      this._keys[key] = true;
      // keyup은 별도 처리 필요 — update에서 keys 객체 참조
      return true;
    }

    // Minimap toggle
    if (key === 'm' || key === 'M' || key === 'Tab') {
      this.showMinimap = !this.showMinimap;
      return true;
    }

    // Enter — NPC 상호작용
    if (key === 'Enter' || key === ' ') {
      this._tryInteract();
      return true;
    }

    // Escape — 메뉴
    if (key === 'Escape') {
      return false; // main.js에서 메뉴 열기 처리
    }

    return false;
  }

  /** 키 상태 동기화 (main.js에서 호출) */
  syncKeys(keys) {
    this._keys = keys;
  }

  _tryInteract() {
    if (!this.currentMapData) return;

    const facing = this.player.getFacingTile();
    const npc = this.tileEngine.getNpcAt(facing.x, facing.y);
    if (!npc) return;

    switch (npc.type) {
      case 'shop':
        if (this.onShop) this.onShop(npc);
        break;
      case 'heal':
        if (this.onHeal) this.onHeal(npc);
        break;
      case 'box':
        if (this.onBox) this.onBox(npc);
        break;
      case 'craft':
        if (this.onCraft) this.onCraft(npc);
        break;
      case 'boss':
        if (this.onBoss) this.onBoss(npc);
        break;
      case 'quest':
        if (this.onQuest) this.onQuest(npc);
        break;
      case 'egg':
        if (this.onEgg) this.onEgg(npc);
        break;
      case 'fusion':
        if (this.onFusion) this.onFusion(npc);
        break;
      case 'trainer':
      case 'gym_leader':
      case 'dialog':
      default:
        if (this.onInteract) this.onInteract(npc);
        break;
    }
  }
}
