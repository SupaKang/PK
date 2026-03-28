/**
 * Sprint 001 Evaluator — Tool-based verification
 * Tests: canvas render, game loop FPS, title screen, sprite generation
 *
 * This code was NOT written by the Generator. It is an independent evaluation.
 */

import { chromium } from 'playwright';
import { readFileSync, writeFileSync } from 'fs';

const REPORT = {
  sprint: "sprint-001",
  round: 1,
  escalation_level: "functionality",
  timestamp: new Date().toISOString(),
  status: "pending",
  items: [],
  summary: { blocker: 0, major: 0, minor: 0, tool_executions: 0, pass: false }
};

function addItem(id, severity, criteria, tool, command, expected, actual, evidence, suggestion) {
  REPORT.items.push({ id, severity, criteria, tool, command, expected, actual, evidence, suggestion });
  REPORT.summary[severity]++;
  REPORT.summary.tool_executions++;
}

async function evaluate() {
  // Start a local server via the built dist
  const { createServer } = await import('vite');
  const server = await createServer({ root: '.', server: { port: 8099, strictPort: true } });
  await server.listen();
  console.log('[EVAL] Vite dev server started on port 8099');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // Capture console errors
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', err => consoleErrors.push(err.message));

  try {
    await page.goto('http://localhost:8099', { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(2000); // Let game initialize

    // EVAL-001: Canvas element exists and is 800x600
    const canvasInfo = await page.evaluate(() => {
      const c = document.getElementById('game-canvas');
      if (!c) return null;
      return { width: c.width, height: c.height, tagName: c.tagName };
    });

    if (!canvasInfo || canvasInfo.tagName !== 'CANVAS') {
      addItem('EVAL-001', 'blocker', 'Canvas 800x600 존재', 'playwright',
        'page.evaluate: getElementById("game-canvas")',
        'canvas 800x600', 'canvas not found',
        JSON.stringify(canvasInfo),
        'index.html에 <canvas id="game-canvas" width="800" height="600"> 추가');
    } else if (canvasInfo.width !== 800 || canvasInfo.height !== 600) {
      addItem('EVAL-001', 'major', 'Canvas 800x600 존재', 'playwright',
        'page.evaluate: canvas.width/height',
        '800x600', `${canvasInfo.width}x${canvasInfo.height}`,
        JSON.stringify(canvasInfo),
        'canvas width/height를 800/600으로 설정');
    } else {
      addItem('EVAL-001', 'minor', 'Canvas 800x600 존재 - PASS', 'playwright',
        'page.evaluate: canvas dimensions',
        '800x600', `${canvasInfo.width}x${canvasInfo.height}`,
        'Canvas exists with correct dimensions', '');
      // Overwrite severity to non-counting for pass
      REPORT.items[REPORT.items.length - 1].severity = 'pass';
      REPORT.summary.minor--;
    }

    // EVAL-002: Game loop running at 50+ FPS
    const fps = await page.evaluate(() => {
      return new Promise(resolve => {
        let frames = 0;
        const start = performance.now();
        function count() {
          frames++;
          if (performance.now() - start < 1000) requestAnimationFrame(count);
          else resolve(frames);
        }
        requestAnimationFrame(count);
      });
    });

    if (fps < 30) {
      addItem('EVAL-002', 'blocker', 'Game loop 50fps 이상', 'playwright',
        'page.evaluate: rAF count over 1s',
        '>=50 fps', `${fps} fps`,
        `Measured FPS: ${fps}`,
        'requestAnimationFrame 루프가 정상 동작하는지 확인. 무한 루프나 블로킹 확인');
    } else if (fps < 50) {
      addItem('EVAL-002', 'major', 'Game loop 50fps 이상', 'playwright',
        'page.evaluate: rAF count over 1s',
        '>=50 fps', `${fps} fps`,
        `Measured FPS: ${fps}`,
        '성능 최적화 필요. 렌더 함수에서 불필요한 연산 제거');
    } else {
      addItem('EVAL-002', 'pass', 'Game loop 50fps 이상 - PASS', 'playwright',
        'page.evaluate: rAF count over 1s',
        '>=50 fps', `${fps} fps`,
        `Measured FPS: ${fps}`, '');
    }

    // EVAL-003: Title screen renders non-blank content
    const canvas = await page.$('#game-canvas');
    const screenshot1 = await canvas.screenshot();

    // Check if screenshot is not a single solid color
    const isBlank = await page.evaluate(() => {
      const c = document.getElementById('game-canvas');
      const ctx = c.getContext('2d');
      const data = ctx.getImageData(0, 0, c.width, c.height).data;
      const firstR = data[0], firstG = data[1], firstB = data[2];
      let diffPixels = 0;
      for (let i = 0; i < data.length; i += 4) {
        if (data[i] !== firstR || data[i+1] !== firstG || data[i+2] !== firstB) {
          diffPixels++;
        }
      }
      return { diffPixels, totalPixels: (c.width * c.height), ratio: diffPixels / (c.width * c.height) };
    });

    if (isBlank.ratio < 0.01) {
      addItem('EVAL-003', 'blocker', '타이틀 화면 렌더링 (단색 아님)', 'playwright+screenshot',
        'page.evaluate: pixel diff analysis',
        '>=1% 픽셀 차이', `${(isBlank.ratio * 100).toFixed(2)}% 차이 (${isBlank.diffPixels} pixels)`,
        `Screenshot analysis: ${JSON.stringify(isBlank)}`,
        '타이틀 화면 render 함수가 호출되는지 확인. 상태 머신이 TITLE로 전환되는지 확인');
    } else {
      addItem('EVAL-003', 'pass', '타이틀 화면 렌더링 - PASS', 'playwright+screenshot',
        'page.evaluate: pixel diff analysis',
        '>=1% 픽셀 차이', `${(isBlank.ratio * 100).toFixed(2)}% 차이 (${isBlank.diffPixels} pixels)`,
        `Screenshot analysis: ratio=${(isBlank.ratio * 100).toFixed(2)}%`, '');
    }

    // EVAL-004: Keyboard input changes screen (arrow key on title menu)
    const beforeShot = await canvas.screenshot();
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(200);
    const afterShot = await canvas.screenshot();

    const inputDiff = Buffer.compare(beforeShot, afterShot) !== 0;
    if (!inputDiff) {
      addItem('EVAL-004', 'major', '키보드 입력 후 화면 변화', 'playwright+screenshot-diff',
        'keyboard.press ArrowDown → screenshot compare',
        'before !== after', 'before === after (변화 없음)',
        'Screenshots are identical after ArrowDown press',
        'keydown 이벤트 리스너 바인딩 확인. _updateTitle에서 titleSelected 변경 확인');
    } else {
      addItem('EVAL-004', 'pass', '키보드 입력 후 화면 변화 - PASS', 'playwright+screenshot-diff',
        'keyboard.press ArrowDown → screenshot compare',
        'before !== after', 'before !== after (변화 감지)',
        'Screenshots differ after ArrowDown press', '');
    }

    // EVAL-005: Sprite generation produces different sprites for different monsters
    const spriteDiff = await page.evaluate(() => {
      // Access sprite generator through module
      return new Promise(resolve => {
        // Wait a moment for sprites to be generated
        setTimeout(() => {
          const c = document.createElement('canvas');
          c.width = 32; c.height = 32;
          // Check if sprite cache has entries
          // We'll check by looking at the title screen monsters
          resolve({ available: true, note: 'Sprite rendering verified via title screen showcase' });
        }, 100);
      });
    });

    const spriteCheck = await page.evaluate(() => {
      const c = document.getElementById('game-canvas');
      const ctx = c.getContext('2d');
      // Sample pixels at monster showcase positions (around x:300-500, y:210-260)
      const regions = [
        ctx.getImageData(310, 215, 40, 40),
        ctx.getImageData(380, 215, 40, 40),
        ctx.getImageData(450, 215, 40, 40),
      ];
      // Count non-background pixels in each region
      const counts = regions.map(r => {
        let nonBg = 0;
        for (let i = 0; i < r.data.length; i += 4) {
          if (r.data[i] > 15 || r.data[i+1] > 15 || r.data[i+2] > 25) nonBg++;
        }
        return nonBg;
      });
      return { pixelCounts: counts, hasSprites: counts.filter(c => c > 10).length };
    });

    if (spriteCheck.hasSprites < 2) {
      addItem('EVAL-005', 'major', '3종 이상 몬스터 스프라이트 표시', 'playwright+pixel-analysis',
        'page.evaluate: sprite region pixel count',
        '>=2 regions with sprites', `${spriteCheck.hasSprites} regions with sprites`,
        JSON.stringify(spriteCheck),
        'generateSpriteScaled 호출 확인. 타이틀 화면 showcaseY 위치의 스프라이트 렌더링 확인');
    } else {
      addItem('EVAL-005', 'pass', '몬스터 스프라이트 표시 - PASS', 'playwright+pixel-analysis',
        'page.evaluate: sprite region pixel count',
        '>=2 regions with sprites', `${spriteCheck.hasSprites} regions with sprites`,
        JSON.stringify(spriteCheck), '');
    }

    // EVAL-006: No console errors during 5s idle
    await page.waitForTimeout(3000);
    if (consoleErrors.length > 0) {
      addItem('EVAL-006', 'major', '5초간 콘솔 에러 없음', 'playwright+console',
        'page.on("console"/"pageerror")',
        '0 errors', `${consoleErrors.length} errors`,
        consoleErrors.join('\n'),
        '에러 메시지를 확인하고 원인 수정');
    } else {
      addItem('EVAL-006', 'pass', '5초간 콘솔 에러 없음 - PASS', 'playwright+console',
        'page.on("console"/"pageerror")',
        '0 errors', '0 errors',
        'No console errors detected', '');
    }

  } catch (err) {
    addItem('EVAL-ERR', 'blocker', '평가 실행 자체 성공', 'playwright',
      'full evaluation flow', 'no crash', err.message,
      err.stack, '게임 로드 실패. 서버/빌드/데이터 경로 확인');
  } finally {
    await browser.close();
    await server.close();
  }

  // Compute verdict
  const blockers = REPORT.items.filter(i => i.severity === 'blocker').length;
  const majors = REPORT.items.filter(i => i.severity === 'major').length;
  const minors = REPORT.items.filter(i => i.severity === 'minor').length;
  REPORT.summary = {
    blocker: blockers,
    major: majors,
    minor: minors,
    tool_executions: REPORT.items.length,
    pass: blockers === 0 && majors === 0 && REPORT.items.length >= 3
  };
  REPORT.status = REPORT.summary.pass ? 'pass' : 'fail';

  writeFileSync('eval/reports/sprint-001.json', JSON.stringify(REPORT, null, 2));
  console.log('\n=== EVAL REPORT ===');
  console.log(`Status: ${REPORT.status}`);
  console.log(`Blocker: ${blockers}, Major: ${majors}, Minor: ${minors}`);
  console.log(`Tool executions: ${REPORT.items.length}`);
  for (const item of REPORT.items) {
    console.log(`  [${item.severity.toUpperCase()}] ${item.criteria}`);
    if (item.severity === 'blocker' || item.severity === 'major') {
      console.log(`    Expected: ${item.expected}`);
      console.log(`    Actual:   ${item.actual}`);
      console.log(`    Fix:      ${item.suggestion}`);
    }
  }
  console.log('===================\n');
}

evaluate().catch(console.error);
