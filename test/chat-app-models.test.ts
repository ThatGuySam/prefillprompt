import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { isChatAppModel } from '../scripts/chat-app-models.mjs'

describe('chat app model filter', () => {
    it('keeps models a person can pick in a chat app', () => {
        for (const id of ['openai/gpt-5.5', 'openai/gpt-5.6-sol', 'openai/o3', 'anthropic/claude-sonnet-5', 'anthropic/claude-opus-4.8', 'google/gemini-3-pro', 'perplexity/sonar-pro']) {
            assert.equal(isChatAppModel(id), true, id)
        }
    })

    it('drops API-only variants', () => {
        for (const id of ['openai/gpt-5.5:batch', 'openai/gpt-oss-20b:free', 'openai/gpt-5.4-image-2', 'openai/gpt-audio-mini', 'openai/gpt-5.3-codex', 'openai/o3-deep-research', 'openai/gpt-oss-120b', 'openai/gpt-4o-2024-11-20', 'openai/gpt-3.5-turbo-0613', 'openai/gpt-3.5-turbo-instruct', 'openai/gpt-4-turbo-preview', 'anthropic/claude-opus-5-fast', 'google/gemini-nano-banana-2.1']) {
            assert.equal(isChatAppModel(id), false, id)
        }
    })
})
