import { readFile, writeFile } from 'node:fs/promises'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const endpoint = 'https://openrouter.ai/api/v1/models?output_modalities=text&sort=newest'
const outputUrl = new URL('../src/data/models.generated.json', import.meta.url)
const providerPrefixes = {
    chatgpt: 'openai/',
    claude: 'anthropic/',
    gemini: 'google/',
    perplexity: 'perplexity/',
}

function isCatalogModel(value) {
    return value
        && typeof value === 'object'
        && typeof value.id === 'string'
        && value.id.includes('/')
        && (value.name === undefined || typeof value.name === 'string')
        && (value.created === undefined || typeof value.created === 'number')
}

function cleanName(name, id) {
    const fallback = id.split('/').at(-1) ?? id
    const value = name?.trim() || fallback
    return value
        .replace(/^[^:]{1,24}:\s*/, '')
        .replace(/^(?:OpenAI|Anthropic|Google|Perplexity|ChatGPT|Claude|Gemini)(?::|\s)+/i, '')
}

const response = await fetch(endpoint, {
    headers: {
        'accept': 'application/json',
        'User-Agent': 'PrefillPrompt catalog updater',
    },
})

if (!response.ok) {
    throw new Error(`OpenRouter model catalog returned ${response.status}`)
}

const body = await response.json()
if (!body || typeof body !== 'object' || !Array.isArray(body.data)) {
    throw new TypeError('OpenRouter model catalog did not include a data array')
}

const models = body.data
    .filter(isCatalogModel)
    .flatMap((model) => {
        const provider = Object.entries(providerPrefixes)
            .find(([, prefix]) => model.id.startsWith(prefix))?.[0]

        if (!provider) {
            return []
        }

        return [{
            id: model.id,
            name: cleanName(model.name, model.id),
            provider,
            created: model.created ?? 0,
        }]
    })
    .sort((a, b) => {
        const providerOrder = Object.keys(providerPrefixes)
        const providerDifference = providerOrder.indexOf(a.provider) - providerOrder.indexOf(b.provider)
        return providerDifference || b.created - a.created || a.id.localeCompare(b.id)
    })

if (models.length < 20) {
    throw new Error(`Refusing to replace the catalog with only ${models.length} recognized models`)
}

let previous
try {
    previous = JSON.parse(await readFile(outputUrl, 'utf8'))
}
catch {
    previous = null
}

if (JSON.stringify(previous?.models) === JSON.stringify(models)) {
    console.log(`Model catalog unchanged (${models.length} models)`)
    process.exit(0)
}

const catalog = {
    source: 'OpenRouter',
    sourceUrl: 'https://openrouter.ai/api/v1/models',
    generatedAt: new Date().toISOString(),
    models,
}

await writeFile(outputUrl, `${JSON.stringify(catalog, null, 4)}\n`)
console.log(`Updated ${fileURLToPath(outputUrl)} with ${models.length} models`)
