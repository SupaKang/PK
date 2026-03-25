// 야생 몬스터 인카운터 시스템

import { createMonster } from '../core/monster.js';

/**
 * 야생 몬스터 조우 판정
 * @param {Object} location - 현재 위치 데이터 (encounters, wildEncounterRate 포함)
 * @returns {boolean} 조우 발생 여부
 */
export function checkEncounter(location) {
  if (!location) return false;
  if (!location.encounters || location.encounters.length === 0) return false;

  const rate = location.wildEncounterRate || 0;
  return Math.random() < rate;
}

/**
 * 가중치 기반 랜덤 선택
 * @param {Array} encounters - { monsterId, weight, minLevel, maxLevel } 배열
 * @returns {Object|null} 선택된 인카운터 항목
 */
function weightedRandom(encounters) {
  if (!encounters || encounters.length === 0) return null;

  const totalWeight = encounters.reduce((sum, e) => sum + (e.weight || 1), 0);
  let roll = Math.random() * totalWeight;

  for (const entry of encounters) {
    roll -= (entry.weight || 1);
    if (roll <= 0) return entry;
  }
  return encounters[encounters.length - 1];
}

/**
 * 야생 몬스터 생성
 * @param {Object} location - 위치 데이터
 * @param {number} badgeCount - 현재 획득한 배지 수 (전설 몬스터 필터용)
 * @returns {Object|null} 생성된 몬스터 인스턴스
 */
export function generateWildMonster(location, badgeCount = 0) {
  if (!location || !location.encounters || location.encounters.length === 0) {
    return null;
  }

  // requiredBadges 조건을 충족하지 못하는 인카운터 필터링
  const filteredEncounters = location.encounters.filter(
    e => !e.requiredBadges || badgeCount >= e.requiredBadges
  );

  if (filteredEncounters.length === 0) {
    return null;
  }

  const entry = weightedRandom(filteredEncounters);
  if (!entry) return null;

  // minLevel ~ maxLevel 사이 랜덤 레벨
  const minLv = entry.minLevel || 2;
  const maxLv = entry.maxLevel || minLv + 3;
  const level = minLv + Math.floor(Math.random() * (maxLv - minLv + 1));

  const monster = createMonster(entry.monsterId, level, true);
  return monster;
}

/**
 * 시간대별 인카운터 필터 (선택적)
 * @param {Array} encounters - 인카운터 목록
 * @param {string} timeOfDay - 'morning' | 'day' | 'night'
 * @returns {Array} 필터된 인카운터 목록
 */
export function filterEncountersByTime(encounters, timeOfDay = 'day') {
  if (!encounters) return [];
  return encounters.filter(e => {
    if (!e.timeOfDay) return true; // 시간 제한 없으면 항상 출현
    return e.timeOfDay === timeOfDay;
  });
}

/**
 * 특수 인카운터 (낚시, 서핑 등)
 * @param {Object} location - 위치 데이터
 * @param {string} method - 인카운터 방법
 * @returns {Object|null} 생성된 몬스터
 */
export function generateSpecialEncounter(location, method) {
  if (!location || !location.specialEncounters) return null;
  const encounters = location.specialEncounters[method];
  if (!encounters || encounters.length === 0) return null;

  const entry = weightedRandom(encounters);
  if (!entry) return null;

  const minLv = entry.minLevel || 5;
  const maxLv = entry.maxLevel || minLv + 5;
  const level = minLv + Math.floor(Math.random() * (maxLv - minLv + 1));

  return createMonster(entry.monsterId, level, true);
}
