// 아이템 아이콘 프로시저럴 생성기
// 카테고리별 16x16 → 32x32 아이콘

const iconCache = new Map();

/**
 * 아이템 아이콘 생성
 * @param {string} category - healing|contract|battle|key
 * @param {string} itemId - 개별 아이템 ID
 * @param {number} size - 렌더링 사이즈 (기본 32)
 * @returns {HTMLCanvasElement}
 */
export function generateItemIcon(category, itemId, size = 32) {
  const key = `${category}_${itemId}_${size}`;
  if (iconCache.has(key)) return iconCache.get(key);

  const grid = createGrid(16);

  switch (category) {
    case 'healing':
      drawHealingIcon(grid, itemId);
      break;
    case 'contract':
      drawContractStoneIcon(grid, itemId);
      break;
    case 'battle':
      drawBattleIcon(grid, itemId);
      break;
    case 'key':
      drawKeyIcon(grid, itemId);
      break;
    default:
      drawDefaultIcon(grid);
  }

  const canvas = renderGrid(grid, size);
  iconCache.set(key, canvas);
  return canvas;
}

function createGrid(s) {
  return Array.from({ length: s }, () => Array(s).fill(null));
}

function setPixel(grid, x, y, color) {
  if (y >= 0 && y < grid.length && x >= 0 && x < grid[0].length) {
    grid[y][x] = color;
  }
}

function fillRect(grid, x, y, w, h, color) {
  for (let dy = 0; dy < h; dy++) {
    for (let dx = 0; dx < w; dx++) {
      setPixel(grid, x + dx, y + dy, color);
    }
  }
}

function fillCircle(grid, cx, cy, r, color) {
  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      if (dx * dx + dy * dy <= r * r) {
        setPixel(grid, cx + dx, cy + dy, color);
      }
    }
  }
}

function renderGrid(grid, size) {
  const gridSize = grid.length;
  const pixelSize = size / gridSize;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  for (let y = 0; y < gridSize; y++) {
    for (let x = 0; x < gridSize; x++) {
      const color = grid[y][x];
      if (color) {
        ctx.fillStyle = color;
        ctx.fillRect(
          Math.floor(x * pixelSize),
          Math.floor(y * pixelSize),
          Math.ceil(pixelSize),
          Math.ceil(pixelSize)
        );
      }
    }
  }

  return canvas;
}

// ─── 카테고리별 아이콘 ───

function drawHealingIcon(grid, itemId) {
  const outline = '#222222';

  if (itemId.includes('revive')) {
    // 부활초 — 잎사귀 형태
    const leaf = '#44cc44';
    const dark = '#228822';
    fillCircle(grid, 8, 8, 4, leaf);
    fillCircle(grid, 8, 8, 2, dark);
    setPixel(grid, 8, 4, '#88ff88');
    setPixel(grid, 8, 3, '#88ff88');
    // 줄기
    setPixel(grid, 8, 12, '#664422');
    setPixel(grid, 8, 13, '#664422');
  } else if (itemId.includes('pp_restore') || itemId.includes('pp_')) {
    // PP 회복 — 파란 병
    drawBottle(grid, '#4488ff', '#2266cc');
  } else if (itemId.includes('status') || itemId.includes('antidote') || itemId.includes('burn') || itemId.includes('paralyze') || itemId.includes('awakening')) {
    // 상태 치료 — 노란 병
    drawBottle(grid, '#ffcc44', '#cc9922');
  } else {
    // 포션 — 빨간 병 (super/hyper는 크기/색상 변형)
    const isHyper = itemId.includes('hyper');
    const isSuper = itemId.includes('super');
    const color = isHyper ? '#ff44ff' : isSuper ? '#ff8844' : '#ff4444';
    const dark = isHyper ? '#cc22cc' : isSuper ? '#cc6622' : '#cc2222';
    drawBottle(grid, color, dark);
  }
}

function drawBottle(grid, color, darkColor) {
  const outline = '#222222';
  // 뚜껑
  fillRect(grid, 6, 2, 4, 2, '#888888');
  // 목
  fillRect(grid, 7, 4, 2, 2, darkColor);
  // 몸통
  fillRect(grid, 5, 6, 6, 7, color);
  // 하이라이트
  setPixel(grid, 6, 7, '#ffffff');
  setPixel(grid, 6, 8, '#ffffff');
  // 바닥
  fillRect(grid, 5, 13, 6, 1, darkColor);
  // 외곽선
  for (let y = 6; y <= 13; y++) { setPixel(grid, 4, y, outline); setPixel(grid, 11, y, outline); }
  fillRect(grid, 5, 5, 6, 1, outline);
  fillRect(grid, 5, 14, 6, 1, outline);
}

function drawContractStoneIcon(grid, itemId) {
  // 마석 — 크리스탈/보석 형태
  let color, darkColor, brightColor;

  if (itemId === 'domination_stone') {
    color = '#cc44ff'; darkColor = '#8822aa'; brightColor = '#ee88ff';
  } else if (itemId === 'ultra_stone') {
    color = '#ffcc00'; darkColor = '#cc9900'; brightColor = '#ffee66';
  } else if (itemId === 'high_stone') {
    color = '#4488ff'; darkColor = '#2255cc'; brightColor = '#88bbff';
  } else {
    color = '#88aacc'; darkColor = '#557799'; brightColor = '#bbddee';
  }

  const outline = '#222222';

  // 다이아몬드 형태
  // 상단 삼각형
  setPixel(grid, 8, 2, outline);
  for (let i = 0; i < 5; i++) {
    const w = i + 1;
    for (let dx = -w; dx <= w; dx++) {
      setPixel(grid, 8 + dx, 3 + i, color);
    }
  }

  // 하단 역삼각형
  for (let i = 0; i < 5; i++) {
    const w = 4 - i;
    for (let dx = -w; dx <= w; dx++) {
      setPixel(grid, 8 + dx, 8 + i, color);
    }
  }

  // 하이라이트
  setPixel(grid, 7, 4, brightColor);
  setPixel(grid, 7, 5, brightColor);
  setPixel(grid, 6, 5, brightColor);

  // 그림자
  setPixel(grid, 9, 7, darkColor);
  setPixel(grid, 10, 6, darkColor);
  setPixel(grid, 9, 8, darkColor);

  // 중앙 빛
  setPixel(grid, 8, 5, '#ffffff');
  setPixel(grid, 8, 6, brightColor);

  // 하단 반짝임
  setPixel(grid, 8, 13, '#ffffff');
  setPixel(grid, 7, 14, brightColor);
  setPixel(grid, 9, 14, brightColor);
}

function drawBattleIcon(grid, itemId) {
  if (itemId === 'escape_rope') {
    // 밧줄 형태
    const rope = '#cc9944';
    for (let i = 0; i < 10; i++) {
      setPixel(grid, 5 + (i % 3), 3 + i, rope);
      setPixel(grid, 6 + (i % 3), 3 + i, '#aa7722');
    }
  } else if (itemId === 'repel') {
    // 스프레이 캔
    fillRect(grid, 6, 3, 4, 2, '#666666');
    fillRect(grid, 5, 5, 6, 8, '#44aa44');
    fillRect(grid, 5, 13, 6, 1, '#228822');
    setPixel(grid, 6, 6, '#88ff88');
  } else {
    // 강화제 — 위 화살표 + 별
    const color = '#ff8844';
    // 위 화살표
    setPixel(grid, 8, 3, color);
    fillRect(grid, 7, 4, 3, 1, color);
    fillRect(grid, 6, 5, 5, 1, color);
    fillRect(grid, 7, 6, 3, 5, color);
    // 하이라이트
    setPixel(grid, 8, 4, '#ffcc88');
  }
}

function drawKeyIcon(grid, itemId) {
  if (itemId.includes('badge')) {
    // 배지 — 별 형태
    const gold = '#ffcc00';
    const dark = '#cc9900';
    fillCircle(grid, 8, 8, 4, gold);
    fillCircle(grid, 8, 8, 2, dark);
    // 광택
    setPixel(grid, 7, 6, '#ffee88');
    setPixel(grid, 7, 7, '#ffee88');
  } else if (itemId === 'town_map') {
    // 지도
    fillRect(grid, 3, 4, 10, 8, '#eedd99');
    fillRect(grid, 4, 5, 8, 6, '#ddcc88');
    // 라인
    setPixel(grid, 6, 6, '#884422');
    setPixel(grid, 7, 7, '#884422');
    setPixel(grid, 8, 6, '#884422');
    setPixel(grid, 9, 8, '#884422');
  } else if (itemId === 'monster_dex') {
    // 도감 — 책 형태
    fillRect(grid, 4, 3, 8, 10, '#cc4444');
    fillRect(grid, 5, 4, 6, 8, '#ffeecc');
    setPixel(grid, 6, 6, '#222222');
    setPixel(grid, 7, 6, '#222222');
    setPixel(grid, 8, 6, '#222222');
  } else {
    // 열쇠/기타
    const color = '#ccaa44';
    fillCircle(grid, 6, 5, 2, color);
    fillRect(grid, 7, 6, 2, 6, color);
    setPixel(grid, 9, 10, color);
    setPixel(grid, 9, 8, color);
  }
}

function drawDefaultIcon(grid) {
  fillRect(grid, 5, 5, 6, 6, '#888888');
  setPixel(grid, 8, 8, '#ffffff');
}
