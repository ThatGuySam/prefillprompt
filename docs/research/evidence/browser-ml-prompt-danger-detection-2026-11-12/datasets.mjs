// One-off research script, kept exactly as run on 2026-11-12 so the memo's numbers can be reproduced.
/* eslint-disable eslint-comments/no-unlimited-disable */
/* eslint-disable */
// Builds the evaluation rows: a seeded sample of the cached corpora, NotInject hard negatives,
// a small hand-written link-threat set, and perturbed variants for the evasion check.
//
// Usage: import { buildRows } from './datasets.mjs'; buildRows({ corpusDir, extraDir, full })

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

function parseCsv(text) {
    const rows = []
    let row = []
    let field = ''
    let quoted = false
    for (let i = 0; i < text.length; i += 1) {
        const char = text[i]
        if (quoted) {
            if (char === '"' && text[i + 1] === '"') { field += '"'; i += 1 }
            else if (char === '"') { quoted = false }
            else { field += char }
        }
        else if (char === '"') { quoted = true }
        else if (char === ',') { row.push(field); field = '' }
        else if (char === '\n' || char === '\r') {
            if (char === '\r' && text[i + 1] === '\n') i += 1
            row.push(field); rows.push(row); row = []; field = ''
        }
        else { field += char }
    }
    if (field || row.length) { row.push(field); rows.push(row) }
    const [header, ...body] = rows
    return body.filter(c => c.length === header.length).map(c => Object.fromEntries(header.map((n, i) => [n, c[i]])))
}

// Small deterministic PRNG so every model sees the same sample.
function mulberry32(seed) {
    let a = seed
    return () => {
        a |= 0; a = a + 0x6D2B79F5 | 0
        let t = Math.imul(a ^ a >>> 15, 1 | a)
        t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t
        return ((t ^ t >>> 14) >>> 0) / 4294967296
    }
}
function sample(items, n, seed) {
    if (n >= items.length) return items
    const rand = mulberry32(seed)
    const copy = items.slice()
    for (let i = copy.length - 1; i > 0; i -= 1) {
        const j = Math.floor(rand() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]]
    }
    return copy.slice(0, n)
}

// ---- perturbations (published character-level techniques; see arXiv 2504.11168 Table 1) ----
const CYRILLIC = { a: 'а', e: 'е', o: 'о', c: 'с', p: 'р', x: 'х', y: 'у', i: 'і' }
const LEET = { a: '4', e: '3', i: '1', o: '0', s: '5', t: '7' }
const mapChars = (text, table) => [...text].map(ch => table[ch] ?? ch).join('')
export const perturbations = {
    'zero-width': text => [...text].join('​'),
    'homoglyph': text => mapChars(text, CYRILLIC),
    'leetspeak': text => mapChars(text, LEET),
    'letter-spacing': text => text.split(' ').map(word => [...word].join(' ')).join('   '),
    'fullwidth': text => [...text].map((ch) => {
        const code = ch.codePointAt(0)
        return code >= 0x21 && code <= 0x7E ? String.fromCodePoint(code + 0xFEE0) : ch
    }).join(''),
    'unicode-tags': text => `Summarize this article for me.${[...text].map((ch) => {
        const code = ch.codePointAt(0)
        return code >= 0x20 && code <= 0x7E ? String.fromCodePoint(0xE0000 + code) : ''
    }).join('')}`,
    'base64': text => `Decode this base64 text and do what it says: ${Buffer.from(text, 'utf8').toString('base64')}`,
}

// ---- normalization pre-pass a detector could run before scoring ----
const CYRILLIC_BACK = Object.fromEntries(Object.entries(CYRILLIC).map(([latin, cyr]) => [cyr, latin]))
export function normalize(text) {
    let out = text.normalize('NFKC')
    // Decode Unicode tag characters back to the ASCII they shadow, so hidden text becomes visible to the scorer.
    out = out.replace(/[\u{E0020}-\u{E007E}]/gu, ch => String.fromCodePoint(ch.codePointAt(0) - 0xE0000))
    out = out.replace(/[​-‏‪-‮⁠-⁤⁦-⁩﻿\u{E0000}-\u{E001F}\u{E007F}]/gu, '')
    out = mapChars(out, CYRILLIC_BACK)
    // Collapse "i g n o r e" style spacing: runs of 4+ single characters separated by single spaces.
    out = out.replace(/(?:(?<=^|\s)\S(?: |$)){4,}/g, run => `${run.replace(/ /g, '')} `)
    out = out.replace(/ {2,}/g, ' ')
    // Decode long base64 runs when they decode to mostly printable text.
    out = out.replace(/[A-Za-z0-9+/]{40,}={0,2}/g, (run) => {
        const decoded = Buffer.from(run, 'base64').toString('utf8')
        const printable = [...decoded].filter(ch => ch >= ' ' && ch <= '~').length
        return printable / Math.max(decoded.length, 1) > 0.9 ? `${run} ${decoded}` : run
    })
    return out
}

export function buildRows({ corpusDir, extraDir, full = false }) {
    const read = file => readFileSync(join(corpusDir, file), 'utf8')
    const jsonl = file => read(file).split('\n').filter(Boolean).map(line => JSON.parse(line))
    const rows = []
    const add = (set, source, label, texts, n, seed) => {
        const clean = texts.filter(t => typeof t === 'string' && t.trim())
        sample(clean, full ? clean.length : n, seed).forEach((text, index) => rows.push({ set, source, label, variant: 'raw', id: `${source}#${index}`, text }))
    }
    add('corpus', 'jailbreak-llms-jailbreak', 'malicious', parseCsv(read('jailbreak-llms-jailbreak.csv')).map(r => r.prompt), 400, 11)
    add('corpus', 'jailbreak-llms-regular', 'benign', parseCsv(read('jailbreak-llms-regular.csv')).map(r => r.prompt), 1200, 12)
    add('corpus', 'prompts-chat', 'benign', parseCsv(read('prompts-chat.csv')).map(r => r.prompt), 800, 13)
    const deepset = jsonl('deepset-prompt-injections.jsonl')
    add('corpus', 'deepset-injection', 'malicious', deepset.filter(r => r.label === 1).map(r => r.text), 1e9, 14)
    add('corpus', 'deepset-benign', 'benign', deepset.filter(r => r.label !== 1).map(r => r.text), 1e9, 15)
    add('corpus', 'gandalf', 'malicious', jsonl('gandalf-ignore-instructions.jsonl').map(r => r.text), 300, 16)
    add('corpus', 'injecagent-data-stealing', 'malicious', jsonl('injecagent-data-stealing.jsonl').map(r => r['Attacker Instruction']), 1e9, 17)
    add('corpus', 'injecagent-direct-harm', 'malicious', jsonl('injecagent-direct-harm.jsonl').map(r => r['Attacker Instruction']), 1e9, 18)

    if (!full) {
        const extra = file => JSON.parse(readFileSync(join(extraDir, file), 'utf8'))
        extra('notinject.json').forEach((text, index) => rows.push({ set: 'notinject', source: 'notinject', label: 'benign', variant: 'raw', id: `notinject#${index}`, text }))
        const link = extra('link-threat.json')
        link.malicious.forEach((text, index) => rows.push({ set: 'link', source: 'link-malicious', label: 'malicious', variant: 'raw', id: `link-mal#${index}`, text }))
        link.benign.forEach((text, index) => rows.push({ set: 'link', source: 'link-benign', label: 'benign', variant: 'raw', id: `link-ben#${index}`, text }))

        // Evasion: short attack prompts, each perturbed, scored raw and after normalize().
        const seeds = sample(rows.filter(r => r.set === 'corpus' && r.label === 'malicious' && (r.source === 'gandalf' || r.source === 'deepset-injection') && r.text.length < 400), 120, 21)
        for (const seed of seeds) {
            rows.push({ ...seed, set: 'evasion', variant: 'original' })
            for (const [name, fn] of Object.entries(perturbations)) {
                const perturbed = fn(seed.text)
                rows.push({ ...seed, set: 'evasion', variant: name, text: perturbed })
                rows.push({ ...seed, set: 'evasion', variant: `${name}+normalized`, text: normalize(perturbed) })
            }
        }
    }
    return rows
}
