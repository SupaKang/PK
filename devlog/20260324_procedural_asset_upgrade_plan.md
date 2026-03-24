# 프로시저럴 에셋 시스템 고도화 기획안

> 날짜: 2026-03-24
> 목표: SD 없이 순수 프로시저럴 방식으로 GBA 16색 스타일의 전체 게임 에셋 생성

---

## 1. 현황 분석

### 현재 시스템
- `sprite-generator.js` (811줄) — 몬스터 전용 프로시저럴 생성기
- 16x16 그리드 → 64x64 렌더링, 10색 팔레트 매핑
- 10 shape × 10 feature × 색상 조합 = 80가지 고유 조합 (100종 몬스터)
- **장점:** 외곽선 자동 생성, 좌우 대칭, 캐시, front/back/silhouette 3종 지원
- **한계:** shape당 고정 실루엣 → 같은 shape의 몬스터가 색만 다른 수준

### 비어있는 에셋
| 폴더 | 상태 |
|------|------|
| `assets/sprites/` | 비어있음 (런타임 생성) |
| `assets/tiles/` | 비어있음 (맵 타일 없음) |
| `assets/ui/` | 비어있음 (코드 드로잉) |

### 현재 렌더링 방식
- **맵:** `LOCATION_ICONS` 심볼 문자 ('T', 'C', '~' 등) + 색상
- **NPC:** 없음 (텍스트 기반 대화만)
- **아이템:** 없음 (텍스트 목록)
- **UI:** 5x7 비트맵 폰트, 코드 드로잉 프레임

---

## 2. 목표 스펙 (GBA 16색 스타일)

### 레퍼런스
- GBA 포켓몬스터 (루비/사파이어/에메랄드) 스타일
- 16x16 기본 단위, 타입별 고정 4색 팔레트 + 공용 4색 = 최대 16색
- 선명한 1px 외곽선, 2단계 음영 (하이라이트/섀도우)

### 에셋 목록

| 카테고리 | 수량 | 그리드 | 렌더 사이즈 | 비고 |
|---------|------|--------|------------|------|
| 몬스터 front | 100 | 32x32 | 64x64 | shape 변형 대폭 확대 |
| 몬스터 back | 100 | 32x32 | 64x64 | front 기반 자동 변환 |
| 몬스터 미니 (필드) | 100 | 16x16 | 32x32 | 파티/도감용 축소판 |
| NPC 스프라이트 | ~30 | 16x24 | 32x48 | 체육관장 8 + 사천왕 4 + 라이벌 + 악당 + 주민 |
| 아이템 아이콘 | 37 | 16x16 | 32x32 | 카테고리별 기본형 + 변형 |
| 맵 타일셋 | 6세트 | 16x16 | 16x16 | town/route/gym/cave/forest/elite |
| 전투 배경 | 6종 | 240x64 | 240x64 | 타일셋과 연동 |
| UI 요소 | ~15 | 다양 | 다양 | 프레임, HP바, 타입 배지 등 |
| **합계** | **~400장** | | | |

---

## 3. 아키텍처 설계

### 3.1 몬스터 스프라이트 고도화

**현재 문제:** shape당 1개의 고정 실루엣
**해결:** 파라메트릭 변형 시스템

```
spriteConfig 확장:
{
  "shape": "quadruped",
  "variant": {         // NEW — shape 내부 변형 파라미터
    "headSize": 0.8,   // 0.5~1.5 (상대적 크기)
    "bodyLength": 1.2,  // 몸통 가로비
    "legLength": 0.7,   // 다리 길이
    "neckLength": 0.3,  // 목 유무/길이
    "tailCurl": 0.5     // 꼬리 곡률
  },
  "features": ["tail", "fangs"],
  "pattern": "stripes", // NEW — 몸체 패턴 (stripes/spots/gradient/solid)
  "baseColor": "#FF6633",
  "accentColor": "#FFAA00"
}
```

**구현 핵심:**
1. **32x32 그리드 확장** — 현재 16x16 → 32x32로 4배 해상도
2. **파라메트릭 body part 조립** — 머리/몸통/팔다리를 독립 생성 후 조립
3. **서브픽셀 셰이딩** — 하이라이트(상단-좌), 섀도우(하단-우) 자동 적용
4. **패턴 오버레이** — stripes/spots/gradient를 body 영역에 적용
5. **진화 연속성** — 같은 계열 몬스터의 variant 파라미터가 점진적 변화

**shape별 파라메트릭 범위:**

| shape | 주요 변형축 | 예상 변형 수 |
|-------|-----------|------------|
| quadruped (32) | headSize, bodyLength, legLength, tailCurl | 충분 |
| bipedal (16) | headSize, armLength, bodyWidth, legStance | 충분 |
| serpent (14) | bodyWidth, coilTightness, headShape | 충분 |
| avian (10) | wingSpan, bodyShape, tailLength, beakSize | 충분 |
| humanoid (7) | bodyBuild, headProportion, limbStyle | 충분 |
| insectoid (7) | segmentCount, legSpread, antennaeStyle | 충분 |
| amorphous (6) | blobCount, symmetry, tendrilCount | 충분 |
| mythical (4) | wingSize, hornStyle, tailType, bodyMass | 충분 |
| aquatic (3) | finCount, bodyElongation, jawSize | 충분 |
| elemental (1) | coreSize, orbitalCount, energyDensity | 충분 |

### 3.2 NPC 스프라이트 생성기 (신규)

```
npcConfig: {
  "role": "gym_leader",     // gym_leader / elite / rival / villain / citizen
  "gender": "male",
  "bodyType": "athletic",   // slim / athletic / large
  "hairStyle": "spiky",     // short / long / spiky / bald
  "hairColor": "#FF4422",
  "outfitColor": "#3399FF",
  "accessory": "cape"       // cape / glasses / hat / mask / none
}
```

**구현:**
- 16x24 그리드 (세로로 긴 인체 비율)
- 머리/몸통/다리 3단 조립
- role별 기본 실루엣 + 색상/악세서리 변형
- 체육관장은 담당 타입 색상 자동 반영

### 3.3 아이템 아이콘 생성기 (신규)

```
카테고리별 기본형:
- healing: 병/약 실루엣 (색상으로 등급 구분)
- capture: 볼 실루엣 (상반구 색상으로 등급 구분)
- battle: 화살표/별 실루엣
- key: 열쇠/배지/특수 아이콘
```

**구현:**
- 16x16 그리드, 카테고리당 2-3개 기본 템플릿
- 색상/크기 변형으로 개별 아이템 구분
- 배지는 타입별 색상 + 심볼 자동 생성

### 3.4 맵 타일셋 생성기 (신규)

```
타일 종류 (16x16 각):
- 바닥: grass / dirt / stone / water / wood / sand / ice / lava
- 장식: tree / bush / rock / flower / sign / lamp
- 구조물: wall / door / roof / fence / bridge
- 특수: gym_floor / cave_wall / elite_floor
```

**구현:**
- 6개 환경별 팔레트 정의
- 자동 타일 연결 (autotile) — 인접 타일 타입에 따라 가장자리 자동 처리
- Wang tile 또는 16-tile bitmasking 방식

**환경 팔레트:**

| 환경 | 주색 | 보조색 | 강조색 | 어두움 |
|------|------|--------|--------|--------|
| town | #44aa66 | #88cc88 | #cc8844 | #336644 |
| route | #66aa44 | #88bb66 | #886644 | #445522 |
| cave | #666688 | #555577 | #8888aa | #333355 |
| gym | 타입색 | 밝은변형 | 골드 | 어두운변형 |
| forest | #338833 | #226622 | #44aa44 | #114411 |
| elite | #332244 | #443355 | #8866cc | #221133 |

### 3.5 전투 배경 생성기 (신규)

- 현재 위치의 맵 타입에 따라 배경 자동 생성
- 하단 1/3 지형 + 상단 2/3 하늘/천장
- 타일셋 팔레트와 동일한 색상 계열
- 패럴랙스 가능하도록 2레이어 (전경/배경)

### 3.6 UI 프레임 생성기 (신규)

- 9-patch 방식의 대화창/메뉴 프레임
- 타입별 색상 배지 (18종)
- HP 바 그라데이션 (녹→황→적)
- 상태이상 아이콘 (poison/burn/paralyze/sleep/freeze)

---

## 4. 구현 순서 (Phase별)

### Phase 1: 몬스터 스프라이트 고도화 ⭐ 최우선
1. 32x32 그리드 확장 + 파라메트릭 body part 시스템
2. `monsters.json`에 variant 파라미터 추가 (100종 전부)
3. 서브픽셀 셰이딩 + 패턴 오버레이
4. 미니 스프라이트 (16x16) 자동 다운스케일
5. 진화 연속성 검증

**예상 작업량:** sprite-generator.js 전면 재작성 (~2000줄 예상)

### Phase 2: 아이템 아이콘
1. 카테고리별 템플릿 정의
2. `item-icon-generator.js` 신규 모듈
3. UI에서 아이콘 표시 연동

**예상 작업량:** ~400줄

### Phase 3: NPC 스프라이트
1. NPC config 데이터 구조 설계
2. `npc-sprite-generator.js` 신규 모듈
3. 체육관장/사천왕/라이벌 등 주요 NPC 설정
4. 대화 UI에 초상화 연동

**예상 작업량:** ~600줄

### Phase 4: 맵 타일셋 + 전투 배경
1. 환경별 타일 팔레트 정의
2. `tileset-generator.js` 신규 모듈 (autotile 포함)
3. `battle-bg-generator.js` 신규 모듈
4. 맵 렌더링 시스템 교체 (심볼 → 타일)

**예상 작업량:** ~1200줄 (가장 큰 작업)

### Phase 5: UI 에셋
1. 9-patch 프레임 생성기
2. 타입 배지, 상태 아이콘
3. 기존 코드 드로잉 UI를 생성된 에셋으로 교체

**예상 작업량:** ~400줄

---

## 5. 기술 핵심

### 팔레트 시스템 통합
모든 생성기가 공유하는 **글로벌 팔레트 매니저**:
- 타입별 4색 팔레트 (18타입 × 4색 = 72색)
- 환경별 4색 팔레트 (6환경 × 4색 = 24색)
- 공용 색상 (외곽선, 눈, 하이라이트, 그림자) = 4색
- **총 16색 이내 제약**: 장면당(몬스터/맵/UI) 16색을 넘지 않도록 팔레트 슬롯 관리

### 결정적 랜덤 (Deterministic)
- 몬스터 ID, 맵 ID 등을 seed로 사용
- 같은 seed → 항상 같은 결과 (세이브/로드 일관성)
- 현재 시스템이 이미 결정적 (`(x * 7 + y * 13) % 5`)

### 성능
- OffscreenCanvas 기반 (현재와 동일)
- 캐시 레이어 유지 (LRU 캐시로 메모리 상한 설정)
- 32x32 → 64x64 업스케일은 nearest-neighbor (픽셀 선명도 유지)

---

## 6. 파일 구조 (예상)

```
src/
  ui/
    sprite-generator.js     ← 전면 재작성 (몬스터)
    npc-sprite-generator.js ← 신규
    item-icon-generator.js  ← 신규
    tileset-generator.js    ← 신규
    battle-bg-generator.js  ← 신규
    ui-asset-generator.js   ← 신규
    palette-manager.js      ← 신규 (글로벌 팔레트)
    renderer.js             ← 에셋 로딩 연동 수정
    battle-ui.js            ← 배경/NPC 초상화 연동
    map-ui.js               ← 타일 렌더링 전환
    dialog-ui.js            ← NPC 초상화 연동
    menu-ui.js              ← 아이템 아이콘 연동
    dex-ui.js               ← 미니 스프라이트 연동
```

---

## 7. 리스크 & 대안

| 리스크 | 대응 |
|--------|------|
| 32x32에서 개성 부족 | variant 파라미터 범위 확대, 패턴 다양화 |
| 맵 타일 autotile 복잡도 | 단순 4방향 → 점진적으로 8방향 확장 |
| 팔레트 16색 제약 내 표현력 | 디더링 패턴으로 중간색 시뮬레이션 |
| 전체 작업량 과다 | Phase 1(몬스터) 우선 완성 후 점진 확장 |
| NPC 인체 비율 어색함 | SD chibi 비율 (2등신) 채택으로 단순화 |

---

## 8. 결론

SD 없이 프로시저럴 방식이 이 프로젝트에 최적인 이유:
1. **비용 $0** — GPU/API 비용 없음
2. **런타임 생성** — 번들 크기 최소, 동적 변형 가능
3. **스타일 완벽 통제** — GBA 16색 규격 정확히 준수
4. **일관성** — 모든 에셋이 같은 팔레트/규칙 공유
5. **확장성** — 새 몬스터/아이템 추가 시 config만 추가

Phase 1(몬스터 고도화)부터 시작하면 기존 게임 플로우를 깨지 않으면서 점진적 개선 가능.
