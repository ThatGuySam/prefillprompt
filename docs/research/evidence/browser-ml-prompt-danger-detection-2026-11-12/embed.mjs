// One-off research script, kept exactly as run on 2026-11-12 so the memo's numbers can be reproduced.
/* eslint-disable eslint-comments/no-unlimited-disable */
/* eslint-disable */
// Embeds every evaluation row with a small sentence-embedding model and writes vectors as JSONL.
// Usage: node embed.mjs <modelName> <modelsDir> <corpusDir> <extraDir> <outDir>
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { env, pipeline } from '@huggingface/transformers'
import { buildRows } from './datasets.mjs'

const [modelName, modelsDir, corpusDir, extraDir, outDir] = process.argv.slice(2)
env.allowRemoteModels = false
env.localModelPath = `${modelsDir}/`
const extract = await pipeline('feature-extraction', modelName, { dtype: 'fp32', session_options: { intraOpNumThreads: 2 } })
const rows = buildRows({ corpusDir, extraDir }).filter(r => r.set !== 'evasion')
mkdirSync(outDir, { recursive: true })
const lines = []
for (const row of rows) {
    const output = await extract(row.text.slice(0, 2000), { pooling: 'mean', normalize: true })
    lines.push(JSON.stringify({ set: row.set, source: row.source, label: row.label, id: row.id, v: Array.from(output.data).map(x => Number(x.toFixed(4))) }))
}
writeFileSync(join(outDir, `${modelName}.embeddings.jsonl`), `${lines.join('\n')}\n`)
console.log(JSON.stringify({ model: modelName, rows: rows.length }))
