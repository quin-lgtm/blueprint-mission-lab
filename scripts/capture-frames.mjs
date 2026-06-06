import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { existsSync } from 'node:fs';

const root = process.cwd();
const out = path.join(root, 'captures', 'frames');
await fs.mkdir(out, { recursive: true });

const server = spawn('npm', ['run', 'dev', '--', '--port', '5173'], {
  cwd: root,
  shell: true,
  stdio: ['ignore', 'pipe', 'pipe'],
});

let ready = false;
server.stdout.on('data', (d) => {
  const text = d.toString();
  process.stdout.write(text);
  if (/Local/i.test(text) || /ready in/i.test(text)) ready = true;
});
server.stderr.on('data', (d) => process.stderr.write(d.toString()));

for (let i = 0; i < 60 && !ready; i++) await new Promise((r) => setTimeout(r, 250));
if (!ready) console.warn('Vite readiness not detected; attempting capture anyway.');

const chromiumPath = process.env.CHROMIUM_PATH || (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined);
const browser = await chromium.launch({ executablePath: chromiumPath, headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 }, deviceScaleFactor: 1 });
await page.goto('http://127.0.0.1:5173', { waitUntil: 'networkidle' });
await page.waitForTimeout(1200);
const maxScroll = await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);
const stops = [0, 0.12, 0.26, 0.39, 0.54, 0.69, 0.84, 1];
for (const stop of stops) {
  await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), maxScroll * stop);
  await page.waitForTimeout(900);
  const name = `mission-${String(Math.round(stop * 100)).padStart(3, '0')}.png`;
  await page.screenshot({ path: path.join(out, name), fullPage: false });
  console.log(`captured ${name}`);
}
await browser.close();
server.kill('SIGTERM');
