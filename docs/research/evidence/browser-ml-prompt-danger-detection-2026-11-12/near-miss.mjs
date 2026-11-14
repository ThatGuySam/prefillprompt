// One-off research script, kept exactly as run on 2026-11-14 so the memo's numbers can be reproduced.
/* eslint-disable eslint-comments/no-unlimited-disable */
/* eslint-disable */
// Scores the hand-written near-miss set (safe prompts that resemble attacks) with one local
// ONNX classifier and with the site's current regex signals, then prints flag counts.
//
// Usage: THREADS=2 node --experimental-strip-types near-miss.mjs <modelName> <modelsDir> <nearMissJson> <outDir>

import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { AutoModelForSequenceClassification, AutoTokenizer, env } from '@huggingface/transformers'
import { normalize } from './datasets.mjs'
import { detectSafetySignals } from './prompt-safety.current.mts'

const [modelName, modelsDir, nearMissPath, outDir] = process.argv.slice(2)
env.allowRemoteModels = false
env.allowLocalModels = true
env.localModelPath = `${modelsDir}/`

const tokenizer = await AutoTokenizer.from_pretrained(modelName)
const model = await AutoModelForSequenceClassification.from_pretrained(modelName, {
    dtype: 'fp32', // each folder holds its chosen quantized file as onnx/model.onnx
    session_options: { intraOpNumThreads: Number(process.env.THREADS ?? 2), interOpNumThreads: 1 },
})
const multiLabel = model.config.problem_type === 'multi_label_classification'
async function score(text) {
    const inputs = await tokenizer(text, { truncation: true, max_length: 512 })
    const values = Array.from((await model(inputs)).logits.data)
    if (multiLabel)
        return 1 / (1 + Math.exp(-values[0]))
    const max = Math.max(...values)
    const exps = values.map(v => Math.exp(v - max))
    return exps[1] / exps.reduce((a, b) => a + b, 0)
}

const { categories } = JSON.parse(readFileSync(nearMissPath, 'utf8'))
const rows = []
for (const [category, prompts] of Object.entries(categories)) {
    for (const [index, text] of prompts.entries()) {
        const signals = detectSafetySignals(text)
        rows.push({
            model: modelName,
            category,
            id: `${category}#${index}`,
            score: Number((await score(text)).toFixed(5)),
            normalizedScore: Number((await score(normalize(text))).toFixed(5)),
            regexSignals: signals.map(s => `${s.tier}:${s.id}`),
            text,
        })
    }
}
writeFileSync(join(outDir, `${modelName}.near-miss.jsonl`), `${rows.map(r => JSON.stringify(r)).join('\n')}\n`)

const count = (list, test) => list.filter(test).length
const table = {}
for (const category of [...Object.keys(categories), 'ALL']) {
    const list = category === 'ALL' ? rows : rows.filter(r => r.category === category)
    table[category] = {
        'n': list.length,
        '≥0.5': count(list, r => r.score >= 0.5),
        '≥0.9': count(list, r => r.score >= 0.9),
        '≥0.99': count(list, r => r.score >= 0.99),
        'norm ≥0.9': count(list, r => r.normalizedScore >= 0.9),
        'regex any': count(list, r => r.regexSignals.length > 0),
        'regex attack': count(list, r => r.regexSignals.some(s => s.startsWith('attack:'))),
    }
}
console.table(table)
console.log('\nScored ≥0.5:')
for (const r of rows.filter(r => r.score >= 0.5).sort((a, b) => b.score - a.score))
    console.log(`${r.score.toFixed(3)}  ${r.id}  ${r.text.slice(0, 110)}`)
console.log('\nRegex signals:')
for (const r of rows.filter(r => r.regexSignals.length))
    console.log(`${r.regexSignals.join(',')}  ${r.id}  ${r.text.slice(0, 110)}`)
