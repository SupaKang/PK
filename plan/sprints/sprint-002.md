# Sprint 002: 타일맵 맵 이동 & 지역 전환

## 목표
에셋 로딩 시스템을 구축하고, PixelLab으로 생성한 타일셋/캐릭터로 타일맵 맵에서 캐릭터가 이동하며 지역 간 전환이 동작한다.

## 대상 기능
- F-003: 맵 화면에서 방향키로 캐릭터를 이동하고, 지역 간 전환이 된다

## 에셋 요구사항
- 플레이어 캐릭터 (8방향 + walk/idle 애니메이션)
- 필드 타일셋: 잔디↔흙길, 잔디↔물, 흙길↔돌바닥 (3개 Wang tileset)
- 맵 오브젝트: 나무, 울타리, 집, 표지판 (4종)

## 우선 작업: 에셋 로딩 시스템
- [ ] AssetLoader 클래스 구현 (이미지 프리로드, Promise.all 완료 대기)
- [ ] SpriteSheet 클래스 구현 (drawImage source rect로 프레임 추출)
- [ ] src/assets/ 디렉토리 구조 생성

## 선행 조건
Sprint 001 산출물 (렌더링 엔진, 게임 루프, 입력 시스템)

## 작업 항목
- [ ] PixelLab으로 플레이어 캐릭터 생성 (8방향, walk+idle)
- [ ] PixelLab으로 타일셋 3종 생성 (잔디/흙길/물/돌)
- [ ] PixelLab으로 맵 오브젝트 4종 생성
- [ ] 타일맵 엔진 구현 (JSON 로드, 64px 타일, 레이어, 카메라 추적)
- [ ] 충돌 레이어 구현 (벽 타일 이동 차단)
- [ ] 플레이어 스프라이트 맵 위 렌더링 및 그리드 기반 이동
- [ ] maps.json 연결(connections) → 출구 감지 → 맵 전환
- [ ] 인장 게이트 (requiredBadges 부족 시 차단)
- [ ] FSM에 MAP 상태 추가

## 완료 조건 (Done Criteria)
- [ ] AssetLoader가 모든 에셋을 로드 후 게임이 시작된다 (검증: 로드 완료 후 화면 확인)
- [ ] 방향키로 캐릭터가 상하좌우 이동한다 (검증: ArrowRight 후 스크린샷 비교)
- [ ] 벽 타일에서 캐릭터가 멈춘다 (검증: 벽 방향 이동 후 좌표 불변)
- [ ] 맵 출구에 닿으면 새 맵이 로드된다 (검증: 출구 이동 후 화면 변경)
- [ ] 타일맵 이음새가 없다 (검증: 타일 경계 부분 스크린샷)
- [ ] 프로시저럴 에셋이 아닌 PixelLab 에셋이 사용된다 (검증: src/assets/ 파일 존재)

## 예상 파일 구조
```
src/ui/asset-loader.js       # 에셋 로딩 시스템
src/ui/spritesheet.js        # 스프라이트시트 프레임 추출
src/ui/tilemap-engine.js     # 타일맵 렌더링/충돌
src/ui/map-ui.js             # 맵 화면 UI, 플레이어 이동
src/world/map.js             # 맵 메타데이터, 연결, 게이트
src/assets/sprites/player/   # 플레이어 캐릭터 에셋
src/assets/tilesets/         # 타일셋 에셋
src/assets/objects/          # 맵 오브젝트 에셋
```
