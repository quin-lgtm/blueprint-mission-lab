import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { existsSync } from 'node:fs';

const root = process.cwd();
const out = path.join(root, 'captures', 'video');
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

const chromiumPath = process.env.CHROMIUM_PATH || (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined);
const browser = await chromium.launch({ executablePath: chromiumPath, headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu-sandbox'] });
const context = await browser.newContext({ viewport: { width: 1440, height: 1100 }, recordVideo: { dir: out, size: { width: 1440, height: 1100 } } });
const page = await context.newPage();
await page.goto('http://127.0.0.1:5173', { waitUntil: 'networkidle' });
await page.waitForTimeout(1000);
const maxScroll = await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);
for (let i = 0; i <= 160; i++) {
  await page.evaluate((y) => window.scrollTo(0, y), (maxScroll * i) / 160);
  await page.waitForTimeout(34);
}
await page.waitForTimeout(1200);
await context.close();
await browser.close();
server.kill('SIGTERM');
console.log(`video saved to ${out}`);
