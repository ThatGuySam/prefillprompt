// One-off research script, kept exactly as run on 2026-11-12 so the memo's numbers can be reproduced.
/* eslint-disable eslint-comments/no-unlimited-disable */
/* eslint-disable */
// Summarizes a --full run: flag rates by source, and the benign rows that scored highest.
// Usage: node analyze-full.mjs <outDir> <corpusDir> <model>
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { buildRows } from './datasets.mjs'

const [outDir, corpusDir, model] = process.argv.slice(2)
const texts = new Map(buildRows({ corpusDir, extraDir: '', full: true }).map(r => [r.id, r.text]))
const rows = readFileSync(join(outDir, `${model}.full.jsonl`), 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l))
const thresholds = [0.5, 0.9, 0.95, 0.99, 0.999]
const bySource = {}
for (const source of [...new Set(rows.map(r => r.source))]) {
    const s = rows.filter(r => r.source === source)
    bySource[source] = { label: s[0].label, n: s.length, ...Object.fromEntries(thresholds.map(t => [`>=${t}`, s.filter(r => r.score >= t).length])) }
}
console.table(bySource)
const mal = rows.filter(r => r.label === 'malicious')
const ben = rows.filter(r => r.label === 'benign')
const clean = ben.filter(r => r.source !== 'jailbreak-llms-regular')
const totals = {}
for (const t of thresholds) {
    totals[t] = { attacksCaught: mal.filter(r => r.score >= t).length, attacks: mal.length, benignFlagged: ben.filter(r => r.score >= t).length, benign: ben.length, cleanBenignFlagged: clean.filter(r => r.score >= t).length, cleanBenign: clean.length }
}
console.table(totals)
const top = ben.filter(r => r.score >= 0.99).sort((a, b) => b.score - a.score)
console.log(`\nbenign rows >= 0.99: ${top.length}`)
for (const r of top) console.log(`  [${r.score.toFixed(4)}] ${r.source}: ${texts.get(r.id).replace(/\s+/g, ' ').slice(0, 200)}`)
const mid = ben.filter(r => r.score >= 0.9 && r.score < 0.99 && r.source !== 'jailbreak-llms-regular')
console.log(`\nclean-benign rows 0.9-0.99: ${mid.length}`)
for (const r of mid) console.log(`  [${r.score.toFixed(4)}] ${r.source}: ${texts.get(r.id).replace(/\s+/g, ' ').slice(0, 200)}`)
writeFileSync(join(outDir, `${model}.full.summary.json`), `${JSON.stringify({ bySource, totals }, null, 4)}\n`)
