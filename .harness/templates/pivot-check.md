# Pivot Check Prompt (Round 10)

현재까지의 결과물과 9회의 반복 히스토리를 검토하세요.

## 입력
- 최근 3회의 eval report (`eval/reports/sprint-NNN.json`)
- 현재 코드 상태 (`src/`)

## 질문에 답하세요

1. 최근 3회의 반복에서 품질 개선 폭이 점차 줄어들고 있는가?
2. 현재 접근 방식의 구조적 한계가 존재하는가?
3. 완전히 다른 접근을 취했을 때 더 나은 결과가 가능한가?

## 판정

3개 중 2개 이상 "예"라면:

```json
{
  "decision": "pivot",
  "reason": "현재 접근 방식의 한계 설명",
  "new_direction": "제안하는 새로운 접근 방식",
  "evidence": {
    "round_7_score": "...",
    "round_8_score": "...",
    "round_9_score": "...",
    "improvement_trend": "감소"
  }
}
```

아닌 경우:

```json
{
  "decision": "continue",
  "focus_areas": ["남은 개선 영역"],
  "additional_rounds": 3,
  "evidence": {
    "round_7_score": "...",
    "round_8_score": "...",
    "round_9_score": "...",
    "improvement_trend": "유지 또는 증가"
  }
}
```
