// One-off research script, kept exactly as run on 2026-11-12 so the memo's numbers can be reproduced.
/* eslint-disable eslint-comments/no-unlimited-disable */
/* eslint-disable */
// Prints the texts behind selected results. Usage: node inspect.mjs <outDir> <corpusDir> <extraDir> <model>
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { buildRows } from './datasets.mjs'
const [outDir, corpusDir, extraDir, model] = process.argv.slice(2)
const texts = new Map(buildRows({ corpusDir, extraDir }).map(r => [`${r.set}|${r.id}|${r.variant}`, r.text]))
const rows = readFileSync(join(outDir, `${model}.jsonl`), 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l))
const show = (title, list, n = 20) => { console.log(`\n## ${title} (${list.length})`); list.slice(0, n).forEach(r => console.log(`  [${r.score.toFixed(3)}] ${r.source}: ${texts.get(`${r.set}|${r.id}|${r.variant}`).replace(/\s+/g, ' ').slice(0, 170)}`)) }
show('benign corpus rows scored >= 0.9', rows.filter(r => r.set === 'corpus' && r.label === 'benign' && r.score >= 0.9).sort((a, b) => b.score - a.score))
show('notinject scored >= 0.5', rows.filter(r => r.set === 'notinject' && r.score >= 0.5).sort((a, b) => b.score - a.score), 8)
show('link-malicious, by score', rows.filter(r => r.source === 'link-malicious').sort((a, b) => b.score - a.score), 24)
show('link-benign scored >= 0.2', rows.filter(r => r.source === 'link-benign' && r.score >= 0.2).sort((a, b) => b.score - a.score))
