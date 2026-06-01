import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

const responses = [];
page.on('response', async resp => {
  if (resp.url().includes('appsync') || resp.url().includes('graphql')) {
    try { responses.push(await resp.text()); } catch {}
  }
});

await page.goto('http://localhost:5173/');
await page.waitForLoadState('networkidle');
await page.fill('input[placeholder*="Email"]', 'petar.prenc@gmail.com');
await page.fill('input[type="password"]', 'Password123456!');
await page.getByRole('button', { name: /sign in/i }).click();
await page.waitForFunction(() => document.body.innerText.includes('Generate Narrative'), { timeout: 15000 });
await page.waitForTimeout(500);

const inputs = await page.locator('input[placeholder*="Observation"]').all();
await inputs[0].fill('limfocit');
await inputs[1].fill('makrofag');
await inputs[2].fill('neutrofil');

await page.getByRole('button', { name: /generate narrative/i }).click();
console.log('Čekam odgovor...');
await page.waitForTimeout(25000);

console.log('\nRaw AppSync odgovor:');
console.log(responses.at(-1));

await browser.close();
