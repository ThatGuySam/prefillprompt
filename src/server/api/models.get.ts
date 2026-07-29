import type { ProviderId } from '~/lib/providers'
import { modelAliases } from '~/lib/providers'

interface OpenRouterModel {
    created?: number
    id?: string
    name?: string
}

interface OpenRouterResponse {
    data?: OpenRouterModel[]
}

const PREFIXES: Record<ProviderId, string> = {
    chatgpt: 'openai/',
    claude: 'anthropic/',
    gemini: 'google/',
    perplexity: 'perplexity/',
}

function emptyCatalog(): Record<ProviderId, Array<{ id: string, name: string }>> {
    return {
        chatgpt: [],
        claude: [],
        gemini: [],
        perplexity: [],
    }
}

export default defineEventHandler(async (event) => {
    setResponseHeader(
        event,
        'Cache-Control',
        'public, max-age=3600, s-maxage=21600, stale-while-revalidate=86400',
    )

    try {
        const response = await fetch('https://openrouter.ai/api/v1/models?output_modalities=text&sort=newest', {
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'PrefillPrompt/1.0',
            },
        })

        if (!response.ok) {
            throw new Error(`Model catalog returned ${response.status}`)
        }

        const body = await response.json() as OpenRouterResponse
        const models = body.data ?? []
        const catalog = emptyCatalog()

        for (const provider of Object.keys(PREFIXES) as ProviderId[]) {
            catalog[provider] = models
                .filter(model => model.id?.startsWith(PREFIXES[provider]))
                .sort((a, b) => (b.created ?? 0) - (a.created ?? 0))
                .slice(0, 12)
                .map(model => ({
                    id: model.id!,
                    name: model.name ?? model.id!,
                }))
        }

        return {
            aliases: modelAliases,
            catalog,
            discoveryOnly: true,
            source: 'OpenRouter',
            sourceUrl: 'https://openrouter.ai/models',
            updatedAt: new Date().toISOString(),
        }
    }
    catch {
        return {
            aliases: modelAliases,
            catalog: emptyCatalog(),
            discoveryOnly: true,
            source: 'Built-in aliases',
            sourceUrl: null,
            updatedAt: null,
        }
    }
})
