/**
 * Pocket Kingdom — Expedition / AP / Time System
 *
 * Players (계약자) venture into dangerous zones on timed expeditions.
 * Each expedition is governed by Action Points (AP). The party must
 * complete its objective and RETURN to the start location before AP
 * runs out, or suffer harsh penalties.
 *
 * Self-contained — zero imports.
 */

// ── Time-of-day table (repeats every 240 AP spent) ─────────────────
const TIME_PHASES = [
  { name: 'morning', label: '아침', apStart: 0,   apEnd: 59,  magiDensity: 0.1 },
  { name: 'day',     label: '낮',   apStart: 60,  apEnd: 119, magiDensity: 0.2 },
  { name: 'evening', label: '저녁', apStart: 120, apEnd: 179, magiDensity: 0.5 },
  { name: 'night',   label: '밤',   apStart: 180, apEnd: 239, magiDensity: 0.9 },
];

const AP_CYCLE = 240;

/**
 * Resolve the current time-phase from total AP spent.
 * Wraps every 240 AP so longer expeditions cycle through day/night.
 */
function _resolvePhase(apSpent) {
  const wrapped = ((apSpent % AP_CYCLE) + AP_CYCLE) % AP_CYCLE; // safe modulo
  for (const phase of TIME_PHASES) {
    if (wrapped >= phase.apStart && wrapped <= phase.apEnd) {
      return phase;
    }
  }
  return TIME_PHASES[0]; // fallback
}

export class ExpeditionManager {
  constructor() {
    /** @type {number} Maximum AP for the current expedition */
    this.maxAP = 240;

    /** @type {number} Remaining AP */
    this.currentAP = 240;

    /** @type {boolean} Whether an expedition is currently active */
    this.isActive = false;

    /** @type {string|null} Map ID where the expedition started */
    this.startLocation = null;

    /** @type {{type:string, target:string, description:string}|null} */
    this.objective = null;

    /** @type {boolean} Whether the current objective has been completed */
    this.objectiveComplete = false;

    /**
     * Internal tracker — the map the party is currently standing on.
     * Set externally by the movement / map system so canReturn() works.
     * @type {string|null}
     */
    this.currentLocation = null;

    /** @type {number} Total AP spent during this expedition (for time calc) */
    this._apSpent = 0;
  }

  // ── Time of Day ──────────────────────────────────────────────────

  /**
   * Returns the current time-of-day phase name.
   * @returns {'morning'|'day'|'evening'|'night'}
   */
  getTimeOfDay() {
    return _resolvePhase(this._apSpent).name;
  }

  /**
   * Maps AP spent into a 0-23 hour value.
   * 240 AP = 24 hours, so 10 AP ≈ 1 hour.
   * @returns {number} 0-23
   */
  getHourOfDay() {
    const wrapped = ((this._apSpent % AP_CYCLE) + AP_CYCLE) % AP_CYCLE;
    return Math.floor((wrapped / AP_CYCLE) * 24);
  }

  /**
   * Current Magi density — higher at night.
   * Drives encounter rate and wild-monster level scaling.
   * @returns {number} 0.0–1.0
   */
  getMagiDensity() {
    return _resolvePhase(this._apSpent).magiDensity;
  }

  // ── AP Management ────────────────────────────────────────────────

  /**
   * Attempt to spend AP. Returns false (without deducting) when
   * the party doesn't have enough.
   * @param {number} amount
   * @returns {boolean}
   */
  spendAP(amount) {
    if (amount < 0) return false;
    if (this.currentAP < amount) return false;
    this.currentAP -= amount;
    this._apSpent += amount;
    return true;
  }

  /**
   * @returns {number} Remaining AP
   */
  getRemainingAP() {
    return this.currentAP;
  }

  /**
   * Ratio of remaining AP to maxAP — useful for a UI progress bar.
   * @returns {number} 0.0 (empty) – 1.0 (full)
   */
  getAPRatio() {
    if (this.maxAP <= 0) return 0;
    return this.currentAP / this.maxAP;
  }

  // ── Expedition Lifecycle ─────────────────────────────────────────

  /**
   * Begin a new expedition.
   * @param {object} config
   * @param {number}  [config.maxAP=240]
   * @param {string}  config.startLocation — map ID
   * @param {{type:string, target:string, description:string}} config.objective
   */
  startExpedition(config) {
    if (this.isActive) {
      throw new Error('이미 탐사가 진행 중입니다.');
    }

    this.maxAP             = config.maxAP ?? 240;
    this.currentAP         = this.maxAP;
    this.isActive          = true;
    this.startLocation     = config.startLocation;
    this.currentLocation   = config.startLocation;
    this.objective         = config.objective ?? null;
    this.objectiveComplete = false;
    this._apSpent          = 0;
  }

  /**
   * Mark the current objective as completed.
   */
  completeObjective() {
    this.objectiveComplete = true;
  }

  /**
   * Check whether the party is back at the starting location.
   * @returns {boolean}
   */
  canReturn() {
    return this.currentLocation === this.startLocation;
  }

  /**
   * End the expedition successfully — the party made it back.
   * Remaining AP is converted to bonus EXP.
   * @returns {{bonusAP:number, bonusExp:number, message:string}}
   */
  returnSafely() {
    if (!this.isActive) {
      throw new Error('활성 탐사가 없습니다.');
    }

    const remaining = this.currentAP;
    const result = {
      bonusAP:  remaining,
      bonusExp: remaining * 10,
      message:  '무사히 귀환했다!',
    };

    this._resetState();
    return result;
  }

  /**
   * Expedition failed — AP ran out or party was wiped.
   * @param {number} [currentMoney=0] The player's wallet, used to
   *   calculate the money penalty.
   * @returns {{moneyLost:number, itemsLost:boolean, message:string}}
   */
  failExpedition(currentMoney = 0) {
    if (!this.isActive) {
      throw new Error('활성 탐사가 없습니다.');
    }

    const result = {
      moneyLost: Math.floor(currentMoney * 0.5),
      itemsLost: true, // lose non-key items gained during expedition
      message:   '마석의 빛이 꺼졌다... 구조대에 의해 마을로 돌아왔다.',
    };

    this._resetState();
    return result;
  }

  // ── Internal ─────────────────────────────────────────────────────

  /** Reset all expedition state back to idle. */
  _resetState() {
    this.isActive          = false;
    this.startLocation     = null;
    this.currentLocation   = null;
    this.objective         = null;
    this.objectiveComplete = false;
    this.currentAP         = 0;
    this.maxAP             = 240;
    this._apSpent          = 0;
  }

  // ── Serialization ────────────────────────────────────────────────

  /**
   * Serialize expedition state for save data.
   * @returns {object}
   */
  serialize() {
    return {
      maxAP:             this.maxAP,
      currentAP:         this.currentAP,
      isActive:          this.isActive,
      startLocation:     this.startLocation,
      currentLocation:   this.currentLocation,
      objective:         this.objective,
      objectiveComplete: this.objectiveComplete,
      _apSpent:          this._apSpent,
    };
  }

  /**
   * Rebuild an ExpeditionManager from serialized data.
   * @param {object} data — output of serialize()
   * @returns {ExpeditionManager}
   */
  static deserialize(data) {
    const em = new ExpeditionManager();
    em.maxAP             = data.maxAP             ?? 240;
    em.currentAP         = data.currentAP         ?? 240;
    em.isActive          = data.isActive           ?? false;
    em.startLocation     = data.startLocation      ?? null;
    em.currentLocation   = data.currentLocation    ?? null;
    em.objective         = data.objective          ?? null;
    em.objectiveComplete = data.objectiveComplete  ?? false;
    em._apSpent          = data._apSpent           ?? 0;
    return em;
  }
}
