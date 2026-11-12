import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { redirectCases } from '../scripts/probe/cases.mjs'
import { parseBooleanParam } from '../src/lib/prompt-links.ts'
import { promptRedirectLocation } from '../src/lib/prompt-redirect.ts'

interface RedirectCase {
    name: string
    query: Record<string, string | undefined>
    location: string
}

// The same decision the /api/prompt route makes.
function redirectFor({ query }: RedirectCase) {
    return promptRedirectLocation({
        prompt: query.q!,
        requestedProvider: query.s ?? query.m,
        model: query.model,
        webSearch: parseBooleanParam(query.web),
        temporary: parseBooleanParam(query.temporary),
    })
}

describe('probe cases', () => {
    for (const testCase of redirectCases as RedirectCase[]) {
        it(`stay in sync with the link builders: ${testCase.name}`, () => {
            assert.equal(redirectFor(testCase), testCase.location)
        })
    }
})
