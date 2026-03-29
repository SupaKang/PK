# Pocket Kingdom 에셋 병렬 제작 계획 v2

> 현재 코드베이스 (v5.0) 스토리/맵/UI 구조 반영.
> 맵 타일 + UI 최우선 제작, 나머지 병렬.
> 예상: **~3-3.5시간** (순차 대비 ~50% 단축)

---

## 현재 코드베이스 에셋 요구사항 전수조사

### 맵 구성 (34 tilemaps)

| 유형 | 개수 | 맵 ID | 환경 타일셋 |
|------|------|-------|-------------|
| 마을 | 9 | town_01~09 | 마을(코블스톤+잔디) |
| 도로 | 9 | route_01~09 | 초원, 눈, 화산, 암흑 등 |
| 체육관 | 8 | gym_01~08 | 실내(타입별 바닥) |
| 동굴 | 2 | cave_01~02 | 동굴(회색석재+어둠) |
| 숲 | 1 | forest_01 | 숲(짙은 녹색) |
| 특수 | 3 | shadow_base, elite_four, (chaos_citadel) | 마왕성/암흑 |
| **합계** | **34** | | |

**맵별 환경 매핑** (스토리 기반):

```
town_01 시작의 마을      → 마을 타일 (따뜻한 크림/갈색)
route_01 1번 도로        → 초원 타일 (밝은 초록)
town_02 화염도시         → 마을 + 화산 악센트
gym_01 화염 수호자 전당  → 실내 화염 (붉은 석재)
route_02 2번 도로        → 초원 → 산악 전환
cave_01 바위동굴         → 동굴 (짙은 회색)
town_03 해류항           → 마을 + 해안 타일
gym_02 해류 수호자 전당  → 실내 해류 (청색 석재)
route_03 3번 도로        → 해안 타일 (모래+물)
town_04 전격시티         → 마을 + 금속 악센트
gym_03 전격 수호자 전당  → 실내 전격 (금속 바닥)
route_04 4번 도로        → 숲 전환 지대
forest_01 수수께끼의 숲  → 숲 타일 (짙은 녹색)
town_05 자연마을         → 마을 + 자연 악센트
gym_04 자연 수호자 전당  → 실내 자연 (나무 바닥)
route_05 5번 도로        → 산악/사막 지대
town_06 투지시티         → 마을 + 투기장 악센트
gym_05 투지 수호자 전당  → 실내 투지 (도장 바닥)
route_06 6번 도로        → 눈 타일 전환
cave_02 빙하동굴         → 빙하 동굴 (청백색)
town_07 빙결마을         → 마을 + 눈 악센트
gym_06 빙결 수호자 전당  → 실내 빙결 (얼음 바닥)
route_07 7번 도로        → 용린 고원 (짙은 녹/보라)
town_08 용린시티         → 마을 + 용린 악센트
gym_07 용린 수호자 전당  → 실내 용린 (비늘 바닥)
route_08 8번 도로        → 암흑 지대 전환
shadow_base 그림자 비밀기지 → 마왕성 타일 (어둠)
town_09 암흑성채         → 마왕성 타일 (짙은 보라)
gym_08 암흑 수호자 전당  → 실내 암흑 (검은 석재)
route_09 챔피언 로드     → 마왕성 외곽 타일
elite_four 마왕성        → 마왕성 내부 (옥좌)
```

### UI 스크린 (10종) — 전체 목록

| # | 스크린 | 소스 파일 | 현재 상태 | 필요 에셋 |
|---|--------|-----------|-----------|-----------|
| 1 | **타이틀** | main.js `_renderTitle()` | 코드 렌더링 | 타이틀 로고, 별 배경 패턴 |
| 2 | **맵/필드** | map-ui.js | 코드+타일셋 | 타일셋 이미지, 오브젝트 스프라이트 |
| 3 | **전투** | battle-ui.js | 코드 렌더링 | 전투 배경, HP바 프레임, 메뉴 프레임, 메시지 박스 |
| 4 | **파티 메뉴** | menu-ui.js | 코드 렌더링 | 메뉴 프레임, 슬롯 배경 |
| 5 | **대화** | dialog-ui.js | 코드 렌더링 | 대화창 프레임, 화자명 프레임 |
| 6 | **상점** | main.js `_renderShop()` | 코드 렌더링 | 상점 프레임, 탭 UI, 골드 아이콘 |
| 7 | **인벤토리** | main.js `_renderInventory()` | 코드 렌더링 | 인벤토리 프레임, 카테고리 탭, 아이템 아이콘 |
| 8 | **도감** | dex-ui.js | 코드 렌더링 | 도감 프레임, 스크롤바, 스탯 바 |
| 9 | **세이브** | main.js `_renderSaveMenu()` | 코드 렌더링 | 세이브 슬롯 프레임 |
| 10 | **로딩** | main.js `_renderLoading()` | 텍스트만 | 로딩 스피너/프로그레스 바 |

### 현재 코드에서 쓰는 Wang 타일셋

```javascript
// tilemap-engine.js
TILESET_MAPPING = {
  grass_dirt:  { lower: GRASS, upper: DIRT },
  grass_water: { lower: GRASS, upper: WATER },
  dirt_stone:  { lower: DIRT,  upper: STONE },
};
```

→ 현재 3종만 정의. 스토리 환경에 비해 **턱없이 부족**. 최소 12종으로 확장 필요.

---

## 제작 에셋 총 목록 (확장)

| 카테고리 | 기존 계획 | 확장 후 | 변경 사유 |
|----------|-----------|---------|-----------|
| 앵커 | 6장 | 6장 | 동일 |
| 팔레트 | 16+8+3 | 16+12+3 | 환경 4종 추가 (체육관 내부 타입별) |
| **타일셋** | **12종** | **20종** | 체육관 내부 8종 + 기존 12종 |
| 캐릭터 | 15종 | 15종 | 동일 |
| 크리처 | 102종 | 102종 | 동일 |
| **맵 오브젝트** | **20종** | **28종** | 체육관/마왕성 전용 오브젝트 8종 추가 |
| 아이템+인장 | 42+8 | 42+8 | 동일 |
| **전투 배경** | **8종** | **10종** | 체육관 내부 + 마왕성 보스 추가 |
| **UI 프레임** | **4종** | **18종** | 전체 10스크린 커버 |
| 이펙트+상태 | 8+6 | 8+6 | 동일 |
| **공통 UI 요소** | **0** | **12종** | 비트맵 폰트, 커서, 아이콘 등 신규 |

### UI 에셋 상세 목록 (신규 추가)

#### UI 프레임 (18종)

```
기존 4종:
  UI01  HP바 프레임          120×32
  UI02  전투 메시지 박스      480×40
  UI03  전투 스킬 메뉴        240×80
  UI04  대화창 프레임         480×60

신규 14종:
  UI05  전투 액션 메뉴        240×80   (FIGHT/BAG/SWAP/RUN 4칸)
  UI06  전투 아이템 목록      200×80   (가방 선택 시)
  UI07  전투 교체 목록        200×120  (교체 선택 시)
  UI08  파티 메뉴 프레임      480×270  (전체 화면)
  UI09  파티 슬롯 배경        460×40   (파티원 1칸)
  UI10  상점 프레임           480×270  (전체 화면)
  UI11  상점 탭 (BUY/SELL)   240×24   (탭 2개)
  UI12  인벤토리 프레임       480×270  (전체 화면)
  UI13  인벤토리 카테고리탭   120×24   (탭 4개)
  UI14  도감 프레임           480×270  (전체 화면)
  UI15  도감 스탯 바          100×8    (6개 스탯)
  UI16  세이브 슬롯 프레임    460×60   (3칸)
  UI17  타이틀 로고           320×80   "POCKET KINGDOM" 픽셀 로고
  UI18  로딩 프로그레스 바    200×16
```

#### 공통 UI 요소 (12종)

```
  UC01  커서 삼각형 (▶)       8×8     깜빡임 2프레임
  UC02  타입 뱃지 배경        32×12   16타입 × 1 (색만 변경)
  UC03  골드 아이콘           16×16
  UC04  스크롤 화살표 ▲▼     8×8     2장
  UC05  EXP 바 프레임         100×4
  UC06  터치 D-pad 스킨       80×80   가상 패드
  UC07  터치 A버튼            32×32
  UC08  터치 B버튼            32×32
  UC09  별 파티클 (타이틀)    4×4     3단계 밝기
  UC10  전투 플랫폼           120×30  아군/적군 발판
  UC11  마석 이펙트           32×32   4프레임 (포획 연출)
  UC12  상태이상 오버레이     16×16   화상/독/마비/수면/혼란/빙결 아이콘
```

### 추가 타일셋 (체육관 내부 8종)

```
기존 12종에 추가:
  T13  체육관 화염 내부    dark red stone floor / lava vent tile
  T14  체육관 해류 내부    blue tile floor / water channel
  T15  체육관 전격 내부    metallic grid floor / tesla coil base
  T16  체육관 자연 내부    wooden planks floor / vine wall
  T17  체육관 투지 내부    dojo mat floor / stone pillar base
  T18  체육관 빙결 내부    ice crystal floor / frosted stone
  T19  체육관 용린 내부    ancient dragon scale floor / obsidian pillar
  T20  체육관 암흑 내부    void stone floor / dark crystal surface
```

### 추가 맵 오브젝트 (8종)

```
기존 20종에 추가:
  O21  체육관 입구 게이트   64×64   guardian gym entrance with type emblem
  O22  수호자 배틀 대        32×32   battle arena center mark
  O23  마왕성 기둥           32×64   dark pillar with torch
  O24  마왕성 옥좌           64×64   demon king throne
  O25  마석 제단             32×48   magic stone altar with glow
  O26  치유 분수             32×48   healing fountain with sparkle
  O27  NPC 집 변형2          64×64   town house with green roof
  O28  항구 배               64×32   small harbor boat
```

---

## 병렬 제작 타임라인

### 우선순위 재배치: 타일 + UI 먼저

```
LAYER 0 ─── 앵커 수작업 (30분)
    │
LAYER 1 ─── 팔레트 자동생성 (5분)
    │
    ├── WAVE 1 (최우선) ─── 타일셋 20종 + UI 30종 + 공통 UI 12종
    │
    ├── WAVE 2 (병렬) ──── 캐릭터 15종 + 스타터 9종 + 오브젝트 28종
    │                       + 아이템 50종 + 전투배경 10종 + 이펙트 14종
    │
    └── WAVE 3 (게이트) ── 일반 크리처 83종 + 전설 10종
         │
    LAYER QA ─── QA → 리젝 재생성 → 매니페스트
```

---

## LAYER 0 — 앵커 수작업 (블로킹)

| 산출물 | 스펙 | 용도 |
|--------|------|------|
| `anchor_warm.png` | 64×64, 4색 | 화염 크리처 스타일 기준 |
| `anchor_cool.png` | 64×64, 4색 | 해류 크리처 스타일 기준 |
| `anchor_neutral.png` | 64×64, 4색 | 무속성 크리처 스타일 기준 |
| `anchor_tile.png` | 16×16, 4색 | 타일 스타일 기준 |
| `anchor_item.png` | 32×32, 4색 | 아이템 아이콘 스타일 기준 |
| `anchor_char.png` | 32×32, 4색 | 필드 캐릭터 스타일 기준 |

**게이트**: 6장 확정 → LAYER 1.
**소요**: 30~60분.

---

## LAYER 1 — 팔레트 생성 (자동 ~5분)

```bash
python generate_palettes.py --from-hints
```

크리처 16타입 + 환경 12종 + UI 3종 = 31 팔레트.
**게이트**: 팔레트 확정 → WAVE 1 + WAVE 2 동시 시작.

---

## WAVE 1 — 타일셋 + UI (최우선, 병렬 3트랙)

> LAYER 1 완료 즉시 시작. 게임 화면 레이아웃 확정의 핵심.

### TRACK 1A — 타일셋 20종

```
API: create_topdown_tileset (MCP)
Style ref: anchor_tile.png
Seeds: 2/종
Output: assets/tiles/candidates/
```

| ID | 이름 | lower | upper | 환경 | 체인 |
|----|------|-------|-------|------|------|
| T01 | 초원↔흙길 | green grass | dirt path | 초원 | — |
| T02 | 흙길↔석재 | dirt path | grey stone | 동굴 | T01→ |
| T03 | 바다↔모래 | ocean water | sandy beach | 해안 | — |
| T04 | 모래↔잔디 | sandy beach | green grass | 해안 | T03→ |
| T05 | 숲바닥↔풀 | forest floor | thick grass | 숲 | T01→ |
| T06 | 눈↔얼음 | snow ground | frozen ice | 눈 | — |
| T07 | 화산↔용암 | volcanic rock | cooled lava | 화산 | — |
| T08 | 동굴↔벽 | cave floor | cave wall | 동굴 | T02→ |
| T09 | 마을↔잔디 | cobblestone | grass lawn | 마을 | T01← |
| T10 | 늪↔진흙 | swamp water | muddy marsh | 습지 | — |
| T11 | 수정동굴 | crystal floor | luminescent | 동굴 | T08→ |
| T12 | 마왕성 | corrupted stone | obsidian+red | 마왕성 | — |
| T13 | 체육관 화염 | dark red stone | lava vent | 실내 | — |
| T14 | 체육관 해류 | blue tile | water channel | 실내 | — |
| T15 | 체육관 전격 | metallic grid | tesla base | 실내 | — |
| T16 | 체육관 자연 | wooden plank | vine wall | 실내 | — |
| T17 | 체육관 투지 | dojo mat | stone pillar | 실내 | — |
| T18 | 체육관 빙결 | ice crystal | frosted stone | 실내 | — |
| T19 | 체육관 용린 | dragon scale | obsidian | 실내 | — |
| T20 | 체육관 암흑 | void stone | dark crystal | 실내 | — |

**API calls**: 20종 × 2 seed = **40 calls**
**소요**: ~15분 생성 + 15분 리뷰

### TRACK 1B — UI 프레임 18종

```
API: create_image_pixflux 또는 generate_with_style_v2
Style ref: anchor_tile.png (프레임 테마 통일)
Seeds: 2~3/종
Output: assets/ui/candidates/
```

**전투 UI** (5종):
| ID | 이름 | 크기 | 프롬프트 |
|----|------|------|----------|
| UI01 | HP바 프레임 | 120×32 | pixel RPG HP bar frame with name plate, stone border, GBC |
| UI02 | 전투 메시지 박스 | 480×40 | pixel RPG text box, dark stone border, flat interior, GBC |
| UI03 | 전투 스킬 메뉴 | 240×80 | pixel RPG 4-slot skill grid, stone frame with dividers, GBC |
| UI04 | 전투 액션 메뉴 | 240×80 | pixel RPG 4-slot action menu (fight/bag/swap/run), stone frame, GBC |
| UI05 | 전투 아이템/교체 목록 | 200×120 | pixel RPG list panel, dark border, scroll area, GBC |

**대화/공통 UI** (3종):
| ID | 이름 | 크기 | 프롬프트 |
|----|------|------|----------|
| UI06 | 대화창 프레임 | 480×60 | pixel RPG dialog box with speaker name area, dark border, GBC |
| UI07 | 파티 슬롯 배경 | 460×40 | pixel RPG party member slot, dark panel with border, GBC |
| UI08 | 세이브 슬롯 프레임 | 460×60 | pixel RPG save slot frame with data area, stone border, GBC |

**전체 스크린 프레임** (6종):
| ID | 이름 | 크기 | 프롬프트 |
|----|------|------|----------|
| UI09 | 파티 메뉴 프레임 | 480×270 | pixel RPG party screen frame, dark blue panel, 6 slots, GBC |
| UI10 | 상점 프레임 | 480×270 | pixel RPG shop screen, buy/sell tabs, gold display, GBC |
| UI11 | 인벤토리 프레임 | 480×270 | pixel RPG inventory screen, 4 category tabs, item list, GBC |
| UI12 | 도감 프레임 | 480×270 | pixel RPG encyclopedia screen, left list + right detail, GBC |
| UI13 | 로딩 화면 | 480×270 | pixel RPG loading screen with progress bar area, dark, GBC |
| UI14 | 타이틀 배경 | 480×270 | pixel RPG title screen starfield background, dark blue night, GBC |

**브랜딩** (2종):
| ID | 이름 | 크기 | 프롬프트 |
|----|------|------|----------|
| UI17 | 타이틀 로고 | 320×80 | pixel art game logo "POCKET KINGDOM", gold/white, GBC style |
| UI18 | 로딩 프로그레스 바 | 200×16 | pixel RPG loading bar frame, stone border, GBC |

**상점/인벤토리 탭** (2종):
| ID | 이름 | 크기 | 프롬프트 |
|----|------|------|----------|
| UI15 | 상점 탭 (BUY/SELL) | 240×24 | pixel RPG tab buttons, stone style, active highlight, GBC |
| UI16 | 인벤토리 카테고리 탭 | 120×24 | pixel RPG 4 small tabs, icon based, GBC |

**API calls**: 18종 × 3 seed = **54 calls**
**소요**: ~15분 생성 + 20분 리뷰

### TRACK 1C — 공통 UI 요소 12종

```
API: create_image_pixflux
Seeds: 2/종
Output: assets/ui/common/candidates/
```

| ID | 이름 | 크기 | 설명 |
|----|------|------|------|
| UC01 | 커서 ▶ | 8×8 | 삼각형 커서, 2프레임 (on/off) |
| UC02 | 타입 뱃지 배경 | 32×12 | 둥근 사각형, 색상 오버레이용 |
| UC03 | 골드 아이콘 | 16×16 | 금화 아이콘 |
| UC04 | 스크롤 화살표 | 8×8 | ▲▼ 2장 |
| UC05 | EXP 바 프레임 | 100×4 | 경험치 바 |
| UC06 | 터치 D-pad | 80×80 | 가상 십자키 |
| UC07 | 터치 A버튼 | 32×32 | 빨간 원형 |
| UC08 | 터치 B버튼 | 32×32 | 파란 원형 |
| UC09 | 별 파티클 | 4×4 | 타이틀 별, 3단계 밝기 |
| UC10 | 전투 플랫폼 | 120×30 | 아군/적군 발판 타원 |
| UC11 | 마석 이펙트 | 32×32 | 포획 연출 4프레임 |
| UC12 | 상태 오버레이 | 16×16 | 6종 (화상/독/마비/수면/혼란/빙결) |

**API calls**: 12종 × 2 seed = **24 calls**
**소요**: ~8분 생성 + 10분 리뷰

### WAVE 1 합계

```
TRACK 1A (타일 20종):   40 calls  ──┐
TRACK 1B (UI 18종):     54 calls  ──┼── 동시 실행, ~30분
TRACK 1C (공통UI 12종): 24 calls  ──┘
합계: 118 calls
```

---

## WAVE 2 — 나머지 에셋 (6트랙 병렬)

> WAVE 1과 **동시 시작** 가능. 독립 트랙.
> 단, 스타터 크리처(Track 2B)는 WAVE 3의 게이트.

### TRACK 2A — 캐릭터 15종 + walk 애니

```
API: create_character + animate_character (MCP)
Style ref: anchor_char.png
Seeds: 2/종
Output: assets/characters/candidates/
```

스토리 반영 NPC 매핑:

| ID | 이름 | 등장 맵 | 스토리 역할 |
|----|------|---------|------------|
| C01 | 주인공 전사 | 전체 | 플레이어 (빨간 모자) |
| C02 | 주인공 마법사 | 전체 | 플레이어 대안 클래스 |
| C03 | 주인공 궁수 | 전체 | 플레이어 대안 클래스 |
| C04 | 주인공 성직자 | 전체 | 플레이어 대안 클래스 |
| C05 | 주인공 암흑기사 | 전체 | 플레이어 대안 클래스 |
| C06 | 라이벌 은하 | ch1~8 | 스파이크 은발, 파란 자켓 |
| C07 | 할아버지 | ch0, town_01 | 서사 도입 |
| C08 | 상점 NPC | 전 마을 | 상점 운영 |
| C09 | 치유사 NPC | 전 마을 | 치유소 운영 |
| C10 | 황혼의 사도 | ch2~7 | 짙은 보라 로브, 가면 |
| C11 | 흑아 쿠로가 | ch4, route_05 | 검은 코트, 붉은 스카프 |
| C12 | 현월 루나르 | ch6, cave_02 | 초승달 가면, 은발 |
| C13 | 겁화 이그니온 | ch7, shadow_base | 짙은 진홍 갑옷, 최종간부 |
| C14 | 마을 주민 남 | 전 마을 | 일반 NPC |
| C15 | 마을 주민 여 | 전 마을 | 일반 NPC |

**API calls**: 30 (생성) + 15 (animate) = **45 calls**
**소요**: ~15분 생성 + 15분 리뷰

### TRACK 2B — 스타터 크리처 9종 ★ 크리티컬 패스

```
API: generate_with_style_v2
Style ref: anchor_warm/cool/neutral.png
Seeds: 3/종
Output: assets/creatures/candidates/phase2/
```

3개 진화 체인 **동시** 실행 (체인 내 순차):
```
화염: 신더(1) → 이그니온(2) → 이프리트(3)
해류: 아쿠아젤(4) → 토렌트(5) → 리바이어선(6)
자연: 시드링(7) → 트렌트(8) → 엘더 트렌트(9)
```

**API calls**: 9종 × 3 seed = **27 calls**
**소요**: ~10분 생성 + 15분 리뷰
**게이트**: 확정 후 → WAVE 3

### TRACK 2C — 맵 오브젝트 28종

```
API: create_map_object (MCP)
Style ref: anchor_tile.png
Seeds: 2/종
Output: assets/objects/candidates/
```

기존 20종 + 신규 8종 (체육관/마왕성 전용):

| 신규 | 이름 | 크기 | 등장 맵 |
|------|------|------|---------|
| O21 | 체육관 게이트 | 64×64 | gym_01~08 |
| O22 | 배틀 대 | 32×32 | gym_01~08 |
| O23 | 마왕성 기둥 | 32×64 | shadow_base, elite_four |
| O24 | 마왕성 옥좌 | 64×64 | elite_four |
| O25 | 마석 제단 | 32×48 | cave_01, cave_02 |
| O26 | 치유 분수 | 32×48 | 전 마을 |
| O27 | 주택 변형2 | 64×64 | 전 마을 |
| O28 | 항구 배 | 64×32 | town_03 해류항 |

**API calls**: 28종 × 2 seed = **56 calls**
**소요**: ~12분 생성 + 12분 리뷰

### TRACK 2D — 아이템 42종 + 인장 8종

```
API: generate_with_style_v2 (배치) 또는 create_image_pixflux (개별)
Style ref: anchor_item.png
Seeds: 2/종
Output: assets/items/candidates/
```

인장은 스토리 체육관 순서와 매핑:
| 인장 | 체육관 | 챕터 |
|------|--------|------|
| B01 화련의 인장 | gym_01 화염 | ch1 |
| B02 암괴의 인장 | gym_02 해류 | ch2 (대지→해류로 변경) |
| B03 조류의 인장 | gym_03 전격 | ch3 |
| B04 뇌광의 인장 | gym_04 자연 | ch4 |
| B05 쟁투의 인장 | gym_05 투지 | ch5 |
| B06 상화의 인장 | gym_06 빙결 | ch6 |
| B07 고룡의 인장 | gym_07 용린 | ch6 |
| B08 성운의 인장 | gym_08 암흑 | ch8 |

**API calls**: 84 (아이템) + 16 (인장) = **100 calls**
**소요**: ~18분 생성 + 15분 리뷰

### TRACK 2E — 전투 배경 10종

```
API: create_image_pixflux
Seeds: 3/종
Output: assets/battle_bg/candidates/
```

스토리 환경 매핑:
| ID | 이름 | 사용 맵 | 프롬프트 핵심 |
|----|------|---------|---------------|
| BG01 | 초원 | route_01~02 | green meadow, blue sky, dithered |
| BG02 | 동굴 | cave_01~02 | dark cave, stalactites |
| BG03 | 해안 | route_03, town_03 | seaside cliff, waves |
| BG04 | 마을 | town_01~09 | town street, buildings |
| BG05 | 화산 | gym_01, town_02 | volcanic crater, lava |
| BG06 | 눈 | route_06, cave_02, town_07 | snowy tundra, aurora |
| BG07 | 숲 | forest_01, route_04 | deep forest, tall trees |
| BG08 | 마왕성 | shadow_base, elite_four | dark throne, pillars |
| BG09 | 체육관 내부 | gym_01~08 | arena interior, stone pillars |
| BG10 | 최종보스 | elite_four (champion) | cosmic void, chaos energy |

**API calls**: 10종 × 3 seed = **30 calls**
**소요**: ~10분 생성 + 10분 리뷰

### TRACK 2F — 이펙트 8종 + 상태이상 6종

기존 계획과 동일.

**API calls**: **28 calls**
**소요**: ~10분 생성 + 10분 리뷰

### WAVE 2 합계

```
TRACK 2A (캐릭터):     45 calls  ──┐
TRACK 2B (스타터):     27 calls  ──┤
TRACK 2C (오브젝트):   56 calls  ──┤── 동시 실행, ~30분
TRACK 2D (아이템):    100 calls  ──┤
TRACK 2E (전투배경):   30 calls  ──┤
TRACK 2F (이펙트):     28 calls  ──┘
합계: 286 calls
```

---

## WAVE 3 — 크리처 대량 생성 (4트랙 병렬)

> TRACK 2B (스타터 9종) 확정 후 시작.

### TRACK 3A~3C — 일반 크리처 83종 (3배치 분할)

```
배치 1: id 10~30 (21종, ~7체인) ── 63 calls
배치 2: id 31~60 (30종, ~10체인) ── 90 calls
배치 3: id 61~90 + 101~102 (32종, ~11체인) ── 96 calls
```

진화 체인 간 병렬, 체인 내 순차 (1단→2단→3단).

### TRACK 3D — 전설 크리처 10종

```
id 91~100, text_guidance_scale: 12
진화 없음 → 10종 전부 병렬
50 calls
```

### WAVE 3 합계

```
TRACK 3A: 63 calls  ──┐
TRACK 3B: 90 calls  ──┼── 동시 실행, ~30분 생성 + 60분 리뷰
TRACK 3C: 96 calls  ──┤
TRACK 3D: 50 calls  ──┘
합계: 299 calls
```

---

## LAYER QA — 검증 + 후처리 + 매니페스트

> 모든 WAVE 완료 후 순차.

| 단계 | 작업 | 소요 |
|------|------|------|
| QA | 자동 검증 + 4색 강제 매핑 | ~10분 |
| 리젝 | 리젝 항목 재생성 (최대 3회, ~100 calls) | ~15분 |
| 매니페스트 | confirmed/ 이동 + manifest.json | ~5분 |

---

## 전체 타임라인

```
시간(분)  0     30   35        65             95          155       175  180
          │      │    │         │              │            │         │    │
 LAYER 0  ████████    │         │              │            │         │    │
          앵커       │         │              │            │         │    │
 LAYER 1  ────────██  │         │              │            │         │    │
          팔레트     │         │              │            │         │    │
                     │         │              │            │         │    │
 ═══════ WAVE 1 (최우선) ══════╗              │            │         │    │
 TRACK1A  ───────────██████████║  타일 20종    │            │         │    │
 TRACK1B  ───────────██████████║  UI 18종      │            │         │    │
 TRACK1C  ───────────████████──║  공통UI 12종  │            │         │    │
                     ╚═════════╝              │            │         │    │
 ═══════ WAVE 2 (동시) ═══════╗              │            │         │    │
 TRACK2A  ───────────██████████║  캐릭터 15종  │            │         │    │
 TRACK2B  ───────────████████──║  스타터 9종 ★ │            │         │    │
 TRACK2C  ───────────██████████║  오브젝트 28종│            │         │    │
 TRACK2D  ───────────████████████  아이템 50종 │            │         │    │
 TRACK2E  ───────────████████──║  전투배경 10종│            │         │    │
 TRACK2F  ───────────████████──║  이펙트 14종  │            │         │    │
                     ╚═════════╝              │            │         │    │
 ═══════ WAVE 3 (스타터 확정 후) ═════════════╗            │         │    │
 TRACK3A  ─────────────────────███████████████║ 일반 배치1  │         │    │
 TRACK3B  ─────────────────────███████████████║ 일반 배치2  │         │    │
 TRACK3C  ─────────────────────███████████████║ 일반 배치3  │         │    │
 TRACK3D  ─────────────────────█████████──────║ 전설 10종   │         │    │
                                              ╚════════════╝         │    │
 QA       ──────────────────────────────────────────────────██████████│    │
 매니페스트 ─────────────────────────────────────────────────────────████  │
```

---

## 에이전트 배분 계획

### Phase 1: WAVE 1 + WAVE 2 (동시 7에이전트)

```
Agent 1: TRACK 1A (타일 20종)         ── 40 calls   ★ 최우선
Agent 2: TRACK 1B (UI 18종)           ── 54 calls   ★ 최우선
Agent 3: TRACK 1C (공통UI) + 2F (이펙트) ── 52 calls
Agent 4: TRACK 2A (캐릭터) + 2E (배경) ── 75 calls
Agent 5: TRACK 2B (스타터 크리처)      ── 27 calls   ★ 크리티컬 패스
Agent 6: TRACK 2C (오브젝트)           ── 56 calls
Agent 7: TRACK 2D (아이템+인장)        ── 100 calls
```

### Phase 2: WAVE 3 (스타터 확정 후 4에이전트)

```
Agent 5: TRACK 3A (일반 id 10~30)   ── 63 calls
Agent 8: TRACK 3B (일반 id 31~60)   ── 90 calls
Agent 9: TRACK 3C (일반 id 61~102)  ── 96 calls
Agent 10: TRACK 3D (전설 10종)       ── 50 calls
```

### Phase 3: QA (1에이전트)

```
Agent 11: QA + 리젝 재생성 + 매니페스트 ── ~100 calls
```

---

## 비용 요약

| 구분 | API calls | 비용 |
|------|-----------|------|
| WAVE 1 (타일+UI) | 118 | ~$1.00 |
| WAVE 2 (캐릭/오브젝트/아이템/배경/이펙트) | 286 | ~$2.30 |
| WAVE 3 (크리처 93종) | 299 | ~$2.40 |
| QA 리젝 재생성 | ~100 | ~$0.80 |
| **합계** | **~803** | **~$6.50** |

기존 663 → 803 calls (+21%) 증가 원인: 타일 8종 추가, UI 14종 추가, 공통UI 12종 추가, 오브젝트 8종 추가, 전투배경 2종 추가.

---

## 크리티컬 패스

```
앵커(30분) → 팔레트(5분) → 스타터 9종(25분) → 일반 83종(60분+리뷰) → QA(25분) → 매니페스트(5분)
= ~150분 = 2.5시간 (최적)
= ~180분 = 3시간 (리뷰 포함 현실적)
```

**타일+UI는 크리티컬 패스에 없지만 최우선 배치 이유:**
1. 게임 화면의 기본 프레임을 먼저 확정 → 다른 에셋의 크기/위치/색감 검증 기준
2. UI가 확정되면 코드 통합을 먼저 시작 가능 → 개발과 에셋 제작 병렬화
3. 타일이 확정되면 맵 에디터 작업 즉시 시작 가능

---

*Parallel Production Plan v2.0 — 2026-03-29*
*변경: UI 에셋 전면 추가, 스토리/맵 구성 반영, 타일+UI 최우선 배치*
