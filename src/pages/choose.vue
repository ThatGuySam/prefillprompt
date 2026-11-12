<script setup lang="ts">
import type { ModelChoice } from '~/lib/model-catalog'
import type { ProviderId, RecipientChoice } from '~/lib/providers'
import { getCompatibilityNotices } from '~/lib/compatibility'
import { flags } from '~/lib/flags'
import { normalizeModelSelection } from '~/lib/model-catalog'
import {
    buildSharePath,
    isProviderId,
    MAX_PROMPT_LENGTH,
    parseBooleanParam,
    resolveProvider,
} from '~/lib/prompt-links'
import { getProvider, providers } from '~/lib/providers'

// Part of the flagged July work. Without the flag this page does not exist.
if (!flags.providerCompatibility) {
    throw createError({ statusCode: 404, statusMessage: 'Page not found', fatal: true })
}

const route = useRoute()

function firstString(value: unknown) {
    return Array.isArray(value)
        ? typeof value[0] === 'string' ? value[0] : undefined
        : typeof value === 'string' ? value : undefined
}

const requestedProvider = firstString(route.query.s)
const requestedModel = firstString(route.query.model) ?? 'latest'
const initialProvider = isProviderId(requestedProvider)
    ? requestedProvider
    : resolveProvider(undefined, requestedModel)
const initialModel = normalizeModelSelection(initialProvider, requestedModel)
const initialStep: RecipientChoice = route.query.choose === 'model' ? 'model' : 'provider'

const prompt = computed(() =>
    (firstString(route.query.q) ?? '').slice(0, MAX_PROMPT_LENGTH),
)
const provider = ref<ProviderId>(initialProvider)
const model = ref(initialModel)
const step = ref<RecipientChoice>(initialStep)
const choiceTitle = ref<HTMLHeadingElement>()
const webSearch = computed(() => parseBooleanParam(route.query.web))
const temporary = computed(() => parseBooleanParam(route.query.temporary))
const definition = computed(() => getProvider(provider.value))
const options = computed(() => ({
    prompt: prompt.value,
    provider: provider.value,
    model: model.value,
    webSearch: webSearch.value,
    temporary: temporary.value,
}))
const destinationPath = computed(() => buildSharePath(options.value))
const notices = computed(() => getCompatibilityNotices(options.value))

useSeoMeta({
    title: 'Choose where to open this prompt — PrefillPrompt',
    description: 'Choose an AI and model, then open the shared prompt.',
    robots: 'noindex, nofollow',
})

async function focusStepTitle() {
    await nextTick()
    choiceTitle.value?.focus()
}

async function selectProvider(nextProvider: ProviderId) {
    provider.value = nextProvider
    model.value = 'latest'
    step.value = 'model'
    await focusStepTitle()
}

async function showProviders() {
    step.value = 'provider'
    await focusStepTitle()
}

function selectModel(choice: ModelChoice) {
    if (choice.provider === provider.value && !choice.recipientChoice) {
        model.value = choice.model
    }
}
</script>

<template>
    <main class="choice-stage">
        <section class="choice-card" aria-labelledby="choice-title">
            <header class="choice-header">
                <p class="eyebrow">
                    One quick choice
                </p>
                <h1
                    id="choice-title"
                    ref="choiceTitle"
                    tabindex="-1"
                >
                    {{ step === 'provider' ? 'Where should this prompt open?' : `Open with ${definition.label}` }}
                </h1>
                <p>
                    {{ step === 'provider'
                        ? 'Pick an AI. You can choose its model next.'
                        : 'Use the suggested model, or choose another before opening.' }}
                </p>
            </header>

            <div v-if="step === 'provider'" class="choice-provider-list">
                <button
                    v-for="choiceProvider in providers"
                    :key="choiceProvider.id"
                    @click="selectProvider(choiceProvider.id)"
                >
                    <span
                        class="choice-provider-icon"
                        :style="{ '--provider-accent': choiceProvider.accent }"
                    >
                        <ProviderIcon :provider="choiceProvider.id" />
                    </span>
                    <span>
                        <strong>{{ choiceProvider.label }}</strong>
                        <small>{{ choiceProvider.behavior }}</small>
                    </span>
                    <span aria-hidden="true">→</span>
                </button>
            </div>

            <div v-else class="choice-model-step">
                <button class="choice-back" @click="showProviders">
                    <span aria-hidden="true">←</span>
                    Choose another AI
                </button>

                <div class="choice-selected-provider">
                    <span
                        class="choice-provider-icon"
                        :style="{ '--provider-accent': definition.accent }"
                    >
                        <ProviderIcon :provider="provider" />
                    </span>
                    <span>
                        <strong>{{ definition.label }}</strong>
                        <small>{{ definition.destination }}</small>
                    </span>
                </div>

                <ModelComboboxNext
                    :allow-recipient-choice="false"
                    lock-provider
                    :model="model"
                    :provider="provider"
                    @select="selectModel"
                />

                <div
                    v-if="notices.length"
                    id="choice-compatibility-notices"
                    class="choice-notices"
                >
                    <p v-for="notice in notices" :key="`${notice.feature}:${notice.message}`">
                        {{ notice.message }}
                    </p>
                </div>

                <a
                    class="choice-open-button"
                    :href="destinationPath"
                    :aria-describedby="notices.length ? 'choice-compatibility-notices' : undefined"
                >
                    Open in {{ definition.label }}
                    <span aria-hidden="true">→</span>
                </a>
            </div>

            <span class="sr-only" role="status" aria-live="polite">
                {{ step === 'model' ? notices.map(notice => notice.message).join(' ') : '' }}
            </span>

            <details class="choice-prompt-preview">
                <summary>Preview shared prompt</summary>
                <p
                    tabindex="0"
                    role="region"
                    aria-label="Shared prompt"
                >
                    {{ prompt }}
                </p>
            </details>
        </section>
    </main>
</template>
