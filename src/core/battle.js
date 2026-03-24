// 배틀 엔진 — 턴 기반 1:1 전투 관리
import {
  calcDamage, checkAccuracy, checkCritical,
  applySkillEffect, getEffectiveStat,
  processStatusDamage, checkStatusAction, STRUGGLE_SKILL
} from './skill.js';
import { getEffectiveness, getEffectivenessText } from './type.js';

/**
 * 배틀 상태 머신
 */
export class Battle {
  constructor({ playerParty, enemyParty, isWild = false, trainerName = null, reward = 0, onEnd }) {
    this.playerParty = playerParty;         // 플레이어 파티 (몬스터 배열)
    this.enemyParty = enemyParty;           // 상대 파티
    this.isWild = isWild;
    this.trainerName = trainerName;
    this.reward = reward;
    this.onEnd = onEnd;                     // 배틀 종료 콜백

    this.playerActive = this.getFirstAlive(playerParty);
    this.enemyActive = this.getFirstAlive(enemyParty);

    this.turn = 0;
    this.state = 'select_action';           // select_action, animating, end
    this.messageQueue = [];
    this.pendingActions = [];
    this.result = null;                     // 'win', 'lose', 'flee', 'capture'

    // 스탯 초기화
    this.initBattleState(this.playerActive);
    this.initBattleState(this.enemyActive);
  }

  initBattleState(monster) {
    if (!monster) return;
    monster._statStages = { atk: 0, def: 0, spAtk: 0, spDef: 0, speed: 0 };
    monster._flinched = false;
  }

  getFirstAlive(party) {
    return party.find(m => m.currentHp > 0) || null;
  }

  getAliveCount(party) {
    return party.filter(m => m.currentHp > 0).length;
  }

  /** 사용 가능한 스킬이 있는지 */
  hasUsableSkill(monster) {
    return monster.skills.some(s => s.pp > 0);
  }

  /** 플레이어 행동 선택 */
  selectAction(action) {
    // action: { type: 'fight'|'switch'|'item'|'flee', skillIndex?, monsterIndex?, itemId? }
    this.pendingActions = [];
    this.messageQueue = [];

    const playerAction = { ...action, monster: this.playerActive };
    const enemyAction = this.getEnemyAction();

    // 행동 순서 결정
    const actions = this.determineOrder(playerAction, enemyAction);
    this.pendingActions = actions;
    this.state = 'animating';
    this.turn++;

    return this.executeTurn();
  }

  /** AI 행동 결정 */
  getEnemyAction() {
    const monster = this.enemyActive;
    if (!monster || monster.currentHp <= 0) return null;

    // 사용 가능한 스킬 중 선택
    const usableSkills = monster.skills
      .map((s, i) => ({ skill: s, index: i }))
      .filter(({ skill }) => skill.pp > 0);

    if (usableSkills.length === 0) {
      return { type: 'fight', skillIndex: -1, monster }; // 발버둥
    }

    // 간단한 AI: 가장 효과적인 스킬 선택
    let bestIndex = 0;
    let bestScore = -1;

    for (const { skill, index } of usableSkills) {
      let score = skill.power || 30;
      const eff = getEffectiveness(skill.type, this.playerActive.type);
      score *= eff;
      if (monster.type.includes(skill.type)) score *= 1.5; // STAB
      if (skill.category === 'status') score = 40; // 상태기 기본 점수
      // 약간의 랜덤성
      score *= (0.8 + Math.random() * 0.4);
      if (score > bestScore) {
        bestScore = score;
        bestIndex = index;
      }
    }

    return { type: 'fight', skillIndex: bestIndex, monster };
  }

  /** 행동 순서 결정 */
  determineOrder(playerAction, enemyAction) {
    const actions = [];

    // 교체/아이템/도망은 항상 선공
    if (playerAction.type !== 'fight') {
      actions.push({ side: 'player', ...playerAction });
      if (enemyAction) actions.push({ side: 'enemy', ...enemyAction });
      return actions;
    }

    if (!enemyAction) {
      actions.push({ side: 'player', ...playerAction });
      return actions;
    }

    // 둘 다 fight인 경우 속도 비교
    const playerSpeed = getEffectiveStat(this.playerActive, 'speed');
    const enemySpeed = getEffectiveStat(this.enemyActive, 'speed');

    // 마비 시 속도 50% 감소
    const pSpeed = this.playerActive.status === 'paralyze' ? playerSpeed * 0.5 : playerSpeed;
    const eSpeed = this.enemyActive.status === 'paralyze' ? enemySpeed * 0.5 : enemySpeed;

    let playerFirst;
    if (pSpeed !== eSpeed) {
      playerFirst = pSpeed > eSpeed;
    } else {
      playerFirst = Math.random() < 0.5;
    }

    if (playerFirst) {
      actions.push({ side: 'player', ...playerAction });
      actions.push({ side: 'enemy', ...enemyAction });
    } else {
      actions.push({ side: 'enemy', ...enemyAction });
      actions.push({ side: 'player', ...playerAction });
    }

    return actions;
  }

  /** 턴 실행 */
  executeTurn() {
    const turnLog = [];

    for (const action of this.pendingActions) {
      // 이미 쓰러진 몬스터는 행동 불가
      if (action.monster && action.monster.currentHp <= 0) continue;

      const msgs = this.executeAction(action);
      turnLog.push(...msgs);

      // 배틀 종료 체크
      if (this.checkBattleEnd()) break;
    }

    // 턴 종료 상태이상 처리
    if (!this.result) {
      if (this.playerActive.currentHp > 0) {
        turnLog.push(...processStatusDamage(this.playerActive));
      }
      if (this.enemyActive && this.enemyActive.currentHp > 0) {
        turnLog.push(...processStatusDamage(this.enemyActive));
      }
      this.checkBattleEnd();
    }

    // 풀린 플래그
    if (this.playerActive) this.playerActive._flinched = false;
    if (this.enemyActive) this.enemyActive._flinched = false;

    this.messageQueue = turnLog;
    if (this.result) {
      this.state = 'end';
    } else {
      this.state = 'select_action';
    }

    return { messages: turnLog, result: this.result, state: this.state };
  }

  /** 단일 행동 실행 */
  executeAction(action) {
    const messages = [];

    switch (action.type) {
      case 'fight': {
        const attacker = action.side === 'player' ? this.playerActive : this.enemyActive;
        const defender = action.side === 'player' ? this.enemyActive : this.playerActive;

        if (!attacker || attacker.currentHp <= 0) break;
        if (!defender || defender.currentHp <= 0) break;

        // 풀죽음 체크
        if (attacker._flinched) {
          messages.push(`${attacker.name}은(는) 풀이 죽어 움직이지 못했다!`);
          break;
        }

        // 상태이상 체크
        const statusCheck = checkStatusAction(attacker);
        messages.push(...statusCheck.messages);
        if (!statusCheck.canAct) break;

        // 스킬 선택
        let skill;
        if (action.skillIndex === -1 || !this.hasUsableSkill(attacker)) {
          skill = STRUGGLE_SKILL;
          messages.push(`${attacker.name}은(는) 발버둥쳤다!`);
        } else {
          skill = attacker.skills[action.skillIndex];
          if (!skill || skill.pp <= 0) {
            skill = STRUGGLE_SKILL;
            messages.push(`${attacker.name}은(는) 발버둥쳤다!`);
          } else {
            skill.pp--;
            messages.push(`${attacker.name}의 ${skill.name}!`);
          }
        }

        // 명중 판정
        if (!checkAccuracy(attacker, defender, skill)) {
          messages.push(`빗나갔다!`);
          break;
        }

        // 데미지 계산
        const isCrit = checkCritical();
        const damage = calcDamage(attacker, defender, skill, isCrit);

        if (isCrit && damage > 0) messages.push('급소에 맞았다!');

        // 타입 상성 메시지
        const eff = getEffectiveness(skill.type, defender.type);
        const effText = getEffectivenessText(eff);
        if (effText) messages.push(effText);

        // 데미지 적용
        if (damage > 0) {
          defender.currentHp = Math.max(0, defender.currentHp - damage);
        }

        // 스킬 효과 적용
        messages.push(...applySkillEffect(skill, attacker, defender, damage));

        // 기절 체크
        if (defender.currentHp <= 0) {
          messages.push(`${defender.name}은(는) 쓰러졌다!`);
          // 경험치 처리는 외부에서
        }
        break;
      }

      case 'switch': {
        const party = action.side === 'player' ? this.playerParty : this.enemyParty;
        const newMonster = party[action.monsterIndex];
        if (newMonster && newMonster.currentHp > 0) {
          const old = action.side === 'player' ? this.playerActive : this.enemyActive;
          messages.push(`${old.name}, 돌아와!`);
          this.initBattleState(newMonster);
          if (action.side === 'player') {
            this.playerActive = newMonster;
          } else {
            this.enemyActive = newMonster;
          }
          messages.push(`가라, ${newMonster.name}!`);
        }
        break;
      }

      case 'item': {
        // 아이템 사용은 UI 레이어에서 처리 후 결과만 전달
        if (action.itemResult) {
          messages.push(...action.itemResult.messages);
        }
        break;
      }

      case 'flee': {
        if (this.isWild) {
          const playerSpeed = getEffectiveStat(this.playerActive, 'speed');
          const enemySpeed = getEffectiveStat(this.enemyActive, 'speed');
          const fleeChance = (playerSpeed * 128 / enemySpeed + 30 * this.turn) % 256;
          if (Math.random() * 256 < fleeChance || this.turn > 3) {
            messages.push('무사히 도망쳤다!');
            this.result = 'flee';
          } else {
            messages.push('도망칠 수 없었다!');
          }
        } else {
          messages.push('트레이너 배틀에서는 도망칠 수 없다!');
        }
        break;
      }
    }

    return messages;
  }

  /** 배틀 종료 조건 체크 */
  checkBattleEnd() {
    // 상대 전멸
    if (this.getAliveCount(this.enemyParty) === 0) {
      this.result = 'win';
      return true;
    }

    // 플레이어 전멸
    if (this.getAliveCount(this.playerParty) === 0) {
      this.result = 'lose';
      return true;
    }

    // 상대 현재 몬스터가 쓰러졌으면 다음 몬스터
    if (this.enemyActive.currentHp <= 0) {
      const next = this.getFirstAlive(this.enemyParty);
      if (next) {
        this.initBattleState(next);
        this.enemyActive = next;
        if (!this.isWild) {
          this.messageQueue.push(`상대는 ${next.name}을(를) 내보냈다!`);
        }
      }
    }

    // 플레이어 현재 몬스터가 쓰러졌으면 교체 필요
    if (this.playerActive.currentHp <= 0) {
      const alive = this.getAliveCount(this.playerParty);
      if (alive > 0) {
        this.state = 'force_switch'; // UI에서 교체 처리
        return false;
      }
    }

    return false;
  }

  /** 강제 교체 */
  forceSwitch(monsterIndex) {
    const newMonster = this.playerParty[monsterIndex];
    if (newMonster && newMonster.currentHp > 0) {
      this.initBattleState(newMonster);
      this.playerActive = newMonster;
      this.state = 'select_action';
      return [`가라, ${newMonster.name}!`];
    }
    return [];
  }

  /** 포획 시도 */
  attemptCapture(ballMultiplier = 1) {
    if (!this.isWild) return { success: false, messages: ['트레이너의 몬스터는 포획할 수 없다!'] };

    const target = this.enemyActive;
    const maxHp = target.stats.hp;
    const currentHp = target.currentHp;
    const catchRate = target.catchRate;

    // 마스터볼
    if (ballMultiplier >= 255) {
      this.result = 'capture';
      return { success: true, messages: ['잡았다!', `${target.name}을(를) 포획했다!`], shakes: 3 };
    }

    // 포획 확률 계산
    const a = ((3 * maxHp - 2 * currentHp) * catchRate * ballMultiplier) / (3 * maxHp);
    const shakeChance = 1048560 / Math.sqrt(Math.sqrt(16711680 / Math.max(1, a)));

    let shakes = 0;
    for (let i = 0; i < 3; i++) {
      if (Math.random() * 65536 < shakeChance) {
        shakes++;
      } else {
        break;
      }
    }

    const messages = [];
    if (shakes === 3) {
      // 최종 판정
      if (Math.random() * 65536 < shakeChance) {
        this.result = 'capture';
        messages.push('잡았다!', `${target.name}을(를) 포획했다!`);
        return { success: true, messages, shakes: 3 };
      }
      shakes = 2; // 아깝게 실패
    }

    const shakeTexts = ['', '흔들...', '흔들... 흔들...', '흔들... 흔들... 흔들...'];
    if (shakes > 0) messages.push(shakeTexts[shakes]);
    messages.push('아! 빠져나와 버렸다!');

    return { success: false, messages, shakes };
  }

  /** 배틀 보상 계산 */
  getRewards() {
    const rewards = {
      money: this.reward,
      exp: 0,
    };

    // 경험치: 쓰러뜨린 적 몬스터 기반
    for (const enemy of this.enemyParty) {
      if (enemy.currentHp <= 0) {
        rewards.exp += Math.floor((enemy.expYield * enemy.level) / 7);
      }
    }

    return rewards;
  }
}
