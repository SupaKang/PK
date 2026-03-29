# Pocket Kingdom — 월드맵 구조 & 연결 설계

> 스토리 10챕터 진행에 따른 맵 전개 + 유기적 연결 구조

---

## 1. 월드맵 전체도

```
                              ┌─────────────┐
                              │  elite_four  │ 마왕성 (사천왕+챔피언)
                              │   Badge: 8   │
                              └──────┬───────┘
                                     │ route_09 (챔피언 로드)
                              ┌──────┴───────┐
                              │   town_09    │ 암흑성채
                              │   Badge: 7   │
                              └──┬───────┬───┘
                    shadow_base ─┘       │
                   (그림자 비밀기지)      │ route_08 (8번 도로)
                                  ┌──────┴───────┐
                                  │   town_08    │ 용린시티
                                  │   Badge: 6   │──── gym_07 (용린 수호자)
                                  └──────┬───────┘
                                         │ route_07 (7번 도로)
                              ┌──────────┴───────────┐
                              │       town_07        │ 빙결마을
                              │       Badge: 5       │──── gym_06 (빙결 수호자)
                              └──┬───────────────┬───┘
                        cave_02 ─┘               │
                       (빙하동굴)                 │ route_06 (6번 도로)
                                          ┌──────┴───────┐
                                          │   town_06    │ 투지시티
                                          │   Badge: 4   │──── gym_05 (투지 수호자)
                                          └──────┬───────┘
                                                 │ route_05 (5번 도로)
                                          ┌──────┴───────┐
                                          │   town_05    │ 자연마을
                                          │   Badge: 3   │──── gym_04 (자연 수호자)
                                          └──┬───────┬───┘
                                  forest_01 ─┘       │
                                 (수수께끼의 숲)      │ route_04 (4번 도로)
                                          ┌──────────┴───────┐
                                          │     town_04      │ 전격시티
                                          │     Badge: 2     │──── gym_03 (전격 수호자)
                                          └──────┬───────────┘
                                                 │ route_03 (3번 도로)
                              ┌──────────────────┴───────┐
                              │          town_03         │ 해류항
                              │          Badge: 1        │──── gym_02 (해류 수호자)
                              └──┬───────────────────┬───┘
                        cave_01 ─┘                   │
                       (바위동굴)                     │ route_02 (2번 도로)
                                              ┌──────┴───────┐
                                              │   town_02    │ 화염도시
                                              │   Badge: 0   │──── gym_01 (화염 수호자)
                                              └──────┬───────┘
                                                     │ route_01 (1번 도로)
                                              ┌──────┴───────┐
                                              │   town_01    │ 시작의 마을
                                              │   Badge: 0   │ ★ START
                                              └──────────────┘
```

---

## 2. 스토리 챕터별 맵 전개

### 프롤로그 (Chapter 0) — 오래된 이야기

```
위치: town_01 (시작의 마을 = "아스텔")

이벤트:
  ① 할아버지의 이야기 (인류+크리처 vs 마왕 카오스)
  ② 파트너 크리처 선택
  ③ 도감 수령
  ④ 모험 출발

스토리 로케이션 매핑:
  story.json "astel" → maps.json "town_01"
```

### Chapter 1 — 화염의 시련

```
진행 경로: town_01 → route_01 → town_02 → gym_01

  town_01  라이벌 은하 첫 만남 + 첫 배틀
     ↓ route_01 (초원길, Lv3~5 야생)
  town_02  화염도시 도착, NPC가 수호자 위치 안내
     → gym_01  화염 수호자 전당
       ├ 화염훈련생 강호
       ├ 화염훈련생 미라
       └ ★ 수호자 불꽃 (Lv12~14) → 화련의 인장 획득

스토리 로케이션 매핑:
  "caldera" → town_02
  "agnion"  → gym_01
```

### Chapter 2 — 대지의 시련

```
진행 경로: town_02 → route_02 → cave_01 → town_03 → gym_02

  town_02  동쪽으로 출발
     ↓ route_02 (해안도로, Lv7~10 야생)
     ├→ cave_01 (바위동굴) — 황혼결사 첫 조우, 그림자단원과 배틀
     ↓
  town_03  해류항 도착
     → gym_02  해류 수호자 전당
       └ ★ 수호자 돌 (해류 타입) → 암괴의 인장 획득

스토리 로케이션 매핑:
  "grimrock_cave" → cave_01
  "lithos"        → gym_02
```

### Chapter 3 — 해류의 시련

```
진행 경로: town_03 → route_03 → town_04 → gym_03

  town_03  라이벌 은하 2차 배틀 (뱃지 2개 보유)
     ↓ route_03 (Lv12~16 야생, 그림자단원 알파 조우)
  town_04  전격시티 도착
     → gym_03  전격 수호자 전당
       └ ★ 수호자 전류 → 조류의 인장 획득

스토리 로케이션 매핑:
  "duran"  → town_03 (라이벌 이벤트 위치)
  "nereid" → gym_03 (스토리에선 해류지만 실제 전격)
```

### Chapter 4 — 전격의 시련

```
진행 경로: town_04 → route_04 → forest_01 → town_05 → gym_04

  town_04  (이미 도착)
     ↓ route_04 (Lv16~20 야생)
     ├→ forest_01 (수수께끼의 숲) — 그림자단원 베타 조우
     ↓
  town_05  자연마을 도착
     → gym_04  자연 수호자 전당
       └ ★ 수호자 대지 → 뇌광의 인장 획득

  ※ 이 시점에서 황혼결사 간부 흑아 쿠로가 등장

스토리 로케이션 매핑:
  "volta_plateau" → route_04 (간부 조우)
  "keranos"       → gym_04
```

### Chapter 5 — 투지의 시련

```
진행 경로: town_05 → route_05 → town_06 → gym_05

  town_05  동쪽으로 출발
     ↓ route_05 (Lv22~28 야생, 간부 검은달 배틀)
  town_06  투지시티 도착, 수호자가 증명 요구
     → gym_05  투지 수호자 전당
       └ ★ 수호자 무한 → 쟁투의 인장 획득

  route_05 에서 라이벌 은하 3차 배틀 (뱃지 5개)

스토리 로케이션 매핑:
  "raizen"       → town_06
  "gaia_temple"  → gym_05
  "balrok_ridge" → route_05 (라이벌 3차 배틀)
```

### Chapter 6 — 빙결과 용의 시련

```
진행 경로: town_06 → route_06 → cave_02 → town_07 → gym_06 → route_07 → town_08 → gym_07

  town_06  북쪽으로 출발
     ↓ route_06 (Lv28~34 야생, 산악 지대)
     ├→ cave_02 (빙하동굴) — 간부 현월 루나르 배틀, 전설 빙결 크리처 이벤트
     ↓
  town_07  빙결마을 도착
     → gym_06  빙결 수호자 전당
       └ ★ 수호자 설화 → 상화의 인장 획득
     ↓ route_07 (Lv34~40 야생, 간부 흑사 배틀)
  town_08  용린시티 도착
     → gym_07  용린 수호자 전당
       └ ★ 용왕 → 고룡의 인장 획득 (용왕이 최종 수호자 성운 위치 알려줌)

스토리 로케이션 매핑:
  "valhalla"        → gym_06
  "borea_snowfield" → cave_02
  "aurora"          → gym_07
```

### Chapter 7 — 그림자의 습격

```
진행 경로: town_08 → route_08 → shadow_base

  town_08  남서쪽 어둠의 기운
     ↓ route_08 (Lv40~46 야생)
  shadow_base  그림자단 비밀기지 침투
     ├ 그림자단원 오메가
     ├ 그림자단원 시그마
     ├ 간부 적월
     ├ 간부 암살
     └ ★ 수장 다크니스 (Lv44~48) — 마왕 부활 의식 저지
       → 카오스 성채로의 문 발견

스토리 로케이션 매핑:
  "obsidian_fortress" → shadow_base
```

### Chapter 8 — 마지막 인장

```
진행 경로: shadow_base → town_09 → gym_08

  shadow_base  다크니스 격파 후
     ↓
  town_09  암흑성채 도착
     → gym_08  암흑 수호자 전당
       └ ★ 수호자 성운 → 성운의 인장 (8번째) 획득
       → 플레이어 치유, 카오스 성채 진입 가능

  ※ 라이벌 은하 최종 배틀 (카오스 성채 입구)
  ※ 은하가 출구를 지키며 플레이어는 전진

스토리 로케이션 매핑:
  "draconia"      → town_09 / gym_08
  "chaos_citadel" → elite_four
```

### Chapter 9 — 새벽이 밝아온다 (에필로그)

```
진행 경로: town_09 → route_09 → elite_four

  town_09  최종 준비
     ↓ route_09 (챔피언 로드, Lv46~55 야생)
     ├ 에이스 트레이너 진
     ├ 에이스 트레이너 현
     └ 에이스 트레이너 별
  elite_four  마왕성
     ├ 사마장 강철 (강철의 수호자)
     ├ 사마장 유령 (영혼의 인도자)
     ├ 사마장 용린 (용의 후예)
     ├ 사마장 우주 (별의 관측자)
     └ ★ 챔피언 하늘 (최종 보스) → 3가지 엔딩 분기

엔딩:
  카르마 ≥ 30  → 빛의 결말 (평화 회복)
  카르마 ≤ -30 → 어둠의 결말 (새로운 마왕)
  그 사이      → 균형의 결말 (여정은 계속)
```

---

## 3. 스토리 로케이션 ↔ 맵 ID 매핑 (확정)

story.json의 로케이션 이름과 maps.json의 실제 맵 ID를 통일합니다.

| story.json 로케이션 | maps.json ID | 한글 이름 | 챕터 |
|---------------------|-------------|-----------|------|
| astel | town_01 | 시작의 마을 | 0, 1 |
| caldera | town_02 | 화염도시 | 1 |
| agnion | gym_01 | 화염 수호자 전당 | 1 |
| grimrock_cave | cave_01 | 바위동굴 | 2 |
| lithos | gym_02 | 해류 수호자 전당 | 2 |
| duran | town_03 | 해류항 | 3 |
| nereid | gym_03 | 전격 수호자 전당 | 3 |
| volta_plateau | route_04 | 4번 도로 | 4 |
| keranos | gym_04 | 자연 수호자 전당 | 4 |
| raizen | town_06 | 투지시티 | 5 |
| gaia_temple | gym_05 | 투지 수호자 전당 | 5 |
| balrok_ridge | route_05 | 5번 도로 | 5 |
| valhalla | gym_06 | 빙결 수호자 전당 | 6 |
| borea_snowfield | cave_02 | 빙하동굴 | 6 |
| aurora | gym_07 | 용린 수호자 전당 | 6 |
| obsidian_fortress | shadow_base | 그림자 비밀기지 | 7 |
| draconia | town_09 / gym_08 | 암흑성채 | 8 |
| chaos_citadel | elite_four | 마왕성 | 8, 9 |

---

## 4. 유기적 연결 구조 (확장)

현재 문제: **완전 선형 구조** (A→B→C→D→...). 탐험감이 부족합니다.

### 4.1 추가 연결 (교차 경로)

기존 선형 구조에 **순환 루프**와 **숏컷**을 추가합니다.

```
추가 연결 ①: 바위동굴 뒷문
  cave_01 ──(뒷출구)──→ town_04
  ※ 뱃지 3개 이상일 때 잠금 해제
  ※ 효과: 2번 도로/3번 도로를 우회하는 숏컷

추가 연결 ②: 숲 비밀 통로
  forest_01 ──(비밀길)──→ town_07
  ※ 뱃지 6개 이상 + 특정 아이템(나침반) 필요
  ※ 효과: 중반 → 후반 직행 루트 (2회차 플레이 편의)

추가 연결 ③: 해류항 ↔ 빙결마을 배편
  town_03 ──(정기 배편)──→ town_07
  ※ 뱃지 5개 이상일 때 해금
  ※ 효과: 항구 도시 간 고속 이동

추가 연결 ④: 용린시티 ↔ 화염도시 고대 통로
  town_08 ──(용의 통로)──→ town_02
  ※ 뱃지 7개 이상
  ※ 효과: 후반 → 초반 귀환 루트

추가 연결 ⑤: 전격시티 지하 연구소
  town_04 ──(지하통로)──→ shadow_base (일방통행, 역방향만)
  ※ 스토리 ch7 이후, 연구소에서 비밀기지 정보 발견
  ※ 효과: 스토리 복선 강화
```

### 4.2 확장 후 연결 그래프

```
                                    elite_four
                                        │
                                    route_09
                                        │
                     shadow_base ── town_09 ── gym_08
                    ╱    │
             town_04·····╯ (⑤ 지하통로, ch7 후)
                         │
                     route_08
                         │
    town_02 ·········town_08 ── gym_07     (④ 용의 통로)
        │                │
     route_01        route_07
        │                │
     town_01    town_07 ── gym_06
                  │╲  │
          cave_02─┘ ╲ │
                     ╲│
    town_03 ··········╯── gym_02            (③ 배편)
      │╲        │
  cave_01·╲ route_03
      │   ·╲    │
      │    ·town_04 ── gym_03              (① 뒷문)
      │         │
      │     route_04
      │      │╲
      │  forest_01·╲
      │      │     ·╲
      │  town_05    ·town_07               (② 비밀 통로)
      │      │
      │   route_05
      │      │
      │  town_06 ── gym_05
      │      │
      │   route_06
      │      │
      └── route_02
```

**범례:**
- `──` 기본 연결 (항상 이동 가능)
- `····` 조건부 연결 (뱃지/아이템 필요)

### 4.3 연결 구조 JSON 정의

```json
{
  "extra_connections": [
    {
      "id": "shortcut_cave_backdoor",
      "from": "cave_01",
      "to": "town_04",
      "type": "shortcut",
      "requiredBadges": 3,
      "description": "바위동굴 깊은 곳에서 발견한 뒷출구. 전격시티로 연결된다."
    },
    {
      "id": "shortcut_forest_secret",
      "from": "forest_01",
      "to": "town_07",
      "type": "shortcut",
      "requiredBadges": 6,
      "requiredItem": "compass",
      "description": "숲의 비밀 통로. 나침반이 있어야 길을 찾을 수 있다."
    },
    {
      "id": "ferry_harbor_ice",
      "from": "town_03",
      "to": "town_07",
      "type": "ferry",
      "requiredBadges": 5,
      "cost": 1000,
      "description": "해류항에서 빙결마을까지의 정기 배편. 편도 1000골드."
    },
    {
      "id": "dragon_tunnel",
      "from": "town_08",
      "to": "town_02",
      "type": "ancient_passage",
      "requiredBadges": 7,
      "description": "용린시티 지하의 고대 용의 통로. 화염도시로 이어진다."
    },
    {
      "id": "lab_tunnel",
      "from": "shadow_base",
      "to": "town_04",
      "type": "one_way",
      "requiredBadges": 7,
      "direction": "shadow_base→town_04",
      "description": "그림자단 비밀기지에서 전격시티 연구소로 탈출하는 비상통로."
    }
  ]
}
```

---

## 5. 환경별 타일셋 매핑

| 맵 ID | 이름 | 타일셋 | 환경 | 분위기 |
|--------|------|--------|------|--------|
| town_01 | 시작의 마을 | T09 cobblestone/grass | 따뜻한 마을 | 평화, 시작 |
| route_01 | 1번 도로 | T01 grass/dirt | 초원 | 모험의 시작 |
| town_02 | 화염도시 | T07 volcanic/lava | 화산 도시 | 뜨겁고 활기 |
| gym_01 | 화염 전당 | T13 gym_fire | 화염 내부 | 붉은 열기 |
| route_02 | 2번 도로 | T01 grass/dirt → T03 ocean/beach | 해안 | 바다 바람 |
| cave_01 | 바위동굴 | T08 cave/wall | 동굴 | 어둡고 습함 |
| town_03 | 해류항 | T03 ocean/beach | 항구 | 시원한 바다 |
| gym_02 | 해류 전당 | T14 gym_water | 해류 내부 | 물살 소리 |
| route_03 | 3번 도로 | T01 grass/dirt | 초원→숲 전환 | 점점 짙어짐 |
| town_04 | 전격시티 | T09 cobblestone/grass | 도시 | 기계 문명 |
| gym_03 | 전격 전당 | T15 gym_electric | 전격 내부 | 전류 흐름 |
| route_04 | 4번 도로 | T05 forest/grass | 숲 입구 | 신비로운 |
| forest_01 | 수수께끼의 숲 | T05 forest/grass | 짙은 숲 | 안개, 미로 |
| town_05 | 자연마을 | T05 forest/grass | 숲속 마을 | 고요한 |
| gym_04 | 자연 전당 | T16 gym_nature | 자연 내부 | 생명의 힘 |
| route_05 | 5번 도로 | T01 grass/dirt | 산악 초원 | 거친 바람 |
| town_06 | 투지시티 | T01 grass/dirt | 무술 도시 | 열혈, 투지 |
| gym_05 | 투지 전당 | T17 gym_fighting | 투지 내부 | 도장 분위기 |
| route_06 | 6번 도로 | T06 snow/ice | 눈 지대 | 차가운 |
| cave_02 | 빙하동굴 | T11 crystal/cave | 빙하 | 신비로운 얼음 |
| town_07 | 빙결마을 | T06 snow/ice | 눈 마을 | 고요한 추위 |
| gym_06 | 빙결 전당 | T18 gym_ice | 빙결 내부 | 결정 반사 |
| route_07 | 7번 도로 | T01 grass/dirt | 고원 | 웅장한 풍경 |
| town_08 | 용린시티 | T01 grass/dirt | 고대 도시 | 전설, 위엄 |
| gym_07 | 용린 전당 | T19 gym_dragon | 용린 내부 | 고대의 힘 |
| route_08 | 8번 도로 | T10 swamp/marsh | 늪지대 | 불길한 |
| shadow_base | 비밀기지 | T12 corrupted/obsidian | 마왕성 분위기 | 어둠, 위협 |
| town_09 | 암흑성채 | T12 corrupted/obsidian | 어둠의 성 | 최종 거점 |
| gym_08 | 암흑 전당 | T20 gym_dark | 암흑 내부 | 공허 |
| route_09 | 챔피언 로드 | T02 dirt/stone | 암흑 외곽 | 결전의 길 |
| elite_four | 마왕성 | T12 corrupted/obsidian | 최종 보스 | 압도적 |

---

## 6. 맵 크기 가이드

| 맵 유형 | 추천 크기 (타일) | 비고 |
|---------|-----------------|------|
| 소형 마을 | 24×18 ~ 28×20 | town_01, town_05, town_07 |
| 중형 도시 | 28×20 ~ 32×24 | town_02, town_03, town_04, town_06 |
| 대형 도시 | 32×24 ~ 36×26 | town_08, town_09 |
| 도로 (짧은) | 30×20 | route_01, route_09 |
| 도로 (긴) | 40×20 ~ 50×20 | route_03, route_05, route_07 |
| 도로 (세로) | 20×40 | route_06 (산악) |
| 동굴 | 24×20 ~ 30×24 | cave_01, cave_02 |
| 숲 | 30×30 | forest_01 (미로형) |
| 체육관 | 16×14 ~ 20×16 | gym_01~08 |
| 비밀기지 | 28×24 | shadow_base |
| 마왕성 | 20×30 | elite_four (세로 긴 구조) |

---

## 7. 레벨 곡선

```
Lv
55 ┤                                                          ████ elite_four
50 ┤                                                    ██████
45 ┤                                              ██████ route_09
40 ┤                                        ██████ shadow/town_09
35 ┤                                  ██████ route_07/town_08
30 ┤                            ██████ route_06/town_07
25 ┤                      ██████ route_05/town_06
20 ┤                ██████ route_04/town_05
16 ┤          ██████ route_03/town_04
12 ┤    ██████ route_02/town_03
 7 ┤████ route_01/town_02
 3 ┤█ town_01
   └─────────────────────────────────────────────────────── 진행도
     Ch0  Ch1   Ch2   Ch3   Ch4   Ch5   Ch6     Ch7  Ch8  Ch9
```

---

*World Map Structure v1.0 — 2026-03-29*
