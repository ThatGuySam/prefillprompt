// One-off research script, kept exactly as run on 2026-11-12 so the memo's numbers can be reproduced.
/* eslint-disable eslint-comments/no-unlimited-disable */
/* eslint-disable */
// Loads each model in headless installed Chrome and prints load and inference timings.
// Usage: node check.mjs <port> <device> <model> [<model> ...]
import { createRequire } from 'node:module'
const require = createRequire('/tmp/pp-ml-eval/runner/')
const { chromium } = require('playwright-core')
const [port, device, ...models] = process.argv.slice(2)
const browser = await chromium.launch({ channel: 'chrome', headless: true, chromiumSandbox: true })
try {
    console.log('chrome', browser.version())
    for (const model of models) {
        const page = await browser.newPage()
        const errors = []
        page.on('pageerror', e => errors.push(String(e).slice(0, 200)))
        await page.goto(`http://127.0.0.1:${port}/page.html?model=${model}&device=${device}`)
        await page.waitForFunction(() => window.__result, null, { timeout: 180_000 })
        console.log(JSON.stringify({ ...(await page.evaluate(() => window.__result)), pageErrors: errors }))
        await page.close()
    }
}
finally {
    await browser.close()
}
