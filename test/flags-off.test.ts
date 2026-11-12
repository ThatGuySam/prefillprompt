import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { flags } from '../src/lib/flags.ts'
import { filterModelChoices, modelChoices } from '../src/lib/model-catalog.ts'
import { buildGeminiHandoffPath, buildProviderUrl } from '../src/lib/prompt-links.ts'
import { getProvider } from '../src/lib/providers.ts'

describe('with no feature flags set', () => {
    it('leaves providerCompatibility off', () => {
        assert.equal(flags.providerCompatibility, false)
    })

    it('asks ChatGPT for web search with the hints parameter and leaves the prompt alone', () => {
        const url = new URL(buildProviderUrl({
            prompt: 'Find current sources',
            provider: 'chatgpt',
            webSearch: true,
        }))

        assert.equal(url.searchParams.get('q'), 'Find current sources')
        assert.equal(url.searchParams.get('hints'), 'search')
    })

    it('never rewrites the prompt for Claude', () => {
        const url = new URL(buildProviderUrl({
            prompt: 'Find current sources',
            provider: 'claude',
            webSearch: true,
        }))

        assert.equal(url.searchParams.get('q'), 'Find current sources')
    })

    it('keeps search and temporary-chat notes out of the Gemini handoff link', () => {
        const handoff = new URL(buildGeminiHandoffPath({
            prompt: 'Compare options',
            provider: 'gemini',
            webSearch: true,
            temporary: true,
        }), 'https://prefillprompt.com')

        assert.equal(handoff.searchParams.get('web'), null)
        assert.equal(handoff.searchParams.get('temporary'), null)
    })

    it('keeps the shipped capability table', () => {
        assert.equal(getProvider('chatgpt').capabilities.webSearch, 'supported')
        assert.equal(getProvider('claude').capabilities.webSearch, 'unavailable')
        assert.equal(getProvider('perplexity').capabilities.models, 'unavailable')
    })

    it('offers no recipient choices in the model list', () => {
        assert.equal(modelChoices.some(choice => choice.recipientChoice), false)
        assert.equal(filterModelChoices('').some(choice => choice.recipientChoice), false)
        assert.equal(filterModelChoices('recipient').length, 0)
    })
})
