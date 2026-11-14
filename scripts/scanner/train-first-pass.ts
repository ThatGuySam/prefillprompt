// Trains the scanner's first pass (src/lib/scanner/first-pass.ts) and writes its gzipped weights
// to public/scanner/ and its settings to src/data/scanner/first-pass.json.
//
// Usage:
//   node --import tsx scripts/scanner/train-first-pass.ts --bits 20 \
//     --oasst <oasst2-prompts.json> --notinject <notinject.json> \
//     --near-miss docs/research/evidence/browser-ml-prompt-danger-detection-2026-11-12/near-miss.json \
//     --links docs/research/evidence/browser-ml-prompt-danger-detection-2026-11-12/link-threat.json \
//     --final-check docs/research/evidence/browser-ml-prompt-danger-detection-2026-11-12/near-miss-2.json \
//     [--write]
//
// Inputs besides the corpora that scripts/safety/fetch.mjs caches:
//   oasst2-prompts.json  the opening user message of each OpenAssistant oasst2 train conversation
//                        (Apache-2.0), made by scripts/scanner/oasst-prompts.py
//   notinject.json       the 339 leolee99/NotInject prompts (MIT) as a JSON array of strings, from
//                        https://datasets-server.huggingface.co/rows?dataset=leolee99/NotInject
//
// Every row lands in train (70%), calibration (15%), or test (15%) by a hash of its text. The
// first run set the threshold just above the highest safe calibration score (0.888 on 2,591
// prompts), and 8 held-out safe prompts still crossed it, 5 of them from the near-miss set. The
// threshold is therefore fixed at 0.999, one step above the lowest value with no held-out false
// alarm (0.998). Because that choice looked at the held-out sets, a second near-miss set, written
// afterwards and scored once, is the clean check (--final-check).

import { createHash } from 'node:crypto'
import { readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import process from 'node:process'
import { gzipSync } from 'node:zlib'
import { safetySignals } from '../../src/lib/prompt-safety.ts'
import { featureIndexes, firstPassScore } from '../../src/lib/scanner/first-pass.ts'
import { loadCorpora, root } from '../safety/corpora.mjs'

type Label = 0 | 1
type Split = 'train' | 'calibration' | 'test' | 'external'
interface Row { source: string, label: Label, text: string, split: Split }

function argument(name: string) {
    const index = process.argv.indexOf(`--${name}`)
    return index === -1 ? undefined : process.argv[index + 1]
}
function required(name: string) {
    const value = argument(name)
    if (value === undefined)
        throw new Error(`--${name} is required`)
    return value
}
const bits = Number(argument('bits') ?? 20)
const buckets = 2 ** bits
const readJson = (path: string) => JSON.parse(readFileSync(path, 'utf8'))

function splitFor(text: string): Split {
    const value = createHash('sha256').update(text).digest().readUInt32BE(0) / 2 ** 32
    return value < 0.7 ? 'train' : value < 0.85 ? 'calibration' : 'test'
}

const rows: Row[] = []
function add(source: string, label: Label, text: string, split?: Split) {
    if (typeof text === 'string' && text.trim())
        rows.push({ source, label, text, split: split ?? splitFor(text) })
}

// jailbreak-llms "regular" holds the character-card and prompt-library templates people really
// share, so it trains as safe. It is labeled by channel and also holds real jailbreaks, so it is
// left out of choosing the threshold.
for (const row of loadCorpora() as Array<{ source: string, label: string, text: string }>)
    add(row.source, row.label === 'malicious' ? 1 : 0, row.text)
for (const prompt of readJson(required('oasst')) as Array<{ text: string }>)
    add('oasst2', 0, prompt.text)
for (const text of readJson(required('notinject')) as string[])
    add('notinject', 0, text)
for (const [category, prompts] of Object.entries(readJson(required('near-miss')).categories as Record<string, string[]>))
    prompts.forEach(text => add(`near-miss:${category}`, 0, text, 'external'))
const links = readJson(required('links')) as { malicious: string[], benign: string[] }
links.malicious.forEach(text => add('link-threat', 1, text, 'external'))
links.benign.forEach(text => add('link-benign', 0, text, 'external'))

// A text that appears with both labels teaches nothing; drop every copy.
const labelsByText = new Map<string, Set<Label>>()
rows.forEach(row => labelsByText.set(row.text, (labelsByText.get(row.text) ?? new Set()).add(row.label)))
// A safe-labeled row that names a DAN-style persona is a mislabeled jailbreak (one sits in
// OpenAssistant's opening prompts), so safe rows matching that pattern are dropped.
const jailbreakPersona = safetySignals.find(signal => signal.id === 'jailbreak-persona')!
const mislabeled = rows.filter(row => row.label === 0 && jailbreakPersona.test(row.text))
const clean = rows.filter(row => labelsByText.get(row.text)!.size === 1 && !mislabeled.includes(row))

const train = clean.filter(row => row.split === 'train')
const features = train.map(row => featureIndexes(row.text, buckets))
const positives = train.filter(row => row.label === 1).length
const classWeight = { 1: train.length / (2 * positives), 0: train.length / (2 * (train.length - positives)) }

// Logistic regression with Adagrad and L2 on the touched weights.
const weights = new Float32Array(buckets)
const squared = new Float32Array(buckets)
let bias = 0
let biasSquared = 0
const learningRate = 0.5
const l2 = 1e-6
let seed = 7
function random() {
    seed = (Math.imul(seed, 1103515245) + 12345) >>> 0
    return seed / 2 ** 32
}
const order = train.map((_, index) => index)
for (let epoch = 0; epoch < 6; epoch += 1) {
    for (let index = order.length - 1; index > 0; index -= 1) {
        const swap = Math.floor(random() * (index + 1));
        [order[index], order[swap]] = [order[swap]!, order[index]!]
    }
    for (const rowIndex of order) {
        const indexes = features[rowIndex]!
        const value = 1 / Math.sqrt(indexes.length)
        let logit = bias
        for (const index of indexes) logit += weights[index]! * value
        const label = train[rowIndex]!.label
        const error = (1 / (1 + Math.exp(-logit)) - label) * classWeight[label]
        for (const index of indexes) {
            const gradient = error * value + l2 * weights[index]!
            squared[index]! += gradient * gradient
            weights[index]! -= learningRate * gradient / Math.sqrt(squared[index]! + 1e-8)
        }
        biasSquared += error * error
        bias -= learningRate * error / Math.sqrt(biasSquared + 1e-8)
    }
}

let largest = 0
for (const weight of weights) largest = Math.max(largest, Math.abs(weight))
const scale = largest / 127
const quantized = Int8Array.from(weights, weight => Math.round(weight / scale))
const model = { buckets, bias, scale, threshold: 1, weights: quantized }

const scored = clean.filter(row => row.split !== 'train').map(row => ({ ...row, score: firstPassScore(model, row.text) }))
const calibrationSafe = scored.filter(row => row.split === 'calibration' && row.label === 0 && row.source !== 'jailbreak-llms-regular').map(row => row.score)
model.threshold = 0.999
const flagged = (row: { score: number }) => row.score >= model.threshold

const lines: string[] = []
function log(line: string) {
    lines.push(line)
    console.log(line)
}
log(`first pass: 2^${bits} buckets (${(buckets / 1e6).toFixed(2)} MB of int8 weights), ${train.length} training rows, threshold ${model.threshold.toFixed(4)}`)
log(`calibration safe prompts: ${calibrationSafe.length}, highest score ${Math.max(...calibrationSafe).toFixed(4)}`)
log(`safe-labeled rows dropped as DAN-style jailbreaks: ${mislabeled.length}`)
log('')
log('split        source                                  label      n   flagged')
const groups = new Map<string, typeof scored>()
for (const row of scored) {
    const key = `${row.split}|${row.source.startsWith('near-miss:') ? 'near-miss (180)' : row.source}|${row.label ? 'attack' : 'safe'}`
    groups.set(key, [...(groups.get(key) ?? []), row])
}
for (const [key, group] of [...groups].sort(([a], [b]) => a.localeCompare(b))) {
    const [split, source, label] = key.split('|')
    const count = group.filter(flagged).length
    log(`${split!.padEnd(12)} ${source!.padEnd(39)} ${label!.padEnd(6)} ${String(group.length).padStart(5)} ${String(count).padStart(6)}  ${(100 * count / group.length).toFixed(1)}%`)
}
const heldOutSafe = scored.filter(row => row.label === 0 && row.split !== 'calibration' && row.source !== 'jailbreak-llms-regular')
log('')
log(`held-out safe prompts flagged (test + near-miss + link-benign): ${heldOutSafe.filter(flagged).length} of ${heldOutSafe.length}`)
for (const row of heldOutSafe.filter(flagged))
    log(`  false alarm ${row.score.toFixed(4)} ${row.source}: ${row.text.slice(0, 120).replace(/\s+/g, ' ')}`)
log('')
log('threshold  held-out safe flagged  test attacks caught  link threats caught')
for (const threshold of [model.threshold, 0.98, 0.99, 0.995, 0.998, 0.999, 0.9995]) {
    const safe = heldOutSafe.filter(row => row.score >= threshold).length
    const attacks = scored.filter(row => row.label === 1 && row.split === 'test')
    const link = scored.filter(row => row.source === 'link-threat')
    log(`${threshold.toFixed(4).padEnd(10)} ${String(safe).padStart(4)} of ${heldOutSafe.length}         ${String(attacks.filter(row => row.score >= threshold).length).padStart(4)} of ${attacks.length}          ${link.filter(row => row.score >= threshold).length} of ${link.length}`)
}
const testAttacks = scored.filter(row => row.label === 1 && row.split === 'test')
log(`test attacks caught: ${testAttacks.filter(flagged).length} of ${testAttacks.length}`)

const finalCheck = argument('final-check')
if (finalCheck) {
    const prompts = Object.entries(readJson(finalCheck).categories as Record<string, string[]>).flatMap(([category, texts]) => texts.map(text => ({ category, text, score: firstPassScore(model, text) })))
    log('')
    log(`final check, second near-miss set: ${prompts.filter(flagged).length} of ${prompts.length} flagged; highest score ${Math.max(...prompts.map(prompt => prompt.score)).toFixed(4)}`)
    for (const prompt of prompts.filter(flagged))
        log(`  false alarm ${prompt.score.toFixed(4)} ${prompt.category}: ${prompt.text.slice(0, 120).replace(/\s+/g, ' ')}`)
}

if (process.argv.includes('--write')) {
    const bytes = new Uint8Array(quantized.buffer)
    const hash = createHash('sha256').update(bytes).digest('hex')
    const file = `first-pass.${hash.slice(0, 12)}.bin.gz`
    for (const old of readdirSync(join(root, 'public/scanner')).filter(name => name.startsWith('first-pass.')))
        rmSync(join(root, 'public/scanner', old))
    writeFileSync(join(root, 'public/scanner', file), gzipSync(bytes, { level: 9 }))
    writeFileSync(join(root, 'src/data/scanner/first-pass.json'), `${JSON.stringify({ file, sha256: hash, buckets, bias, scale, threshold: model.threshold }, null, 4)}\n`)
    writeFileSync(join(root, 'docs/research/evidence/browser-ml-prompt-danger-detection-2026-11-12/first-pass.report.txt'), `${lines.join('\n')}\n`)
    console.log(`wrote public/scanner/${file}`)
}
