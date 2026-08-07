import type { ModelAlias, ProviderId } from './providers.ts'
import {
    getProvider,
    isModelAlias,

    providers,
} from './providers.ts'

export const MAX_PROMPT_LENGTH = 12_000
export const MAX_QR_URL_LENGTH = 1_800
// Cloudflare accepts request URLs up to 16 KB. Keep headroom for the origin,
// future parameters, and intermediaries with slightly smaller limits.
export const MAX_SHARE_URL_LENGTH = 15_000

export interface PromptLinkOptions {
    prompt: string
    provider?: ProviderId
    model?: string
    webSearch?: boolean
    temporary?: boolean
}

const MODEL_PROVIDER_PATTERNS: Array<[RegExp, ProviderId]> = [
    [/^(?:openai\/|chatgpt|gpt-|o\d|codex)/i, 'chatgpt'],
    [/^(?:anthropic\/|claude)/i, 'claude'],
    [/^(?:google\/|gemini)/i, 'gemini'],
    [/^(?:perplexity\/|sonar)/i, 'perplexity'],
]

const WEB_MODEL_ALIASES: Record<ProviderId, Partial<Record<ModelAlias, string>>> = {
    chatgpt: {
        'latest-fast': 'instant',
        'latest-reasoning': 'thinking',
    },
    claude: {},
    gemini: {
        'latest-fast': 'fast',
        'latest-reasoning': 'thinking',
    },
    perplexity: {},
}

export function isProviderId(value: unknown): value is ProviderId {
    return typeof value === 'string' && providers.some(provider => provider.id === value)
}

export function inferProviderFromModel(model: string | undefined): ProviderId | undefined {
    if (!model || isModelAlias(model)) {
        return undefined
    }

    return MODEL_PROVIDER_PATTERNS.find(([pattern]) => pattern.test(model))?.[1]
}

export function resolveProvider(provider: unknown, model?: string): ProviderId {
    if (isProviderId(provider)) {
        return provider
    }

    return inferProviderFromModel(model) ?? 'chatgpt'
}

export function parseBooleanParam(value: unknown) {
    return value === true || value === '1' || value === 'true'
}

function providerModelValue(provider: ProviderId, model: string | undefined) {
    if (!model || model === 'latest') {
        return undefined
    }

    if (isModelAlias(model)) {
        return WEB_MODEL_ALIASES[provider][model]
    }

    const withoutCatalogPrefix = model.includes('/') ? model.split('/').at(-1) : model
    return withoutCatalogPrefix?.trim() || undefined
}

export function buildSharePath(options: PromptLinkOptions) {
    const params = new URLSearchParams({
        q: options.prompt,
        s: options.provider ?? resolveProvider(undefined, options.model),
    })

    if (options.model) {
        params.set('model', options.model)
    }
    if (options.webSearch) {
        params.set('web', '1')
    }
    if (options.temporary) {
        params.set('temporary', '1')
    }

    return `/api/prompt?${params.toString()}`
}

export function buildAbsoluteShareUrl(origin: string, options: PromptLinkOptions) {
    return new URL(buildSharePath(options), origin).toString()
}

export function encodedUrlLength(url: string) {
    return new TextEncoder().encode(url).byteLength
}

export function isShareUrlWithinLimit(url: string) {
    return encodedUrlLength(url) <= MAX_SHARE_URL_LENGTH
}

export function buildProviderUrl(options: PromptLinkOptions) {
    const provider = options.provider ?? resolveProvider(undefined, options.model)
    const model = providerModelValue(provider, options.model)
    let url: URL

    switch (provider) {
        case 'chatgpt': {
            url = new URL('https://chatgpt.com/')
            url.searchParams.set('q', options.prompt)
            if (model) {
                url.searchParams.set('model', model)
            }
            if (options.webSearch) {
                url.searchParams.set('hints', 'search')
            }
            if (options.temporary) {
                url.searchParams.set('temporary-chat', 'true')
            }
            break
        }
        case 'claude': {
            url = new URL('https://claude.ai/new')
            url.searchParams.set('q', options.prompt)
            if (model) {
                url.searchParams.set('model', model)
            }
            if (options.model === 'latest-reasoning') {
                url.searchParams.set('thinking', 'extended')
            }
            if (options.temporary) {
                url.searchParams.set('incognito', 'true')
            }
            break
        }
        case 'gemini': {
            url = new URL('https://gemini.google.com/app')
            break
        }
        case 'perplexity': {
            url = new URL('https://www.perplexity.ai/search')
            url.searchParams.set('s', 'o')
            url.searchParams.set('q', options.prompt)
            break
        }
    }

    return url.toString()
}

export function buildGeminiHandoffPath(options: PromptLinkOptions) {
    const params = new URLSearchParams({
        q: options.prompt,
    })

    if (options.model) {
        params.set('model', options.model)
    }

    return `/handoff?${params.toString()}`
}

function escapeMarkdownLabel(value: string) {
    return value.replaceAll('\\', '\\\\').replaceAll('[', '\\[').replaceAll(']', '\\]')
}

export function buildMarkdownLink(url: string, provider: ProviderId, prompt: string) {
    const providerLabel = getProvider(provider).label
    const compactPrompt = prompt.replaceAll(/\s+/g, ' ').trim()
    const summary = compactPrompt.length > 48 ? `${compactPrompt.slice(0, 47)}…` : compactPrompt
    return `[${escapeMarkdownLabel(`Ask ${providerLabel}: ${summary}`)}](${url})`
}
