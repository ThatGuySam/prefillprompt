import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'

const moreSheet = readFileSync(
    new URL('../src/components/MoreSheet.vue', import.meta.url),
    'utf8',
)
const handoff = readFileSync(
    new URL('../src/pages/handoff.vue', import.meta.url),
    'utf8',
)

describe('reviewed interaction fallbacks', () => {
    it('disables every share action until a valid prompt link exists', () => {
        assert.match(moreSheet, /Open prompt[\s\S]*Copy Markdown[\s\S]*Show QR code/)
        assert.equal((moreSheet.match(/:disabled="!promptReady"/g) ?? []).length, 3)
        assert.match(moreSheet, /:disabled="!promptReady \|\| !qrAvailable"/)
    })

    it('keeps a direct Gemini navigation path after clipboard denial', () => {
        assert.match(handoff, /v-if="failed"[\s\S]*href="https:\/\/gemini\.google\.com\/app"/)
        assert.match(handoff, /Open Gemini without copying/)
    })
})
