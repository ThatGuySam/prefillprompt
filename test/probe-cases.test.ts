import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { redirectCases } from '../scripts/probe/cases.mjs'
import {
    buildGeminiHandoffPath,
    buildProviderUrl,
    parseBooleanParam,
    resolveProvider,
} from '../src/lib/prompt-links.ts'

interface RedirectCase {
    name: string
    query: Record<string, string | undefined>
    location: string
}

// Mirrors the redirect decision in src/server/api/prompt.ts.
function redirectFor({ query }: RedirectCase) {
    const provider = resolveProvider(query.s ?? query.m, query.model)

    if (provider === 'gemini') {
        return buildGeminiHandoffPath({ prompt: query.q!, provider, model: query.model })
    }

    return buildProviderUrl({
        prompt: query.q!,
        provider,
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
