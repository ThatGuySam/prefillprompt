import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { getCompatibilityNotices } from '../src/lib/compatibility.ts'
import './helpers/enable-provider-compatibility.ts'

describe('provider compatibility notices', () => {
    it('warns that ChatGPT web search is a prompt-level request', () => {
        const notices = getCompatibilityNotices({
            prompt: 'Find recent sources',
            provider: 'chatgpt',
            model: 'latest-reasoning',
            webSearch: true,
        })

        assert.match(
            notices.find(notice => notice.feature === 'webSearch')?.message ?? '',
            /requested in the prompt/i,
        )
        assert.match(
            notices.find(notice => notice.feature === 'webSearch')?.message ?? '',
            /may still ignore/i,
        )
    })

    it('keeps unsupported destination controls selectable but explicit', () => {
        const notices = getCompatibilityNotices({
            prompt: 'Hello',
            provider: 'gemini',
            model: 'google/gemini-pro',
            temporary: true,
            webSearch: true,
        })

        assert.ok(notices.some(notice =>
            notice.feature === 'model' && /cannot reliably select/i.test(notice.message),
        ))
        assert.ok(notices.some(notice =>
            notice.feature === 'temporary' && /turn on Temporary chat/i.test(notice.message),
        ))
        assert.ok(notices.some(notice =>
            notice.feature === 'handoff' && /copy-and-open/i.test(notice.message),
        ))
    })

    it('explains recipient control before opening', () => {
        const notices = getCompatibilityNotices({
            prompt: 'Hello',
            provider: 'claude',
            model: 'latest',
            recipientChoice: 'model',
        })

        assert.match(notices[0]?.message ?? '', /recipient will choose a Claude model/i)
    })

    it('does not claim to serialize unsupported provider controls', () => {
        const claude = getCompatibilityNotices({
            prompt: 'Hello',
            provider: 'claude',
            model: 'latest-fast',
        })
        const perplexity = getCompatibilityNotices({
            prompt: 'Hello',
            provider: 'perplexity',
            model: 'latest-reasoning',
            temporary: true,
        })

        assert.match(
            claude.find(notice => notice.feature === 'model')?.message ?? '',
            /cannot reliably select/i,
        )
        assert.match(
            perplexity.find(notice => notice.feature === 'temporary')?.message ?? '',
            /link cannot enable/i,
        )
    })

    it('uses provider-neutral controls when the recipient chooses', () => {
        const notices = getCompatibilityNotices({
            prompt: 'Hello',
            provider: 'gemini',
            model: 'latest',
            recipientChoice: 'provider',
            temporary: true,
            webSearch: true,
        })

        assert.match(
            notices.find(notice => notice.feature === 'webSearch')?.message ?? '',
            /selected AI/i,
        )
        assert.match(
            notices.find(notice => notice.feature === 'temporary')?.message ?? '',
            /varies by AI/i,
        )
        assert.equal(
            notices.filter(notice => notice.feature === 'handoff').length,
            1,
        )
        assert.ok(!notices.some(notice => /copy-and-open/i.test(notice.message)))
    })
})
