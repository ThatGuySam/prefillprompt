import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'
import {
    exactModelChoices,
    findModelChoice,
    flexibleModelChoices,
} from '../src/lib/model-catalog.ts'

interface CatalogModel {
    id: string
    name: string
    provider: string
    created: number
}

interface Catalog {
    source: string
    sourceUrl: string
    generatedAt: string
    models: CatalogModel[]
}

const catalog = JSON.parse(readFileSync(
    new URL('../src/data/models.generated.json', import.meta.url),
    'utf8',
)) as Catalog

describe('generated model catalog', () => {
    it('contains a validated public catalog snapshot', () => {
        assert.equal(catalog.source, 'OpenRouter')
        assert.equal(catalog.sourceUrl, 'https://openrouter.ai/api/v1/models')
        assert.ok(Date.parse(catalog.generatedAt) > 0)
        assert.ok(catalog.models.length >= 20)
    })

    it('contains searchable models for every supported provider', () => {
        const providers = new Set(catalog.models.map(model => model.provider))

        assert.deepEqual(
            [...providers].sort(),
            ['chatgpt', 'claude', 'gemini', 'perplexity'],
        )
        for (const model of catalog.models) {
            assert.ok(model.id.includes('/'))
            assert.ok(model.name.length > 0)
            assert.ok(Number.isFinite(model.created))
        }
    })

    it('is deterministic within each provider', () => {
        const providerOrder = ['chatgpt', 'claude', 'gemini', 'perplexity']
        const sorted = [...catalog.models].sort((a, b) =>
            providerOrder.indexOf(a.provider) - providerOrder.indexOf(b.provider)
            || b.created - a.created
            || a.id.localeCompare(b.id),
        )

        assert.deepEqual(catalog.models, sorted)
    })

    it('does not offer ineffective Perplexity model hints', () => {
        const flexiblePerplexity = flexibleModelChoices.filter(choice =>
            choice.provider === 'perplexity',
        )
        const exactPerplexity = exactModelChoices.filter(choice =>
            choice.provider === 'perplexity',
        )

        assert.deepEqual(flexiblePerplexity.map(choice => choice.model), ['latest'])
        assert.equal(flexiblePerplexity[0]?.modelLabel, 'Default')
        assert.equal(exactPerplexity.length, 0)
    })

    it('shows a removed saved model explicitly instead of pretending it is Latest', () => {
        const choice = findModelChoice('chatgpt', 'openai/removed-model')

        assert.equal(choice.kind, 'unavailable')
        assert.equal(choice.model, 'openai/removed-model')
        assert.match(choice.label, /not in current catalog/)
    })
})
