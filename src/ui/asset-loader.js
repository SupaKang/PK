/**
 * asset-loader.js — Image asset loading system
 * Loads PNG/sprite assets via fetch, returns Image elements
 */

export class AssetLoader {
  constructor() {
    /** @type {Map<string, HTMLImageElement>} */
    this.cache = new Map();
    /** @type {Map<string, Promise<HTMLImageElement>>} */
    this._pending = new Map();
    this.totalAssets = 0;
    this.loadedAssets = 0;
  }

  /**
   * Load a single image by key and path
   * @param {string} key - Unique identifier
   * @param {string} path - URL or relative path to image
   * @returns {Promise<HTMLImageElement>}
   */
  load(key, path) {
    if (this.cache.has(key)) {
      return Promise.resolve(this.cache.get(key));
    }
    if (this._pending.has(key)) {
      return this._pending.get(key);
    }

    this.totalAssets++;
    const promise = new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        this.cache.set(key, img);
        this.loadedAssets++;
        this._pending.delete(key);
        resolve(img);
      };
      img.onerror = () => {
        this._pending.delete(key);
        console.warn(`[AssetLoader] Failed to load: ${key} (${path})`);
        // Create a fallback placeholder
        const fallback = this._createPlaceholder(32, 32, key);
        this.cache.set(key, fallback);
        this.loadedAssets++;
        resolve(fallback);
      };
      img.src = path;
    });

    this._pending.set(key, promise);
    return promise;
  }

  /**
   * Load multiple assets from a manifest
   * @param {Array<{key: string, path: string}>} manifest
   * @returns {Promise<void>}
   */
  async loadAll(manifest) {
    await Promise.all(manifest.map(({ key, path }) => this.load(key, path)));
  }

  /**
   * Get a loaded image by key
   * @param {string} key
   * @returns {HTMLImageElement|null}
   */
  get(key) {
    return this.cache.get(key) || null;
  }

  /**
   * Check if all queued assets are loaded
   */
  get isComplete() {
    return this.loadedAssets >= this.totalAssets && this._pending.size === 0;
  }

  /**
   * Loading progress 0..1
   */
  get progress() {
    return this.totalAssets === 0 ? 1 : this.loadedAssets / this.totalAssets;
  }

  /**
   * Create a colored placeholder canvas converted to image
   */
  _createPlaceholder(w, h, label) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#FF00FF';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#000000';
    ctx.fillRect(2, 2, w - 4, h - 4);
    ctx.fillStyle = '#FF00FF';
    ctx.font = '8px monospace';
    ctx.fillText(label.slice(0, 6), 3, h / 2 + 3);
    // Convert canvas to image for consistency
    const img = new Image();
    img.src = c.toDataURL();
    img.width = w;
    img.height = h;
    return img;
  }
}
