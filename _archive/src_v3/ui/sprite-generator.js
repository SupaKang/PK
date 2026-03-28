// 프로시저럴 픽셀 스프라이트 생성기

const spriteCache = new Map();
const backSpriteCache = new Map();

/**
 * 색상 유틸리티
 */
function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return { r, g, b };
}

function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(c => Math.max(0, Math.min(255, Math.round(c))).toString(16).padStart(2, '0')).join('');
}

function lighten(hex, amount = 0.3) {
  const { r, g, b } = hexToRgb(hex);
  return rgbToHex(
    r + (255 - r) * amount,
    g + (255 - g) * amount,
    b + (255 - b) * amount
  );
}

function darken(hex, amount = 0.3) {
  const { r, g, b } = hexToRgb(hex);
  return rgbToHex(r * (1 - amount), g * (1 - amount), b * (1 - amount));
}

function blendColors(hex1, hex2, t = 0.5) {
  const c1 = hexToRgb(hex1);
  const c2 = hexToRgb(hex2);
  return rgbToHex(
    c1.r + (c2.r - c1.r) * t,
    c1.g + (c2.g - c1.g) * t,
    c1.b + (c2.b - c1.b) * t
  );
}

/**
 * 팔레트 생성 (베이스 + 악센트로 5색 팔레트)
 */
function buildPalette(baseColor, accentColor) {
  return {
    darkOutline: darken(baseColor, 0.55),
    base: baseColor,
    baseLight: lighten(baseColor, 0.25),
    baseDark: darken(baseColor, 0.25),
    accent: accentColor,
    accentLight: lighten(accentColor, 0.3),
    accentDark: darken(accentColor, 0.2),
    highlight: lighten(baseColor, 0.55),
    eye: '#111111',
    eyeShine: '#ffffff',
    belly: lighten(blendColors(baseColor, accentColor, 0.4), 0.2),
  };
}

/**
 * 그리드에 대칭으로 픽셀 설정
 */
function setPixelSym(grid, x, y, val, gridW) {
  const halfW = Math.floor(gridW / 2);
  if (y < 0 || y >= grid.length) return;
  if (x < 0 || x > halfW) return;
  const mirrorX = gridW - 1 - x;
  grid[y][x] = val;
  grid[y][mirrorX] = val;
}

function setPixel(grid, x, y, val) {
  if (y >= 0 && y < grid.length && x >= 0 && x < grid[0].length) {
    grid[y][x] = val;
  }
}

function fillRect(grid, x, y, w, h, val, sym = false, gridW = 0) {
  for (let dy = 0; dy < h; dy++) {
    for (let dx = 0; dx < w; dx++) {
      if (sym) {
        setPixelSym(grid, x + dx, y + dy, val, gridW);
      } else {
        setPixel(grid, x + dx, y + dy, val);
      }
    }
  }
}

function fillEllipse(grid, cx, cy, rx, ry, val, sym = false, gridW = 0) {
  for (let dy = -ry; dy <= ry; dy++) {
    for (let dx = -rx; dx <= rx; dx++) {
      if ((dx * dx) / (rx * rx) + (dy * dy) / (ry * ry) <= 1.0) {
        if (sym) {
          setPixelSym(grid, cx + dx, cy + dy, val, gridW);
        } else {
          setPixel(grid, cx + dx, cy + dy, val);
        }
      }
    }
  }
}

/**
 * 형태별 실루엣 생성 (16x16 기준 그리드)
 * 값: 0=투명, 1=외곽, 2=베이스, 3=베이스라이트, 4=악센트, 5=눈, 6=하이라이트, 7=배, 8=악센트다크, 9=눈빛
 */
function generateShape(shape, gridSize = 16) {
  const g = gridSize;
  const grid = Array.from({ length: g }, () => new Uint8Array(g));
  const half = Math.floor(g / 2);

  switch (shape) {
    case 'bipedal': {
      // 머리 (둥근 상체, 두 다리)
      fillEllipse(grid, half, 4, 4, 3, 2);       // 머리
      fillEllipse(grid, half, 4, 3, 2, 3);        // 머리 하이라이트
      fillEllipse(grid, half, 9, 3, 4, 2);        // 몸통
      fillEllipse(grid, half, 9, 2, 3, 7);        // 배
      // 다리
      fillRect(grid, half - 3, 13, 2, 3, 2);
      fillRect(grid, half + 2, 13, 2, 3, 2);
      // 팔
      setPixel(grid, half - 4, 8, 2);
      setPixel(grid, half - 4, 9, 2);
      setPixel(grid, half + 4, 8, 2);
      setPixel(grid, half + 4, 9, 2);
      // 눈
      setPixel(grid, half - 2, 3, 5);
      setPixel(grid, half + 2, 3, 5);
      setPixel(grid, half - 2, 2, 9);
      setPixel(grid, half + 2, 2, 9);
      // 입
      setPixel(grid, half, 5, 8);
      break;
    }
    case 'quadruped': {
      // 머리 (앞쪽) + 몸통 (가로로 긴) + 4다리
      fillEllipse(grid, half, 5, 3, 3, 2);        // 머리
      fillEllipse(grid, half, 5, 2, 2, 3);
      fillEllipse(grid, half, 9, 5, 3, 2);        // 몸통
      fillEllipse(grid, half, 9, 4, 2, 7);        // 배
      // 다리 4개
      fillRect(grid, half - 4, 12, 2, 4, 2);
      fillRect(grid, half - 1, 12, 2, 4, 2);
      fillRect(grid, half + 1, 12, 2, 4, 8);
      fillRect(grid, half + 3, 12, 2, 4, 8);
      // 눈
      setPixel(grid, half - 2, 4, 5);
      setPixel(grid, half + 2, 4, 5);
      setPixel(grid, half - 2, 3, 9);
      setPixel(grid, half + 2, 3, 9);
      break;
    }
    case 'serpent': {
      // S자 뱀 형태
      // 머리
      fillEllipse(grid, half, 2, 3, 2, 2);
      fillEllipse(grid, half, 2, 2, 1, 3);
      // S형 몸통
      for (let i = 0; i < 10; i++) {
        const yy = 4 + i;
        const xOff = Math.round(Math.sin(i * 0.7) * 2.5);
        setPixel(grid, half + xOff, yy, 2);
        setPixel(grid, half + xOff - 1, yy, 2);
        setPixel(grid, half + xOff + 1, yy, 2);
        if (i % 2 === 0) setPixel(grid, half + xOff, yy, 7);
      }
      // 꼬리
      setPixel(grid, half + 1, 14, 4);
      setPixel(grid, half + 2, 15, 4);
      // 눈
      setPixel(grid, half - 1, 1, 5);
      setPixel(grid, half + 1, 1, 5);
      setPixel(grid, half - 1, 0, 9);
      setPixel(grid, half + 1, 0, 9);
      // 혀
      setPixel(grid, half, 4, 4);
      break;
    }
    case 'avian': {
      // 새 형태 - 둥근 몸체, 날개, 부리
      fillEllipse(grid, half, 5, 3, 3, 2);        // 몸
      fillEllipse(grid, half, 5, 2, 2, 3);
      // 날개 (좌우로 넓게)
      for (let dy = 0; dy < 4; dy++) {
        for (let dx = 0; dx < 4 - dy; dx++) {
          setPixel(grid, half - 4 - dx, 4 + dy, dy === 0 ? 4 : 2);
          setPixel(grid, half + 4 + dx, 4 + dy, dy === 0 ? 4 : 2);
        }
      }
      // 꼬리깃
      setPixel(grid, half, 9, 4);
      setPixel(grid, half - 1, 10, 4);
      setPixel(grid, half + 1, 10, 4);
      setPixel(grid, half, 11, 4);
      // 부리
      setPixel(grid, half, 7, 4);
      setPixel(grid, half, 8, 8);
      // 눈
      setPixel(grid, half - 2, 4, 5);
      setPixel(grid, half + 2, 4, 5);
      setPixel(grid, half - 2, 3, 9);
      setPixel(grid, half + 2, 3, 9);
      // 발
      setPixel(grid, half - 1, 12, 8);
      setPixel(grid, half + 1, 12, 8);
      break;
    }
    case 'amorphous': {
      // 무정형 - 불규칙한 blob
      fillEllipse(grid, half, 7, 5, 6, 2);
      fillEllipse(grid, half, 7, 4, 5, 3);
      fillEllipse(grid, half, 7, 3, 4, 7);
      // 불규칙 돌기
      setPixel(grid, half - 3, 1, 2);
      setPixel(grid, half - 4, 2, 2);
      setPixel(grid, half + 3, 2, 2);
      setPixel(grid, half + 4, 3, 2);
      setPixel(grid, half - 5, 5, 2);
      setPixel(grid, half + 5, 4, 2);
      // 눈 (여러개)
      setPixel(grid, half - 2, 5, 5);
      setPixel(grid, half + 1, 6, 5);
      setPixel(grid, half, 4, 5);
      setPixel(grid, half - 2, 4, 9);
      setPixel(grid, half + 1, 5, 9);
      // 입
      fillRect(grid, half - 1, 9, 3, 1, 8);
      break;
    }
    case 'insectoid': {
      // 곤충 형태 - 머리, 흉부, 복부 + 6다리 + 더듬이
      fillEllipse(grid, half, 3, 2, 2, 2);        // 머리
      fillEllipse(grid, half, 3, 1, 1, 3);
      fillEllipse(grid, half, 7, 2, 2, 4);        // 흉부
      fillEllipse(grid, half, 11, 3, 3, 2);       // 복부
      fillEllipse(grid, half, 11, 2, 2, 7);
      // 더듬이
      setPixel(grid, half - 2, 0, 4);
      setPixel(grid, half - 3, 0, 4);
      setPixel(grid, half + 2, 0, 4);
      setPixel(grid, half + 3, 0, 4);
      // 다리 3쌍
      for (let i = 0; i < 3; i++) {
        const yy = 6 + i * 2;
        setPixel(grid, half - 3 - i, yy, 8);
        setPixel(grid, half - 4 - i, yy + 1, 8);
        setPixel(grid, half + 3 + i, yy, 8);
        setPixel(grid, half + 4 + i, yy + 1, 8);
      }
      // 눈 (큰 복안)
      setPixel(grid, half - 1, 2, 5);
      setPixel(grid, half + 1, 2, 5);
      setPixel(grid, half - 1, 3, 4);
      setPixel(grid, half + 1, 3, 4);
      setPixel(grid, half - 1, 1, 9);
      setPixel(grid, half + 1, 1, 9);
      break;
    }
    case 'aquatic': {
      // 물고기/해양 생물 - 유선형 몸체, 지느러미, 꼬리
      fillEllipse(grid, half, 7, 4, 5, 2);        // 몸
      fillEllipse(grid, half, 7, 3, 4, 3);
      fillEllipse(grid, half, 7, 2, 3, 7);        // 배
      // 등지느러미
      setPixel(grid, half, 1, 4);
      setPixel(grid, half, 2, 4);
      setPixel(grid, half - 1, 2, 4);
      setPixel(grid, half + 1, 2, 4);
      // 꼬리지느러미
      setPixel(grid, half, 13, 4);
      setPixel(grid, half - 1, 14, 4);
      setPixel(grid, half + 1, 14, 4);
      setPixel(grid, half - 2, 15, 4);
      setPixel(grid, half + 2, 15, 4);
      // 옆지느러미
      setPixel(grid, half - 5, 6, 4);
      setPixel(grid, half - 5, 7, 4);
      setPixel(grid, half + 5, 6, 4);
      setPixel(grid, half + 5, 7, 4);
      // 눈
      setPixel(grid, half - 2, 6, 5);
      setPixel(grid, half + 2, 6, 5);
      setPixel(grid, half - 2, 5, 9);
      setPixel(grid, half + 2, 5, 9);
      // 입
      setPixel(grid, half, 9, 8);
      break;
    }
    case 'humanoid': {
      // 인간형 - 머리, 몸통, 두 팔, 두 다리 (더 뚜렷하게)
      fillEllipse(grid, half, 3, 3, 2, 2);        // 머리
      fillEllipse(grid, half, 3, 2, 1, 3);
      // 몸통
      fillRect(grid, half - 2, 6, 5, 5, 4);
      fillRect(grid, half - 1, 7, 3, 3, 7);
      // 팔
      fillRect(grid, half - 4, 6, 2, 5, 2);
      fillRect(grid, half + 3, 6, 2, 5, 2);
      // 손
      setPixel(grid, half - 4, 11, 3);
      setPixel(grid, half + 4, 11, 3);
      // 다리
      fillRect(grid, half - 2, 11, 2, 4, 2);
      fillRect(grid, half + 1, 11, 2, 4, 2);
      // 신발
      setPixel(grid, half - 3, 15, 8);
      setPixel(grid, half - 2, 15, 8);
      setPixel(grid, half + 2, 15, 8);
      setPixel(grid, half + 3, 15, 8);
      // 눈
      setPixel(grid, half - 1, 2, 5);
      setPixel(grid, half + 1, 2, 5);
      setPixel(grid, half - 1, 1, 9);
      setPixel(grid, half + 1, 1, 9);
      // 입
      setPixel(grid, half, 4, 8);
      break;
    }
    case 'mythical': {
      // 신화 생물 - 용 같은 형태, 큰 날개, 뿔, 꼬리
      fillEllipse(grid, half, 4, 3, 2, 2);        // 머리
      fillEllipse(grid, half, 4, 2, 1, 3);
      fillEllipse(grid, half, 8, 3, 4, 2);        // 몸통
      fillEllipse(grid, half, 8, 2, 3, 7);
      // 뿔
      setPixel(grid, half - 2, 0, 4);
      setPixel(grid, half - 3, 0, 4);
      setPixel(grid, half + 2, 0, 4);
      setPixel(grid, half + 3, 0, 4);
      // 큰 날개
      for (let i = 0; i < 5; i++) {
        setPixel(grid, half - 4 - i, 5 + Math.floor(i * 0.5), 4);
        setPixel(grid, half - 4 - i, 6 + Math.floor(i * 0.5), 2);
        setPixel(grid, half + 4 + i, 5 + Math.floor(i * 0.5), 4);
        setPixel(grid, half + 4 + i, 6 + Math.floor(i * 0.5), 2);
      }
      // 다리
      fillRect(grid, half - 3, 12, 2, 3, 2);
      fillRect(grid, half + 2, 12, 2, 3, 2);
      // 꼬리
      for (let i = 0; i < 3; i++) {
        setPixel(grid, half + i, 12 + i, 4);
        setPixel(grid, half + i + 1, 12 + i, 2);
      }
      // 눈
      setPixel(grid, half - 1, 3, 5);
      setPixel(grid, half + 1, 3, 5);
      setPixel(grid, half - 1, 2, 9);
      setPixel(grid, half + 1, 2, 9);
      break;
    }
    case 'elemental': {
      // 원소 생물 - 핵심부 + 부유하는 에너지
      fillEllipse(grid, half, 7, 4, 4, 2);        // 핵심
      fillEllipse(grid, half, 7, 3, 3, 3);
      fillEllipse(grid, half, 7, 2, 2, 6);        // 빛나는 중심
      // 에너지 오라 (점들)
      const auraPoints = [
        [half - 1, 1], [half + 1, 1],
        [half - 5, 4], [half + 5, 4],
        [half - 6, 7], [half + 6, 7],
        [half - 5, 10], [half + 5, 10],
        [half - 2, 13], [half + 2, 13],
        [half, 14],
        [half - 3, 2], [half + 3, 2],
      ];
      for (const [ax, ay] of auraPoints) {
        setPixel(grid, ax, ay, 4);
      }
      // 에너지 흐름선
      for (let i = 0; i < 3; i++) {
        setPixel(grid, half - 4, 5 + i * 2, 4);
        setPixel(grid, half + 4, 5 + i * 2, 4);
      }
      // 눈
      setPixel(grid, half - 1, 6, 5);
      setPixel(grid, half + 1, 6, 5);
      setPixel(grid, half - 1, 5, 9);
      setPixel(grid, half + 1, 5, 9);
      break;
    }
    default: {
      // fallback - 단순 원
      fillEllipse(grid, half, half, 5, 5, 2);
      fillEllipse(grid, half, half, 4, 4, 3);
      setPixel(grid, half - 2, half - 1, 5);
      setPixel(grid, half + 2, half - 1, 5);
      break;
    }
  }

  return grid;
}

/**
 * 피처 추가
 */
function applyFeatures(grid, features, gridSize) {
  const half = Math.floor(gridSize / 2);

  for (const feat of features) {
    switch (feat) {
      case 'horns':
        setPixel(grid, half - 2, 0, 4);
        setPixel(grid, half - 3, 0, 8);
        setPixel(grid, half + 2, 0, 4);
        setPixel(grid, half + 3, 0, 8);
        setPixel(grid, half - 2, 1, 4);
        setPixel(grid, half + 2, 1, 4);
        break;
      case 'wings':
        for (let i = 0; i < 3; i++) {
          setPixel(grid, half - 5 - i, 4 + i, 4);
          setPixel(grid, half + 5 + i, 4 + i, 4);
          setPixel(grid, half - 5 - i, 5 + i, 2);
          setPixel(grid, half + 5 + i, 5 + i, 2);
        }
        break;
      case 'tail':
        for (let i = 0; i < 4; i++) {
          setPixel(grid, half + 3 + i, 11 + Math.floor(i * 0.5), i < 2 ? 2 : 4);
        }
        break;
      case 'fangs':
        setPixel(grid, half - 1, 6, 6);
        setPixel(grid, half + 1, 6, 6);
        break;
      case 'claws':
        setPixel(grid, half - 5, 10, 6);
        setPixel(grid, half - 5, 11, 6);
        setPixel(grid, half + 5, 10, 6);
        setPixel(grid, half + 5, 11, 6);
        break;
      case 'shell':
        // 등에 패턴 추가
        for (let dy = -2; dy <= 2; dy++) {
          for (let dx = -2; dx <= 2; dx++) {
            if (Math.abs(dx) + Math.abs(dy) <= 2) {
              const px = half + dx;
              const py = 8 + dy;
              if (py >= 0 && py < gridSize && px >= 0 && px < gridSize && grid[py][px] === 2) {
                grid[py][px] = 8;
              }
            }
          }
        }
        break;
      case 'fins':
        setPixel(grid, half, 1, 4);
        setPixel(grid, half - 1, 1, 4);
        setPixel(grid, half + 1, 1, 4);
        setPixel(grid, half, 0, 4);
        break;
      case 'spikes':
        setPixel(grid, half, 0, 4);
        setPixel(grid, half - 3, 1, 4);
        setPixel(grid, half + 3, 1, 4);
        setPixel(grid, half - 4, 5, 4);
        setPixel(grid, half + 4, 5, 4);
        break;
      case 'aura': {
        // 오라 효과 - 외곽 주변에 점 추가
        for (let y = 0; y < gridSize; y++) {
          for (let x = 0; x < gridSize; x++) {
            if (grid[y][x] !== 0) {
              // 주변 빈 칸에 랜덤하게 점
              const neighbors = [[-1, 0], [1, 0], [0, -1], [0, 1]];
              for (const [dx, dy] of neighbors) {
                const nx = x + dx, ny = y + dy;
                if (nx >= 0 && nx < gridSize && ny >= 0 && ny < gridSize && grid[ny][nx] === 0) {
                  // 해시 기반 결정적 랜덤
                  if ((x * 7 + y * 13 + dx * 3 + dy * 5) % 5 === 0) {
                    grid[ny][nx] = 4;
                  }
                }
              }
            }
          }
        }
        break;
      }
      case 'crystals':
        // 결정체 돌기
        setPixel(grid, half - 3, 1, 4);
        setPixel(grid, half - 4, 2, 4);
        setPixel(grid, half - 3, 2, 6);
        setPixel(grid, half + 3, 1, 4);
        setPixel(grid, half + 4, 2, 4);
        setPixel(grid, half + 3, 2, 6);
        setPixel(grid, half, 0, 6);
        setPixel(grid, half, 1, 4);
        break;

      // ─── 계약자(플레이어) 전용 장비 특징 ───

      case 'armor':
        // 갑옷 — 몸통에 견갑, 가슴판
        fillRect(grid, half - 3, 5, 7, 2, 8);  // 어깨 장갑
        fillRect(grid, half - 2, 7, 5, 3, 8);  // 가슴 갑옷
        setPixel(grid, half, 7, 6);             // 가슴 장식
        setPixel(grid, half, 8, 6);
        // 팔 보호대
        setPixel(grid, half - 4, 7, 8);
        setPixel(grid, half - 4, 8, 8);
        setPixel(grid, half + 4, 7, 8);
        setPixel(grid, half + 4, 8, 8);
        break;

      case 'cape':
        // 망토 — 어깨에서 내려오는 형태
        for (let i = 0; i < 6; i++) {
          const w = Math.min(3, 1 + Math.floor(i * 0.6));
          for (let dx = -w; dx <= w; dx++) {
            const px = half + dx;
            const py = 6 + i;
            if (py < gridSize && px >= 0 && px < gridSize) {
              if (grid[py][px] === 0) {
                grid[py][px] = 4;
              }
            }
          }
        }
        // 망토 내부 음영
        setPixel(grid, half, 8, 7);
        setPixel(grid, half, 9, 7);
        setPixel(grid, half - 1, 10, 7);
        setPixel(grid, half + 1, 10, 7);
        break;

      case 'staff':
        // 지팡이 — 오른손에 세로 지팡이 + 상단 보석
        for (let i = 2; i <= 14; i++) {
          setPixel(grid, half + 5, i, 8);
        }
        // 보석
        setPixel(grid, half + 5, 1, 6);
        setPixel(grid, half + 4, 1, 6);
        setPixel(grid, half + 6, 1, 6);
        setPixel(grid, half + 5, 0, 4);
        break;

      case 'bow':
        // 활 — 오른쪽에 활 형태
        setPixel(grid, half + 5, 3, 8);
        setPixel(grid, half + 6, 4, 8);
        setPixel(grid, half + 6, 5, 8);
        setPixel(grid, half + 6, 6, 8);
        setPixel(grid, half + 6, 7, 8);
        setPixel(grid, half + 6, 8, 8);
        setPixel(grid, half + 5, 9, 8);
        // 줄
        setPixel(grid, half + 5, 4, 6);
        setPixel(grid, half + 5, 5, 6);
        setPixel(grid, half + 5, 6, 6);
        setPixel(grid, half + 5, 7, 6);
        setPixel(grid, half + 5, 8, 6);
        break;

      case 'sword':
        // 검 — 왼쪽에 검 형태
        for (let i = 2; i <= 12; i++) {
          setPixel(grid, half - 5, i, 6);
        }
        // 가드
        setPixel(grid, half - 6, 9, 8);
        setPixel(grid, half - 4, 9, 8);
        // 날 하이라이트
        setPixel(grid, half - 5, 3, 9);
        setPixel(grid, half - 5, 5, 9);
        break;

      case 'shield':
        // 방패 — 왼쪽에 작은 방패
        fillRect(grid, half - 7, 6, 3, 4, 8);
        setPixel(grid, half - 6, 7, 6);
        setPixel(grid, half - 6, 8, 6);
        break;
    }
  }
}

/**
 * 외곽선 자동 생성
 */
function addOutline(grid, gridSize) {
  const outlined = Array.from({ length: gridSize }, () => new Uint8Array(gridSize));
  // 복사
  for (let y = 0; y < gridSize; y++) {
    for (let x = 0; x < gridSize; x++) {
      outlined[y][x] = grid[y][x];
    }
  }
  // 외곽 추가
  for (let y = 0; y < gridSize; y++) {
    for (let x = 0; x < gridSize; x++) {
      if (grid[y][x] !== 0) continue;
      const neighbors = [[-1, 0], [1, 0], [0, -1], [0, 1]];
      for (const [dx, dy] of neighbors) {
        const nx = x + dx, ny = y + dy;
        if (nx >= 0 && nx < gridSize && ny >= 0 && ny < gridSize && grid[ny][nx] !== 0 && grid[ny][nx] !== 1) {
          outlined[y][x] = 1;
          break;
        }
      }
    }
  }
  return outlined;
}

/**
 * 그리드를 캔버스로 렌더링
 */
function gridToCanvas(grid, palette, size, gridSize) {
  const canvas = new OffscreenCanvas(size, size);
  const ctx = canvas.getContext('2d');
  const pixelSize = size / gridSize;

  const colorMap = {
    0: null,
    1: palette.darkOutline,
    2: palette.base,
    3: palette.baseLight,
    4: palette.accent,
    5: palette.eye,
    6: palette.highlight,
    7: palette.belly,
    8: palette.accentDark,
    9: palette.eyeShine,
  };

  for (let y = 0; y < gridSize; y++) {
    for (let x = 0; x < gridSize; x++) {
      const val = grid[y][x];
      const color = colorMap[val];
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

/**
 * 뒤쪽 뷰용 간소화 그리드 생성
 */
function generateBackShape(shape, gridSize = 16) {
  const g = gridSize;
  const grid = Array.from({ length: g }, () => new Uint8Array(g));
  const half = Math.floor(g / 2);

  switch (shape) {
    case 'bipedal': {
      fillEllipse(grid, half, 4, 4, 3, 2);
      fillEllipse(grid, half, 4, 3, 2, 8);
      fillEllipse(grid, half, 9, 3, 4, 2);
      fillRect(grid, half - 3, 13, 2, 3, 2);
      fillRect(grid, half + 2, 13, 2, 3, 2);
      setPixel(grid, half - 4, 8, 2);
      setPixel(grid, half - 4, 9, 2);
      setPixel(grid, half + 4, 8, 2);
      setPixel(grid, half + 4, 9, 2);
      break;
    }
    case 'quadruped': {
      fillEllipse(grid, half, 5, 3, 2, 2);
      fillEllipse(grid, half, 5, 2, 1, 8);
      fillEllipse(grid, half, 9, 5, 3, 2);
      fillRect(grid, half - 4, 12, 2, 4, 2);
      fillRect(grid, half - 1, 12, 2, 4, 2);
      fillRect(grid, half + 1, 12, 2, 4, 8);
      fillRect(grid, half + 3, 12, 2, 4, 8);
      break;
    }
    case 'serpent': {
      fillEllipse(grid, half, 2, 3, 2, 2);
      fillEllipse(grid, half, 2, 2, 1, 8);
      for (let i = 0; i < 10; i++) {
        const yy = 4 + i;
        const xOff = Math.round(Math.sin(i * 0.7) * 2.5);
        setPixel(grid, half + xOff, yy, 2);
        setPixel(grid, half + xOff - 1, yy, 2);
        setPixel(grid, half + xOff + 1, yy, 2);
      }
      setPixel(grid, half + 1, 14, 4);
      break;
    }
    case 'avian': {
      fillEllipse(grid, half, 5, 3, 3, 2);
      fillEllipse(grid, half, 5, 2, 2, 8);
      for (let dy = 0; dy < 4; dy++) {
        for (let dx = 0; dx < 4 - dy; dx++) {
          setPixel(grid, half - 4 - dx, 4 + dy, dy === 0 ? 4 : 2);
          setPixel(grid, half + 4 + dx, 4 + dy, dy === 0 ? 4 : 2);
        }
      }
      setPixel(grid, half, 9, 4);
      setPixel(grid, half - 1, 10, 4);
      setPixel(grid, half + 1, 10, 4);
      break;
    }
    case 'amorphous': {
      fillEllipse(grid, half, 7, 5, 6, 2);
      fillEllipse(grid, half, 7, 4, 5, 8);
      setPixel(grid, half - 3, 1, 2);
      setPixel(grid, half + 3, 2, 2);
      break;
    }
    case 'insectoid': {
      fillEllipse(grid, half, 3, 2, 2, 2);
      fillEllipse(grid, half, 7, 2, 2, 4);
      fillEllipse(grid, half, 11, 3, 3, 2);
      setPixel(grid, half - 2, 0, 4);
      setPixel(grid, half + 2, 0, 4);
      for (let i = 0; i < 3; i++) {
        setPixel(grid, half - 3 - i, 6 + i * 2, 8);
        setPixel(grid, half + 3 + i, 6 + i * 2, 8);
      }
      break;
    }
    case 'aquatic': {
      fillEllipse(grid, half, 7, 4, 5, 2);
      fillEllipse(grid, half, 7, 3, 4, 8);
      setPixel(grid, half, 1, 4);
      setPixel(grid, half, 2, 4);
      setPixel(grid, half, 13, 4);
      setPixel(grid, half - 1, 14, 4);
      setPixel(grid, half + 1, 14, 4);
      break;
    }
    case 'humanoid': {
      fillEllipse(grid, half, 3, 3, 2, 2);
      fillEllipse(grid, half, 3, 2, 1, 8);
      fillRect(grid, half - 2, 6, 5, 5, 4);
      fillRect(grid, half - 4, 6, 2, 5, 2);
      fillRect(grid, half + 3, 6, 2, 5, 2);
      fillRect(grid, half - 2, 11, 2, 4, 2);
      fillRect(grid, half + 1, 11, 2, 4, 2);
      break;
    }
    case 'mythical': {
      fillEllipse(grid, half, 4, 3, 2, 2);
      fillEllipse(grid, half, 4, 2, 1, 8);
      fillEllipse(grid, half, 8, 3, 4, 2);
      setPixel(grid, half - 2, 0, 4);
      setPixel(grid, half + 2, 0, 4);
      for (let i = 0; i < 5; i++) {
        setPixel(grid, half - 4 - i, 5 + Math.floor(i * 0.5), 4);
        setPixel(grid, half + 4 + i, 5 + Math.floor(i * 0.5), 4);
      }
      fillRect(grid, half - 3, 12, 2, 3, 2);
      fillRect(grid, half + 2, 12, 2, 3, 2);
      break;
    }
    case 'elemental': {
      fillEllipse(grid, half, 7, 4, 4, 2);
      fillEllipse(grid, half, 7, 3, 3, 8);
      fillEllipse(grid, half, 7, 2, 2, 6);
      const pts = [
        [half - 1, 1], [half + 1, 1], [half - 5, 4], [half + 5, 4],
        [half - 6, 7], [half + 6, 7], [half - 5, 10], [half + 5, 10],
        [half, 14],
      ];
      for (const [ax, ay] of pts) setPixel(grid, ax, ay, 4);
      break;
    }
    default: {
      fillEllipse(grid, half, half, 5, 5, 2);
      fillEllipse(grid, half, half, 4, 4, 8);
      break;
    }
  }

  return grid;
}

/**
 * 캐시 키 생성
 */
function cacheKey(config, size) {
  return `${config.baseColor}_${config.accentColor}_${config.shape}_${(config.features || []).join(',')}_${size}`;
}

/**
 * 프론트 스프라이트 생성
 */
export function generateSprite(spriteConfig, size = 64) {
  if (!spriteConfig) return null;

  const key = cacheKey(spriteConfig, size);
  if (spriteCache.has(key)) return spriteCache.get(key);

  const gridSize = 16;
  const palette = buildPalette(spriteConfig.baseColor, spriteConfig.accentColor);

  let grid = generateShape(spriteConfig.shape, gridSize);

  if (spriteConfig.features && spriteConfig.features.length > 0) {
    applyFeatures(grid, spriteConfig.features, gridSize);
  }

  grid = addOutline(grid, gridSize);

  const canvas = gridToCanvas(grid, palette, size, gridSize);
  spriteCache.set(key, canvas);
  return canvas;
}

/**
 * 백 스프라이트 생성 (배틀에서 플레이어 몬스터용)
 */
export function generateSpriteBack(spriteConfig, size = 64) {
  if (!spriteConfig) return null;

  const key = 'back_' + cacheKey(spriteConfig, size);
  if (backSpriteCache.has(key)) return backSpriteCache.get(key);

  const gridSize = 16;
  const palette = buildPalette(spriteConfig.baseColor, spriteConfig.accentColor);

  let grid = generateBackShape(spriteConfig.shape, gridSize);

  if (spriteConfig.features && spriteConfig.features.length > 0) {
    // 뒤쪽에서도 보이는 피처만 적용
    const backFeatures = (spriteConfig.features || []).filter(
      f => ['wings', 'tail', 'spikes', 'shell', 'fins', 'horns', 'aura', 'crystals'].includes(f)
    );
    applyFeatures(grid, backFeatures, gridSize);
  }

  grid = addOutline(grid, gridSize);

  const canvas = gridToCanvas(grid, palette, size, gridSize);
  backSpriteCache.set(key, canvas);
  return canvas;
}

/**
 * 실루엣 스프라이트 (도감 미등록용)
 */
export function generateSilhouette(spriteConfig, size = 64) {
  if (!spriteConfig) return null;

  const silhouetteConfig = {
    ...spriteConfig,
    baseColor: '#222222',
    accentColor: '#333333',
  };

  const key = 'sil_' + cacheKey(spriteConfig, size);
  if (spriteCache.has(key)) return spriteCache.get(key);

  const gridSize = 16;
  const palette = buildPalette('#222222', '#333333');
  // 모든 색상을 동일하게 어둡게
  palette.darkOutline = '#111111';
  palette.base = '#222222';
  palette.baseLight = '#2a2a2a';
  palette.baseDark = '#1a1a1a';
  palette.accent = '#333333';
  palette.accentLight = '#3a3a3a';
  palette.accentDark = '#2a2a2a';
  palette.highlight = '#333333';
  palette.eye = '#222222';
  palette.eyeShine = '#333333';
  palette.belly = '#282828';

  let grid = generateShape(spriteConfig.shape, gridSize);
  if (spriteConfig.features && spriteConfig.features.length > 0) {
    applyFeatures(grid, spriteConfig.features, gridSize);
  }
  grid = addOutline(grid, gridSize);

  const canvas = gridToCanvas(grid, palette, size, gridSize);
  spriteCache.set(key, canvas);
  return canvas;
}

/**
 * 캐시 초기화
 */
export function clearSpriteCache() {
  spriteCache.clear();
  backSpriteCache.clear();
}

// ─── 하이브리드 스프라이트 시스템 ───
// 외부 PNG가 있으면 사용, 없으면 프로시저럴 폴백


/**
 * 하이브리드 스프라이트 가져오기 (외부 에셋 우선)
 * @param {number} monsterId - 몬스터 ID (계약자는 0 또는 null)
 * @param {object} spriteConfig - 프로시저럴 생성용 config
 * @param {'front'|'back'|'silhouette'} view
 * @param {number} size
 * @returns {Image|Canvas|null}
 */
export function getHybridSprite(monsterId, spriteConfig, view = 'front', size = 64) {
  // 외부 에셋 체크 (몬스터만, 계약자는 프로시저럴 전용)
  if (monsterId && !spriteConfig?.isPlayer) {
    const key = `monster_${monsterId}_${view}`;
    if (external) return external;
  }

  // 프로시저럴 폴백
  switch (view) {
    case 'front': return generateSprite(spriteConfig, size);
    case 'back': return generateSpriteBack(spriteConfig, size);
    case 'silhouette': return generateSilhouette(spriteConfig, size);
    default: return generateSprite(spriteConfig, size);
  }
}
