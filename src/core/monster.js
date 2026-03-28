/**
 * monster.js — Monster instance creation and stat calculation
 * Creates battle-ready monster instances from base data
 */

/**
 * Create a monster instance for battle
 * @param {Object} baseData - Monster entry from monsters.json
 * @param {number} level - Monster level
 * @param {Object} [skillsData] - Full skills.json array for skill lookup
 * @returns {Object} Monster instance
 */
export function createMonster(baseData, level, skillsData) {
  // Generate random IVs (0-31)
  const iv = {
    hp: Math.floor(Math.random() * 32),
    atk: Math.floor(Math.random() * 32),
    def: Math.floor(Math.random() * 32),
    spAtk: Math.floor(Math.random() * 32),
    spDef: Math.floor(Math.random() * 32),
    speed: Math.floor(Math.random() * 32),
  };

  const stats = calcStats(baseData.baseStats, iv, level);

  // Determine skills: last 4 learned skills up to this level
  const learnset = baseData.learnset || baseData.skills || [];
  const available = learnset
    .filter(s => s.level <= level)
    .sort((a, b) => b.level - a.level)
    .slice(0, 4);

  const skills = available.map(s => {
    const skillData = skillsData
      ? (Array.isArray(skillsData) ? skillsData : []).find(sk => sk.id === s.skillId)
      : null;
    return {
      id: s.skillId,
      ...(skillData || {}),
      ppLeft: skillData ? skillData.pp : 20,
    };
  });

  return {
    id: baseData.id,
    name: baseData.name,
    type: baseData.type || ['normal'],
    level,
    baseStats: baseData.baseStats,
    iv,
    stats,
    hp: stats.hp,
    maxHp: stats.hp,
    skills,
    spriteConfig: baseData.spriteConfig || null,
    isWild: true,
    status: null, // poison, burn, etc.
  };
}

/**
 * Calculate final stats from base + IV + level
 * Simplified formula inspired by Pokemon gen 3
 */
function calcStats(base, iv, level) {
  const calc = (baseStat, ivVal) => {
    return Math.floor(((2 * baseStat + ivVal) * level) / 100) + 5;
  };

  return {
    hp: Math.floor(((2 * base.hp + iv.hp) * level) / 100) + level + 10,
    atk: calc(base.atk, iv.atk),
    def: calc(base.def, iv.def),
    spAtk: calc(base.spAtk, iv.spAtk),
    spDef: calc(base.spDef, iv.spDef),
    speed: calc(base.speed, iv.speed),
  };
}

/**
 * Check if monster is fainted
 */
export function isFainted(monster) {
  return monster.hp <= 0;
}

/**
 * Heal monster to full HP
 */
export function healFull(monster) {
  monster.hp = monster.maxHp;
  monster.status = null;
  for (const skill of monster.skills) {
    const base = skill.pp || 20;
    skill.ppLeft = base;
  }
}

/**
 * Calculate EXP gained from defeating a monster
 */
export function calcExpGain(defeated) {
  const baseExp = defeated.baseStats
    ? Math.floor((defeated.baseStats.hp + defeated.baseStats.atk + defeated.baseStats.spAtk) / 3)
    : 50;
  return Math.floor((baseExp * defeated.level) / 5) + 10;
}

/**
 * Add EXP to a monster. Returns level-up events.
 * @param {Object} monster
 * @param {number} exp
 * @param {Array} monstersData - Full monsters.json for evolution lookup
 * @param {Array} skillsData - Full skills.json for new skill lookup
 * @returns {Array} events [{type: 'levelup'|'evolution'|'newskill', ...}]
 */
export function addExp(monster, exp, monstersData, skillsData) {
  if (!monster.exp) monster.exp = 0;
  if (!monster.expToNext) monster.expToNext = calcExpToNext(monster.level);

  monster.exp += exp;
  const events = [];

  while (monster.exp >= monster.expToNext) {
    monster.exp -= monster.expToNext;
    monster.level++;

    // Recalculate stats
    const oldMaxHp = monster.maxHp;
    monster.stats = calcStats(monster.baseStats, monster.iv, monster.level);
    monster.maxHp = monster.stats.hp;
    monster.hp += (monster.maxHp - oldMaxHp); // Heal the HP difference
    monster.expToNext = calcExpToNext(monster.level);

    events.push({ type: 'levelup', level: monster.level });

    // Check for new skills
    const baseData = monstersData ? monstersData.find(m => m.id === monster.id) : null;
    if (baseData) {
      const learnset = baseData.learnset || [];
      const newSkills = learnset.filter(s => s.level === monster.level);
      for (const ns of newSkills) {
        if (monster.skills.length < 4) {
          const skillData = skillsData
            ? (Array.isArray(skillsData) ? skillsData : []).find(sk => sk.id === ns.skillId)
            : null;
          const newSkill = { id: ns.skillId, ...(skillData || {}), ppLeft: skillData ? skillData.pp : 20 };
          monster.skills.push(newSkill);
          events.push({ type: 'newskill', skill: newSkill });
        }
      }

      // Check evolution
      if (baseData.evolution && monster.level >= baseData.evolution.level) {
        const evoTarget = monstersData.find(m => m.id === baseData.evolution.to);
        if (evoTarget) {
          events.push({
            type: 'evolution',
            fromId: monster.id,
            fromName: monster.name,
            toId: evoTarget.id,
            toName: evoTarget.name,
          });
          // Apply evolution
          monster.id = evoTarget.id;
          monster.name = evoTarget.name;
          monster.type = evoTarget.type || monster.type;
          monster.baseStats = evoTarget.baseStats;
          monster.spriteConfig = evoTarget.spriteConfig || monster.spriteConfig;
          // Recalculate stats with new base
          const oldHp = monster.maxHp;
          monster.stats = calcStats(monster.baseStats, monster.iv, monster.level);
          monster.maxHp = monster.stats.hp;
          monster.hp += (monster.maxHp - oldHp);
        }
      }
    }
  }

  return events;
}

/**
 * EXP needed for next level (cubic growth)
 */
function calcExpToNext(level) {
  return Math.floor(4 * Math.pow(level, 2.2) / 5) + 10;
}

/**
 * Attempt to capture a wild monster
 * @param {Object} monster - Wild monster instance
 * @param {Object} item - Contract stone item data
 * @returns {{ success: boolean, shakes: number }}
 */
export function attemptCapture(monster, item) {
  const catchRate = monster.baseStats
    ? Math.min(255, Math.floor(150 / (monster.baseStats.hp + monster.baseStats.def)))
    : 45;

  // HP ratio factor: lower HP = easier catch
  const hpRatio = monster.hp / monster.maxHp;
  const hpFactor = (1 - hpRatio * 0.7);

  // Status bonus
  let statusBonus = 1;
  if (monster.status === 'sleep' || monster.status === 'freeze') statusBonus = 2.5;
  else if (monster.status) statusBonus = 1.5;

  // Stone multiplier
  const stoneMultiplier = item.effect ? item.effect.value : 1;

  // Final catch rate (0-255)
  const rate = Math.min(255, Math.floor(catchRate * hpFactor * statusBonus * stoneMultiplier));

  // 4 shake checks (like Pokemon gen 3)
  let shakes = 0;
  const threshold = Math.floor(65536 / Math.pow(255 / rate, 0.25));

  for (let i = 0; i < 4; i++) {
    if (Math.random() * 65536 < threshold) {
      shakes++;
    } else {
      break;
    }
  }

  return { success: shakes >= 4, shakes };
}
