import type { ModelAlias, ProviderId } from './providers'
import generatedCatalog from '~/data/models.generated.json'
import { getProvider, modelAliases, providers } from './providers'

export type ModelChoiceKind = 'flexible' | 'exact' | 'unavailable'

export interface ModelChoice {
    key: string
    provider: ProviderId
    model: string
    label: string
    providerLabel: string
    modelLabel: string
    kind: ModelChoiceKind
    description: string
    searchText: string
}

interface GeneratedModel {
    id: string
    name: string
    provider: string
    created: number
}

interface GeneratedCatalog {
    source: string
    sourceUrl: string
    generatedAt: string | null
    models: GeneratedModel[]
}

const catalog = generatedCatalog as GeneratedCatalog
const providerKeywords: Record<ProviderId, string> = {
    chatgpt: 'chatgpt openai gpt o-series codex',
    claude: 'claude anthropic',
    gemini: 'gemini google',
    perplexity: 'perplexity sonar',
}

function isProviderId(value: string): value is ProviderId {
    return providers.some(provider => provider.id === value)
}

function aliasChoice(provider: ProviderId, alias: {
    id: ModelAlias
    label: string
    description: string
}): ModelChoice {
    const definition = getProvider(provider)
    const modelLabel = definition.capabilities.models === 'unavailable'
        ? 'Default'
        : alias.label

    return {
        key: `${provider}:${alias.id}`,
        provider,
        model: alias.id,
        label: `${definition.label} · ${modelLabel}`,
        providerLabel: definition.label,
        modelLabel,
        kind: 'flexible',
        description: definition.capabilities.models === 'unavailable'
            ? `${definition.label} uses its account default; model hints are unavailable.`
            : alias.description,
        searchText: `${providerKeywords[provider]} ${alias.id} ${modelLabel}`.toLowerCase(),
    }
}

function exactChoice(model: GeneratedModel): ModelChoice | null {
    if (!isProviderId(model.provider)) {
        return null
    }

    const provider = model.provider
    const definition = getProvider(provider)

    if (definition.capabilities.models === 'unavailable') {
        return null
    }

    return {
        key: `${provider}:${model.id}`,
        provider,
        model: model.id,
        label: `${definition.label} · ${model.name}`,
        providerLabel: definition.label,
        modelLabel: model.name,
        kind: 'exact',
        description: `Exact model hint · ${model.id}`,
        searchText: `${providerKeywords[provider]} ${model.id} ${model.name}`.toLowerCase(),
    }
}

export const flexibleModelChoices = providers.flatMap(provider =>
    modelAliases
        .filter(alias => provider.capabilities.models !== 'unavailable' || alias.id === 'latest')
        .map(alias => aliasChoice(provider.id, alias)),
)

export const exactModelChoices = catalog.models
    .map(exactChoice)
    .filter((choice): choice is ModelChoice => Boolean(choice))

export const modelChoices = [...flexibleModelChoices, ...exactModelChoices]

export const modelCatalogMetadata = {
    source: catalog.source,
    sourceUrl: catalog.sourceUrl,
    generatedAt: catalog.generatedAt,
    count: exactModelChoices.length,
}

export function findModelChoice(provider: ProviderId, model: string) {
    return modelChoices.find(choice =>
        choice.provider === provider && choice.model === model,
    ) ?? unavailableModelChoice(provider, model)
}

function unavailableModelChoice(provider: ProviderId, model: string): ModelChoice {
    const definition = getProvider(provider)
    const isUnsupportedHint = definition.capabilities.models === 'unavailable'
    const suffix = isUnsupportedHint ? 'not supported' : 'not in current catalog'

    return {
        key: `${provider}:${model}:unavailable`,
        provider,
        model,
        label: `${definition.label} · ${model} (${suffix})`,
        providerLabel: definition.label,
        modelLabel: `${model} (${suffix})`,
        kind: 'unavailable',
        description: isUnsupportedHint
            ? `${definition.label} does not accept model hints.`
            : 'This saved exact model is no longer in the current catalog.',
        searchText: `${providerKeywords[provider]} ${model}`.toLowerCase(),
    }
}

export function filterModelChoices(query: string, limit = 12) {
    const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean)
    const source = terms.length ? modelChoices : flexibleModelChoices

    return source
        .filter(choice => terms.every(term => choice.searchText.includes(term)))
        .slice(0, limit)
}
