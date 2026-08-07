import type { ProviderId } from '~/lib/providers'
import generatedCatalog from '~/data/models.generated.json'
import { getProvider, modelAliases } from '~/lib/providers'

function emptyCatalog(): Record<ProviderId, Array<{ id: string, name: string }>> {
    return {
        chatgpt: [],
        claude: [],
        gemini: [],
        perplexity: [],
    }
}

export default defineEventHandler((event) => {
    setResponseHeader(
        event,
        'Cache-Control',
        'public, max-age=3600, s-maxage=21600, stale-while-revalidate=86400',
    )

    const catalog = emptyCatalog()

    for (const model of generatedCatalog.models) {
        if (
            typeof model.provider === 'string'
            && model.provider in catalog
            && typeof model.id === 'string'
            && typeof model.name === 'string'
            && getProvider(model.provider as ProviderId).capabilities.models !== 'unavailable'
        ) {
            catalog[model.provider as ProviderId].push({
                id: model.id,
                name: model.name,
            })
        }
    }

    return {
        aliases: modelAliases,
        capabilities: Object.fromEntries(
            (Object.keys(catalog) as ProviderId[]).map(provider => [
                provider,
                getProvider(provider).capabilities.models,
            ]),
        ),
        catalog,
        discoveryOnly: true,
        source: generatedCatalog.source,
        sourceUrl: generatedCatalog.sourceUrl,
        updatedAt: generatedCatalog.generatedAt,
    }
})
