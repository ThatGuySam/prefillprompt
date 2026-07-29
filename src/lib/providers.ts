export type ProviderId = 'chatgpt' | 'claude' | 'gemini' | 'perplexity'
export type ModelAlias = 'latest' | 'latest-fast' | 'latest-reasoning'
export type CapabilityLevel = 'supported' | 'experimental' | 'unavailable' | 'always'

export interface ProviderDefinition {
    id: ProviderId
    label: string
    mark: string
    destination: string
    behavior: string
    accent: string
    capabilities: {
        models: CapabilityLevel
        temporary: CapabilityLevel
        webSearch: CapabilityLevel
    }
}

export const modelAliases: Array<{ id: ModelAlias, label: string, description: string }> = [
    {
        id: 'latest',
        label: 'Latest',
        description: 'Let the destination choose its current default.',
    },
    {
        id: 'latest-fast',
        label: 'Latest fast',
        description: 'Best-effort hint for the destination’s fastest mode.',
    },
    {
        id: 'latest-reasoning',
        label: 'Latest reasoning',
        description: 'Best-effort hint for the destination’s reasoning mode.',
    },
]

export const providers: ProviderDefinition[] = [
    {
        id: 'chatgpt',
        label: 'ChatGPT',
        mark: 'CG',
        destination: 'chatgpt.com',
        behavior: 'Opens a new ChatGPT conversation.',
        accent: '#0b6b52',
        capabilities: {
            models: 'experimental',
            temporary: 'experimental',
            webSearch: 'supported',
        },
    },
    {
        id: 'claude',
        label: 'Claude',
        mark: 'CL',
        destination: 'claude.ai',
        behavior: 'Prefills a new Claude chat for review.',
        accent: '#b5482e',
        capabilities: {
            models: 'experimental',
            temporary: 'experimental',
            webSearch: 'unavailable',
        },
    },
    {
        id: 'gemini',
        label: 'Gemini',
        mark: 'GE',
        destination: 'gemini.google.com',
        behavior: 'Starts the prompt in Gemini.',
        accent: '#2c5cc5',
        capabilities: {
            models: 'experimental',
            temporary: 'unavailable',
            webSearch: 'unavailable',
        },
    },
    {
        id: 'perplexity',
        label: 'Perplexity',
        mark: 'PE',
        destination: 'perplexity.ai',
        behavior: 'Runs a new Perplexity search.',
        accent: '#13737a',
        capabilities: {
            models: 'unavailable',
            temporary: 'unavailable',
            webSearch: 'always',
        },
    },
]

export function getProvider(id: ProviderId) {
    return providers.find(provider => provider.id === id) ?? providers[0]!
}

export function isModelAlias(value: string | undefined): value is ModelAlias {
    return modelAliases.some(alias => alias.id === value)
}
