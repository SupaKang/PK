// 에셋 로더 — 외부 PNG 우선, 프로시저럴 폴백
// 하이브리드 에셋 시스템의 핵심 모듈

/**
 * 이미지 캐시 및 로딩 관리
 */
class AssetLoaderClass {
  constructor() {
    this._cache = new Map();      // key → Image|Canvas
    this._loading = new Set();    // 로딩 중인 키
    this._failed = new Set();     // 로드 실패한 키 (폴백 사용)
    this._totalAssets = 0;
    this._loadedAssets = 0;
    this._ready = false;
  }

  /** 로딩 진행률 (0~1) */
  get progress() {
    return this._totalAssets > 0 ? this._loadedAssets / this._totalAssets : 0;
  }

  get isReady() {
    return this._ready;
  }

  /**
   * 단일 이미지 로드 (Promise)
   * @param {string} key - 캐시 키
   * @param {string} src - 이미지 경로
   * @returns {Promise<Image|null>}
   */
  loadImage(key, src) {
    if (this._cache.has(key)) return Promise.resolve(this._cache.get(key));
    if (this._failed.has(key)) return Promise.resolve(null);

    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        this._cache.set(key, img);
        this._loadedAssets++;
        resolve(img);
      };
      img.onerror = () => {
        this._failed.add(key);
        this._loadedAssets++;
        resolve(null);
      };
      img.src = src;
    });
  }

  /**
   * 캐시에서 가져오기 (동기)
   * @returns {Image|Canvas|null}
   */
  get(key) {
    return this._cache.get(key) || null;
  }

  /**
   * 프로시저럴 생성 결과를 캐시에 저장
   */
  set(key, imageOrCanvas) {
    this._cache.set(key, imageOrCanvas);
  }

  /**
   * 해당 키가 외부 에셋 로드에 실패했는지 (폴백 필요)
   */
  needsFallback(key) {
    return this._failed.has(key) || !this._cache.has(key);
  }

  /**
   * 몬스터 스프라이트 로드 시도
   * @param {number} monsterId
   * @returns {Promise<{front: Image|null, back: Image|null}>}
   */
  async loadMonsterSprite(monsterId) {
    const idStr = String(monsterId).padStart(3, '0');
    const basePath = `./assets/sprites/monsters/`;

    const [front, back] = await Promise.all([
      this.loadImage(`monster_${monsterId}_front`, `${basePath}${idStr}_front.png`),
      this.loadImage(`monster_${monsterId}_back`, `${basePath}${idStr}_back.png`),
    ]);

    return { front, back };
  }

  /**
   * 전체 몬스터 스프라이트 일괄 로드 (100종)
   * 실패한 것은 프로시저럴 폴백 사용
   */
  async preloadAllMonsters(count = 100) {
    this._totalAssets += count * 2;
    const promises = [];
    for (let i = 1; i <= count; i++) {
      promises.push(this.loadMonsterSprite(i));
    }
    await Promise.all(promises);
  }

  /**
   * 타일셋 로드 시도
   */
  async loadTileset(tilesetId) {
    return this.loadImage(`tileset_${tilesetId}`, `./assets/tiles/${tilesetId}.png`);
  }

  /**
   * 배틀 배경 로드 시도
   */
  async loadBattleBackground(bgId) {
    return this.loadImage(`battle_bg_${bgId}`, `./assets/backgrounds/${bgId}.png`);
  }

  /**
   * 전체 에셋 프리로드
   * 외부 PNG가 없어도 에러 없이 진행 (폴백 처리)
   */
  async preloadAll() {
    // 몬스터 스프라이트 (외부 PNG 있으면 로드)
    await this.preloadAllMonsters(100);

    // 배틀 배경
    this._totalAssets += 6;
    await Promise.all([
      this.loadBattleBackground('grass'),
      this.loadBattleBackground('cave'),
      this.loadBattleBackground('water'),
      this.loadBattleBackground('snow'),
      this.loadBattleBackground('desert'),
      this.loadBattleBackground('elite'),
    ]);

    // 타일셋 (외부 PNG 있으면 로드)
    this._totalAssets += 6;
    await Promise.all([
      this.loadTileset('town'),
      this.loadTileset('route'),
      this.loadTileset('cave'),
      this.loadTileset('gym'),
      this.loadTileset('forest'),
      this.loadTileset('elite'),
    ]);

    this._ready = true;
  }

  /**
   * 타일맵 데이터 로드 (JSON)
   */
  async loadTilemapData(mapId) {
    const key = `tilemap_data_${mapId}`;
    if (this._cache.has(key)) return this._cache.get(key);

    try {
      const res = await fetch(`./data/tilemaps/${mapId}.json`);
      if (!res.ok) return null;
      const data = await res.json();
      this._cache.set(key, data);
      return data;
    } catch {
      return null;
    }
  }

  /**
   * 타일맵 데이터 가져오기 (캐시)
   */
  getTilemapData(mapId) {
    return this._cache.get(`tilemap_data_${mapId}`) || null;
  }

  /**
   * 해당 맵에 타일맵이 있는지 확인
   */
  hasTilemap(mapId) {
    return this._cache.has(`tilemap_data_${mapId}`) && this._cache.has(`tileset_${this._cache.get(`tilemap_data_${mapId}`)?.tileset}`);
  }

  /**
   * 몬스터 스프라이트 가져오기 (외부 또는 프로시저럴)
   * @param {number} monsterId
   * @param {'front'|'back'} view
   * @param {object} spriteConfig - 프로시저럴 폴백용
   * @param {Function} proceduralFn - 프로시저럴 생성 함수
   * @returns {Image|Canvas}
   */
  getMonsterSprite(monsterId, view, spriteConfig, proceduralFn) {
    const key = `monster_${monsterId}_${view}`;

    // 1. 외부 에셋이 있으면 사용
    const external = this.get(key);
    if (external) return external;

    // 2. 프로시저럴 캐시 확인
    const procKey = `proc_${key}`;
    const cached = this.get(procKey);
    if (cached) return cached;

    // 3. 프로시저럴 생성 & 캐시
    if (proceduralFn && spriteConfig) {
      const generated = proceduralFn(spriteConfig, 64);
      if (generated) {
        this.set(procKey, generated);
        return generated;
      }
    }

    return null;
  }
}

export const AssetLoader = new AssetLoaderClass();
