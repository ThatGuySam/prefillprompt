// One-off research script, kept exactly as run on 2026-11-12 so the memo's numbers can be reproduced.
/* eslint-disable eslint-comments/no-unlimited-disable */
/* eslint-disable */
// Exemplar-similarity baseline for link-style threats.
// Bank = half of the hand-written link attacks; test = the other half plus every benign row. Two folds.
// Usage: node knn.mjs <embeddingsJsonl>
import { readFileSync } from 'node:fs'

const rows = readFileSync(process.argv[2], 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l))
const dot = (a, b) => { let s = 0; for (let i = 0; i < a.length; i += 1) s += a[i] * b[i]; return s }
const linkMal = rows.filter(r => r.source === 'link-malicious')
const benign = rows.filter(r => r.label === 'benign')
const otherMal = rows.filter(r => r.label === 'malicious' && r.source !== 'link-malicious')
const maxSim = (row, bank) => Math.max(...bank.map(b => dot(row.v, b.v)))
const folds = [0, 1].map((parity) => {
    const bank = linkMal.filter((_, i) => i % 2 === parity)
    const held = linkMal.filter((_, i) => i % 2 !== parity)
    return { bank, held, benignScores: benign.map(r => ({ source: r.source, s: maxSim(r, bank) })), heldScores: held.map(r => maxSim(r, bank)), otherScores: otherMal.map(r => maxSim(r, bank)) }
})
for (const t of [0.5, 0.55, 0.6, 0.65, 0.7, 0.75, 0.8]) {
    let caught = 0; let total = 0; let fp = 0; let nBenign = 0; const fpBySource = {}; let other = 0; let nOther = 0
    for (const fold of folds) {
        caught += fold.heldScores.filter(s => s >= t).length; total += fold.heldScores.length
        for (const b of fold.benignScores) { nBenign += 1; if (b.s >= t) { fp += 1; fpBySource[b.source] = (fpBySource[b.source] ?? 0) + 1 } }
        other += fold.otherScores.filter(s => s >= t).length; nOther += fold.otherScores.length
    }
    console.log(`sim>=${t}: held-out link attacks caught ${caught}/${total} | benign flagged ${fp}/${nBenign} (${(100 * fp / nBenign).toFixed(2)}%) ${JSON.stringify(fpBySource)} | other-corpus attacks flagged ${(100 * other / nOther).toFixed(1)}%`)
}
