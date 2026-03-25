// 스토리 및 이벤트 진행 시스템

let storyDB = null;

export async function loadStory() {
  const res = await fetch('./data/story.json');
  storyDB = await res.json();
  return storyDB;
}

export function getStoryData() {
  return storyDB;
}

/**
 * 스토리 매니저 — 챕터 진행, 이벤트, 뱃지 관리
 */
export class StoryManager {
  constructor() {
    this.currentChapter = 0;
    this.completedEvents = new Set();
    this.completedTriggers = new Set(); // defeat_gym_gym_01 등
    this.badges = new Set();
  }

  /** 챕터 데이터에서 ID 필드 추출 (id 또는 chapter) */
  _getChapterId(ch) {
    return ch.id !== undefined ? ch.id : ch.chapter;
  }

  /** 챕터 찾기 (id 또는 chapter 필드 모두 지원) */
  _findChapter(chapterId) {
    if (!storyDB || !storyDB.chapters) return null;
    return storyDB.chapters.find(c =>
      (c.id !== undefined && c.id === chapterId) ||
      (c.chapter !== undefined && c.chapter === chapterId)
    ) || null;
  }

  /**
   * 현재 위치에서 발동해야 할 이벤트 목록
   * @param {string} locationId - 현재 위치 ID
   * @returns {Array} 활성 이벤트 배열
   */
  getActiveEvents(locationId) {
    const chapter = this._findChapter(this.currentChapter);
    if (!chapter || !chapter.events) return [];

    return chapter.events.filter(event => {
      // 이미 완료된 이벤트 제외
      if (this.completedEvents.has(event.id)) return false;

      // 위치 일치 확인 — location 또는 locationId 필드 모두 지원
      const eventLoc = event.location || event.locationId;
      if (eventLoc && eventLoc !== locationId) return false;

      // 선행 이벤트 완료 여부 확인
      if (event.requires) {
        for (const reqId of event.requires) {
          if (!this.completedEvents.has(reqId)) return false;
        }
      }

      // 뱃지 요구사항 확인
      if (event.requiredBadges && this.getBadgeCount() < event.requiredBadges) {
        return false;
      }

      // 트리거 조건 확인 — 특수 트리거는 해당 조건 충족 시에만 발동
      const trigger = event.trigger;
      if (trigger === 'defeat_gym' || trigger === 'defeat_champion' || trigger === 'defeat_shadow_boss') {
        // 이 트리거들은 completedTriggers에 등록되어야만 발동
        if (!this.completedTriggers?.has(trigger + '_' + eventLoc)) return false;
      }

      return true;
    });
  }

  /** 이벤트 완료 처리 */
  completeEvent(eventId) {
    this.completedEvents.add(eventId);
  }

  /** 트리거 완료 등록 (defeat_gym, defeat_champion 등) */
  completeTrigger(triggerKey) {
    this.completedTriggers.add(triggerKey);
  }

  /** 뱃지 획득 */
  addBadge(badgeId) {
    this.badges.add(badgeId);
  }

  /** 뱃지 수 */
  getBadgeCount() {
    return this.badges.size;
  }

  /** 특정 뱃지 보유 여부 */
  hasBadge(badgeId) {
    return this.badges.has(badgeId);
  }

  /** 전체 뱃지 목록 */
  getBadges() {
    return [...this.badges];
  }

  /**
   * 현재 챕터의 모든 이벤트가 완료되었는지 확인
   */
  isChapterComplete(chapterId = this.currentChapter) {
    const ch = this._findChapter(chapterId);
    if (!ch || !ch.events) return false;

    const requiredEvents = ch.events.filter(e => !e.optional);
    return requiredEvents.every(e => this.completedEvents.has(e.id));
  }

  /** 다음 챕터로 진행 */
  advanceChapter() {
    const nextChapter = this.currentChapter + 1;
    if (!storyDB || !storyDB.chapters) {
      return { success: false, message: '스토리 데이터가 없습니다.' };
    }

    const next = this._findChapter(nextChapter);
    if (!next) {
      return { success: false, message: '마지막 챕터입니다. 축하합니다!' };
    }

    this.currentChapter = nextChapter;
    return {
      success: true,
      message: `제${nextChapter}장: ${next.title}`,
      chapter: next,
    };
  }

  /** 현재 챕터 정보 */
  getCurrentChapterInfo() {
    return this._findChapter(this.currentChapter);
  }

  /** 직렬화 */
  serialize() {
    return {
      currentChapter: this.currentChapter,
      completedEvents: [...this.completedEvents],
      completedTriggers: [...this.completedTriggers],
      badges: [...this.badges],
    };
  }

  /** 역직렬화 */
  static deserialize(data) {
    const sm = new StoryManager();
    sm.currentChapter = data.currentChapter ?? 0;
    sm.completedEvents = new Set(data.completedEvents || []);
    sm.completedTriggers = new Set(data.completedTriggers || []);
    sm.badges = new Set(data.badges || []);
    return sm;
  }
}
