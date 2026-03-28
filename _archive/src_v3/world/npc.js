// NPC 대화 및 트레이너 배틀 관리

import { createMonster } from '../core/monster.js';

/**
 * 트레이너 매니저 — 패배한 트레이너 추적 및 팀 생성
 */
export class TrainerManager {
  constructor() {
    this.defeatedTrainers = new Set();
  }

  /** 트레이너 패배 여부 확인 */
  isDefeated(trainerId) {
    return this.defeatedTrainers.has(trainerId);
  }

  /** 트레이너 패배 등록 */
  markDefeated(trainerId) {
    this.defeatedTrainers.add(trainerId);
  }

  /** 트레이너 패배 취소 (연속전 실패 시 리셋용) */
  unmarkDefeated(trainerId) {
    this.defeatedTrainers.delete(trainerId);
  }

  /**
   * 트레이너 팀 생성 — 트레이너 데이터에서 몬스터 인스턴스 배열 생성
   * @param {Object} trainer - { id, name, team: [{ monsterId, level }], ... }
   * @returns {Array} 몬스터 인스턴스 배열
   */
  getTrainerTeam(trainer) {
    if (!trainer || !trainer.team) return [];
    return trainer.team.map(entry => {
      const monster = createMonster(entry.monsterId, entry.level, false);
      if (entry.nickname) {
        monster.nickname = entry.nickname;
      }
      // 트레이너 몬스터는 야생이 아님
      monster.isWild = false;
      return monster;
    });
  }

  /**
   * 위치의 NPC 목록에서 활성 트레이너 필터링
   * (아직 패배하지 않은 트레이너만)
   * @param {Array} npcs - 위치의 NPC 배열
   * @returns {Array} 배틀 가능한 트레이너 목록
   */
  getActiveTrainers(npcs) {
    if (!npcs) return [];
    return npcs.filter(npc =>
      npc.type === 'trainer' && !this.isDefeated(npc.id)
    );
  }

  /**
   * NPC 대화 텍스트 가져오기
   * @param {Object} npc - NPC 데이터
   * @returns {string} 대화 텍스트
   */
  getDialogue(npc) {
    if (!npc) return '';

    // 트레이너인 경우 패배 전/후 대사가 다름
    if (npc.type === 'trainer') {
      if (this.isDefeated(npc.id)) {
        return npc.defeatDialogue || '다음에는 지지 않겠어!';
      }
      return npc.battleDialogue || '승부다!';
    }

    return npc.dialogue || '...';
  }

  /**
   * 트레이너 패배 보상 계산
   * @param {Object} trainer - 트레이너 데이터
   * @returns {Object} { money, items }
   */
  getRewards(trainer) {
    if (!trainer) return { money: 0, items: [] };

    // 기본 보상: 팀 최고 레벨 * 보상 배율
    const maxLevel = trainer.team
      ? Math.max(...trainer.team.map(t => t.level))
      : 1;
    const rewardMultiplier = trainer.rewardMultiplier || 50;

    return {
      money: maxLevel * rewardMultiplier,
      items: trainer.rewardItems || [],
    };
  }

  /** 직렬화 */
  serialize() {
    return {
      defeatedTrainers: [...this.defeatedTrainers],
    };
  }

  /** 역직렬화 */
  static deserialize(data) {
    const tm = new TrainerManager();
    tm.defeatedTrainers = new Set(data.defeatedTrainers || []);
    return tm;
  }
}
