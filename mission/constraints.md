# Constraints

## 기술 스택
- JavaScript (ES6 Modules) — 프레임워크 없음 (순수 JS)
- HTML5 Canvas 2D API (게임 엔진 없음)
- Vite 빌드 도구
- JSON 기반 데이터 (monsters, skills, maps, story, items, types, classes)
- Web Audio API (프로시저럴 칩튠 사운드)
- LocalStorage 기반 세이브 시스템

## 렌더링
- 해상도: 800 x 600
- 커스텀 5x7 비트맵 픽셀 폰트 (한글 미지원, ASCII 전용)
- 프로시저럴 픽셀아트 몬스터 스프라이트 생성
- 타일맵 기반 맵 렌더링 (64px 타일)

## 플랫폼
- 웹 브라우저 (PC + 모바일)
- 모바일 터치 입력 지원
- PWA 지원

## 기존 데이터 자산 (data/ 폴더에 보존)
- monsters.json (102종)
- skills.json (346개)
- types.json (18타입 상성표)
- classes.json (5개 직업)
- items.json (42종)
- maps.json (31개 맵)
- story.json (10챕터)
- tilemaps/*.json (31개 타일맵)

## 성능 요구사항
- 60 FPS 목표
- 번들 크기 250KB 이하 (gzip 제외)

## 게임 기획 문서
- docs/GAME_DESIGN_DOCUMENT.md 참조
