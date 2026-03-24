// 월드 맵 시스템 — 노드 기반 이동

let mapsDB = null;

export async function loadMaps() {
  const res = await fetch('./data/maps.json');
  mapsDB = await res.json();
  return mapsDB;
}

export function getMapData() {
  return mapsDB;
}

/**
 * 맵 매니저 — 플레이어의 현재 위치와 이동을 관리
 */
export class MapManager {
  constructor() {
    this.currentLocation = 'town_01'; // 시작 마을
    this.visitedLocations = new Set(['town_01']);
  }

  /** 위치 데이터 가져오기 */
  getLocation(locationId) {
    if (!mapsDB) return null;
    return ( mapsDB.locations || mapsDB.maps || [] ).find(loc => loc.id === locationId) || null;
  }

  /** 현재 위치 데이터 */
  getCurrentLocation() {
    return this.getLocation(this.currentLocation);
  }

  /** 현재 위치에서 이동 가능한 연결 목록 */
  getConnections() {
    const location = this.getCurrentLocation();
    if (!location || !location.connections) return [];
    return location.connections.map(conn => {
      const target = this.getLocation(conn.to);
      return {
        id: conn.to,
        name: target ? target.name : conn.to,
        requiredBadges: conn.requiredBadges || 0,
        description: conn.description || '',
      };
    });
  }

  /** 뱃지 요구사항 확인 */
  canAccess(locationId, badgeCount = 0) {
    const current = this.getCurrentLocation();
    if (!current || !current.connections) return false;

    const conn = current.connections.find(c => c.to === locationId);
    if (!conn) return false;

    const required = conn.requiredBadges || 0;
    return badgeCount >= required;
  }

  /** 이동 시도 — 연결돼있고 뱃지 조건 충족 시 이동 */
  moveTo(locationId, badgeCount = 0) {
    if (!this.canAccess(locationId, badgeCount)) {
      const conn = this.getCurrentLocation()?.connections?.find(c => c.to === locationId);
      if (!conn) {
        return { success: false, message: '이 장소로 갈 수 없습니다.' };
      }
      return {
        success: false,
        message: `이 길을 지나려면 뱃지 ${conn.requiredBadges}개가 필요합니다.`,
      };
    }

    this.currentLocation = locationId;
    this.visitedLocations.add(locationId);
    const loc = this.getCurrentLocation();
    return {
      success: true,
      message: `${loc?.name || locationId}에 도착했습니다!`,
      location: loc,
    };
  }

  /** 방문 여부 확인 */
  hasVisited(locationId) {
    return this.visitedLocations.has(locationId);
  }

  /** 모든 위치 목록 */
  getAllLocations() {
    if (!mapsDB) return [];
    return ( mapsDB.locations || mapsDB.maps || [] );
  }

  /** 마지막 방문한 마을로 복귀 (전멸 시 사용) */
  returnToLastTown() {
    // 방문 기록 중 마을 타입을 역순으로 찾기
    const visited = [...this.visitedLocations];
    for (let i = visited.length - 1; i >= 0; i--) {
      const loc = this.getLocation(visited[i]);
      if (loc && loc.type === 'town') {
        this.currentLocation = loc.id;
        return;
      }
    }
    // 못 찾으면 시작 마을로
    this.currentLocation = 'town_01';
  }

  /** 직렬화 */
  serialize() {
    return {
      currentLocation: this.currentLocation,
      visitedLocations: [...this.visitedLocations],
    };
  }

  /** 역직렬화 */
  static deserialize(data) {
    const mm = new MapManager();
    mm.currentLocation = data.currentLocation || 'town_01';
    mm.visitedLocations = new Set(data.visitedLocations || ['town_01']);
    return mm;
  }
}
