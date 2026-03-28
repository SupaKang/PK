/**
 * map-ui.js — Map screen: player movement, camera, map transitions
 * Handles the MAP game state
 */

import { RENDER_TILE } from '../world/map.js';

// Direction vectors for 4-way grid movement
const DIR = {
  ArrowUp:    { dx: 0, dy: -1, facing: 'north' },
  ArrowDown:  { dx: 0, dy: 1,  facing: 'south' },
  ArrowLeft:  { dx: -1, dy: 0, facing: 'west' },
  ArrowRight: { dx: 1, dy: 0,  facing: 'east' },
  KeyW:       { dx: 0, dy: -1, facing: 'north' },
  KeyS:       { dx: 0, dy: 1,  facing: 'south' },
  KeyA:       { dx: -1, dy: 0, facing: 'west' },
  KeyD:       { dx: 1, dy: 0,  facing: 'east' },
};

export class MapUI {
  /**
   * @param {import('./tilemap-engine.js').TilemapEngine} tilemapEngine
   * @param {import('../world/map.js').MapManager} mapManager
   */
  constructor(tilemapEngine, mapManager) {
    this.tilemapEngine = tilemapEngine;
    this.mapManager = mapManager;

    // Player state (tile coords)
    this.playerX = 7;
    this.playerY = 7;
    this.playerFacing = 'south';

    // Movement cooldown (grid-based, not pixel-based)
    this.moveCooldown = 0;
    this.moveSpeed = 0.15; // seconds between moves when holding key

    // Smooth movement interpolation
    this.renderX = this.playerX;
    this.renderY = this.playerY;
    this.moveProgress = 1; // 0..1 interpolation
    this.prevX = this.playerX;
    this.prevY = this.playerY;
    this.lerpSpeed = 8; // interpolation speed

    // NPCs
    this.npcs = [];

    // Player sprite
    this.assetLoader = null;
    this.walkFrameTimer = 0;
    this.walkFrame = 0;
    this.walkFrameCount = 6; // PixelLab walk frames (6 for old, 2+ for GBC)
    this.isMoving = false;

    // Transition state
    this.transitioning = false;
    this.transitionAlpha = 0;
    this.transitionTarget = null;
    this.transitionPhase = 'fadeOut';
    this.lastTransitionMapId = null;

    // Gate message
    this.gateMessage = null;
    this.gateMessageTimer = 0;
  }

  /**
   * Set asset loader for frame-based player sprites
   */
  setAssetLoader(loader) {
    this.assetLoader = loader;
  }

  /**
   * Spawn player at a specific tile
   */
  spawn(tileX, tileY) {
    this.playerX = tileX;
    this.playerY = tileY;
    this.renderX = tileX;
    this.renderY = tileY;
    this.prevX = tileX;
    this.prevY = tileY;
    this.moveProgress = 1;
  }

  /**
   * Update map state
   * @param {number} dt
   * @param {Object} keys - Current key state
   * @param {Object} keysJustPressed
   * @returns {Object|null} State change request {type, data}
   */
  update(dt, keys, keysJustPressed) {
    // Handle map transition fade
    if (this.transitioning) {
      return this._updateTransition(dt);
    }

    // Gate message timer
    if (this.gateMessageTimer > 0) {
      this.gateMessageTimer -= dt;
      if (this.gateMessageTimer <= 0) {
        this.gateMessage = null;
      }
    }

    // Smooth movement interpolation
    if (this.moveProgress < 1) {
      this.moveProgress = Math.min(1, this.moveProgress + dt * this.lerpSpeed);
      this.renderX = this.prevX + (this.playerX - this.prevX) * this.moveProgress;
      this.renderY = this.prevY + (this.playerY - this.prevY) * this.moveProgress;
    }

    // Movement cooldown
    this.moveCooldown = Math.max(0, this.moveCooldown - dt);

    // Check for movement input (keys = held, keysJustPressed = tap)
    this.isMoving = false;
    if (this.moveCooldown <= 0) {
      for (const [key, dir] of Object.entries(DIR)) {
        if (keys[key] || keysJustPressed[key]) {
          this.playerFacing = dir.facing;
          const newX = this.playerX + dir.dx;
          const newY = this.playerY + dir.dy;

          const map = this.mapManager.currentMap;
          if (map && map.isPassable(newX, newY)) {
            this.prevX = this.playerX;
            this.prevY = this.playerY;
            this.playerX = newX;
            this.playerY = newY;
            this.moveProgress = 0;
            this.moveCooldown = this.moveSpeed;
            this.isMoving = true;

            // Check for exit
            const exit = map.getExitAt(newX, newY);
            if (exit) {
              this._startTransition(exit);
            }
          }
          break; // Only process first active direction
        }
      }
    }

    // Walk animation
    if (this.isMoving || this.moveProgress < 1) {
      this.walkFrameTimer += dt;
      if (this.walkFrameTimer >= 0.12) {
        this.walkFrameTimer -= 0.12;
        this.walkFrame = (this.walkFrame + 1) % this.walkFrameCount;
      }
    } else {
      this.walkFrame = 0;
      this.walkFrameTimer = 0;
    }

    // Update camera
    if (this.mapManager.currentMap) {
      this.tilemapEngine.followTarget(
        this.renderX, this.renderY,
        this.mapManager.currentMap.width,
        this.mapManager.currentMap.height
      );
    }

    // Return 'moved' event when player stepped to a new tile
    return this.isMoving ? 'moved' : null;
  }

  /**
   * Render the map screen
   * @param {import('./renderer.js').Renderer} renderer
   */
  render(renderer) {
    const ctx = renderer.ctx;
    const map = this.mapManager.currentMap;
    if (!map) return;

    renderer.clear('#0a0a16');

    // Render tilemap + objects
    this.tilemapEngine.render(ctx, map);

    // Render NPCs (4-direction, face toward player)
    if (this.npcs) {
      const CHAR_SIZE = 32; // GBC character sprite size
      const CHAR_RENDER = RENDER_TILE * 2; // 32px on 480×270 canvas (2 tiles tall)
      for (const npc of this.npcs) {
        const sx = npc.x * RENDER_TILE - this.tilemapEngine.cameraX;
        const sy = npc.y * RENDER_TILE - this.tilemapEngine.cameraY - (CHAR_RENDER - RENDER_TILE);
        if (sx < -CHAR_RENDER || sy < -CHAR_RENDER || sx > renderer.width || sy > renderer.height) continue;

        // NPC faces player when nearby
        let npcFacing = npc.facing || 'south';
        const dx = this.playerX - npc.x;
        const dy = this.playerY - npc.y;
        const dist = Math.abs(dx) + Math.abs(dy);
        if (dist <= 3) {
          if (Math.abs(dx) > Math.abs(dy)) npcFacing = dx > 0 ? 'east' : 'west';
          else npcFacing = dy > 0 ? 'south' : 'north';
        }

        const img = this.assetLoader ? this.assetLoader.get(npc.sprite + '_' + npcFacing) : null;
        if (img && img.complete && (img.naturalWidth > 0 || img.width > 0)) {
          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(img, sx | 0, sy | 0, CHAR_RENDER, CHAR_RENDER);
        } else {
          // Try south fallback
          const fallback = this.assetLoader ? this.assetLoader.get(npc.sprite + '_south') : null;
          if (fallback && fallback.complete && (fallback.naturalWidth > 0 || fallback.width > 0)) {
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(fallback, sx | 0, sy | 0, CHAR_RENDER, CHAR_RENDER);
          } else {
            ctx.fillStyle = '#DD88AA';
            ctx.fillRect((sx + 4) | 0, (sy + 4) | 0, CHAR_RENDER - 8, CHAR_RENDER - 8);
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect((sx + 8) | 0, (sy + 8) | 0, 2, 2);
            ctx.fillRect((sx + 14) | 0, (sy + 8) | 0, 2, 2);
          }
        }
      }
    }

    // Render player
    this._renderPlayer(ctx);

    // Map name overlay
    renderer.setAlpha(0.7);
    renderer.fillRect(0, 0, renderer.width, 10, '#000000');
    renderer.resetAlpha();
    renderer.drawText(map.name, 2, 2, '#FFFFFF', 1);

    // Gate message
    if (this.gateMessage) {
      const msgW = renderer.measureText(this.gateMessage, 1) + 10;
      const msgX = (renderer.width - msgW) / 2;
      renderer.fillRect(msgX, 120, msgW, 16, '#000000');
      renderer.strokeRect(msgX, 120, msgW, 16, '#FFD700');
      renderer.drawTextCentered(this.gateMessage, 124, '#FFD700', 1);
    }

    // Transition fade
    if (this.transitioning) {
      renderer.setAlpha(this.transitionAlpha);
      renderer.fillRect(0, 0, renderer.width, renderer.height, '#000000');
      renderer.resetAlpha();
    }

    // Debug: player tile coords
    renderer.drawText(
      `[${this.playerX},${this.playerY}]`, renderer.width - 80, 6, '#888888', 1
    );
  }

  // === Private ===

  _renderPlayer(ctx) {
    const CHAR_RENDER = RENDER_TILE * 2; // 32px character on 16px grid
    const screenX = this.renderX * RENDER_TILE - this.tilemapEngine.cameraX;
    const screenY = this.renderY * RENDER_TILE - this.tilemapEngine.cameraY - (CHAR_RENDER - RENDER_TILE);
    const size = CHAR_RENDER;
    const dirName = this.playerFacing || 'south';

    if (this.assetLoader) {
      let img = null;

      // Try walk frame if moving
      if (this.isMoving || this.moveProgress < 1) {
        img = this.assetLoader.get(`player_walk_${dirName}_${this.walkFrame}`);
      }
      // Fall back to idle rotation
      if (!img) {
        img = this.assetLoader.get(`player_${dirName}`);
      }

      if (img && img.complete && (img.naturalWidth > 0 || img.width > 0)) {
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(img, screenX | 0, screenY | 0, size, size);
        return;
      }
    }

    // Fallback: colored rectangle
    ctx.fillStyle = '#44aaff';
    ctx.fillRect((screenX + 8) | 0, (screenY + 4) | 0, size - 16, size - 8);
    ctx.fillStyle = '#ffffff';
    const cx = screenX + size / 2;
    const cy = screenY + size / 2;
    switch (this.playerFacing) {
      case 'north': ctx.fillRect(cx - 2, cy - 12, 4, 4); break;
      case 'south': ctx.fillRect(cx - 2, cy + 8, 4, 4); break;
      case 'left':  ctx.fillRect(cx - 12, cy - 2, 4, 4); break;
      case 'right': ctx.fillRect(cx + 8, cy - 2, 4, 4); break;
    }
  }

  _startTransition(exit) {
    // Check badge gate
    const targetData = this.mapManager.mapsData.find(m => m.id === exit.targetMap);
    if (targetData && (targetData.requiredBadges || 0) > this.mapManager.playerBadges) {
      this.gateMessage = `BADGE ${targetData.requiredBadges} REQUIRED`;
      this.gateMessageTimer = 2;
      // Revert position
      this.playerX = this.prevX;
      this.playerY = this.prevY;
      this.renderX = this.prevX;
      this.renderY = this.prevY;
      this.moveProgress = 1;
      return;
    }

    this.transitioning = true;
    this.transitionAlpha = 0;
    this.transitionTarget = exit;
    this.transitionPhase = 'fadeOut';
  }

  _updateTransition(dt) {
    if (this.transitionPhase === 'fadeOut') {
      this.transitionAlpha = Math.min(1, this.transitionAlpha + dt * 3);
      if (this.transitionAlpha >= 1) {
        // Load new map
        const result = this.mapManager.loadMap(this.transitionTarget.targetMap);
        if (result) {
          this.spawn(this.transitionTarget.targetX, this.transitionTarget.targetY);
        }
        this.lastTransitionMapId = this.transitionTarget.targetMap;
        this.transitionPhase = 'fadeIn';
      }
    } else if (this.transitionPhase === 'fadeIn') {
      this.transitionAlpha = Math.max(0, this.transitionAlpha - dt * 3);
      if (this.transitionAlpha <= 0) {
        this.transitioning = false;
        this.transitionTarget = null;
      }
    }
    return null;
  }
}
