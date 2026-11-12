// Builds src/data/safety/dangerous-prompts.json: 100 real malicious prompts with a short
// explanation each.
//
//   node --experimental-strip-types scripts/safety/build-examples.mjs
//
// Every prompt is copied verbatim from a public dataset whose license allows it. Nothing is
// written or paraphrased here except the explanations. "Most common" is measured, not
// assumed: prompts are grouped by technique, techniques are ranked by how many malicious
// prompts use them, and inside a technique the most repeated texts come first. No technique
// takes more than ten slots, because the datasets differ in size for reasons unrelated to
// how common an attack is.

import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { safetySignals } from '../../src/lib/prompt-safety.ts'
import { loadCorpora, root } from './corpora.mjs'

const TOTAL = 100
const MIN_PER_TECHNIQUE = 3
const MAX_PER_TECHNIQUE = 10
const MIN_TEXT = 20
const MAX_TEXT = 400
const SITE = 'https://prefillprompt.com/safety'

const sources = Object.fromEntries(JSON.parse(readFileSync(join(root, 'src/data/safety/sources.json'), 'utf8')).sources.map(source => [source.id, source]))
const redistributable = id => /^(?:MIT|Apache-2\.0)$/.test(sources[id].license)

// Techniques with no pattern of their own are named after the kind of attack their dataset collects.
const fallback = {
    'gandalf-ignore-instructions': { id: 'secret-extraction', title: 'Talks the AI out of a secret', explanation: 'It tries to talk the AI into giving up a password or secret it was told to keep.' },
    'deepset-prompt-injections': { id: 'instruction-hijack', title: 'Hijacks the task', explanation: 'It swaps the task the AI was given for one the attacker wants instead.' },
    'jailbreak-llms-jailbreak': { id: 'jailbreak-roleplay', title: 'Jailbreak role-play', explanation: 'It wraps a request in role-play so the AI drops its normal safety limits.' },
    'injecagent-data-stealing': { id: 'agent-data-theft', title: 'Makes an agent hand over data', explanation: 'It tells an agent with access to your accounts to collect private data and pass it on.' },
    'injecagent-direct-harm': { id: 'agent-harmful-action', title: 'Makes an agent act against you', explanation: 'It tells an agent to take a real action for the attacker, such as paying, unlocking, or deleting.' },
    'redcode-exec-bash': { id: 'risky-shell-task', title: 'Risky shell task', explanation: 'It asks a coding agent to run shell commands that expose data or damage the system.' },
    'llmail-inject': { id: 'agent-email-injection', title: 'Hijacks an email agent', explanation: 'It is an email written to make an AI assistant send messages the owner never asked for.' },
}
const UNSUITABLE = /\b(?:nsfw|porn|sex(?:ual|y)?|rape|erotic|fetish|nigg|fagg|suicide|self[- ]harm|child(?:ren)?|minor|kill)\b/i

const normalize = text => text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim()
const sha256 = text => createHash('sha256').update(text).digest('hex')

const malicious = loadCorpora().filter(row => row.label === 'malicious')
const groups = new Map()
const techniqueTotals = new Map()
for (const row of malicious) {
    const signal = safetySignals.find(candidate => candidate.test(row.text))
    const technique = signal ? { id: signal.id, title: signal.title, explanation: signal.explanation } : fallback[row.source]
    if (!technique)
        continue
    techniqueTotals.set(technique.id, (techniqueTotals.get(technique.id) ?? 0) + 1)
    if (!redistributable(row.source) || UNSUITABLE.test(row.text) || row.text.trim().length < MIN_TEXT)
        continue
    const key = `${technique.id}\u0000${normalize(row.text)}`
    const group = groups.get(key) ?? { technique, row, count: 0 }
    group.count += 1
    groups.set(key, group)
}

// Rank techniques by how many malicious prompts use them. Each gets between three and ten
// slots, limited by how many distinct prompts it has; spare slots go to the highest ranked.
const counted = [...techniqueTotals.entries()].sort((a, b) => b[1] - a[1])
const all = counted.reduce((sum, [, count]) => sum + count, 0)
const order = counted.map(([id]) => id)
const pools = new Map(order.map(id => [id, [...groups.values()].filter(group => group.technique.id === id).sort((a, b) => b.count - a.count || a.row.text.length - b.row.text.length || a.row.text.localeCompare(b.row.text))]))
const slots = new Map(counted.map(([id, count]) => [id, Math.min(pools.get(id).length, Math.max(MIN_PER_TECHNIQUE, Math.min(MAX_PER_TECHNIQUE, Math.round(count / all * TOTAL))))]))
const taken = () => [...slots.values()].reduce((a, b) => a + b, 0)
for (let limit = MAX_PER_TECHNIQUE; taken() < TOTAL; limit += 1) {
    for (const id of order) {
        if (taken() < TOTAL && slots.get(id) < Math.min(limit, pools.get(id).length))
            slots.set(id, slots.get(id) + 1)
    }
}

const examples = []
for (const id of order) {
    for (const group of pools.get(id).slice(0, slots.get(id))) {
        const source = sources[group.row.source]
        const text = group.row.text.trim()
        examples.push({
            technique: id,
            title: group.technique.title,
            explanation: group.technique.explanation,
            learnMore: `${SITE}#${id}`,
            text: text.length > MAX_TEXT ? `${text.slice(0, MAX_TEXT)}…` : text,
            truncated: text.length > MAX_TEXT,
            fullTextSha256: sha256(text),
            timesSeen: group.count,
            techniqueCount: techniqueTotals.get(id),
            source: { id: source.id, ref: group.row.ref, url: source.url, license: source.license },
        })
    }
}
examples.forEach((example, index) => Object.assign(example, { id: index + 1, ...example }))

writeFileSync(join(root, 'src/data/safety/dangerous-prompts.json'), `${JSON.stringify({
    built: new Date().toISOString().slice(0, 10),
    method: 'Real malicious prompts from the public datasets in sources.json, grouped by technique. Techniques are ranked by how many malicious prompts use them, and each gets three to ten examples. Inside a technique, the most repeated texts come first, then the shortest. Prompts are verbatim; long ones are cut at 400 characters and marked truncated. Explanations are written for this dataset.',
    limits: 'Ranks reflect these datasets, not all prompts in the world. Sources without a clear redistribution license are counted but not copied. Prompts with sexual or violent wording are left out.',
    maliciousPromptsCounted: all,
    techniques: order.map(id => ({ id, promptsCounted: techniqueTotals.get(id), examples: examples.filter(example => example.technique === id).length })),
    examples: examples.map(({ id, ...rest }) => ({ id, ...rest })),
}, null, 4)}\n`)
console.log(`${examples.length} examples`, JSON.stringify(Object.fromEntries(order.map(id => [id, `${techniqueTotals.get(id)}→${examples.filter(e => e.technique === id).length}`]))))
