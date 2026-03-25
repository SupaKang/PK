/**
 * character-controller.js
 * Grid-based character controller for tile map movement and sprite rendering.
 * ZERO imports — fully standalone.
 */

// ---------------------------------------------------------------------------
// Sprite rendering helpers
// ---------------------------------------------------------------------------

/**
 * Draw a single "pixel" in the 16x16 sprite grid, scaled up.
 */
function drawPixel(ctx, x, y, px, py, scale, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x + px * scale, y + py * scale, scale, scale);
}

/**
 * Render a procedural 16x16 pixel-art human character.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x        top-left screen X
 * @param {number} y        top-left screen Y
 * @param {string} direction 'down'|'up'|'left'|'right'
 * @param {number} frame     0 = idle, 1 = step
 * @param {string} baseColor   body / shirt colour
 * @param {string} accentColor legs / detail colour
 * @param {number} scale       pixels per sprite-pixel (2 → 32x32)
 */
export function renderCharacterSprite(
  ctx, x, y, direction, frame, baseColor, accentColor, scale
) {
  const s = scale || 2;
  const skin = '#FFDCB0';
  const hair = '#4A3728';
  const shoe = '#333333';

  // Facing flags
  const facingDown  = direction === 'down';
  const facingUp    = direction === 'up';
  const facingLeft  = direction === 'left';
  const facingRight = direction === 'right';

  // ------ Hair / back of head (row 1-2) ------
  if (facingUp) {
    // Show hair instead of face when facing up
    for (let px = 6; px <= 9; px++) {
      for (let py = 1; py <= 2; py++) {
        drawPixel(ctx, x, y, px, py, s, hair);
      }
    }
  } else {
    // Hair top row
    for (let px = 6; px <= 9; px++) {
      drawPixel(ctx, x, y, px, 1, s, hair);
    }
  }

  // ------ Head (rows 2-5, cols 6-9  →  4x4) ------
  if (!facingUp) {
    // Skin for face area
    for (let px = 6; px <= 9; px++) {
      for (let py = 2; py <= 4; py++) {
        drawPixel(ctx, x, y, px, py, s, skin);
      }
    }

    // Eyes (row 3)
    if (facingDown) {
      drawPixel(ctx, x, y, 7, 3, s, '#222');
      drawPixel(ctx, x, y, 8, 3, s, '#222');
    } else if (facingLeft) {
      drawPixel(ctx, x, y, 6, 3, s, '#222');
    } else if (facingRight) {
      drawPixel(ctx, x, y, 9, 3, s, '#222');
    }
  } else {
    // Back of head — skin sides
    for (let px = 6; px <= 9; px++) {
      for (let py = 3; py <= 4; py++) {
        drawPixel(ctx, x, y, px, py, s, skin);
      }
    }
  }

  // ------ Body / shirt (rows 5-10, cols 6-9  →  4x6) ------
  for (let px = 6; px <= 9; px++) {
    for (let py = 5; py <= 10; py++) {
      drawPixel(ctx, x, y, px, py, s, baseColor);
    }
  }

  // ------ Arms (cols 5 and 10, rows 5-8  →  1x4 each) ------
  if (facingLeft) {
    // Left-facing: only left arm visible (col 5), thicker
    for (let py = 5; py <= 8; py++) {
      drawPixel(ctx, x, y, 5, py, s, skin);
    }
  } else if (facingRight) {
    // Right-facing: only right arm visible (col 10)
    for (let py = 5; py <= 8; py++) {
      drawPixel(ctx, x, y, 10, py, s, skin);
    }
  } else {
    // Front / back: both arms
    for (let py = 5; py <= 8; py++) {
      drawPixel(ctx, x, y, 5, py, s, skin);
      drawPixel(ctx, x, y, 10, py, s, skin);
    }
  }

  // ------ Legs (rows 11-13, two legs each 2 wide) ------
  // Idle (frame 0): legs together, left = cols 6-7, right = cols 8-9
  // Step (frame 1): legs offset — one forward, one back
  if (frame === 0) {
    // Left leg
    for (let py = 11; py <= 13; py++) {
      drawPixel(ctx, x, y, 6, py, s, accentColor);
      drawPixel(ctx, x, y, 7, py, s, accentColor);
    }
    // Right leg
    for (let py = 11; py <= 13; py++) {
      drawPixel(ctx, x, y, 8, py, s, accentColor);
      drawPixel(ctx, x, y, 9, py, s, accentColor);
    }
    // Shoes
    drawPixel(ctx, x, y, 6, 14, s, shoe);
    drawPixel(ctx, x, y, 7, 14, s, shoe);
    drawPixel(ctx, x, y, 8, 14, s, shoe);
    drawPixel(ctx, x, y, 9, 14, s, shoe);
  } else {
    // Walking frame — offset legs based on direction
    const spread = (facingLeft || facingUp) ? -1 : 1;

    // Left leg (forward)
    for (let py = 11; py <= 13; py++) {
      const offsetPy = py + (facingDown || facingUp ? -spread : 0);
      const offsetPx = (facingLeft || facingRight) ? 6 + spread : 6;
      drawPixel(ctx, x, y, offsetPx, offsetPy, s, accentColor);
      drawPixel(ctx, x, y, offsetPx + 1, offsetPy, s, accentColor);
    }
    // Left shoe
    {
      const offsetPy = 14 + (facingDown || facingUp ? -spread : 0);
      const offsetPx = (facingLeft || facingRight) ? 6 + spread : 6;
      drawPixel(ctx, x, y, offsetPx, offsetPy, s, shoe);
      drawPixel(ctx, x, y, offsetPx + 1, offsetPy, s, shoe);
    }

    // Right leg (back)
    for (let py = 11; py <= 13; py++) {
      const offsetPy = py + (facingDown || facingUp ? spread : 0);
      const offsetPx = (facingLeft || facingRight) ? 8 - spread : 8;
      drawPixel(ctx, x, y, offsetPx, offsetPy, s, accentColor);
      drawPixel(ctx, x, y, offsetPx + 1, offsetPy, s, accentColor);
    }
    // Right shoe
    {
      const offsetPy = 14 + (facingDown || facingUp ? spread : 0);
      const offsetPx = (facingLeft || facingRight) ? 8 - spread : 8;
      drawPixel(ctx, x, y, offsetPx, offsetPy, s, shoe);
      drawPixel(ctx, x, y, offsetPx + 1, offsetPy, s, shoe);
    }
  }

  // ------ Belt detail (accent stripe across waist) ------
  for (let px = 6; px <= 9; px++) {
    drawPixel(ctx, x, y, px, 8, s, accentColor);
  }
}

// ---------------------------------------------------------------------------
// Direction deltas
// ---------------------------------------------------------------------------

const DIR_DELTA = {
  up:    { dx:  0, dy: -1 },
  down:  { dx:  0, dy:  1 },
  left:  { dx: -1, dy:  0 },
  right: { dx:  1, dy:  0 },
};

const KEY_TO_DIR = {
  ArrowUp:    'up',
  ArrowDown:  'down',
  ArrowLeft:  'left',
  ArrowRight: 'right',
  w: 'up',
  s: 'down',
  a: 'left',
  d: 'right',
};

// ---------------------------------------------------------------------------
// CharacterController
// ---------------------------------------------------------------------------

const TILE_SIZE = 64;
const MOVE_SPEED = 4; // tiles per second

export class CharacterController {
  constructor() {
    // Grid position (integer tile coords)
    this._tileX = 0;
    this._tileY = 0;

    // Pixel position (for smooth interpolation)
    this._worldX = 0;
    this._worldY = 0;

    // Movement
    this._moving = false;
    this._moveProgress = 0;   // 0..1
    this._moveFromX = 0;
    this._moveFromY = 0;
    this._moveToX = 0;
    this._moveToY = 0;
    this._queuedDir = null;

    // Direction & animation
    this._direction = 'down';
    this._animFrame = 0;
    this._animTimer = 0;

    // Appearance
    this._classId = 'warrior';
    this._baseColor = '#3366CC';
    this._accentColor = '#223388';

    // Collision checker  (tx, ty) → boolean
    this._isBlocked = null;

    // Map bounds (set via setMapSize, defaults to very large)
    this._mapW = 9999;
    this._mapH = 9999;
  }

  // ---- Setters -----------------------------------------------------------

  /** Place the character on a tile instantly (no animation). */
  setPosition(tileX, tileY) {
    this._tileX = tileX;
    this._tileY = tileY;
    this._worldX = tileX * TILE_SIZE;
    this._worldY = tileY * TILE_SIZE;
    this._moving = false;
    this._moveProgress = 0;
  }

  /** Set facing direction without moving. */
  setDirection(dir) {
    if (DIR_DELTA[dir]) {
      this._direction = dir;
    }
  }

  /** Set the player's visual appearance. */
  setAppearance(classId, baseColor, accentColor) {
    this._classId = classId || this._classId;
    this._baseColor = baseColor || this._baseColor;
    this._accentColor = accentColor || this._accentColor;
  }

  /** Provide a collision callback: fn(tileX, tileY) → boolean. */
  setCollisionChecker(fn) {
    this._isBlocked = fn;
  }

  /** Tell the controller the map dimensions (in tiles) for edge clamping. */
  setMapSize(w, h) {
    this._mapW = w;
    this._mapH = h;
  }

  // ---- Queries -----------------------------------------------------------

  isMoving() {
    return this._moving;
  }

  getTileX() {
    return this._tileX;
  }

  getTileY() {
    return this._tileY;
  }

  /** Pixel X (top-left of the tile the character occupies / is heading to). */
  getWorldX() {
    return this._worldX;
  }

  /** Pixel Y. */
  getWorldY() {
    return this._worldY;
  }

  /** Return the tile coordinate the player is currently facing. */
  getFacingTile() {
    const d = DIR_DELTA[this._direction];
    return {
      x: this._tileX + d.dx,
      y: this._tileY + d.dy,
    };
  }

  // ---- Update ------------------------------------------------------------

  /**
   * @param {number} dt  Delta time in seconds.
   * @param {object} keys  Map of key names to booleans, e.g. { ArrowUp: true }.
   */
  update(dt, keys) {
    if (this._moving) {
      this._updateMove(dt);
      // While moving, remember held direction for continuous movement
      this._queuedDir = this._readDirection(keys);
    } else {
      // Try to start a new move
      let dir = this._queuedDir || this._readDirection(keys);
      this._queuedDir = null;

      if (dir) {
        this._direction = dir;
        const d = DIR_DELTA[dir];
        const nx = this._tileX + d.dx;
        const ny = this._tileY + d.dy;

        if (this._canMoveTo(nx, ny)) {
          this._startMove(nx, ny);
        } else {
          // Blocked — just face that direction, check for held key
          // so that releasing and pressing again works
        }
      }

      // While idle, tick a simple anim timer so frame resets
      this._animFrame = 0;
    }
  }

  // ---- Render ------------------------------------------------------------

  /**
   * Render the character at the given screen coordinates.
   * screenX/screenY should be the top-left pixel for the tile on screen.
   */
  render(ctx, screenX, screenY) {
    renderCharacterSprite(
      ctx,
      screenX, screenY,
      this._direction,
      this._animFrame,
      this._baseColor,
      this._accentColor,
      4 // scale: 16→64
    );
  }

  // ---- Internal ----------------------------------------------------------

  _readDirection(keys) {
    for (const key in KEY_TO_DIR) {
      if (keys[key]) return KEY_TO_DIR[key];
    }
    return null;
  }

  _canMoveTo(tx, ty) {
    // Map edge check
    if (tx < 0 || ty < 0 || tx >= this._mapW || ty >= this._mapH) {
      return false;
    }
    // Collision callback
    if (this._isBlocked && this._isBlocked(tx, ty)) {
      return false;
    }
    return true;
  }

  _startMove(toX, toY) {
    this._moving = true;
    this._moveProgress = 0;
    this._moveFromX = this._tileX * TILE_SIZE;
    this._moveFromY = this._tileY * TILE_SIZE;
    this._moveToX = toX * TILE_SIZE;
    this._moveToY = toY * TILE_SIZE;
    this._tileX = toX;
    this._tileY = toY;
    this._animFrame = 1; // walking frame
  }

  _updateMove(dt) {
    this._moveProgress += dt * MOVE_SPEED;

    if (this._moveProgress >= 1) {
      // Arrived
      this._moveProgress = 1;
      this._worldX = this._moveToX;
      this._worldY = this._moveToY;
      this._moving = false;
      this._animFrame = 0;
    } else {
      // Interpolate
      const t = this._moveProgress;
      this._worldX = this._moveFromX + (this._moveToX - this._moveFromX) * t;
      this._worldY = this._moveFromY + (this._moveToY - this._moveFromY) * t;
      // Alternate walk frame
      this._animFrame = (t < 0.5) ? 1 : 0;
    }
  }
}

// ---------------------------------------------------------------------------
// NPC colour map
// ---------------------------------------------------------------------------

const NPC_TYPE_COLORS = {
  citizen:    { base: '#4488CC', accent: '#2255AA' },
  shopkeeper: { base: '#44AA55', accent: '#227733' },
  healer:     { base: '#EEEEFF', accent: '#AABBDD' },
  trainer:    { base: '#CC4444', accent: '#882222' },
  gym_leader: { base: '#DDAA22', accent: '#AA7711' },
  boss:       { base: '#992266', accent: '#661144' },
};

const DEFAULT_NPC_COLOR = { base: '#888888', accent: '#555555' };

// ---------------------------------------------------------------------------
// NpcSprite
// ---------------------------------------------------------------------------

export class NpcSprite {
  /**
   * @param {object} npcData  { id, x, y, name, sprite, type, direction }
   */
  constructor(npcData) {
    this.id = npcData.id;
    this.x = npcData.x;           // tile X
    this.y = npcData.y;           // tile Y
    this.name = npcData.name || '';
    this.sprite = npcData.sprite || 'person';
    this.type = npcData.type || 'citizen';
    this.direction = npcData.direction || 'down';

    const colors = NPC_TYPE_COLORS[this.type] || DEFAULT_NPC_COLOR;
    this.baseColor = colors.base;
    this.accentColor = colors.accent;

    // Idle animation
    this._animTimer = 0;
    this._animFrame = 0;
  }

  /**
   * Render the NPC at the given screen position.
   */
  render(ctx, screenX, screenY) {
    renderCharacterSprite(
      ctx,
      screenX, screenY,
      this.direction,
      this._animFrame,
      this.baseColor,
      this.accentColor,
      4 // scale: 16→64
    );
  }
}
