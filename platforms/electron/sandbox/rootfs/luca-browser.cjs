#!/usr/bin/env node
const { chromium } = require('/opt/luca-sandbox/node_modules/playwright');

const encoded = process.argv[2] || '';
if (!/^[A-Za-z0-9_-]+$/.test(encoded) || encoded.length > 131072) throw new Error('Invalid browser plan.');
const plan = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));

function allowedUrl(raw) {
    const url = new URL(raw);
    if (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname))) throw new Error('Browser navigation requires HTTPS.');
    const host = url.hostname.toLowerCase();
    if (/^(10\.|127\.|169\.254\.|192\.168\.|localhost$)/.test(host) || /^172\.(1[6-9]|2\d|3[01])\./.test(host)) throw new Error('Private network navigation is blocked.');
    return url.href;
}

(async () => {
    const browser = await chromium.launch({ headless: true });
    try {
        const page = await browser.newPage({ acceptDownloads: false });
        await page.goto(allowedUrl(plan.url), { waitUntil: 'domcontentloaded', timeout: plan.timeoutMs });
        for (const action of plan.actions || []) {
            const locator = page.getByRole(action.role, { name: action.name, exact: true });
            if (action.type === 'click') await locator.click();
            else if (action.type === 'fill') await locator.fill(action.value);
            else throw new Error('Unsupported browser action.');
        }
        const title = await page.title();
        const text = (await page.locator('body').innerText()).slice(0, plan.maxTextChars);
        process.stdout.write(JSON.stringify({ url: page.url(), title, text }));
    } finally {
        await browser.close();
    }
})().catch((error) => { process.stderr.write(String(error.message || error)); process.exitCode = 1; });
