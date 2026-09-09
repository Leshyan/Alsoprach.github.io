import { chromium } from 'playwright';
import fs from 'node:fs';

const OUT = '/tmp/nebula-shots';
fs.mkdirSync(OUT, { recursive: true });
const shot = (page, name) => page.screenshot({ path: `${OUT}/${name}.png` });

const browser = await chromium.launch({
  args: [
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    '--no-sandbox',
  ],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

const consoleErrors = [];
page.on('console', (msg) => {
  if (msg.type() === 'error' || msg.type() === 'warning') {
    consoleErrors.push(`[${msg.type()}] ${msg.text()}`);
  }
});
page.on('pageerror', (err) => consoleErrors.push(`[pageerror] ${err.message}`));

const url = 'http://localhost:4321/';
await page.goto(url, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2500);

// ---- gate 0: WebGL really works ----
const webgl = await page.evaluate(() => {
  const engine = window.__nebulaUniverse;
  const gl = document.querySelector('#universe-canvas').getContext('webgl2') ||
             document.querySelector('#universe-canvas').getContext('webgl');
  return {
    hasEngine: !!engine,
    state: engine?.state ?? null,
    glVersion: gl ? String(gl.getParameter(gl.VERSION)) : null,
    renderer: gl ? gl.getParameter(gl.RENDERER) : null,
  };
});
console.log('WEBGL:', JSON.stringify(webgl));

// ---- gate 1: cover state ----
const coverState = await page.evaluate(() => document.documentElement.dataset.universeState);
await shot(page, '01-cover');
console.log('COVER state:', coverState);

// ---- gate 2: mouse gather (gravity) ----
await page.mouse.move(640, 400, { steps: 30 });
await page.waitForTimeout(300);
for (let i = 0; i < 25; i++) {
  await page.mouse.move(640 + Math.sin(i) * 40, 400 + Math.cos(i) * 30, { steps: 4 });
  await page.waitForTimeout(60);
}
await shot(page, '02-cover-gather');
console.log('GATHER done');

// ---- gate 3: click -> collapse -> bigbang -> cosmos ----
await page.mouse.click(640, 400);
await page.waitForTimeout(250);
await shot(page, '03-collapse');
const collapseState = await page.evaluate(() => window.__nebulaUniverse.state);
console.log('After click state:', collapseState);

await page.waitForFunction(
  () => window.__nebulaUniverse?.state === 'bigbang',
  null, { timeout: 8000 },
).catch(() => console.log('WARN: did not observe bigbang state (may have passed quickly)'));
await shot(page, '04-bigbang').catch(() => {});

await page.waitForFunction(
  () => window.__nebulaUniverse?.state === 'cosmos',
  null, { timeout: 12000 },
);
await page.waitForTimeout(600);
await shot(page, '05-cosmos');
console.log('COSMOS reached');

// ---- gate 4: pointer lock + fly toward research nebula ----
await page.mouse.click(640, 400); // capture pointer lock
await page.waitForTimeout(400);
const locked = await page.evaluate(() => window.__nebulaUniverse?.flight?.isPointerLocked ?? null);
console.log('POINTER LOCK (headless may deny):', locked);

const focusProbe = async () => page.evaluate(() => {
  const engine = window.__nebulaUniverse;
  const st = engine?.state;
  return {
    state: st,
    pos: engine ? engine.camera.position.toArray().map((v) => +v.toFixed(1)) : null,
  };
});

// If pointer lock granted, steer toward research nebula (-26,8,-48); otherwise teleport.
if (locked) {
  await page.keyboard.down('KeyW');
  await page.keyboard.down('ShiftLeft');
  await page.waitForTimeout(2500);
  await page.keyboard.up('ShiftLeft');
  await page.waitForTimeout(1500);
  console.log('AFTER W-FLY:', JSON.stringify(await focusProbe()));
  await page.keyboard.up('KeyW');
} else {
  await page.evaluate(() => {
    const engine = window.__nebulaUniverse;
    engine.camera.position.set(-20, 8, -34);
    engine.flight.syncFromCamera();
  });
  console.log('TELEPORT to approach position:', JSON.stringify(await focusProbe()));
}

// ---- gate 5: focus label -> enter article ----
await page.waitForFunction(
  () => document.querySelector('#article-label')?.style.opacity !== '0' &&
        document.querySelector('#article-label-title')?.textContent?.length > 0,
  null, { timeout: 6000 },
).catch(() => console.log('WARN: article label not visible'));
await shot(page, '06-focus-label');
const label = await page.evaluate(() => ({
  title: document.querySelector('#article-label-title')?.textContent,
  hint: document.querySelector('.article-label__hint')?.textContent,
  state: window.__nebulaUniverse.state,
}));
console.log('FOCUS LABEL:', JSON.stringify(label));

// align camera exactly at star and enter
await page.evaluate(() => {
  const engine = window.__nebulaUniverse;
  const candidates = engine.articleStars?.stars ?? [];
  const star = candidates[0];
  if (star) {
    engine.camera.position.copy(star.world).add(new DOMPoint(0, 0, 6).toVector3?.() ?? { x: 0, y: 0, z: 0 });
    engine.camera.lookAt(star.world.x, star.world.y, star.world.z);
    engine.flight.syncFromCamera();
  }
});
await page.waitForTimeout(300);
await shot(page, '07-centered-star');

const navPromise = page.waitForURL('**/posts/**', { timeout: 15000 });
await page.mouse.click(640, 400); // click to enter (pointer locked + centered)
const entered = await navPromise.then(() => true).catch(() => false);
console.log('ENTERED ARTICLE URL:', page.url(), 'ok=', entered);

await page.waitForFunction(
  () => window.__nebulaUniverse?.state === 'article',
  null, { timeout: 10000 },
);
await page.waitForTimeout(1200);
await shot(page, '08-article');
const articleState = await page.evaluate(() => ({
  state: window.__nebulaUniverse.state,
  h1: document.querySelector('.article-page h1')?.textContent,
}));
console.log('ARTICLE:', JSON.stringify(articleState));

// ---- gate 6: return link -> reverse transition ----
await page.click('.article-back');
await page.waitForTimeout(400);
await shot(page, '09-return-mid');
await page.waitForFunction(
  () => window.__nebulaUniverse?.state === 'cosmos',
  null, { timeout: 12000 },
);
await page.waitForTimeout(500);
await shot(page, '10-cosmos-after-return');
const afterReturn = await page.evaluate(() => ({
  state: window.__nebulaUniverse.state,
  url: location.pathname,
}));
console.log('AFTER RETURN:', JSON.stringify(afterReturn));

// ---- gate 7: Back/Forward ----
await page.goBack();
await page.waitForFunction(
  () => window.__nebulaUniverse?.state === 'article' && location.pathname.startsWith('/posts/'),
  null, { timeout: 12000 },
);
await shot(page, '11-back-to-article');
console.log('BACK -> article ok:', page.url());

await page.goForward();
await page.waitForFunction(
  () => window.__nebulaUniverse?.state === 'cosmos',
  null, { timeout: 12000 },
);
await shot(page, '12-forward-to-cosmos');
console.log('FORWARD -> cosmos ok:', page.url());

// ---- gate 8: resize integrity ----
await page.setViewportSize({ width: 900, height: 620 });
await page.waitForTimeout(600);
await shot(page, '13-resize');
const resizeOk = await page.evaluate(() => ({
  state: window.__nebulaUniverse.state,
  w: document.querySelector('#universe-canvas').width,
  h: document.querySelector('#universe-canvas').height,
}));
console.log('RESIZE:', JSON.stringify(resizeOk));

// ---- gate 9: pointer-lock release (ESC) does not corrupt camera ----
await page.setViewportSize({ width: 1280, height: 800 });
await page.keyboard.press('Escape');
await page.waitForTimeout(400);
const afterEsc = await page.evaluate(() => ({
  state: window.__nebulaUniverse.state,
  pos: window.__nebulaUniverse.camera.position.toArray().map((v) => +v.toFixed(1)),
}));
console.log('AFTER ESC:', JSON.stringify(afterEsc));

console.log('\n=== CONSOLE ISSUES ===');
console.log(consoleErrors.length ? consoleErrors.join('\n') : '(none)');

await browser.close();
console.log('SMOKE TEST DONE');
