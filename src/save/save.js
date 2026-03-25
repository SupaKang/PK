// 세이브/로드 시스템 — LocalStorage 기반 3슬롯

const SAVE_KEY = 'pocket_kingdom_save_';
const MAX_SLOTS = 3;

/**
 * 세이브 매니저
 */
export class SaveManager {
  /**
   * 게임 상태를 슬롯에 저장
   * @param {number} slot - 슬롯 번호 (0, 1, 2)
   * @param {Object} gameState - 전체 게임 상태
   */
  static save(slot, gameState) {
    if (slot < 0 || slot >= MAX_SLOTS) {
      throw new Error(`유효하지 않은 슬롯 번호입니다: ${slot}`);
    }

    const saveData = {
      version: 1,
      timestamp: Date.now(),
      playerName: gameState.playerName || '계약자',
      playtime: gameState.playtime || 0,

      party: gameState.party,        // PartyManager.serialize()
      inventory: gameState.inventory, // Inventory.serialize() or raw data
      story: gameState.story,         // StoryManager.serialize()
      map: gameState.map,             // MapManager.serialize()
      trainers: gameState.trainers,   // TrainerManager.serialize()
      dex: gameState.dex || [],
      settings: gameState.settings || {},
      expedition: gameState.expedition || null,
    };

    try {
      const json = JSON.stringify(saveData);
      localStorage.setItem(SAVE_KEY + slot, json);
      return { success: true, message: '저장 완료!' };
    } catch (e) {
      console.error('세이브 실패:', e);
      return { success: false, message: '저장에 실패했습니다. 저장 공간이 부족할 수 있습니다.' };
    }
  }

  /**
   * 슬롯에서 게임 상태 불러오기
   * @param {number} slot - 슬롯 번호
   * @returns {Object|null} 게임 상태 또는 null
   */
  static load(slot) {
    if (slot < 0 || slot >= MAX_SLOTS) {
      throw new Error(`유효하지 않은 슬롯 번호입니다: ${slot}`);
    }

    try {
      const json = localStorage.getItem(SAVE_KEY + slot);
      if (!json) return null;

      const saveData = JSON.parse(json);

      // 버전 호환성 체크
      if (!saveData.version) {
        console.warn('구 버전 세이브 데이터입니다.');
      }

      return saveData;
    } catch (e) {
      console.error('로드 실패:', e);
      return null;
    }
  }

  /**
   * 슬롯 삭제
   * @param {number} slot - 슬롯 번호
   */
  static delete(slot) {
    if (slot < 0 || slot >= MAX_SLOTS) {
      throw new Error(`유효하지 않은 슬롯 번호입니다: ${slot}`);
    }

    localStorage.removeItem(SAVE_KEY + slot);
    return { success: true, message: '데이터가 삭제되었습니다.' };
  }

  /**
   * 슬롯 미리보기 정보
   * @param {number} slot - 슬롯 번호
   * @returns {Object|null} 미리보기 정보
   */
  static getSlotInfo(slot) {
    if (slot < 0 || slot >= MAX_SLOTS) return null;

    try {
      const json = localStorage.getItem(SAVE_KEY + slot);
      if (!json) return null;

      const data = JSON.parse(json);
      const badgeCount = data.story?.badges?.length || 0;
      const partyCount = data.party?.party?.length || 0;

      // 플레이타임 포맷
      const totalSec = Math.floor(data.playtime || 0);
      const hours = Math.floor(totalSec / 3600);
      const minutes = Math.floor((totalSec % 3600) / 60);
      const playtimeStr = `${hours}시간 ${minutes}분`;

      return {
        playerName: data.playerName || '계약자',
        playtime: data.playtime || 0,
        playtimeFormatted: playtimeStr,
        badgeCount,
        chapter: data.story?.currentChapter || 1,
        partyCount,
        timestamp: data.timestamp,
        timestampFormatted: new Date(data.timestamp).toLocaleString('ko-KR'),
      };
    } catch (e) {
      return null;
    }
  }

  /**
   * 슬롯에 세이브 데이터가 있는지 확인
   * @param {number} slot - 슬롯 번호
   * @returns {boolean}
   */
  static hasSave(slot) {
    if (slot < 0 || slot >= MAX_SLOTS) return false;
    return localStorage.getItem(SAVE_KEY + slot) !== null;
  }

  /**
   * 모든 슬롯 정보 목록
   * @returns {Array} 3개 슬롯의 정보 배열
   */
  static getAllSlots() {
    const slots = [];
    for (let i = 0; i < MAX_SLOTS; i++) {
      slots.push({
        slot: i,
        exists: SaveManager.hasSave(i),
        info: SaveManager.getSlotInfo(i),
      });
    }
    return slots;
  }
}
