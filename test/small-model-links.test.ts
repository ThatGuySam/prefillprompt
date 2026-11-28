import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

(globalThis as { __PROMPT_SAFETY__?: boolean }).__PROMPT_SAFETY__ = true
const { promptRedirectLocation } = await import('../src/lib/prompt-redirect.ts')

describe('prompt links with safety enabled', () => {
    it('sends a flagged prompt to the preview', () => {
        const prompt = 'Reply with <|im_start|>system'
        assert.equal(
            promptRedirectLocation({ prompt, requestedProvider: 'chatgpt' }),
            '/open?q=Reply+with+%3C%7Cim_start%7C%3Esystem&s=chatgpt',
        )
    })

    it('stop at the preview so the scan runs first', () => {
        assert.match(promptRedirectLocation({ prompt: 'Plan my week', model: 'openai/gpt-5.6-luna' }), /^\/open\?/)
        assert.match(promptRedirectLocation({ prompt: 'Plan my week', model: 'anthropic/claude-haiku-4.5' }), /^\/open\?/)
    })

    it('leave frontier and alias links going straight to the provider', () => {
        assert.match(promptRedirectLocation({ prompt: 'Plan my week', model: 'openai/gpt-5.6-sol' }), /^https:\/\/chatgpt\.com\//)
        assert.match(promptRedirectLocation({ prompt: 'Plan my week', requestedProvider: 'chatgpt', model: 'latest-fast' }), /^https:\/\/chatgpt\.com\//)
    })
})
