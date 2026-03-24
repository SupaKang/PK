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
    this.currentChapter = 1;
    this.completedEvents = new Set();
    this.badges = new Set();
  }

  /**
   * 현재 위치에서 발동해야 할 이벤트 목록
   * @param {string} locationId - 현재 위치 ID
   * @returns {Array} 활성 이벤트 배열
   */
  getActiveEvents(locationId) {
    if (!storyDB || !storyDB.chapters) return [];

    const chapter = storyDB.chapters.find(c => c.chapter === this.currentChapter);
    if (!chapter || !chapter.events) return [];

    return chapter.events.filter(event => {
      // 이미 완료된 이벤트 제외
      if (this.completedEvents.has(event.id)) return false;

      // 위치 일치 확인
      if (event.locationId && event.locationId !== locationId) return false;

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

      return true;
    });
  }

  /** 이벤트 완료 처리 */
  completeEvent(eventId) {
    this.completedEvents.add(eventId);
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
   * @param {number} chapter - 챕터 번호 (기본: 현재 챕터)
   * @returns {boolean}
   */
  isChapterComplete(chapter = this.currentChapter) {
    if (!storyDB || !storyDB.chapters) return false;

    const ch = storyDB.chapters.find(c => c.chapter === chapter);
    if (!ch || !ch.events) return false;

    // 필수 이벤트만 확인 (optional 이벤트 제외)
    const requiredEvents = ch.events.filter(e => !e.optional);
    return requiredEvents.every(e => this.completedEvents.has(e.id));
  }

  /** 다음 챕터로 진행 */
  advanceChapter() {
    const nextChapter = this.currentChapter + 1;
    if (!storyDB || !storyDB.chapters) {
      return { success: false, message: '스토리 데이터가 없습니다.' };
    }

    const next = storyDB.chapters.find(c => c.chapter === nextChapter);
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
    if (!storyDB || !storyDB.chapters) return null;
    return storyDB.chapters.find(c => c.chapter === this.currentChapter) || null;
  }

  /** 직렬화 */
  serialize() {
    return {
      currentChapter: this.currentChapter,
      completedEvents: [...this.completedEvents],
      badges: [...this.badges],
    };
  }

  /** 역직렬화 */
  static deserialize(data) {
    const sm = new StoryManager();
    sm.currentChapter = data.currentChapter || 1;
    sm.completedEvents = new Set(data.completedEvents || []);
    sm.badges = new Set(data.badges || []);
    return sm;
  }
}
