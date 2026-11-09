// Expected behavior of the public `/api/prompt` contract. Expectations are
// written out by hand, not derived from src/lib, so the probe catches drift in
// either the code or the deployed site. test/probe-cases.test.ts keeps these
// in sync with the library.

export const redirectCases = [
    {
        name: 'default provider is ChatGPT',
        query: { q: 'hello' },
        location: 'https://chatgpt.com/?q=hello',
    },
    {
        name: 'chatgpt basic',
        query: { s: 'chatgpt', q: 'hello world' },
        location: 'https://chatgpt.com/?q=hello+world',
    },
    {
        name: 'chatgpt latest-fast alias',
        query: { s: 'chatgpt', q: 'hi', model: 'latest-fast' },
        location: 'https://chatgpt.com/?q=hi&model=instant',
    },
    {
        name: 'chatgpt reasoning + web + temporary',
        query: { s: 'chatgpt', q: 'hi', model: 'latest-reasoning', web: '1', temporary: '1' },
        location: 'https://chatgpt.com/?q=hi&model=thinking&hints=search&temporary-chat=true',
    },
    {
        name: 'chatgpt provider inferred from model',
        query: { q: 'hi', model: 'gpt-5' },
        location: 'https://chatgpt.com/?q=hi&model=gpt-5',
    },
    {
        name: 'catalog prefix is stripped',
        query: { q: 'hi', model: 'openai/gpt-5' },
        location: 'https://chatgpt.com/?q=hi&model=gpt-5',
    },
    {
        name: 'claude basic',
        query: { s: 'claude', q: 'hello' },
        location: 'https://claude.ai/new?q=hello',
    },
    {
        name: 'claude reasoning sets extended thinking',
        query: { s: 'claude', q: 'hello', model: 'latest-reasoning' },
        location: 'https://claude.ai/new?q=hello&thinking=extended',
    },
    {
        name: 'claude temporary uses incognito',
        query: { s: 'claude', q: 'hello', temporary: 'true' },
        location: 'https://claude.ai/new?q=hello&incognito=true',
    },
    {
        name: 'claude provider inferred from model',
        query: { q: 'hello', model: 'anthropic/claude-sonnet-4' },
        location: 'https://claude.ai/new?q=hello&model=claude-sonnet-4',
    },
    {
        name: 'perplexity basic',
        query: { s: 'perplexity', q: 'hello' },
        location: 'https://www.perplexity.ai/search?s=o&q=hello',
    },
    {
        name: 'gemini goes through the handoff page',
        query: { s: 'gemini', q: 'hello' },
        location: '/handoff?q=hello',
    },
    {
        name: 'gemini handoff keeps model',
        query: { s: 'gemini', q: 'hello', model: 'latest-fast' },
        location: '/handoff?q=hello&model=latest-fast',
    },
    {
        name: 'legacy m param selects the provider',
        query: { m: 'claude', q: 'hello' },
        location: 'https://claude.ai/new?q=hello',
    },
]

export const roundTripPrompt = 'Résumé & "quotes" #1 100% =?+ 日本語 😀\nline two'

export const errorCases = [
    { name: 'missing prompt', query: {}, status: 400, code: 'PROMPT_REQUIRED' },
    { name: 'blank prompt', query: { q: '   ' }, status: 400, code: 'PROMPT_REQUIRED' },
    { name: 'unsupported service', query: { s: 'bogus', q: 'hi' }, status: 400, code: 'UNSUPPORTED_SERVICE' },
    { name: 'prompt over 12,000 chars', query: { q: 'a'.repeat(12_001) }, status: 400, code: 'PROMPT_TOO_LONG' },
    { name: 'URL over 15,000 bytes', query: { q: 'a'.repeat(15_500) }, status: 414, code: 'PROMPT_URL_TOO_LONG' },
]

// Weak check: the destination is reachable. These sites sit behind login and
// bot checks, so a plain request cannot prove a parameter is honored.
export const providerTargets = [
    { provider: 'chatgpt', url: 'https://chatgpt.com/?q=probe' },
    { provider: 'claude', url: 'https://claude.ai/new?q=probe' },
    { provider: 'gemini', url: 'https://gemini.google.com/app' },
    { provider: 'perplexity', url: 'https://www.perplexity.ai/search?s=o&q=probe' },
]
