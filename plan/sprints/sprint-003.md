# Sprint 003: 턴제 전투 엔진 & 타입 상성

## 목표
야생 몬스터와 턴제 1v1 전투가 동작하고, 18타입 상성에 따른 데미지 계산이 적용된다. PixelLab 몬스터 스프라이트가 전투 화면에 표시된다.

## 대상 기능
- F-004: 야생 몬스터와 턴제 전투 + 18타입 상성

## 에셋 요구사항
- 몬스터 캐릭터 4종 (화염/해류/자연/전격 — 4방향, idle+attack 애니메이션)
- 전투 UI 프레임 (HP 바 영역 포함)
- 타입 아이콘 세트 (화염/해류/자연/전격 — 16x16)

## 선행 조건
Sprint 002 산출물 (에셋 로딩 시스템, 맵 이동, FSM MAP 상태)

## 작업 항목
- [ ] PixelLab으로 몬스터 4종 생성 (idle + attack 애니메이션)
- [ ] PixelLab으로 전투 UI 프레임 + 타입 아이콘 생성
- [ ] 야생 조우 시스템 (맵별 encounters, 확률적 조우)
- [ ] 몬스터 인스턴스 생성 (base stats + IV + 레벨 보정)
- [ ] 전투 FSM (SELECT_ACTION → EXECUTE → RESULT → END)
- [ ] 스킬 데미지 공식 (물리/특수, 위력, 공/방, STAB)
- [ ] types.json 상성 매트릭스 → 배율 적용 (2x/0.5x/0x)
- [ ] 크리티컬 (6.25%, 1.5배), 명중률 판정
- [ ] 전투 UI (양측 몬스터 + HP 바 + 스킬 4개 선택)
- [ ] 전투 종료 (HP 0 → 맵 복귀)
- [ ] FSM에 BATTLE 상태 추가

## 완료 조건 (Done Criteria)
- [ ] 야생 조우 시 전투 화면 전환 (검증: 이동 후 전투 화면 확인)
- [ ] 스킬 → 데미지 → HP 감소 동작 (검증: 전투 로그에서 값 확인)
- [ ] 화염→자연 2배, 화염→해류 0.5배 (검증: 데미지 계산 검증)
- [ ] HP 0이면 전투 종료 → 맵 복귀 (검증: 종료 상태 확인)
- [ ] 몬스터 PixelLab 스프라이트가 전투 화면에 표시 (검증: src/assets/ 에셋 + 화면 확인)
- [ ] 5초 랜덤 입력 시 크래시 없음 (검증: 콘솔 에러 0)

## 예상 파일 구조
```
src/core/monster.js          # 몬스터 인스턴스, 스탯
src/core/battle.js           # 전투 엔진, 턴 관리, AI
src/core/skill.js            # 데미지 계산, 명중
src/core/type.js             # 타입 상성
src/world/encounter.js       # 야생 조우
src/ui/battle-ui.js          # 전투 화면 UI
src/assets/sprites/monsters/ # 몬스터 에셋
src/assets/ui/               # 전투 UI 에셋
```
