import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
    buildMarkdownLink,
    buildProviderUrl,
    buildSharePath,
    inferProviderFromModel,
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
            gemini: 'gemini.google.com',
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
