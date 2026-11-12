// Downloads the public datasets used to measure the prompt-safety signals.
//
//   node scripts/safety/fetch.mjs
//
// Raw files go to .cache/safety/ (not committed). src/data/safety/sources.json records where
// each file came from, its license, the upstream revision, and its SHA-256, so a
// measurement can be traced to the exact bytes it used.

import { Buffer } from 'node:buffer'
import { createHash } from 'node:crypto'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const cache = join(root, '.cache/safety')
mkdirSync(cache, { recursive: true })

const github = [
    { id: 'jailbreak-llms-jailbreak', repo: 'verazuo/jailbreak_llms', path: 'data/prompts/jailbreak_prompts_2023_12_25.csv', license: 'MIT', label: 'malicious', note: 'Jailbreak prompts collected in the wild from Reddit, Discord, websites, and open datasets (Shen et al., CCS 2024).' },
    { id: 'jailbreak-llms-regular', repo: 'verazuo/jailbreak_llms', path: 'data/prompts/regular_prompts_2023_12_25.csv', license: 'MIT', label: 'benign', note: 'Regular prompts from the same communities, labeled non-jailbreak by the same study.' },
    { id: 'injecagent-data-stealing', repo: 'uiuc-kang-lab/InjecAgent', path: 'data/attacker_cases_ds.jsonl', license: 'MIT', label: 'malicious', note: 'Attacker instructions that make a tool-using agent steal data (Zhan et al., 2024).' },
    { id: 'injecagent-direct-harm', repo: 'uiuc-kang-lab/InjecAgent', path: 'data/attacker_cases_dh.jsonl', license: 'MIT', label: 'malicious', note: 'Attacker instructions that make a tool-using agent cause direct harm (Zhan et al., 2024).' },
    { id: 'cyberseceval-prompt-injection', repo: 'meta-llama/PurpleLlama', path: 'CybersecurityBenchmarks/datasets/prompt_injection/prompt_injection.json', license: 'unstated in repository metadata; measured only, not redistributed', label: 'malicious', note: 'Prompt-injection test cases from Meta\'s CyberSecEval, each tagged with its technique.' },
    { id: 'prompts-chat', repo: 'f/prompts.chat', path: 'prompts.csv', license: 'unstated in repository metadata; measured only, not redistributed', label: 'benign', note: 'Community prompts shared for everyday use. Unlabeled; treated as benign for false-positive counts.' },
]
// Whole directories, fetched file by file at one commit.
const githubDirectories = [
    { id: 'redcode-exec-bash', repo: 'AI-secure/RedCode', path: 'dataset/RedCode-Exec/bash2text_dataset_json', license: 'MIT', label: 'malicious', note: 'Risky shell tasks given to code agents, as code and as plain-language requests (Guo et al., 2024).' },
]
const huggingFace = [
    { id: 'deepset-prompt-injections', dataset: 'deepset/prompt-injections', splits: ['train', 'test'], license: 'Apache-2.0', label: 'mixed (label 1 = injection)', note: 'Labeled injection and benign prompts in English and German.' },
    { id: 'llmail-inject', dataset: 'microsoft/llmail-inject-challenge', splits: ['Phase1'], limit: 3000, license: 'MIT', label: 'malicious', note: 'Emails submitted to Microsoft\'s LLMail-Inject challenge to make an email agent send mail for the attacker. The first 3,000 rows of Phase 1.' },
    { id: 'gandalf-ignore-instructions', dataset: 'Lakera/gandalf_ignore_instructions', splits: ['train', 'validation', 'test'], license: 'MIT', label: 'malicious', note: 'Player-submitted injection attempts from Lakera\'s Gandalf game, filtered to instruction-override attacks.' },
]

const sha256 = bytes => createHash('sha256').update(bytes).digest('hex')
async function get(url, headers = {}) {
    const response = await fetch(url, { headers })
    if (!response.ok)
        throw new Error(`${response.status} for ${url}`)
    return response
}

const sources = []
for (const source of github) {
    const commit = (await (await get(`https://api.github.com/repos/${source.repo}/commits?path=${encodeURIComponent(source.path)}&per_page=1`, { 'User-Agent': 'prefillprompt-safety-research' })).json())[0].sha
    const url = `https://raw.githubusercontent.com/${source.repo}/${commit}/${source.path}`
    const bytes = Buffer.from(await (await get(url)).arrayBuffer())
    const file = `${source.id}.${source.path.split('.').pop()}`
    writeFileSync(join(cache, file), bytes)
    sources.push({ id: source.id, file, url, revision: commit, license: source.license, label: source.label, note: source.note, bytes: bytes.length, sha256: sha256(bytes) })
    console.log(`✅ ${source.id} ${bytes.length} bytes`)
}
for (const source of githubDirectories) {
    const headers = { 'User-Agent': 'prefillprompt-safety-research' }
    const commit = (await (await get(`https://api.github.com/repos/${source.repo}/commits?path=${encodeURIComponent(source.path)}&per_page=1`, headers)).json())[0].sha
    const listing = await (await get(`https://api.github.com/repos/${source.repo}/contents/${source.path}?ref=${commit}`, headers)).json()
    const rows = []
    for (const entry of listing.filter(item => item.name.endsWith('.json')).sort((a, b) => a.name.localeCompare(b.name))) {
        const cases = await (await get(`https://raw.githubusercontent.com/${source.repo}/${commit}/${source.path}/${entry.name}`)).json()
        rows.push(...cases.map(item => ({ file: entry.name, ...item })))
    }
    const bytes = Buffer.from(`${rows.map(row => JSON.stringify(row)).join('\n')}\n`)
    const file = `${source.id}.jsonl`
    writeFileSync(join(cache, file), bytes)
    sources.push({ id: source.id, file, url: `https://github.com/${source.repo}/tree/${commit}/${source.path}`, revision: commit, license: source.license, label: source.label, note: source.note, rows: rows.length, bytes: bytes.length, sha256: sha256(bytes) })
    console.log(`✅ ${source.id} ${rows.length} rows`)
}
for (const source of huggingFace) {
    const info = await (await get(`https://huggingface.co/api/datasets/${source.dataset}`)).json()
    const rows = []
    for (const split of source.splits) {
        for (let offset = 0; ; offset += 100) {
            const page = await (await get(`https://datasets-server.huggingface.co/rows?dataset=${encodeURIComponent(source.dataset)}&config=default&split=${split}&offset=${offset}&length=100`)).json()
            rows.push(...page.rows.map(item => ({ split, index: item.row_idx, ...item.row })))
            if (offset + 100 >= Math.min(page.num_rows_total, source.limit ?? Infinity))
                break
        }
    }
    const bytes = Buffer.from(`${rows.map(row => JSON.stringify(row)).join('\n')}\n`)
    const file = `${source.id}.jsonl`
    writeFileSync(join(cache, file), bytes)
    sources.push({ id: source.id, file, url: `https://huggingface.co/datasets/${source.dataset}`, revision: info.sha, license: source.license, label: source.label, note: source.note, rows: rows.length, bytes: bytes.length, sha256: sha256(bytes) })
    console.log(`✅ ${source.id} ${rows.length} rows`)
}
writeFileSync(join(root, 'src/data/safety/sources.json'), `${JSON.stringify({ fetched: new Date().toISOString().slice(0, 10), sources }, null, 4)}\n`)
