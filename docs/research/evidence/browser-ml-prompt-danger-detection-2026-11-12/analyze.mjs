// One-off research script, kept exactly as run on 2026-11-12 so the memo's numbers can be reproduced.
/* eslint-disable eslint-comments/no-unlimited-disable */
/* eslint-disable */
// Summarizes eval output. Usage: node --experimental-strip-types analyze.mjs <outDir> <corpusDir> <extraDir>
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { buildRows } from './datasets.mjs'
import { detectSafetySignals } from './prompt-safety.snapshot.mts'

const [outDir, corpusDir, extraDir] = process.argv.slice(2)
const texts = new Map(buildRows({ corpusDir, extraDir }).map(r => [`${r.set}|${r.id}|${r.variant}`, r.text]))
const regexAttack = new Map()
const regexAny = new Map()
for (const [key, text] of texts) {
    const signals = detectSafetySignals(text)
    regexAttack.set(key, signals.some(s => s.tier === 'attack'))
    regexAny.set(key, signals.length > 0)
}
const pct = (n, d) => d ? `${(100 * n / d).toFixed(1)}%` : 'n/a'
const quantile = (values, q) => { const s = values.slice().sort((a, b) => a - b); return s.length ? s[Math.min(s.length - 1, Math.floor(q * s.length))] : null }
const summary = {}
const files = readdirSync(outDir).filter(f => f.endsWith('.jsonl') && !f.includes('.full'))
for (const file of files) {
    const rows = readFileSync(join(outDir, file), 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l))
    const model = rows[0].model
    const key = r => `${r.set}|${r.id}|${r.variant}`
    const corpus = rows.filter(r => r.set === 'corpus')
    const mal = corpus.filter(r => r.label === 'malicious')
    const ben = corpus.filter(r => r.label === 'benign')
    const out = { thresholds: {}, bySource: {}, notinject: {}, link: {}, evasion: {}, latency: {}, withRegex: {} }
    for (const t of [0.5, 0.9, 0.99, 0.999]) {
        const tp = mal.filter(r => r.score >= t).length
        const fp = ben.filter(r => r.score >= t).length
        const recall = tp / mal.length
        const fpr = fp / ben.length
        const precAt = p => recall * p + fpr * (1 - p) ? (recall * p) / (recall * p + fpr * (1 - p)) : null
        out.thresholds[t] = { tp, fp, recall: pct(tp, mal.length), fpr: pct(fp, ben.length), precisionCorpusMix: pct(tp, tp + fp), precisionAt1pct: precAt(0.01) === null ? 'n/a' : `${(100 * precAt(0.01)).toFixed(1)}%`, precisionAt0_1pct: precAt(0.001) === null ? 'n/a' : `${(100 * precAt(0.001)).toFixed(1)}%` }
        const ni = rows.filter(r => r.set === 'notinject')
        out.notinject[t] = `${ni.filter(r => r.score >= t).length}/${ni.length}`
        const lm = rows.filter(r => r.source === 'link-malicious'); const lb = rows.filter(r => r.source === 'link-benign')
        out.link[t] = { caught: `${lm.filter(r => r.score >= t).length}/${lm.length}`, falseAlarms: `${lb.filter(r => r.score >= t).length}/${lb.length}` }
    }
    for (const source of [...new Set(corpus.map(r => r.source))]) {
        const s = corpus.filter(r => r.source === source)
        out.bySource[source] = { label: s[0].label, n: s.length, 'flag@0.5': pct(s.filter(r => r.score >= 0.5).length, s.length), 'flag@0.9': pct(s.filter(r => r.score >= 0.9).length, s.length), 'flag@0.99': pct(s.filter(r => r.score >= 0.99).length, s.length) }
    }
    const ev = rows.filter(r => r.set === 'evasion')
    for (const variant of [...new Set(ev.map(r => r.variant))]) {
        const s = ev.filter(r => r.variant === variant)
        out.evasion[variant] = pct(s.filter(r => r.score >= 0.5).length, s.length)
    }
    const long = corpus.filter(r => r.tokens >= 400).map(r => r.ms); const short = corpus.filter(r => r.tokens <= 64).map(r => r.ms)
    out.latency = { 'p50 ≤64 tok': quantile(short, 0.5), 'p50 ≥400 tok': quantile(long, 0.5), 'p95 ≥400 tok': quantile(long, 0.95) }
    // Combining with the regex snapshot (attack tier).
    const rxMal = mal.filter(r => regexAttack.get(key(r))); const rxBen = ben.filter(r => regexAttack.get(key(r)))
    out.withRegex.regexAttackAlone = { tp: rxMal.length, fp: rxBen.length, recall: pct(rxMal.length, mal.length), precisionCorpusMix: pct(rxMal.length, rxMal.length + rxBen.length) }
    for (const t of [0.5, 0.9, 0.99]) {
        const andTp = rxMal.filter(r => r.score >= t).length; const andFp = rxBen.filter(r => r.score >= t).length
        const orTp = mal.filter(r => r.score >= t || regexAttack.get(key(r))).length
        const modelOnlyTp = mal.filter(r => r.score >= t && !regexAttack.get(key(r))).length
        out.withRegex[`regex AND model@${t}`] = { tp: andTp, fp: andFp, recall: pct(andTp, mal.length), precisionCorpusMix: pct(andTp, andTp + andFp) }
        out.withRegex[`model@${t} adds beyond regex`] = { extraCaught: modelOnlyTp, unionRecall: pct(orTp, mal.length) }
    }
    out.counts = { malicious: mal.length, benign: ben.length }
    summary[model] = out
}
writeFileSync(join(outDir, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`)
for (const [model, out] of Object.entries(summary)) {
    console.log(`\n================ ${model}  (mal=${out.counts.malicious}, ben=${out.counts.benign})`)
    console.log('thresholds:'); console.table(out.thresholds)
    console.log('by source:'); console.table(out.bySource)
    console.log('notinject flagged:', JSON.stringify(out.notinject))
    console.log('link set:', JSON.stringify(out.link))
    console.log('evasion recall@0.5:', JSON.stringify(out.evasion))
    console.log('latency ms:', JSON.stringify(out.latency))
    console.log('with regex:'); console.table(out.withRegex)
}
