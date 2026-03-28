# Pokemon Gold (GBC 2세대) 스프라이트 스타일 레퍼런스 프롬프트

---

## 1. 시스템 프롬프트 (공통 스타일 정의)

모든 생성 요청 앞에 붙이는 스타일 앵커 프롬프트.

### 영문 (PixelLab / MCP 용)

```
You are generating pixel art in the exact style of Pokemon Gold/Silver
(Game Boy Color, 1999, Gen 2). Follow these strict rules:

PALETTE: 4 colors per sprite maximum. Each sprite uses one 4-color
sub-palette from the GBC's 8-palette system. Colors are muted and
warm-toned, not saturated. Typical palette structure: 1 dark outline
color, 1 shadow/mid-dark tone, 1 base/mid tone, 1 highlight/light tone.
Background is always transparent (color index 0).

RESOLUTION: Overworld characters are exactly 16x16 pixels on a 16x16
grid. Battle sprites (front) are 56x56 pixels. Battle sprites (back)
are 48x48 pixels. Trainer portraits are 56x56 pixels.

OUTLINE: Single-pixel black or near-black outline on all edges.
No anti-aliasing. No sub-pixel rendering. Every pixel is deliberate
and manually placed. Outlines are consistent 1px width, never thicker.

SHADING: Maximum 2 shade levels per color region (base + shadow).
Dithering is used sparingly, only for large gradient areas.
No smooth gradients. Hard pixel boundaries between shade regions.
Shadow direction is consistent: top-left light source, shadows fall
bottom-right.

PROPORTIONS (Overworld 16x16):
- Head occupies top 7-8 rows (nearly half the sprite)
- Body occupies bottom 8-9 rows
- Character is 2 heads tall (super-deformed/chibi ratio)
- Eyes are 1-2 pixels, placed on row 3-4 from top
- Arms are suggested by 1-2 pixels extending from torso
- Feet are 2-3 pixels wide at the bottom row
- Hair is a solid color block on top of head, 2-4 rows

PROPORTIONS (Battle/Portrait 56x56):
- More detailed but still chunky pixel art
- Head is roughly 1/3 of total height
- Features are simplified: eyes are 2-4 pixels, nose is 0-1 pixel
- Clothing folds shown with 1-2 pixel shadow lines
- Hands are simplified mitten shapes (3-4 pixels)

ANIMATION: Overworld walk cycle is exactly 2 frames per direction.
Frame 1: left foot forward. Frame 2: right foot forward.
Standing idle reuses one walk frame. 4 directions: down, up, left, right.

DESIGN PHILOSOPHY:
- Silhouette readability is paramount at 16x16
- Every pixel must serve a purpose
- Reduce details to essential shapes
- Use color contrast for readability, not detail density
- Characters are friendly and approachable even when villainous
- Clothing and hair define character identity at small scale
```

### 한국어 요약

```
포켓몬스터 금/은(게임보이 컬러, 1999년, 2세대) 정확한 스프라이트 스타일.

팔레트: 스프라이트당 최대 4색. 채도 낮고 따뜻한 톤. 구조는 [외곽선 어두운색,
그림자색, 기본색, 하이라이트색]. 배경은 항상 투명.

해상도: 필드 캐릭터 16x16px, 전투 앞모습 56x56px, 전투 뒷모습 48x48px.

외곽선: 1px 검정 외곽선. 안티앨리어싱 없음. 모든 픽셀이 의도적으로 배치됨.

음영: 색상 영역당 최대 2단계(기본+그림자). 디더링은 극히 제한적.
그라디언트 없음. 광원은 좌상단, 그림자는 우하단.

비율(필드 16x16): 머리가 상단 절반, 2등신 SD체형. 눈 1-2px, 팔 1-2px 암시,
발 2-3px. 머리카락은 단색 블록.

디자인 원칙: 16x16에서 실루엣 가독성 최우선. 모든 픽셀에 역할 부여.
색상 대비로 가독성 확보. 디테일 밀도가 아닌 핵심 형태로 캐릭터 구분.
```

---

## 2. PixelLab API 파라미터 매핑

### 2.1 필드 캐릭터 (16x16, 4방향)

```json
{
  "endpoint": "create-character-with-4-directions",
  "image_size": { "width": 16, "height": 16 },
  "view": "low top-down",
  "outline": "single color black outline",
  "shading": "minimal shading",
  "detail": "low detail",
  "proportions": "{\"type\": \"preset\", \"name\": \"chibi\"}"
}
```

### 2.2 전투 스프라이트 (56x56, 정면)

```json
{
  "endpoint": "create-image-pixflux",
  "image_size": { "width": 56, "height": 56 },
  "no_background": true,
  "outline": "single color black outline",
  "shading": "basic shading",
  "detail": "low detail",
  "view": "side"
}
```

### 2.3 전투 스프라이트 (48x48, 뒷모습)

```json
{
  "endpoint": "create-image-pixflux",
  "image_size": { "width": 48, "height": 48 },
  "no_background": true,
  "outline": "single color black outline",
  "shading": "basic shading",
  "detail": "low detail",
  "view": "side"
}
```

---

## 3. 색상 팔레트 레퍼런스

GBC 2세대 대표 팔레트 구조 (4색 단위):

```
주인공 (금):
  outline:   #181818  (거의 검정)
  shadow:    #884400  (갈색 그림자)
  base:      #DD8800  (황금 기본)
  highlight: #FFDD88  (밝은 크림)

라이벌 (은):
  outline:   #181818
  shadow:    #882222
  base:      #CC4444
  highlight: #FFAAAA

NPC 일반 (남):
  outline:   #181818
  shadow:    #335588
  base:      #5588BB
  highlight: #AACCEE

NPC 일반 (여):
  outline:   #181818
  shadow:    #884466
  base:      #CC6688
  highlight: #FFAACC

로켓단:
  outline:   #181818
  shadow:    #222222
  base:      #444444
  highlight: #888888
```

PixelLab에서 팔레트 강제 적용:

```json
{
  "color_image": {
    "type": "base64",
    "base64": "<4색 팔레트 스와치 이미지의 base64>",
    "format": "png"
  },
  "force_colors": true
}
```

---

## 4. 프롬프트 템플릿

### 4.1 필드 캐릭터

```
[캐릭터 설명], 16x16 pixel sprite, pokemon gold silver GBC style,
4-color palette, 2-head-tall chibi proportions, 1px black outline,
minimal shading, top-down RPG overworld view, transparent background
```

#### 예시

```
# 주인공 (전사 클래스)
"young warrior boy with short brown hair and red cape, light armor,
16x16 pixel sprite, pokemon gold silver GBC style, 4-color palette,
2-head-tall chibi proportions, 1px black outline, minimal shading,
top-down RPG overworld view, transparent background"

# 라이벌 은하
"rival trainer with spiky silver hair and blue jacket,
confident stance, 16x16 pixel sprite, pokemon gold silver GBC style,
4-color palette, 2-head-tall chibi proportions, 1px black outline,
minimal shading, top-down RPG overworld view, transparent background"

# 황혼의 사도 (졸개)
"hooded cultist in dark purple robe with mask,
16x16 pixel sprite, pokemon gold silver GBC style, 4-color palette,
2-head-tall chibi proportions, 1px black outline, minimal shading,
top-down RPG overworld view, transparent background"

# 상점 NPC
"friendly shopkeeper with apron and hat,
16x16 pixel sprite, pokemon gold silver GBC style, 4-color palette,
2-head-tall chibi proportions, 1px black outline, minimal shading,
top-down RPG overworld view, transparent background"
```

### 4.2 전투 트레이너 스프라이트

```
[캐릭터 설명], 56x56 pixel battle sprite, pokemon gold silver GBC style,
4-color palette, chunky pixel art, 1px black outline, basic shading,
front-facing battle pose, transparent background
```

#### 예시

```
# 화련 이그니아 (화염 수호자)
"fire gym leader woman with flame-shaped hair ornament and red kimono,
arms crossed with confident smirk, 56x56 pixel battle sprite,
pokemon gold silver GBC style, 4-color palette, chunky pixel art,
1px black outline, basic shading, front-facing battle pose,
transparent background"

# 겁화 이그니온 (황혼결사 보스)
"villain boss in dark ornate armor with glowing red eye,
imposing crossed-arms pose, 56x56 pixel battle sprite,
pokemon gold silver GBC style, 4-color palette, chunky pixel art,
1px black outline, basic shading, front-facing battle pose,
transparent background"

# 마왕 아포칼립스
"demon overlord with massive horns and dark wings, menacing pose,
56x56 pixel battle sprite, pokemon gold silver GBC style,
4-color palette, chunky pixel art, 1px black outline, basic shading,
front-facing battle pose, transparent background"
```

### 4.3 몬스터 전투 스프라이트

```
[몬스터 설명], 56x56 pixel front battle sprite,
pokemon gold silver GBC monster style, 4-color palette,
1px black outline, basic shading with dithering,
front-facing idle pose, transparent background
```

#### 예시

```
# 엠버냥 (화염 스타터 1단계)
"small fire kitten with ember tail and glowing eyes,
56x56 pixel front battle sprite, pokemon gold silver GBC monster style,
4-color palette, 1px black outline, basic shading with dithering,
front-facing idle pose, transparent background"

# 인페르냥 (화염 스타터 최종)
"majestic fire emperor lion with flame crown and armored mane,
56x56 pixel front battle sprite, pokemon gold silver GBC monster style,
4-color palette, 1px black outline, basic shading with dithering,
front-facing idle pose, transparent background"

# 창세룡 오리진 (전설)
"primordial light dragon with golden celestial armor and radiant wings,
56x56 pixel front battle sprite, pokemon gold silver GBC monster style,
4-color palette, 1px black outline, basic shading with dithering,
front-facing idle pose, transparent background"
```

---

## 5. PixelLab 16x16 생성 시 주의사항

PixelLab은 16x16 이하에서 품질이 떨어질 수 있음.
권장 워크플로우:

```
방법 A: 직접 16x16 생성
→ create-image-bitforge (16x16 지원, 스타일 레퍼런스 가능)
→ 결과물 수동 보정 필요 확률 높음

방법 B: 32x32 생성 후 다운스케일
→ create-image-pixflux (32x32)
→ nearest-neighbor 다운스케일로 16x16 변환
→ 디테일은 더 좋지만 GBC 정확한 느낌과 다를 수 있음

방법 C: 64x64 생성 + 스타일 레퍼런스
→ GBC 스타일 레퍼런스 이미지를 style_image로 첨부
→ generate-with-style-v2 사용
→ 가장 높은 품질, 후처리로 다운스케일
```

권장: **방법 C** (64x64 생성 → 후처리 다운스케일)

```json
{
  "endpoint": "generate-with-style-v2",
  "style_images": [
    {
      "image": { "type": "base64", "base64": "<GBC 레퍼런스 스프라이트>" },
      "size": { "width": 16, "height": 16 }
    }
  ],
  "description": "...",
  "image_size": { "width": 64, "height": 64 },
  "no_background": true
}
```

---

## 6. 스타일 키워드 치트시트

| 목적 | 키워드 |
|------|--------|
| GBC 세대 고정 | `pokemon gold silver GBC style` |
| 팔레트 제한 | `4-color palette`, `limited color palette` |
| 외곽선 | `1px black outline`, `single pixel outline` |
| 음영 방식 | `minimal shading`, `basic shading with dithering` |
| 안티앨리어싱 방지 | `no anti-aliasing`, `hard pixel edges` |
| 필드 비율 | `2-head-tall chibi`, `super-deformed proportions` |
| 전투 비율 | `chunky pixel art`, `front-facing battle pose` |
| 배경 | `transparent background` |
| 연대 느낌 | `late 90s handheld game style`, `8-bit color depth` |
| 디더링 | `sparse dithering`, `checkerboard dithering for gradients` |

### 조합 예시 (복사해서 바로 사용)

```
# 필드용 최소 조합
", 16x16 pixel sprite, pokemon gold silver GBC style, 4-color palette, 1px black outline, chibi, transparent background"

# 전투용 최소 조합
", 56x56 pixel battle sprite, pokemon gold silver GBC style, 4-color palette, 1px black outline, basic shading, transparent background"

# 몬스터 전투용 최소 조합
", 56x56 pixel monster sprite, pokemon gold silver GBC style, 4-color palette, 1px black outline, dithered shading, transparent background"
```
