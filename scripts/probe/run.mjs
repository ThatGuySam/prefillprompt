import process from 'node:process'
import { errorCases, providerTargets, redirectCases, roundTripPrompt } from './cases.mjs'

const args = process.argv.slice(2)
const flag = name => args.includes(`--${name}`)
function option(name, fallback) {
    const index = args.indexOf(`--${name}`)
    return index === -1 ? fallback : args[index + 1]
}

const base = option('base', 'https://prefillprompt.com').replace(/\/$/, '')
const results = []

function record(group, name, status, detail = '') {
    results.push({ group, name, status, detail })
}

function apiUrl(query) {
    return `${base}/api/prompt?${new URLSearchParams(query).toString()}`
}

async function get(url, init = {}) {
    return fetch(url, {
        redirect: 'manual',
        signal: AbortSignal.timeout(15_000),
        headers: { 'User-Agent': 'PrefillPrompt URL probe' },
        ...init,
    })
}

async function check(group, name, run) {
    try {
        const outcome = await run()
        record(group, name, outcome?.warn ? 'warn' : 'pass', outcome?.warn ?? '')
    }
    catch (error) {
        record(group, name, 'fail', error instanceof Error ? error.message : String(error))
    }
}

function expectEqual(actual, expected, label) {
    if (actual !== expected) {
        throw new Error(`${label}: expected ${expected} but got ${actual}`)
    }
}

for (const testCase of redirectCases) {
    await check('redirect', testCase.name, async () => {
        const response = await get(apiUrl(testCase.query))
        expectEqual(response.status, 307, 'status')
        const location = response.headers.get('location') ?? ''
        expectEqual(new URL(location, base).href, new URL(testCase.location, base).href, 'location')
        expectEqual(response.headers.get('cache-control'), 'private, no-store', 'cache-control')
    })
}

await check('redirect', 'special characters survive the redirect', async () => {
    const response = await get(apiUrl({ s: 'claude', q: roundTripPrompt }))
    expectEqual(response.status, 307, 'status')
    const location = new URL(response.headers.get('location') ?? '', base)
    expectEqual(location.searchParams.get('q'), roundTripPrompt, 'decoded q')
})

for (const testCase of errorCases) {
    await check('error', testCase.name, async () => {
        const response = await get(apiUrl(testCase.query))
        expectEqual(response.status, testCase.status, 'status')
        const body = await response.json().catch(() => ({}))
        const code = body?.data?.code
        expectEqual(code, testCase.code, 'error code')
    })
}

await check('site', 'home page renders', async () => {
    const response = await get(`${base}/`)
    expectEqual(response.status, 200, 'status')
    const html = await response.text()
    if (!html.includes('PrefillPrompt')) {
        throw new Error('home page did not contain "PrefillPrompt"')
    }
})

await check('site', 'gemini handoff page renders', async () => {
    expectEqual((await get(`${base}/handoff?q=hello`)).status, 200, 'status')
})

await check('site', 'model catalog endpoint returns models', async () => {
    const response = await get(`${base}/api/models`)
    expectEqual(response.status, 200, 'status')
    const body = await response.json()
    const providerIds = ['chatgpt', 'claude', 'gemini', 'perplexity']
    for (const id of providerIds) {
        if (!Array.isArray(body?.catalog?.[id])) {
            throw new TypeError(`catalog.${id} is missing`)
        }
        if (typeof body?.capabilities?.[id] !== 'string') {
            throw new TypeError(`capabilities.${id} is missing`)
        }
    }
    const aliasIds = (body?.aliases ?? []).map(alias => alias.id).join(',')
    expectEqual(aliasIds, 'latest,latest-fast,latest-reasoning', 'aliases')
    const total = providerIds.reduce((sum, id) => sum + body.catalog[id].length, 0)
    if (total === 0) {
        throw new Error('model catalog is empty')
    }
})

if (flag('providers')) {
    for (const target of providerTargets) {
        await check('provider', `${target.provider} destination reachable`, async () => {
            const response = await get(target.url)
            if (response.status === 404 || response.status >= 500) {
                throw new Error(`${target.url} returned ${response.status}`)
            }
            if (response.status === 403 || response.status === 429) {
                return { warn: `${response.status} (bot check; reachability only, parameters unverified)` }
            }
        })
    }
}

const icon = { pass: 'PASS', fail: 'FAIL', warn: 'WARN' }
if (flag('json')) {
    process.stdout.write(`${JSON.stringify({ base, results }, null, 2)}\n`)
}
else {
    console.log(`PrefillPrompt URL probe against ${base}\n`)
    for (const result of results) {
        const detail = result.detail ? `  ${result.detail}` : ''
        console.log(`${icon[result.status]}  [${result.group}] ${result.name}${detail}`)
    }
    const counts = Object.fromEntries(['pass', 'warn', 'fail'].map(status => [status, results.filter(r => r.status === status).length]))
    console.log(`\n${counts.pass} passed, ${counts.warn} warnings, ${counts.fail} failed`)
}

process.exitCode = results.some(result => result.status === 'fail') ? 1 : 0
