# 개발 로그 — 외부 디자인 에셋 통합 계획
- 날짜: 2026-03-24
- 프로젝트: PK (턴제 몬스터배틀 RPG)
- 유형: 계획 (Plan)

## 배경

현재 PK의 모든 그래픽/오디오 에셋은 런타임 프로시저럴 생성 방식이다.
- 몬스터: `sprite-generator.js`가 64x64 픽셀 front/back 스프라이트를 Canvas로 그림
- 맵: `map-ui.js`가 단색/패턴 기반으로 맵 화면을 렌더링
- 오디오: `audio.js`가 Web Audio API로 칩튠 합성

시각적 품질 향상을 위해 외부 무료 에셋으로 전환한다.
혼합 소싱(Mixed Sourcing) 전략을 채택한다.

---

## Phase 1: 에셋 수집 및 정리

### 1-1. 몬스터 스프라이트 수집

| 순서 | 소스 | 용도 | 수량 | 사이즈 | 라이선스 |
|------|------|------|------|--------|----------|
| 1 | Tuxemon Set 1 (OpenGameArt) | 메인 몬스터 | 154종 중 100종 선별 | 64x64 front/back | CC-BY-SA 4.0 |
| 2 | Cyangmou Pixel 50 (itch.io) | 보스/레전더리 보충 | 최대 10종 | 64x64 front | 상업 가능 |
| 3 | Retromon Big Pack 3 (itch.io) | 색상 변형/추가 몬스터 | 최대 32종 | 56x56 → 64x64 리사이즈 | CC-BY |

작업 항목:
- [ ] Tuxemon Set 1 ZIP 다운로드 → 154종 스프라이트 확인
- [ ] PK의 100종 몬스터(`data/monsters.json`)와 Tuxemon 디자인 매핑 테이블 작성
- [ ] 타입/외형 기준으로 1:1 매칭 (화염 → 화염 계열 Tuxemon 등)
- [ ] 매칭 안 되는 종은 Cyangmou/Retromon에서 보충
- [ ] Retromon 56x56 스프라이트 → 64x64 리사이즈 (nearest neighbor 보간)
- [ ] 최종 100종 front/back PNG를 `assets/sprites/monsters/` 하위에 정리
  - 네이밍: `{monster_id}_front.png`, `{monster_id}_back.png`
  - 면 스프라이트: `{monster_id}_face.png` (24x24, Tuxemon 제공분)

### 1-2. 맵 타일셋 수집

| 순서 | 소스 | 용도 | 타일 사이즈 | 라이선스 |
|------|------|------|-------------|----------|
| 1 | Serene Village Revamped (LimeZu) | 타운 건물/지형 | 16x16 | CC-BY 4.0 |
| 2 | Monster Taming Essentials (scarloxy) | 바이옴 타일 (초원/해변/눈/유적/도시) | 16x16 | CC-BY 4.0 |
| 3 | CraftPix Dungeon Tileset | 가디언 던전 | 다양 → 16x16 정규화 | 상업 무제한 |
| 4 | OpenGameArt Hyptosis Pack | 종합 보충 | 다양 | CC-BY 3.0 |

작업 항목:
- [ ] 각 타일셋 다운로드 및 내용물 확인
- [ ] 16x16 기준으로 타일 사이즈 통일 (필요 시 리사이즈)
- [ ] PK 맵 구조와 타일 매핑:
  - 8개 타운 → Serene Village 건물/지형 타일
  - 7개 루트 → Monster Taming Essentials 바이옴별 타일
  - 8개 가디언 던전 → CraftPix 던전 + 테마별 팔레트 스왑
  - 엘리트4/챔피언 → Hyptosis 성/궁전 타일
- [ ] 타일셋을 `assets/tiles/` 하위에 정리
  - `assets/tiles/town/`, `assets/tiles/route/`, `assets/tiles/dungeon/`
- [ ] 각 맵별 타일맵 데이터(JSON) 정의 구조 설계

### 1-3. 배틀 배경/UI 에셋 수집

작업 항목:
- [ ] Monster Taming Essentials의 배틀 배경 3종(640x360) 활용
- [ ] 필요 시 추가 배경 제작 또는 팔레트 스왑으로 변형
- [ ] UI 버튼/프레임 에셋은 기존 Canvas 렌더링 유지 또는 스프라이트 전환 검토

---

## Phase 2: 스프라이트 로더 구현

### 2-1. 이미지 프리로더 모듈 신규 작성

파일: `src/ui/asset-loader.js` (신규)

```
역할:
- 게임 시작 시 모든 스프라이트/타일 PNG를 Image 객체로 프리로드
- 로딩 진행률 표시 (로딩 화면)
- 캐시 맵: { monsterId → { front: Image, back: Image, face: Image } }
- 캐시 맵: { tileId → Image }
```

작업 항목:
- [ ] `asset-loader.js` 작성 — Promise 기반 이미지 로드
- [ ] 로딩 화면 UI 구현 (프로그레스 바)
- [ ] `main.js` 초기화 흐름에 에셋 로딩 단계 삽입

### 2-2. sprite-generator.js 교체/분기

```
현재: sprite-generator.js → Canvas 프로시저럴 생성
변경: asset-loader.js에서 로드한 PNG 사용
폴백: PNG 없으면 기존 프로시저럴 생성 (하위 호환)
```

작업 항목:
- [ ] `sprite-generator.js`에 외부 스프라이트 우선 사용 분기 추가
- [ ] `getMonsterSprite(id, view)` → PNG 있으면 반환, 없으면 프로시저럴 생성
- [ ] 점진적 전환 가능하도록 fallback 유지

---

## Phase 3: 타일맵 렌더러 구현

### 3-1. 타일맵 데이터 구조 설계

```json
// data/tilemaps/{map_id}.json 구조 예시
{
  "width": 50,
  "height": 40,
  "tileSize": 16,
  "layers": [
    { "name": "ground", "data": [1,1,2,3,...] },
    { "name": "objects", "data": [0,0,5,0,...] },
    { "name": "collision", "data": [0,0,1,0,...] }
  ],
  "tileset": "town_01"
}
```

작업 항목:
- [ ] 타일맵 JSON 스키마 정의
- [ ] 25개 맵 각각의 타일맵 데이터 작성 (또는 Tiled 에디터 활용)
- [ ] `data/tilemaps/` 디렉토리 생성

### 3-2. map-ui.js 타일맵 렌더링 추가

작업 항목:
- [ ] `map-ui.js`에 타일 기반 렌더링 로직 추가
- [ ] 레이어별 렌더링 (ground → objects → player)
- [ ] 카메라/뷰포트 시스템 (800x600 화면에 맵 스크롤)
- [ ] 충돌 레이어 처리 (collision data → 이동 불가 타일)
- [ ] 맵 전환 트랜지션 (페이드/와이프)

### 3-3. 플레이어 캐릭터 스프라이트

작업 항목:
- [ ] Monster Taming Essentials의 캐릭터 스프라이트(32x32, 걷기 애니메이션) 활용
- [ ] 맵 위 플레이어 이동 렌더링 구현
- [ ] NPC 스프라이트 배치 시스템

---

## Phase 4: 통합 및 정리

### 4-1. monsters.json 스프라이트 매핑 필드 추가

```json
// 기존 spriteConfig 대신 또는 병행
{
  "id": 1,
  "name": "Flamelet",
  "spriteFile": "001",
  "spriteSource": "tuxemon",
  ...
}
```

작업 항목:
- [ ] `monsters.json`에 `spriteFile` 필드 추가 (100종)
- [ ] `monster.js`에서 스프라이트 참조 로직 수정

### 4-2. maps.json 타일맵 연결

작업 항목:
- [ ] `maps.json` 각 맵에 `tilemap` 필드 추가
- [ ] `map.js`에서 타일맵 데이터 로드 연동

### 4-3. 크레딧 및 라이선스 처리

CC-BY / CC-BY-SA 에셋 사용으로 출처 표기 의무 발생.

작업 항목:
- [ ] `CREDITS.md` 파일 작성 — 모든 외부 에셋 출처 명시
- [ ] 게임 내 크레딧 화면 추가 (메뉴 → 크레딧)
- [ ] CC-BY-SA 4.0 라이선스 고지:
  - Tuxemon Set 1: 수정된 스프라이트도 CC-BY-SA로 배포 필요
  - 게임 코드 자체에는 SA 조건 전파 안 됨 (에셋만 해당)

---

## Phase 5: 검증 및 폴리싱

작업 항목:
- [ ] 전체 100종 몬스터 스프라이트 표시 확인 (도감 화면 순회)
- [ ] 배틀 화면 front/back 스프라이트 정상 표시 확인
- [ ] 25개 맵 타일맵 렌더링 확인
- [ ] 맵 간 이동/전환 정상 동작 확인
- [ ] 스타일 불일치 부분 파악 → 팔레트 조정 또는 리터칭
- [ ] 성능 테스트 (이미지 로드 시간, 메모리 사용량)
- [ ] 프로시저럴 fallback 정상 동작 확인

---

## 에셋 디렉토리 구조 (목표)

```
assets/
├── sprites/
│   └── monsters/
│       ├── 001_front.png
│       ├── 001_back.png
│       ├── 001_face.png
│       ├── 002_front.png
│       └── ...
├── tiles/
│   ├── town/
│   │   ├── serene_village.png
│   │   └── ...
│   ├── route/
│   │   ├── grassland.png
│   │   ├── beach.png
│   │   └── ...
│   └── dungeon/
│       ├── dungeon_01.png
│       └── ...
├── characters/
│   ├── player.png
│   └── npc/
├── backgrounds/
│   ├── battle_bg_01.png
│   ├── battle_bg_02.png
│   └── battle_bg_03.png
├── audio/          (향후 확장)
└── ui/             (향후 확장)

data/
├── tilemaps/
│   ├── starting_town.json
│   ├── route_01.json
│   └── ...
└── (기존 JSON 파일들)
```

---

## 리스크 및 주의사항

| 리스크 | 영향 | 대응 |
|--------|------|------|
| 스타일 불일치 (소스별 화풍 차이) | 시각적 위화감 | 팔레트 통일 스크립트, 리터칭 |
| CC-BY-SA 라이선스 전파 | 수정 에셋 공개 의무 | 에셋 수정 최소화, 원본 사용 우선 |
| Tuxemon 154종 중 PK 18타입 매칭 어려움 | 일부 타입 몬스터 부족 | Cyangmou/Retromon으로 보충 |
| 타일셋 사이즈 불일치 (16x16 vs 기타) | 렌더링 깨짐 | 16x16으로 일괄 정규화 |
| 이미지 로드 시간 증가 | 초기 로딩 지연 | 프리로더 + 스프라이트시트 아틀라스 |
| 에셋 라이선스 변경 가능성 | 사후 문제 | 다운로드 시점 라이선스 아카이빙 |

---

## 우선순위 요약

```
Phase 1 (에셋 수집)     ██████████ 가장 먼저 — 에셋 없이 코드 작업 불가
Phase 2 (스프라이트 로더) ████████── 에셋 수집과 병행 가능
Phase 3 (타일맵 렌더러)  ██████──── Phase 2 완료 후
Phase 4 (데이터 통합)    ████────── Phase 2-3 완료 후
Phase 5 (검증/폴리싱)    ██──────── 최종 단계
```
