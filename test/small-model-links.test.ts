import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { promptRedirectLocation } from '../src/lib/prompt-redirect.ts'

describe('small-model links', () => {
    it('stop at the preview so the scan runs first', () => {
        assert.match(promptRedirectLocation({ prompt: 'Plan my week', model: 'openai/gpt-5.6-luna' }), /^\/open\?/)
        assert.match(promptRedirectLocation({ prompt: 'Plan my week', model: 'anthropic/claude-haiku-4.5' }), /^\/open\?/)
    })

    it('leave frontier and alias links going straight to the provider', () => {
        assert.match(promptRedirectLocation({ prompt: 'Plan my week', model: 'openai/gpt-5.6-sol' }), /^https:\/\/chatgpt\.com\//)
        assert.match(promptRedirectLocation({ prompt: 'Plan my week', requestedProvider: 'chatgpt', model: 'latest-fast' }), /^https:\/\/chatgpt\.com\//)
    })
})
