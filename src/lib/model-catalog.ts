import type { ModelAlias, ProviderId, RecipientChoice } from './providers'
import generatedCatalog from '~/data/models.generated.json'
import { getProvider, modelAliases, providers } from './providers'

export type ModelChoiceKind = 'flexible' | 'exact' | 'unavailable' | 'recipient'

export interface ModelChoice {
    key: string
    provider: ProviderId
    model: string
    label: string
    providerLabel: string
    modelLabel: string
    kind: ModelChoiceKind
    recipientChoice?: RecipientChoice
    description: string
    searchText: string
}

export interface ModelChoiceFilter {
    includeRecipientChoices?: boolean
    provider?: ProviderId
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

function recipientModelChoice(provider: ProviderId): ModelChoice {
    const definition = getProvider(provider)

    return {
        key: `${provider}:recipient-model`,
        provider,
        model: 'latest',
        label: `${definition.label} · Recipient chooses model`,
        providerLabel: definition.label,
        modelLabel: 'Recipient chooses model',
        kind: 'recipient',
        recipientChoice: 'model',
        description: `Start with ${definition.label}; let the recipient choose a model or switch AI.`,
        searchText: `${providerKeywords[provider]} recipient user choose chooses decides model`.toLowerCase(),
    }
}

export const recipientProviderChoice: ModelChoice = {
    key: 'recipient:provider',
    provider: 'chatgpt',
    model: 'latest',
    label: 'Recipient decides · AI and model',
    providerLabel: 'Recipient decides',
    modelLabel: 'AI and model',
    kind: 'recipient',
    recipientChoice: 'provider',
    description: 'Let the recipient choose where the prompt opens.',
    searchText: 'recipient user choose decides any ai provider model chatgpt claude gemini perplexity',
}

export const flexibleModelChoices = providers.flatMap(provider =>
    modelAliases
        .filter(alias => provider.capabilities.models !== 'unavailable' || alias.id === 'latest')
        .map(alias => aliasChoice(provider.id, alias)),
)

export const recipientModelChoices = providers.map(provider =>
    recipientModelChoice(provider.id),
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

export function findModelChoice(
    provider: ProviderId,
    model: string,
    recipientChoice?: RecipientChoice,
) {
    if (recipientChoice === 'provider') {
        return recipientProviderChoice
    }
    if (recipientChoice === 'model') {
        return recipientModelChoice(provider)
    }

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

export function normalizeModelSelection(provider: ProviderId, model: string | undefined) {
    if (!model) {
        return 'latest'
    }

    return modelChoices.some(choice =>
        choice.provider === provider && choice.model === model,
    )
        ? model
        : 'latest'
}

export function filterModelChoices(
    query: string,
    limit = 12,
    filters: ModelChoiceFilter = {},
) {
    const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean)
    const recipientChoices = filters.includeRecipientChoices
        ? [recipientProviderChoice, ...recipientModelChoices]
        : []
    const source = terms.length
        ? [...recipientChoices, ...modelChoices]
        : [...recipientChoices, ...flexibleModelChoices]

    return source
        .filter(choice => !filters.provider || choice.provider === filters.provider)
        .filter(choice => terms.every(term => choice.searchText.includes(term)))
        .slice(0, limit)
}
