// 배틀 엔진 — 턴 기반 1:1 전투 관리
import {
  calcDamage, checkAccuracy, checkCritical,
  applySkillEffect, getEffectiveStat, getSkillPriority, getMultiHitCount,
  processStatusDamage, checkStatusAction, STRUGGLE_SKILL
} from './skill.js';
import { getEffectiveness, getEffectivenessText } from './type.js';
import { calculatePartyBuffs } from './party-buffs.js';

/**
 * 배틀 상태 머신
 */
export class Battle {
  constructor({ playerParty, enemyParty, isWild = false, trainerName = null, reward = 0, onEnd }) {
    this.playerParty = playerParty;         // 플레이어 전투 파티 (계약자 + 몬스터 배열)
    this.enemyParty = enemyParty;           // 상대 파티
    this.isWild = isWild;
    this.trainerName = trainerName;
    this.reward = reward;
    this.onEnd = onEnd;                     // 배틀 종료 콜백
    this.contractorKO = false;              // 계약자(주인) 기절 플래그

    this.playerActive = this.getFirstAlive(playerParty);
    this.enemyActive = this.getFirstAlive(enemyParty);

    this.turn = 0;
    this.state = 'select_action';           // select_action, animating, end
    this.messageQueue = [];
    this.pendingActions = [];
    this.result = null;                     // 'win', 'lose', 'flee', 'capture'

    // 파티 버프 계산
    this.playerBuffs = null;
    const contractor = playerParty.find(m => m.isContractor);
    if (contractor) {
      this.playerBuffs = calculatePartyBuffs(contractor);
    }

    // 스탯 초기화
    this.initBattleState(this.playerActive);
    this.initBattleState(this.enemyActive);
  }

  initBattleState(monster) {
    if (!monster) return;
    monster._statStages = { atk: 0, def: 0, spAtk: 0, spDef: 0, speed: 0 };
    monster._flinched = false;
    monster._protected = false;
    monster._leech = null;
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

    // Smart AI: consider HP, status, type effectiveness
    const hpRatio = monster.currentHp / monster.stats.hp;
    const playerHpRatio = this.playerActive.currentHp / this.playerActive.stats.hp;

    // AI 전략: 트레이너 배틀은 더 똑똑하게
    const isSmart = !this.isWild;

    // 교체 고려 (트레이너만, 불리한 타입 매칭 + 대안이 있을 때)
    if (isSmart && this.getAliveCount(this.enemyParty) > 1 && hpRatio > 0.3) {
      const currentEff = this._getBestMoveEffectiveness(monster, this.playerActive);
      const playerEff = this._getBestMoveEffectiveness(this.playerActive, monster);

      // 상대가 매우 유리하고 자신이 불리하면 교체 고려
      if (playerEff >= 2 && currentEff <= 0.5) {
        const betterSwitch = this._findBetterSwitch();
        if (betterSwitch >= 0 && Math.random() < 0.6) {
          return { type: 'switch', monsterIndex: betterSwitch, monster };
        }
      }
    }

    let bestIndex = 0;
    let bestScore = -1;

    for (const { skill, index } of usableSkills) {
      let score = 0;

      if (skill.category === 'status') {
        // Status move scoring
        score = this._scoreStatusMove(skill, monster, hpRatio, playerHpRatio, isSmart);
      } else {
        // Damage move scoring
        score = skill.power || 30;
        const eff = getEffectiveness(skill.type, this.playerActive.type);
        score *= eff;
        if (monster.type.includes(skill.type)) score *= 1.5; // STAB
        score *= (skill.accuracy / 100); // Weight by accuracy

        // Avoid overkill — prefer weaker moves when opponent is low
        if (isSmart && playerHpRatio < 0.2 && score > 150) {
          score *= 0.7; // Don't waste big moves on nearly dead opponent
        }

        // Avoid ineffective moves
        if (eff <= 0.5) score *= 0.3;
        if (eff === 0) score = 0;
      }

      // Add randomness (less for smart AI)
      const randomRange = isSmart ? 0.15 : 0.3;
      score *= (1 - randomRange + Math.random() * randomRange * 2);

      if (score > bestScore) {
        bestScore = score;
        bestIndex = index;
      }
    }

    return { type: 'fight', skillIndex: bestIndex, monster };
  }

  /** AI: Score status moves based on context */
  _scoreStatusMove(skill, monster, hpRatio, playerHpRatio, isSmart) {
    if (!isSmart) return 20 + Math.random() * 20;

    let score = 0;
    const effect = skill.effect;

    // Don't use status moves when opponent is almost dead
    if (playerHpRatio < 0.15) return 5;

    if (effect) {
      switch (effect.type) {
        case 'burn': case 'poison': case 'paralyze':
        case 'sleep': case 'confuse': case 'freeze':
          // 상태이상 기술 평가
          if (this.playerActive.status) return 5;
          score = 60;
          if (['paralyze', 'burn'].includes(effect.type)) score = 70;
          if (effect.type === 'sleep' || effect.type === 'freeze') score = 75;
          break;
        case 'stat_up':
          // 자기 강화 — HP 높을 때 유리
          score = hpRatio > 0.7 ? 55 : 20;
          break;
        case 'stat_down':
          // 적 약화
          score = 45;
          break;
        case 'heal':
          // Heal when HP is low
          score = hpRatio < 0.4 ? 80 : (hpRatio < 0.6 ? 40 : 5);
          break;
        default:
          score = 30;
      }
    } else {
      score = 25;
    }

    return score;
  }

  /** AI: Find best type effectiveness this monster can deal */
  _getBestMoveEffectiveness(attacker, defender) {
    let best = 0;
    for (const skill of attacker.skills) {
      if (skill.pp > 0 && skill.category !== 'status') {
        const eff = getEffectiveness(skill.type, defender.type);
        if (eff > best) best = eff;
      }
    }
    return best;
  }

  /** AI: Find a better switch-in against current player monster */
  _findBetterSwitch() {
    let bestIdx = -1;
    let bestScore = 0;

    for (let i = 0; i < this.enemyParty.length; i++) {
      const mon = this.enemyParty[i];
      if (mon === this.enemyActive || mon.currentHp <= 0) continue;

      // Score by how well this monster matches up
      let score = 0;
      const offEff = this._getBestMoveEffectiveness(mon, this.playerActive);
      const defEff = this._getBestMoveEffectiveness(this.playerActive, mon);

      score = offEff * 2 - defEff; // Favor good offense, penalize being weak to player
      score += mon.currentHp / mon.stats.hp; // Prefer healthier mons

      if (score > bestScore) {
        bestScore = score;
        bestIdx = i;
      }
    }

    return bestScore > 1.5 ? bestIdx : -1; // Only switch if significantly better
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

    // 우선도(priority) 비교
    const playerSkill = this.playerActive.skills?.[playerAction.skillIndex];
    const enemySkill = this.enemyActive.skills?.[enemyAction.skillIndex];
    const playerPriority = getSkillPriority(playerSkill);
    const enemyPriority = getSkillPriority(enemySkill);

    let playerFirst;

    if (playerPriority !== enemyPriority) {
      // 우선도가 다르면 높은 쪽이 선공
      playerFirst = playerPriority > enemyPriority;
    } else {
      // 우선도 같으면 속도 비교
      const playerSpeed = getEffectiveStat(this.playerActive, 'speed', this.playerBuffs);
      const enemySpeed = getEffectiveStat(this.enemyActive, 'speed');

      // 마비 시 속도 50% 감소
      const pSpeed = this.playerActive.status === 'paralyze' ? playerSpeed * 0.5 : playerSpeed;
      const eSpeed = this.enemyActive.status === 'paralyze' ? enemySpeed * 0.5 : enemySpeed;

      if (pSpeed !== eSpeed) {
        playerFirst = pSpeed > eSpeed;
      } else {
        playerFirst = Math.random() < 0.5;
      }
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
    if (this.playerActive) {
      this.playerActive._flinched = false;
      this.playerActive._protected = false;
    }
    if (this.enemyActive) {
      this.enemyActive._flinched = false;
      this.enemyActive._protected = false;
    }

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

        // 방어(protect) 상태 체크
        if (defender._protected && skill.category !== 'status') {
          messages.push(`${defender.name}은(는) 공격을 막아냈다!`);
          break;
        }

        // 파티 버프 결정 (플레이어 측 공격자만 공격 버프 적용)
        const attackerBuffs = action.side === 'player' ? this.playerBuffs : null;
        const defenderBuffs = action.side === 'enemy' ? this.playerBuffs : null;

        // 명중 판정
        if (!checkAccuracy(attacker, defender, skill, attackerBuffs)) {
          messages.push(`빗나갔다!`);
          break;
        }

        // 멀티히트 처리
        const hitCount = getMultiHitCount(skill);
        let totalDamage = 0;

        for (let hit = 0; hit < hitCount; hit++) {
          if (defender.currentHp <= 0) break;

          const isCrit = checkCritical(skill, attackerBuffs);
          const damage = calcDamage(attacker, defender, skill, isCrit, attackerBuffs);

          if (hit === 0 || hitCount > 1) {
            if (isCrit && damage > 0) messages.push('급소에 맞았다!');
          }

          if (hit === 0) {
            const eff = getEffectiveness(skill.type, defender.type);
            const effText = getEffectivenessText(eff);
            if (effText) messages.push(effText);
          }

          if (damage > 0) {
            defender.currentHp = Math.max(0, defender.currentHp - damage);
            totalDamage += damage;
          }
        }

        if (hitCount > 1) {
          messages.push(`${hitCount}번 맞았다!`);
        }

        // 스킬 효과 적용
        messages.push(...applySkillEffect(skill, attacker, defender, totalDamage, attackerBuffs, defenderBuffs));

        // 기절 체크
        if (defender.currentHp <= 0) {
          messages.push(`${defender.name}은(는) 쓰러졌다!`);
          // 계약자 기절 추적
          if (defender.isContractor && action.side === 'enemy') {
            this.contractorKO = true;
            messages.push('계약자가 쓰러졌다! 전투 후 마을로 돌아가야 한다!');
          }
        }
        break;
      }

      case 'switch': {
        const party = action.side === 'player' ? this.playerParty : this.enemyParty;
        const newMonster = party[action.monsterIndex];
        if (newMonster && newMonster.currentHp > 0) {
          const old = action.side === 'player' ? this.playerActive : this.enemyActive;
          const recallLines = [
            `${old.name}, 돌아와!`,
            `${old.name}, 수고했어!`,
            `${old.name}, 잠깐 쉬어!`,
            `잘 싸웠어, ${old.name}!`,
          ];
          const sendLines = [
            `가라, ${newMonster.name}!`,
            `${newMonster.name}, 네 차례다!`,
            `${newMonster.name}, 힘을 보여줘!`,
            `부탁해, ${newMonster.name}!`,
          ];
          // Deterministic selection based on turn number
          const recallMsg = old.isContractor ? `${old.name}이(가) 뒤로 물러났다!` : recallLines[this.turn % recallLines.length];
          const sendMsg = newMonster.isContractor ? `${newMonster.name}이(가) 전투에 나섰다!` : sendLines[this.turn % sendLines.length];
          messages.push(recallMsg);
          this.initBattleState(newMonster);
          if (action.side === 'player') {
            this.playerActive = newMonster;
          } else {
            this.enemyActive = newMonster;
          }
          messages.push(sendMsg);
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
          messages.push('상대와의 배틀에서는 도망칠 수 없다!');
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
      const forceSendLines = [
        `가라, ${newMonster.name}!`,
        `${newMonster.name}, 네 차례다!`,
        `${newMonster.name}, 힘을 보여줘!`,
        `부탁해, ${newMonster.name}!`,
      ];
      const msg = newMonster.isContractor
        ? `${newMonster.name}이(가) 전투에 나섰다!`
        : forceSendLines[this.turn % forceSendLines.length];
      return [msg];
    }
    return [];
  }

  /** 계약 시도 (마석) */
  attemptCapture(ballMultiplier = 1) {
    if (!this.isWild) return { success: false, messages: ['상대의 몬스터와는 계약할 수 없다!'] };

    const target = this.enemyActive;
    const maxHp = target.stats.hp;
    const currentHp = target.currentHp;
    const catchRate = target.catchRate;

    // 마스터볼
    if (ballMultiplier >= 255) {
      this.result = 'capture';
      return { success: true, messages: ['계약 성립!', `${target.name}과(와) 계약했다!`], shakes: 3 };
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
        messages.push('계약 성립!', `${target.name}과(와) 계약했다!`);
        return { success: true, messages, shakes: 3 };
      }
      shakes = 2; // 아깝게 실패
    }

    const shakeTexts = ['', '흔들...', '흔들... 흔들...', '흔들... 흔들... 흔들...'];
    if (shakes > 0) messages.push(shakeTexts[shakes]);
    messages.push('계약이 거부되었다!');

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
