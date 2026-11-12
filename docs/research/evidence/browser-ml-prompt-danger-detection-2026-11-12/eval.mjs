// One-off research script, kept exactly as run on 2026-11-12 so the memo's numbers can be reproduced.
/* eslint-disable eslint-comments/no-unlimited-disable */
/* eslint-disable */
// Scores every evaluation row with one local ONNX classifier and writes JSONL.
//
// Usage: node eval.mjs <modelName> <modelsDir> <corpusDir> <extraDir> <outDir> [--full] [--limit N]
//   --full  scores every corpus row (no sampling) and skips the extra sets.

import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { AutoModelForSequenceClassification, AutoTokenizer, env } from '@huggingface/transformers'
import { buildRows } from './datasets.mjs'

const [modelName, modelsDir, corpusDir, extraDir, outDir, ...flags] = process.argv.slice(2)
const full = flags.includes('--full')
const limit = flags.includes('--limit') ? Number(flags[flags.indexOf('--limit') + 1]) : Infinity
const MAX_TOKENS = 512

env.allowRemoteModels = false
env.allowLocalModels = true
env.localModelPath = `${modelsDir}/`

const tokenizer = await AutoTokenizer.from_pretrained(modelName)
const loadStart = performance.now()
const model = await AutoModelForSequenceClassification.from_pretrained(modelName, {
    dtype: 'fp32', // each folder holds its chosen quantized file as onnx/model.onnx
    session_options: { intraOpNumThreads: Number(process.env.THREADS ?? 2), interOpNumThreads: 1 },
})
const loadMs = performance.now() - loadStart
const multiLabel = model.config.problem_type === 'multi_label_classification'
const id2label = model.config.id2label

function positiveScore(logits) {
    const values = Array.from(logits.data)
    if (multiLabel) // index 0 is the overall "unsafe" sigmoid
        return 1 / (1 + Math.exp(-values[0]))
    const max = Math.max(...values)
    const exps = values.map(v => Math.exp(v - max))
    return exps[1] / exps.reduce((a, b) => a + b, 0)
}

const rows = buildRows({ corpusDir, extraDir, full }).slice(0, limit)
mkdirSync(outDir, { recursive: true })
const lines = []
const started = performance.now()
for (const [index, row] of rows.entries()) {
    const inputs = await tokenizer(row.text, { truncation: true, max_length: MAX_TOKENS })
    const tokens = inputs.input_ids.dims[1]
    const t0 = performance.now()
    const { logits } = await model(inputs)
    const ms = performance.now() - t0
    lines.push(JSON.stringify({ model: modelName, set: row.set, source: row.source, label: row.label, variant: row.variant, id: row.id, score: Number(positiveScore(logits).toFixed(5)), ms: Number(ms.toFixed(1)), tokens, chars: row.text.length }))
    if (index % 500 === 0)
        console.error(`${modelName} ${index}/${rows.length} ${((performance.now() - started) / 1000).toFixed(0)}s`)
}
writeFileSync(join(outDir, `${modelName}${full ? '.full' : ''}.jsonl`), `${lines.join('\n')}\n`)
console.log(JSON.stringify({ model: modelName, rows: rows.length, loadMs: Math.round(loadMs), totalSeconds: Math.round((performance.now() - started) / 1000), labels: id2label, multiLabel }))
