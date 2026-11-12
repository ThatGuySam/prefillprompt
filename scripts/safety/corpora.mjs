// Loads the cached datasets as { source, label, text, ref } rows. Run fetch.mjs first.

import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const cache = join(root, '.cache/safety')

// RFC 4180 CSV with quoted fields that may contain commas and newlines.
export function parseCsv(text) {
    const rows = []
    let row = []
    let field = ''
    let quoted = false
    for (let i = 0; i < text.length; i += 1) {
        const char = text[i]
        if (quoted) {
            if (char === '"' && text[i + 1] === '"') {
                field += '"'
                i += 1
            }
            else if (char === '"') {
                quoted = false
            }
            else {
                field += char
            }
        }
        else if (char === '"') {
            quoted = true
        }
        else if (char === ',') {
            row.push(field)
            field = ''
        }
        else if (char === '\n' || char === '\r') {
            if (char === '\r' && text[i + 1] === '\n')
                i += 1
            row.push(field)
            rows.push(row)
            row = []
            field = ''
        }
        else {
            field += char
        }
    }
    if (field || row.length) {
        row.push(field)
        rows.push(row)
    }
    const [header, ...body] = rows
    return body.filter(cells => cells.length === header.length).map(cells => Object.fromEntries(header.map((name, index) => [name, cells[index]])))
}

const read = file => readFileSync(join(cache, file), 'utf8')
const jsonl = file => read(file).split('\n').filter(Boolean).map(line => JSON.parse(line))

export function loadCorpora() {
    const rows = []
    const add = (source, label, text, ref) => {
        if (typeof text === 'string' && text.trim())
            rows.push({ source, label, text, ref })
    }
    parseCsv(read('jailbreak-llms-jailbreak.csv')).forEach((row, index) => add('jailbreak-llms-jailbreak', 'malicious', row.prompt, `row ${index + 1}, ${row.platform}/${row.source}`))
    parseCsv(read('jailbreak-llms-regular.csv')).forEach((row, index) => add('jailbreak-llms-regular', 'benign', row.prompt, `row ${index + 1}, ${row.platform}/${row.source}`))
    parseCsv(read('prompts-chat.csv')).forEach((row, index) => add('prompts-chat', 'benign', row.prompt, `row ${index + 1}, ${row.act}`))
    jsonl('deepset-prompt-injections.jsonl').forEach(row => add('deepset-prompt-injections', row.label === 1 ? 'malicious' : 'benign', row.text, `${row.split} ${row.index}`))
    jsonl('gandalf-ignore-instructions.jsonl').forEach(row => add('gandalf-ignore-instructions', 'malicious', row.text, `${row.split} ${row.index}`))
    jsonl('injecagent-data-stealing.jsonl').forEach((row, index) => add('injecagent-data-stealing', 'malicious', row['Attacker Instruction'], `line ${index + 1}`))
    JSON.parse(read('cyberseceval-prompt-injection.json')).forEach(row => add('cyberseceval-prompt-injection', 'malicious', row.user_input, `prompt_id ${row.prompt_id}, ${row.injection_variant}`))
    jsonl('redcode-exec-bash.jsonl').forEach(row => add('redcode-exec-bash', 'malicious', `${row.Text_details}\n\n${row.Code}`, `${row.file} ${row.Index}`))
    jsonl('llmail-inject.jsonl').forEach(row => add('llmail-inject', 'malicious', [row.subject, row.body].filter(Boolean).join('\n'), `${row.split} ${row.index}`))
    jsonl('injecagent-direct-harm.jsonl').forEach((row, index) => add('injecagent-direct-harm', 'malicious', row['Attacker Instruction'], `line ${index + 1}`))
    return rows
}
