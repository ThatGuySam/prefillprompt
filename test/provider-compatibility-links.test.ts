import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { flags } from '../src/lib/flags.ts'
import { filterModelChoices } from '../src/lib/model-catalog.ts'
import {
    buildChoicePath,
    buildGeminiHandoffPath,
    buildMarkdownLink,
    buildProviderUrl,
    buildSharePath,
    MAX_PROMPT_LENGTH,
} from '../src/lib/prompt-links.ts'
import { getProvider } from '../src/lib/providers.ts'
import './helpers/enable-provider-compatibility.ts'

describe('prompt links with the providerCompatibility flag on', () => {
    it('runs with the flag on', () => {
        assert.equal(flags.providerCompatibility, true)
    })

    it('keeps ChatGPT web-search requests inside the prompt', () => {
        const url = new URL(buildProviderUrl({
            prompt: 'Find current sources',
            provider: 'chatgpt',
            model: 'latest-reasoning',
            temporary: true,
            webSearch: true,
        }))

        assert.equal(url.hostname, 'chatgpt.com')
        assert.equal(
            url.searchParams.get('q'),
            'Search the web before answering and cite your sources.\n\nFind current sources',
        )
        assert.equal(url.searchParams.get('model'), 'thinking')
        assert.equal(url.searchParams.get('hints'), null)
        assert.equal(url.searchParams.get('temporary-chat'), 'true')
    })

    it('builds an internal recipient-choice handoff', () => {
        const options = {
            prompt: 'Compare these options',
            provider: 'claude' as const,
            model: 'latest-reasoning',
            webSearch: true,
            recipientChoice: 'model' as const,
        }
        const choice = new URL(buildChoicePath(options), 'https://prefillprompt.com')
        const shared = new URL(buildSharePath(options), 'https://prefillprompt.com')

        assert.equal(choice.pathname, '/choose')
        assert.equal(choice.searchParams.get('choose'), 'model')
        assert.equal(choice.searchParams.get('s'), 'claude')
        assert.equal(choice.searchParams.get('model'), 'latest-reasoning')
        assert.equal(choice.searchParams.get('web'), '1')
        assert.equal(shared.toString(), choice.toString())
    })

    it('carries Gemini handoff instructions without relying on hidden URL flags', () => {
        const handoff = new URL(buildGeminiHandoffPath({
            prompt: 'Compare current options',
            provider: 'gemini',
            model: 'latest',
            webSearch: true,
            temporary: true,
        }), 'https://prefillprompt.com')

        assert.equal(
            handoff.searchParams.get('q'),
            'Compare current options',
        )
        assert.equal(handoff.searchParams.get('web'), '1')
        assert.equal(handoff.searchParams.get('temporary'), '1')
    })

    it('preserves the end of a maximum-length Gemini prompt', () => {
        const prompt = `${'x'.repeat(MAX_PROMPT_LENGTH - 4)}TAIL`
        const handoff = new URL(buildGeminiHandoffPath({
            prompt,
            provider: 'gemini',
            webSearch: true,
        }), 'https://prefillprompt.com')

        assert.equal(handoff.searchParams.get('q'), prompt)
        assert.match(handoff.searchParams.get('q') ?? '', /TAIL$/)
    })

    it('labels recipient-choice Markdown links honestly', () => {
        const markdown = buildMarkdownLink(
            'https://prefillprompt.com/choose?q=hello',
            'chatgpt',
            'Compare the options',
            'provider',
        )

        assert.equal(
            markdown,
            '[Choose an AI: Compare the options](https://prefillprompt.com/choose?q=hello)',
        )
    })

    it('lets a link ask for search on providers that only search from their own UI', () => {
        assert.equal(getProvider('claude').capabilities.webSearch, 'ui-only')
        assert.equal(getProvider('perplexity').capabilities.models, 'ui-only')
    })

    it('offers the recipient choices only when asked', () => {
        const withChoices = filterModelChoices('', 18, { includeRecipientChoices: true })
        const without = filterModelChoices('')

        assert.equal(withChoices[0]?.recipientChoice, 'provider')
        assert.equal(without.some(choice => choice.recipientChoice), false)
    })
})
