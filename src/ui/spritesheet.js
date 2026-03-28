/**
 * spritesheet.js — SpriteSheet frame extraction and animation
 * Extracts frames from a loaded spritesheet image using source rects
 */

export class SpriteSheet {
  /**
   * @param {HTMLImageElement} image - The loaded spritesheet image
   * @param {number} frameWidth - Width of a single frame
   * @param {number} frameHeight - Height of a single frame
   */
  constructor(image, frameWidth, frameHeight) {
    this.image = image;
    this.frameWidth = frameWidth;
    this.frameHeight = frameHeight;
    this.cols = Math.floor(image.width / frameWidth) || 1;
    this.rows = Math.floor(image.height / frameHeight) || 1;
    this.totalFrames = this.cols * this.rows;
  }

  /**
   * Draw a specific frame to a canvas context
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} frameIndex - Frame number (0-based, left-to-right, top-to-bottom)
   * @param {number} dx - Destination X
   * @param {number} dy - Destination Y
   * @param {number} [dw] - Destination width (defaults to frameWidth)
   * @param {number} [dh] - Destination height (defaults to frameHeight)
   */
  drawFrame(ctx, frameIndex, dx, dy, dw, dh) {
    const col = frameIndex % this.cols;
    const row = Math.floor(frameIndex / this.cols);
    const sx = col * this.frameWidth;
    const sy = row * this.frameHeight;
    ctx.drawImage(
      this.image,
      sx, sy, this.frameWidth, this.frameHeight,
      dx | 0, dy | 0,
      (dw || this.frameWidth) | 0,
      (dh || this.frameHeight) | 0
    );
  }

  /**
   * Get source rect for a frame (for external rendering)
   * @param {number} frameIndex
   * @returns {{sx: number, sy: number, sw: number, sh: number}}
   */
  getFrameRect(frameIndex) {
    const col = frameIndex % this.cols;
    const row = Math.floor(frameIndex / this.cols);
    return {
      sx: col * this.frameWidth,
      sy: row * this.frameHeight,
      sw: this.frameWidth,
      sh: this.frameHeight,
    };
  }
}

/**
 * Animated sprite using a SpriteSheet
 */
export class AnimatedSprite {
  /**
   * @param {SpriteSheet} sheet
   * @param {Object} animations - { name: { frames: [0,1,2,3], speed: 0.15 } }
   */
  constructor(sheet, animations) {
    this.sheet = sheet;
    this.animations = animations;
    this.currentAnim = Object.keys(animations)[0];
    this.frameTimer = 0;
    this.currentFrameIdx = 0;
  }

  /**
   * Set the current animation
   * @param {string} name
   */
  play(name) {
    if (name !== this.currentAnim && this.animations[name]) {
      this.currentAnim = name;
      this.currentFrameIdx = 0;
      this.frameTimer = 0;
    }
  }

  /**
   * Update animation timer
   * @param {number} dt - Delta time in seconds
   */
  update(dt) {
    const anim = this.animations[this.currentAnim];
    if (!anim || anim.frames.length <= 1) return;

    this.frameTimer += dt;
    if (this.frameTimer >= anim.speed) {
      this.frameTimer -= anim.speed;
      this.currentFrameIdx = (this.currentFrameIdx + 1) % anim.frames.length;
    }
  }

  /**
   * Draw the current animation frame
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} x
   * @param {number} y
   * @param {number} [w]
   * @param {number} [h]
   */
  draw(ctx, x, y, w, h) {
    const anim = this.animations[this.currentAnim];
    if (!anim) return;
    const frame = anim.frames[this.currentFrameIdx];
    this.sheet.drawFrame(ctx, frame, x, y, w, h);
  }
}
