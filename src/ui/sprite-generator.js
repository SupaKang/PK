/**
 * sprite-generator.js — Procedural pixel art monster sprite generator
 * Generates unique sprites from color palettes + shape templates + features
 */

import { hexToRgb, rgbToHex, lightenColor, darkenColor } from './renderer.js';

const SPRITE_SIZE = 32; // pixels
const spriteCache = new Map();

/**
 * Build a color palette from base and accent colors
 */
function buildPalette(baseColor, accentColor) {
  return {
    outline: darkenColor(baseColor, 0.6),
    base: baseColor,
    light: lightenColor(baseColor, 0.3),
    dark: darkenColor(baseColor, 0.3),
    accent: accentColor,
    accentLight: lightenColor(accentColor, 0.3),
    eye: '#FFFFFF',
    eyePupil: '#111111',
    belly: lightenColor(baseColor, 0.5),
  };
}

/**
 * Shape templates — define the silhouette for each body type
 * Each is a 16x16 grid (center portion of 32x32 sprite)
 * 0=empty, 1=outline, 2=base, 3=light, 4=dark, 5=accent, 6=eye, 7=belly
 */
const SHAPES = {
  quadruped: [
    '0000000000000000',
    '0000011110000000',
    '0000126621000000',
    '0001222221000000',
    '0001222221000000',
    '0001277221000000',
    '0001222221000000',
    '0001222221000000',
    '0012222221100000',
    '0012222222100000',
    '0012222222100000',
    '0012222222100000',
    '0001200012100000',
    '0001200012100000',
    '0001100011100000',
    '0000000000000000',
  ],
  bipedal: [
    '0000000000000000',
    '0000011110000000',
    '0000126621000000',
    '0001222221000000',
    '0000122210000000',
    '0001222221000000',
    '0001277221000000',
    '0001222221000000',
    '0000122210000000',
    '0000122210000000',
    '0000122210000000',
    '0000122210000000',
    '0000120210000000',
    '0000120210000000',
    '0000110110000000',
    '0000000000000000',
  ],
  amorphous: [
    '0000000000000000',
    '0000000000000000',
    '0000011110000000',
    '0001222221000000',
    '0012266221100000',
    '0012222222100000',
    '0012277222100000',
    '0122222222210000',
    '0122222222210000',
    '0122222222210000',
    '0012222222100000',
    '0001222221000000',
    '0000122210000000',
    '0000011110000000',
    '0000000000000000',
    '0000000000000000',
  ],
  serpent: [
    '0000000000000000',
    '0000011100000000',
    '0000126610000000',
    '0001222210000000',
    '0000122100000000',
    '0000012210000000',
    '0000001221000000',
    '0000012210000000',
    '0000122100000000',
    '0001221000000000',
    '0001221000000000',
    '0000122100000000',
    '0000012210000000',
    '0000001110000000',
    '0000000000000000',
    '0000000000000000',
  ],
  avian: [
    '0000000000000000',
    '0000011110000000',
    '0000126621000000',
    '0001222221000000',
    '0001222221000000',
    '0112277221100000',
    '1222222222210000',
    '0122222222100000',
    '0012222221000000',
    '0001277210000000',
    '0000122100000000',
    '0000122100000000',
    '0000120100000000',
    '0000110100000000',
    '0000000000000000',
    '0000000000000000',
  ],
  humanoid: [
    '0000000000000000',
    '0000011110000000',
    '0000126621000000',
    '0000122221000000',
    '0000011110000000',
    '0000122210000000',
    '0001222221000000',
    '0012277222100000',
    '0001222221000000',
    '0000122210000000',
    '0000122210000000',
    '0000122210000000',
    '0000122210000000',
    '0000120210000000',
    '0000110110000000',
    '0000000000000000',
  ],
  insectoid: [
    '0000000000000000',
    '0001000001000000',
    '0000100010000000',
    '0000011110000000',
    '0000126621000000',
    '0001222221000000',
    '0001222221000000',
    '0012277221100000',
    '0012222222100000',
    '0001222221000000',
    '0001255521000000',
    '0000122210000000',
    '0001020201000000',
    '0010020200100000',
    '0000000000000000',
    '0000000000000000',
  ],
  aquatic: [
    '0000000000000000',
    '0000000000000000',
    '0000011110000000',
    '0001222221000000',
    '0012266222100000',
    '1012222222101000',
    '0122277222210000',
    '0122222222210000',
    '0012222222100000',
    '0001222221000000',
    '0000122310000000',
    '0000011310000000',
    '0000000100000000',
    '0000000000000000',
    '0000000000000000',
    '0000000000000000',
  ],
  elemental: [
    '0000000000000000',
    '0000010100000000',
    '0000111110000000',
    '0001222221000000',
    '0012266221100000',
    '0012222222100000',
    '0122277222100000',
    '0122222222210000',
    '0122255222210000',
    '0012222222100000',
    '0001222221000000',
    '0000155510000000',
    '0000055500000000',
    '0000005000000000',
    '0000000000000000',
    '0000000000000000',
  ],
  mythical: [
    '0000000000000000',
    '0010000000100000',
    '0001011101000000',
    '0001266210000000',
    '0001222210000000',
    '0000122100000000',
    '0001222210000000',
    '0012277221000000',
    '0122222222100000',
    '0122222222100000',
    '0012222222100000',
    '0001222221000000',
    '0001200210000000',
    '0001100110000000',
    '0000000000000000',
    '0000000000000000',
  ],
};

/**
 * Feature overlays — modify the base shape
 */
function applyFeatures(pixels, features, palette) {
  for (const feat of features) {
    switch (feat) {
      case 'tail':
        // Add tail on right side
        setPixel(pixels, 13, 9, palette.base);
        setPixel(pixels, 14, 8, palette.base);
        setPixel(pixels, 15, 7, palette.accent);
        setPixel(pixels, 14, 9, palette.outline);
        break;
      case 'fangs':
        // Add fangs below head
        setPixel(pixels, 5, 4, palette.eye);
        setPixel(pixels, 9, 4, palette.eye);
        break;
      case 'claws':
        // Add claws at feet
        setPixel(pixels, 3, 14, palette.accent);
        setPixel(pixels, 4, 14, palette.accent);
        setPixel(pixels, 9, 14, palette.accent);
        setPixel(pixels, 10, 14, palette.accent);
        break;
      case 'aura':
        // Add glow particles around body
        setPixelAlpha(pixels, 2, 3, palette.accent, 0.5);
        setPixelAlpha(pixels, 12, 2, palette.accent, 0.5);
        setPixelAlpha(pixels, 1, 8, palette.accentLight, 0.4);
        setPixelAlpha(pixels, 13, 6, palette.accentLight, 0.4);
        break;
      case 'fins':
        // Add fins on sides
        setPixel(pixels, 0, 6, palette.accent);
        setPixel(pixels, 0, 7, palette.accent);
        setPixel(pixels, 14, 6, palette.accent);
        setPixel(pixels, 14, 7, palette.accent);
        break;
      case 'horns':
        // Add horns on top
        setPixel(pixels, 4, 0, palette.accent);
        setPixel(pixels, 5, 0, palette.dark);
        setPixel(pixels, 9, 0, palette.dark);
        setPixel(pixels, 10, 0, palette.accent);
        break;
      case 'spikes':
        // Add spikes along back
        setPixel(pixels, 6, 1, palette.accent);
        setPixel(pixels, 8, 0, palette.accent);
        setPixel(pixels, 10, 1, palette.accent);
        break;
      case 'wings':
        // Add wing shapes on sides
        setPixel(pixels, 0, 5, palette.accent);
        setPixel(pixels, 1, 4, palette.accent);
        setPixel(pixels, 0, 6, palette.accentLight);
        setPixel(pixels, 13, 5, palette.accent);
        setPixel(pixels, 14, 4, palette.accent);
        setPixel(pixels, 13, 6, palette.accentLight);
        break;
      case 'shell':
        // Add shell pattern on back
        setPixel(pixels, 6, 7, palette.dark);
        setPixel(pixels, 8, 7, palette.dark);
        setPixel(pixels, 7, 8, palette.dark);
        setPixel(pixels, 6, 9, palette.dark);
        setPixel(pixels, 8, 9, palette.dark);
        break;
      case 'crystals':
        // Add crystal protrusions
        setPixel(pixels, 5, 1, palette.accentLight);
        setPixel(pixels, 6, 0, palette.accent);
        setPixel(pixels, 9, 1, palette.accentLight);
        setPixel(pixels, 10, 0, palette.accent);
        break;
      case 'armor':
        // Humanoid armor overlay
        setPixel(pixels, 5, 6, palette.dark);
        setPixel(pixels, 6, 6, palette.dark);
        setPixel(pixels, 8, 6, palette.dark);
        setPixel(pixels, 9, 6, palette.dark);
        break;
      case 'cape':
        // Humanoid cape
        setPixel(pixels, 10, 5, palette.accent);
        setPixel(pixels, 10, 6, palette.accent);
        setPixel(pixels, 10, 7, palette.accent);
        setPixel(pixels, 11, 6, palette.accent);
        setPixel(pixels, 11, 7, palette.accentLight);
        setPixel(pixels, 11, 8, palette.accent);
        break;
      case 'bow':
        // Archer bow
        setPixel(pixels, 12, 4, palette.dark);
        setPixel(pixels, 13, 5, palette.dark);
        setPixel(pixels, 13, 6, palette.dark);
        setPixel(pixels, 13, 7, palette.dark);
        setPixel(pixels, 12, 8, palette.dark);
        break;
      case 'staff':
        // Cleric staff
        setPixel(pixels, 12, 3, palette.accentLight);
        setPixel(pixels, 12, 4, palette.accent);
        setPixel(pixels, 12, 5, palette.dark);
        setPixel(pixels, 12, 6, palette.dark);
        setPixel(pixels, 12, 7, palette.dark);
        setPixel(pixels, 12, 8, palette.dark);
        break;
    }
  }
}

function setPixel(pixels, x, y, color) {
  if (x >= 0 && x < 16 && y >= 0 && y < 16) {
    pixels[y * 16 + x] = color;
  }
}

function setPixelAlpha(pixels, x, y, color, _alpha) {
  // For simplicity, just set the pixel — alpha handled at render time
  setPixel(pixels, x, y, color);
}

/**
 * Generate a sprite as an offscreen canvas
 * @param {Object} config - { baseColor, accentColor, shape, features }
 * @returns {HTMLCanvasElement}
 */
export function generateSprite(config) {
  const cacheKey = JSON.stringify(config);
  if (spriteCache.has(cacheKey)) {
    return spriteCache.get(cacheKey);
  }

  const palette = buildPalette(config.baseColor, config.accentColor);
  const shapeTemplate = SHAPES[config.shape] || SHAPES.bipedal;

  // Parse shape template into pixel colors
  const pixels = new Array(16 * 16).fill(null);
  const colorMap = {
    '0': null,
    '1': palette.outline,
    '2': palette.base,
    '3': palette.light,
    '4': palette.dark,
    '5': palette.accent,
    '6': palette.eye,
    '7': palette.belly,
  };

  for (let y = 0; y < 16; y++) {
    const row = shapeTemplate[y];
    for (let x = 0; x < 16; x++) {
      const ch = row[x];
      pixels[y * 16 + x] = colorMap[ch] || null;
    }
  }

  // Apply features
  applyFeatures(pixels, config.features || [], palette);

  // Render to offscreen canvas at SPRITE_SIZE
  const canvas = document.createElement('canvas');
  canvas.width = SPRITE_SIZE;
  canvas.height = SPRITE_SIZE;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  const scale = SPRITE_SIZE / 16;
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const color = pixels[y * 16 + x];
      if (color) {
        ctx.fillStyle = color;
        ctx.fillRect(x * scale, y * scale, scale, scale);
      }
    }
  }

  spriteCache.set(cacheKey, canvas);
  return canvas;
}

/**
 * Generate a sprite at a specific size
 */
export function generateSpriteScaled(config, size) {
  const base = generateSprite(config);
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(base, 0, 0, size, size);
  return canvas;
}

/**
 * Pre-generate sprites for an array of monster data
 */
export function preloadSprites(monsters) {
  for (const m of monsters) {
    if (m.spriteConfig) {
      generateSprite(m.spriteConfig);
    }
  }
}

export function clearSpriteCache() {
  spriteCache.clear();
}

export function getSpriteFromCache(config) {
  return spriteCache.get(JSON.stringify(config));
}
