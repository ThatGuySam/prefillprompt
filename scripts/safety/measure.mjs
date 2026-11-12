// Counts how often each safety signal fires on malicious and benign prompts.
//
//   node --experimental-strip-types scripts/safety/measure.mjs [--show <signal-id>]
//
// Writes src/data/safety/signal-measurements.json. --show prints benign prompts that matched one
// signal, for reading the false positives by hand.

import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import process from 'node:process'
import { safetySignals } from '../../src/lib/prompt-safety.ts'
import { loadCorpora, root } from './corpora.mjs'

const rows = loadCorpora()
const totals = {}
for (const row of rows) {
    totals[row.source] ??= { malicious: 0, benign: 0 }
    totals[row.source][row.label] += 1
}
const malicious = rows.filter(row => row.label === 'malicious').length
const benign = rows.length - malicious

const show = process.argv.includes('--show') ? process.argv[process.argv.indexOf('--show') + 1] : null
const signals = safetySignals.map((signal) => {
    const hits = { malicious: 0, benign: 0 }
    const bySource = {}
    for (const row of rows) {
        if (!signal.test(row.text))
            continue
        hits[row.label] += 1
        bySource[row.source] = (bySource[row.source] ?? 0) + 1
        if (show === signal.id && row.label === 'benign')
            console.log(`--- ${row.source} ${row.ref}\n${row.text.slice(0, 400).replaceAll('\n', ' ')}`)
    }
    const total = hits.malicious + hits.benign
    return {
        id: signal.id,
        tier: signal.tier,
        maliciousHits: hits.malicious,
        benignHits: hits.benign,
        precision: total ? Number((hits.malicious / total).toFixed(4)) : null,
        benignHitsPer10k: Number((hits.benign / benign * 10_000).toFixed(1)),
        maliciousCoverage: Number((hits.malicious / malicious).toFixed(4)),
        bySource,
    }
})

if (!show) {
    writeFileSync(join(root, 'src/data/safety/signal-measurements.json'), `${JSON.stringify({ measured: new Date().toISOString().slice(0, 10), prompts: { malicious, benign }, bySource: totals, signals }, null, 4)}\n`)
    console.log(`prompts: ${malicious} malicious, ${benign} benign`, JSON.stringify(totals))
    for (const s of signals)
        console.log(`${s.id.padEnd(22)} ${s.tier.padEnd(8)} mal=${String(s.maliciousHits).padStart(4)} ben=${String(s.benignHits).padStart(4)} precision=${s.precision} benign/10k=${s.benignHitsPer10k} coverage=${s.maliciousCoverage}`)
}
