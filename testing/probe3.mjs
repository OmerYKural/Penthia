import { chromium } from 'playwright';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } }); // desktop mode: no viewport auto-expand
await ctx.addInitScript(() => { try { sessionStorage.setItem('penthia_quiz_popup_seen','1'); } catch(e){} });
const page = await ctx.newPage();
await page.goto('http://localhost:8811/testing/index.html', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1500);
console.log(await page.evaluate(() => {
  const bad = [];
  document.querySelectorAll('body *').forEach(el => {
    const r = el.getBoundingClientRect();
    if (r.right > 395 || r.left < -5) {
      const cs = getComputedStyle(el);
      if (cs.position === 'fixed' || r.width > 100)
        bad.push(`${el.tagName}#${el.id}.${(el.className||'').toString().split(' ')[0]} L=${Math.round(r.left)} R=${Math.round(r.right)} W=${Math.round(r.width)} pos=${cs.position}`);
    }
  });
  return { scrollW: document.documentElement.scrollWidth, bodyScrollW: document.body.scrollWidth, bad: bad.slice(0,20) };
}));
await browser.close();
