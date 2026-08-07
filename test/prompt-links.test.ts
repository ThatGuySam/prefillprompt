import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
    buildAbsoluteShareUrl,
    buildGeminiHandoffPath,
    buildMarkdownLink,
    buildProviderUrl,
    buildSharePath,
    encodedUrlLength,
    inferProviderFromModel,
    isShareUrlWithinLimit,
    MAX_SHARE_URL_LENGTH,
    resolveProvider,
} from '../src/lib/prompt-links.ts'

describe('prompt link builder', () => {
    it('builds a share endpoint with encoded line breaks', () => {
        const path = buildSharePath({
            prompt: 'First line\nSecond line',
            provider: 'claude',
            model: 'latest',
        })
        const url = new URL(path, 'https://prefillprompt.com')

        assert.equal(url.pathname, '/api/prompt')
        assert.equal(url.searchParams.get('q'), 'First line\nSecond line')
        assert.equal(url.searchParams.get('s'), 'claude')
        assert.equal(url.searchParams.get('model'), 'latest')
    })

    it('bounds the serialized URL rather than only decoded prompt characters', () => {
        const shortUrl = buildAbsoluteShareUrl('https://prefillprompt.com', {
            prompt: '界'.repeat(200),
            provider: 'chatgpt',
        })
        const oversizedUrl = buildAbsoluteShareUrl('https://prefillprompt.com', {
            prompt: '界'.repeat(2_000),
            provider: 'chatgpt',
        })

        assert.equal(isShareUrlWithinLimit(shortUrl), true)
        assert.equal(isShareUrlWithinLimit(oversizedUrl), false)
        assert.ok(encodedUrlLength(oversizedUrl) > MAX_SHARE_URL_LENGTH)
    })

    it('infers a provider from exact model IDs', () => {
        assert.equal(inferProviderFromModel('o3'), 'chatgpt')
        assert.equal(inferProviderFromModel('anthropic/claude-opus'), 'claude')
        assert.equal(inferProviderFromModel('google/gemini-pro'), 'gemini')
        assert.equal(inferProviderFromModel('sonar-pro'), 'perplexity')
        assert.equal(resolveProvider(undefined, 'o3'), 'chatgpt')
    })

    it('adds supported ChatGPT feature hints', () => {
        const url = new URL(buildProviderUrl({
            prompt: 'Find current sources',
            provider: 'chatgpt',
            model: 'latest-reasoning',
            temporary: true,
            webSearch: true,
        }))

        assert.equal(url.hostname, 'chatgpt.com')
        assert.equal(url.searchParams.get('q'), 'Find current sources')
        assert.equal(url.searchParams.get('model'), 'thinking')
        assert.equal(url.searchParams.get('hints'), 'search')
        assert.equal(url.searchParams.get('temporary-chat'), 'true')
    })

    it('builds provider-specific destinations', () => {
        const destinations = {
            chatgpt: 'chatgpt.com',
            claude: 'claude.ai',
            perplexity: 'www.perplexity.ai',
        } as const

        for (const [provider, hostname] of Object.entries(destinations)) {
            const url = new URL(buildProviderUrl({
                prompt: 'Hello',
                provider: provider as keyof typeof destinations,
            }))
            assert.equal(url.hostname, hostname)
            assert.equal(url.searchParams.get('q'), 'Hello')
        }
    })

    it('uses a first-party handoff instead of Gemini’s unreliable query URL', () => {
        const destination = new URL(buildProviderUrl({
            prompt: 'Hello',
            provider: 'gemini',
            model: 'google/gemini-pro',
        }))
        const handoff = new URL(buildGeminiHandoffPath({
            prompt: 'Hello',
            provider: 'gemini',
            model: 'google/gemini-pro',
        }), 'https://prefillprompt.com')

        assert.equal(destination.toString(), 'https://gemini.google.com/app')
        assert.equal(destination.searchParams.get('q'), null)
        assert.equal(handoff.pathname, '/handoff')
        assert.equal(handoff.searchParams.get('q'), 'Hello')
        assert.equal(handoff.searchParams.get('model'), 'google/gemini-pro')
    })

    it('creates a readable Markdown button', () => {
        const markdown = buildMarkdownLink(
            'https://prefillprompt.com/api/prompt?q=hello',
            'gemini',
            'Plan a four-week study sprint',
        )

        assert.equal(
            markdown,
            '[Ask Gemini: Plan a four-week study sprint](https://prefillprompt.com/api/prompt?q=hello)',
        )
    })
})
