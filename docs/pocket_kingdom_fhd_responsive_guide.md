# Pocket Kingdom — FHD 반응형 설계 가이드

> GBC 2세대 도트 스타일 유지 + FHD(1920×1080) 기준 반응형 화면
> 가로 비율 기준, 상하 letterbox(검은 바) 허용

---

## 1. 핵심 원칙: 내부 해상도 고정 + 정수배 스케일링

```
[에셋 원본] → [내부 캔버스 480×270] → [정수배 스케일] → [디스플레이]
  16px 타일      1:1 픽셀 매핑         ×4 (FHD)        1920×1080
                                       nearest-neighbor
                                       image-rendering: pixelated
```

---

## 2. 내부 캔버스 해상도

**480 × 270px (16:9)**

선정 근거:
- 16px 타일 기준 **30 × 16.875 타일** 배치 (실사용: 30×16 + UI 영역)
- 1920 ÷ 480 = **정확히 4배** → 1 소스 픽셀 = 4×4 스크린 픽셀
- GBC 원본(160×144)의 3배 = 480×432이나 16:9가 아니므로 480×270 채택
- 16:9 비율이라 현대 모니터/모바일에 letterbox 최소화

---

## 3. 화면 비율 대응

### 3.1 스케일 팩터 계산

```
scale = min(
  floor(viewportWidth / 480),
  floor(viewportHeight / 270)
) || 1
```

| 디스플레이 | 해상도 | scale | 렌더 크기 | 여백 |
|---|---|---|---|---|
| FHD | 1920×1080 | ×4 | 1920×1080 | 없음 (완벽 fit) |
| QHD | 2560×1440 | ×5 | 2400×1350 | 좌우 80px, 상하 45px |
| HD | 1366×768 | ×2 | 960×540 | 좌우 203px, 상하 114px |
| 노트북 | 1280×720 | ×2 | 960×540 | 좌우 160px, 상하 90px |
| 모바일(가로) | 844×390 | ×1 | 480×270 | 좌우 182px, 상하 60px |
| 모바일(세로) | 390×844 | ×1 | 480×270 | 좌우 0, 상하 287px |

### 3.2 letterbox 처리

- body 배경 `#000` (검은색)
- 캔버스를 뷰포트 중앙 정렬
- 가로/세로 남는 영역은 자연스럽게 검은 바

---

## 4. 에셋 해상도 가이드

| 에셋 | 소스 크기 | 캔버스 위 크기 | FHD 표시 크기 | PixelLab 생성 크기 |
|---|---|---|---|---|
| 타일 | 16×16 | 16×16 | 64×64 | 16×16 (tileset) |
| 필드 캐릭터 | 32×32 | 32×32 | 128×128 | 32×32 → 그대로 사용 |
| 필드 NPC | 32×32 | 32×32 | 128×128 | 32×32 (4방향) |
| 전투 몬스터 | 64×64 | 약 120×120 | 약 480×480 | 64×64 (pixflux) |
| 전투 배경 | 480×270 | 풀스크린 | 1920×1080 | 480×270 (pixflux) |
| UI 프레임 | 480×60 | 하단 UI | 1920×240 | 480×60 (map-object) |
| 아이템 아이콘 | 16×16 | 16×16 | 64×64 | 32×32 → 2x 다운스케일 |
| 인장 아이콘 | 16×16 | 16×16 | 64×64 | 32×32 → 2x 다운스케일 |
| 상태이상 아이콘 | 8×8 | 8×8 | 32×32 | 16×16 → 2x 다운스케일 |

### 4.1 다운스케일 전략

PixelLab 최소 지원 크기와 GBC 스타일 목표 크기가 다른 경우:

```
목표 16px 이하 에셋:
  → PixelLab에서 32px로 생성 (low detail, minimal features)
  → nearest-neighbor 2x 다운스케일 → 16px
  → 프롬프트에 "low detail, large shapes, minimal features" 강조

목표 8px 에셋 (상태이상 아이콘 등):
  → PixelLab에서 16px로 생성
  → 2x 다운스케일 → 8px
  → 또는 수동 도트 작업 (8px은 AI 생성 한계)
```

---

## 5. 화면 레이아웃

### 5.1 필드 화면 (480×270)

```
┌──────────────────────────────────────────────────┐
│                                                  │
│              게임 월드 (480×240)                  │
│         30×15 타일 (16px each)                   │
│         플레이어 32×32 중앙 고정                 │
│         카메라가 플레이어 추적                   │
│                                                  │
├──────────────────────────────────────────────────┤
│  하단 UI (480×30): 미니맵 토글 / 퀵 메뉴        │
└──────────────────────────────────────────────────┘
```

### 5.2 전투 화면 (480×270)

```
┌──────────────────────────────────────────────────┐
│  전투 배경 이미지 (480×150)                      │
│  ┌────────┐                     ┌────────┐       │
│  │적 몬스터│ ← 64px 소스        │적 HP바 │       │
│  │120×120 │   1.875x 스케일     └────────┘       │
│  └────────┘                                      │
│                        ┌────────┐                │
│       ┌────────┐       │아군HP바│                │
│       │아군 몬스│       └────────┘                │
│       │120×120 │                                 │
│       └────────┘                                 │
├──────────────────────────────────────────────────┤
│  메시지 박스 (480×40)                            │
│  "야생 엠버냥이 나타났다!"                       │
├──────────────────────────────────────────────────┤
│  명령 메뉴 (480×80)                              │
│  ┌──────┬──────┬──────┬──────┐                   │
│  │ 공격 │ 교체 │ 가방 │ 도주 │                   │
│  └──────┴──────┴──────┴──────┘                   │
└──────────────────────────────────────────────────┘
```

### 5.3 메뉴 화면 (480×270)

```
┌──────────────────────────────────────────────────┐
│  상단 바 (480×24): 이름 / 인장 / 골드            │
├────────────┬─────────────────────────────────────┤
│            │                                     │
│  좌측 메뉴 │          우측 상세                   │
│  (120×246) │          (360×246)                   │
│            │                                     │
│  ▶ 파티   │  파티 몬스터 6슬롯                   │
│    가방    │  각 슬롯: 아이콘 + 이름 + HP바      │
│    도감    │                                     │
│    업적    │                                     │
│    저장    │                                     │
│    설정    │                                     │
│            │                                     │
└────────────┴─────────────────────────────────────┘
```

---

## 6. 코드 구현

### 6.1 렌더링 파이프라인

```javascript
// renderer.js
const INTERNAL_W = 480;
const INTERNAL_H = 270;

const gameCanvas = document.createElement('canvas');
gameCanvas.width = INTERNAL_W;
gameCanvas.height = INTERNAL_H;
const gameCtx = gameCanvas.getContext('2d');
gameCtx.imageSmoothingEnabled = false;

const displayCanvas = document.getElementById('game');
const displayCtx = displayCanvas.getContext('2d');
displayCtx.imageSmoothingEnabled = false;

let currentScale = 4;

function resize() {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  currentScale = Math.max(1, Math.min(
    Math.floor(vw / INTERNAL_W),
    Math.floor(vh / INTERNAL_H)
  ));

  displayCanvas.width = INTERNAL_W * currentScale;
  displayCanvas.height = INTERNAL_H * currentScale;
  displayCanvas.style.position = 'absolute';
  displayCanvas.style.left = `${(vw - displayCanvas.width) / 2}px`;
  displayCanvas.style.top = `${(vh - displayCanvas.height) / 2}px`;

  displayCtx.imageSmoothingEnabled = false;
}

function render() {
  gameCtx.clearRect(0, 0, INTERNAL_W, INTERNAL_H);

  // 1) 내부 캔버스에 480×270 기준으로 렌더
  renderWorld(gameCtx);   // 타일맵 + 캐릭터
  renderUI(gameCtx);      // HUD, 대화창

  // 2) 디스플레이 캔버스에 정수배 스케일 복사
  displayCtx.drawImage(gameCanvas, 0, 0,
    displayCanvas.width, displayCanvas.height);

  requestAnimationFrame(render);
}

window.addEventListener('resize', resize);
resize();
render();
```

### 6.2 CSS

```css
* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  background: #000;
  overflow: hidden;
  width: 100vw;
  height: 100vh;
}

canvas#game {
  image-rendering: pixelated;
  image-rendering: crisp-edges;
  -ms-interpolation-mode: nearest-neighbor;
}
```

### 6.3 타일맵 렌더링 (내부 캔버스 기준)

```javascript
// tilemap-engine.js
const TILE_SIZE = 16; // 소스 타일 크기
const VIEWPORT_TILES_X = 30; // 480 / 16
const VIEWPORT_TILES_Y = 15; // 240 / 16 (하단 30px UI 제외)

function renderTilemap(ctx, camera, tilemap, tilesetImage) {
  const startX = Math.floor(camera.x / TILE_SIZE);
  const startY = Math.floor(camera.y / TILE_SIZE);
  const offsetX = -(camera.x % TILE_SIZE);
  const offsetY = -(camera.y % TILE_SIZE);

  for (let y = 0; y <= VIEWPORT_TILES_Y; y++) {
    for (let x = 0; x <= VIEWPORT_TILES_X; x++) {
      const tileIndex = getTile(tilemap, startX + x, startY + y);
      const srcX = (tileIndex % 16) * TILE_SIZE;
      const srcY = Math.floor(tileIndex / 16) * TILE_SIZE;

      ctx.drawImage(tilesetImage,
        srcX, srcY, TILE_SIZE, TILE_SIZE,
        offsetX + x * TILE_SIZE,
        offsetY + y * TILE_SIZE,
        TILE_SIZE, TILE_SIZE
      );
    }
  }
}
```

### 6.4 캐릭터 렌더링

```javascript
// map-ui.js
const CHAR_SIZE = 32; // 소스 캐릭터 크기 (32×32 생성)
const CHAR_DISPLAY = 32; // 캔버스 위 표시 크기

function renderPlayer(ctx, player, camera) {
  const screenX = player.x - camera.x - CHAR_DISPLAY / 2;
  const screenY = player.y - camera.y - CHAR_DISPLAY / 2;

  ctx.drawImage(player.spriteSheet,
    player.frameX * CHAR_SIZE,
    player.direction * CHAR_SIZE,
    CHAR_SIZE, CHAR_SIZE,
    screenX, screenY,
    CHAR_DISPLAY, CHAR_DISPLAY
  );
}
```

### 6.5 입력 좌표 변환

```javascript
// input.js
function screenToGame(screenX, screenY) {
  const rect = displayCanvas.getBoundingClientRect();
  return {
    x: Math.floor((screenX - rect.left) / currentScale),
    y: Math.floor((screenY - rect.top) / currentScale)
  };
}

displayCanvas.addEventListener('click', (e) => {
  const pos = screenToGame(e.clientX, e.clientY);
  handleClick(pos.x, pos.y); // 480×270 좌표계에서 처리
});
```

---

## 7. 기존 계획 대비 변경사항

| 항목 | 기존 계획 | 변경 |
|---|---|---|
| 캔버스 크기 | 800×600 고정 | **480×270 내부 + 정수배 스케일** |
| TILE_SCALE | 3 (16px→48px) | **제거** (내부 1:1, 디스플레이에서 스케일) |
| 타일 렌더 | 16px × 3 = 48px | **16px (내부) → 64px (FHD 4x)** |
| 캐릭터 렌더 | 48px 고정 | **32px (내부) → 128px (FHD 4x)** |
| 전투 배경 | 320×240 | **480×270** (내부 해상도 동일) |
| 좌표계 | 800×600 기준 | **480×270 기준** (모든 로직) |
| 반응형 | 없음 | **정수배 스케일 + letterbox** |
| 모바일 | 미지원 | **×1~×2 스케일로 대응** |

---

## 8. PixelLab 프롬프트 수정사항

기존 프롬프트 가이드에서 해상도/스타일 파라미터 변경:

### 8.1 타일셋 (변경 없음)

```json
{
  "tile_size": { "width": 16, "height": 16 },
  "view": "high top-down",
  "outline": "single color black outline",
  "shading": "minimal shading",
  "detail": "low detail"
}
```

### 8.2 필드 캐릭터 (48px → 32px)

```json
{
  "endpoint": "create-character-with-4-directions",
  "image_size": { "width": 32, "height": 32 },
  "view": "low top-down",
  "outline": "single color black outline",
  "shading": "minimal shading",
  "detail": "low detail"
}
```

프롬프트 접미사 변경:
```
기존: "48px, GBA pokemon style"
변경: "32x32 pixel sprite, pokemon gold silver GBC style, 4-color palette,
       2-head-tall chibi, 1px black outline, minimal shading, low detail,
       large simple shapes, transparent background"
```

### 8.3 전투 몬스터 (56px → 64px)

```json
{
  "endpoint": "create-image-pixflux",
  "image_size": { "width": 64, "height": 64 },
  "no_background": true,
  "outline": "single color black outline",
  "shading": "basic shading",
  "detail": "low detail"
}
```

### 8.4 전투 배경 (320×240 → 480×270)

```json
{
  "endpoint": "create-image-pixflux",
  "image_size": { "width": 480, "height": 270 },
  "detail": "medium detail",
  "shading": "basic shading"
}
```

### 8.5 맵 오브젝트 (최소 32px)

```json
{
  "endpoint": "map-objects",
  "image_size": { "width": 32, "height": 32 },
  "view": "high top-down",
  "outline": "single color black outline",
  "shading": "minimal shading",
  "detail": "low detail"
}
```

| 오브젝트 | 생성 크기 | 비고 |
|---|---|---|
| 나무 | 32×48 | API 최소 너비 32 |
| 소나무 | 32×48 | |
| 집 | 64×64 | 2×2 타일 블록 |
| 상점 | 64×64 | |
| 치유소 | 64×64 | |
| 체육관 | 64×64 | |
| 풀숲 | 32×32 | 타일 반복으로 영역 채움 |
| 바위 | 32×32 | |
| 표지판 | 32×32 | |
| 동굴입구 | 32×48 | |
| 울타리 | 32×32 | 수평 반복 배치 |
| 꽃밭 | 32×32 | |
| 가로등 | 32×48 | |
| 우물 | 32×32 | |
| 동상 | 32×48 | |

### 8.6 4색 팔레트 강제 적용

모든 캐릭터/몬스터 생성 시 `color_image` + `force_colors` 추가:

```json
{
  "color_image": {
    "type": "base64",
    "base64": "<4색 팔레트 스와치 PNG의 base64>",
    "format": "png"
  },
  "force_colors": true
}
```

카테고리별 팔레트:
```
주인공:    #181818, #884400, #DD8800, #FFDD88
라이벌:    #181818, #882222, #CC4444, #FFAAAA
NPC 남:    #181818, #335588, #5588BB, #AACCEE
NPC 여:    #181818, #884466, #CC6688, #FFAACC
황혼결사:  #181818, #222222, #444444, #888888
화염 몬스터: #181818, #882200, #DD4400, #FFAA44
해류 몬스터: #181818, #224488, #4488CC, #88CCFF
자연 몬스터: #181818, #226622, #44AA44, #88DD88
```

---

## 9. 성능 고려사항

### 9.1 오프스크린 캔버스

모든 게임 로직은 480×270 오프스크린 캔버스에서 처리.
디스플레이 캔버스로의 복사는 단일 `drawImage()` 호출.
GPU가 스케일링 처리 → CPU 부담 최소.

### 9.2 타일맵 캐싱

카메라가 이동하지 않으면 타일맵 재렌더 스킵.
더티 플래그로 변경된 영역만 다시 그림.

### 9.3 번들 크기

에셋 개별 크기 감소 (48px → 32px, 128px → 64px).
총 에셋 수 증가하더라도 총량은 비슷하거나 감소.
16px 타일셋은 스프라이트시트 1장에 16종 = 64×64 PNG 1개.

---

## 10. 구현 순서

1. **renderer.js**: 오프스크린 + 디스플레이 이중 캔버스 구조
2. **resize 로직**: 정수배 스케일 + letterbox
3. **좌표계 전환**: 모든 게임 로직을 480×270 기준으로 수정
4. **입력 변환**: 스크린 좌표 → 게임 좌표 매핑
5. **PixelLab 에셋 재생성**: 변경된 해상도로 전체 에셋
6. **UI 레이아웃**: 480×270 기준 전투/메뉴/대화 화면

---

*Pocket Kingdom FHD Responsive Design Guide v1.0*
*작성일: 2026-03-28*
