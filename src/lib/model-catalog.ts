import type { ModelAlias, ProviderId, RecipientChoice } from './providers'
import generatedCatalog from '~/data/models.generated.json'
import { getProvider, modelAliases, providers } from './providers'

export type ModelChoiceKind = 'flexible' | 'exact' | 'recipient'

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
    const modelLabel = alias.label

    return {
        key: `${provider}:${alias.id}`,
        provider,
        model: alias.id,
        label: `${definition.label} · ${modelLabel}`,
        providerLabel: definition.label,
        modelLabel,
        kind: 'flexible',
        description: alias.description,
        searchText: `${providerKeywords[provider]} ${alias.id} ${modelLabel}`.toLowerCase(),
    }
}

function exactChoice(model: GeneratedModel): ModelChoice | null {
    if (!isProviderId(model.provider)) {
        return null
    }

    const provider = model.provider
    const definition = getProvider(provider)

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
    modelAliases.map(alias => aliasChoice(provider.id, alias)),
)

export const recipientModelChoices = providers.map(provider =>
    recipientModelChoice(provider.id),
)

export const exactModelChoices = catalog.models
    .map(exactChoice)
    .filter((choice): choice is ModelChoice => Boolean(choice))

export const modelChoices = [
    recipientProviderChoice,
    ...recipientModelChoices,
    ...flexibleModelChoices,
    ...exactModelChoices,
]

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
        !choice.recipientChoice
        && choice.provider === provider
        && choice.model === model,
    ) ?? aliasChoice(provider, modelAliases[0]!)
}

export function normalizeModelSelection(provider: ProviderId, model: string | undefined) {
    if (!model) {
        return 'latest'
    }

    return modelChoices.some(choice =>
        !choice.recipientChoice
        && choice.provider === provider
        && choice.model === model,
    )
        ? model
        : 'latest'
}

export function filterModelChoices(
    query: string,
    limit = 18,
    filters: ModelChoiceFilter = {},
) {
    const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean)
    const includeRecipientChoices = filters.includeRecipientChoices ?? true
    const defaultChoices = includeRecipientChoices
        ? [recipientProviderChoice, ...recipientModelChoices, ...flexibleModelChoices]
        : flexibleModelChoices
    const source = terms.length ? modelChoices : defaultChoices

    return source
        .filter(choice => includeRecipientChoices || !choice.recipientChoice)
        .filter(choice => !filters.provider || choice.provider === filters.provider)
        .filter(choice => terms.every(term => choice.searchText.includes(term)))
        .slice(0, limit)
}
