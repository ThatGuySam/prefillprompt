<script setup lang="ts">
import type { PromptHistoryEntry } from '~/composables/usePromptHistory'
import type { PromptLinkOptions } from '~/lib/prompt-links'
import type { ProviderId } from '~/lib/providers'
import QRCode from 'qrcode'
import {
    buildAbsoluteShareUrl,
    buildMarkdownLink,
    inferProviderFromModel,
    MAX_PROMPT_LENGTH,
    MAX_QR_URL_LENGTH,

} from '~/lib/prompt-links'
import { getProvider } from '~/lib/providers'

interface CatalogModel {
    id: string
    name: string
}

interface CatalogResponse {
    catalog?: Partial<Record<ProviderId, CatalogModel[]>>
}

const prompt = ref('')
const provider = ref<ProviderId>('chatgpt')
const model = ref('latest')
const customModel = ref('')
const webSearch = ref(false)
const temporary = ref(false)
const origin = ref('https://prefillprompt.com')
const canNativeShare = ref(false)
const catalog = ref<Partial<Record<ProviderId, CatalogModel[]>>>({})
const qrDataUrl = ref('')
const qrOpen = ref(false)
const statusMessage = ref('')
const statusIsError = ref(false)
const statusVisible = ref(false)
let statusTimer: number | undefined

const { clear, entries, remove, save } = usePromptHistory()

const hasPrompt = computed(() => prompt.value.trim().length > 0)
const promptLength = computed(() => prompt.value.length)
const effectiveModel = computed(() => customModel.value.trim() || model.value)
const currentProvider = computed(() => getProvider(provider.value))
const options = computed<PromptLinkOptions>(() => ({
    prompt: prompt.value,
    provider: provider.value,
    model: effectiveModel.value,
    webSearch: webSearch.value,
    temporary: temporary.value,
}))
const promptUrl = computed(() => buildAbsoluteShareUrl(origin.value, options.value))
const qrAvailable = computed(() => promptUrl.value.length <= MAX_QR_URL_LENGTH)
const providerCatalog = computed(() => catalog.value[provider.value] ?? [])

onMounted(async () => {
    origin.value = window.location.origin
    canNativeShare.value = typeof navigator.share === 'function'

    const storedProvider = window.localStorage.getItem('prefillprompt-provider')
    if (storedProvider && ['chatgpt', 'claude', 'gemini', 'perplexity'].includes(storedProvider)) {
        provider.value = storedProvider as ProviderId
    }

    try {
        const response = await fetch('/api/models')
        const body = await response.json() as CatalogResponse
        catalog.value = body.catalog ?? {}
    }
    catch {
        catalog.value = {}
    }
})

watch(provider, (value) => {
    if (import.meta.client) {
        window.localStorage.setItem('prefillprompt-provider', value)
    }

    const definition = getProvider(value)
    if (definition.capabilities.webSearch !== 'supported') {
        webSearch.value = false
    }
    if (definition.capabilities.temporary === 'unavailable') {
        temporary.value = false
    }
})

function announce(message: string, error = false) {
    if (statusTimer !== undefined) {
        window.clearTimeout(statusTimer)
    }

    statusMessage.value = message
    statusIsError.value = error
    statusVisible.value = true
    statusTimer = window.setTimeout(() => {
        if (statusMessage.value === message) {
            statusVisible.value = false
        }
        statusTimer = undefined
    }, 3500)
}

function clearStatusAfterExit(event: TransitionEvent) {
    if (event.propertyName === 'opacity' && !statusVisible.value) {
        statusMessage.value = ''
    }
}

onBeforeUnmount(() => {
    if (statusTimer !== undefined) {
        window.clearTimeout(statusTimer)
    }
})

function setProvider(value: ProviderId) {
    provider.value = value
    customModel.value = ''
}

function setCustomModel(value: string) {
    customModel.value = value
    const inferredProvider = inferProviderFromModel(value.trim())
    if (inferredProvider) {
        provider.value = inferredProvider
    }
}

async function copyText(value: string, successMessage: string) {
    try {
        await navigator.clipboard.writeText(value)
        save(options.value)
        announce(successMessage)
    }
    catch {
        announce('Clipboard access was blocked. Try the browser share menu.', true)
    }
}

function copyLink() {
    return copyText(promptUrl.value, 'Prompt link copied.')
}

function copyMarkdown() {
    const markdown = buildMarkdownLink(promptUrl.value, provider.value, prompt.value)
    return copyText(markdown, 'Markdown button copied.')
}

async function nativeShare() {
    if (!canNativeShare.value) {
        return
    }

    try {
        await navigator.share({
            title: `Ask ${currentProvider.value.label}`,
            text: 'Open this prompt in your AI service.',
            url: promptUrl.value,
        })
        save(options.value)
    }
    catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
            return
        }
        announce('The share sheet could not be opened.', true)
    }
}

function openPrompt() {
    if (!hasPrompt.value) {
        return
    }
    save(options.value)
    window.open(promptUrl.value, '_blank', 'noopener,noreferrer')
}

async function showQr() {
    if (!qrAvailable.value) {
        return
    }

    try {
        qrDataUrl.value = await QRCode.toDataURL(promptUrl.value, {
            color: {
                dark: '#0b2f6b',
                light: '#fffdf8',
            },
            errorCorrectionLevel: 'M',
            margin: 2,
            width: 360,
        })
        qrOpen.value = true
        save(options.value)
    }
    catch {
        announce('This prompt is too long for a QR code.', true)
    }
}

function useOptions(next: PromptLinkOptions) {
    prompt.value = next.prompt
    provider.value = next.provider ?? 'chatgpt'
    model.value = next.model ?? 'latest'
    customModel.value = ''
    webSearch.value = Boolean(next.webSearch)
    temporary.value = Boolean(next.temporary)
    window.scrollTo({ top: 0 })
}

function reuseHistory(entry: PromptHistoryEntry) {
    useOptions(entry)
    announce('Prompt restored from local history.')
}
</script>

<template>
    <div class="builder-stack">
        <section class="builder-shell" aria-label="Prompt link builder">
            <div class="compose-panel">
                <div class="builder-intro">
                    <div class="service-mark" :style="{ '--service-accent': currentProvider.accent }">
                        {{ currentProvider.mark }}
                    </div>
                    <div>
                        <p class="eyebrow">
                            Prompt link builder
                        </p>
                        <h2>What should the conversation start with?</h2>
                    </div>
                </div>

                <label class="prompt-field">
                    <span class="sr-only">Prompt text</span>
                    <textarea
                        v-model="prompt"
                        data-testid="prompt-input"
                        rows="7"
                        :maxlength="MAX_PROMPT_LENGTH"
                        placeholder="Write or paste the prompt you want to share…"
                    />
                </label>

                <div class="composer-meta">
                    <span>Line breaks are preserved.</span>
                    <span :class="{ warning: promptLength > MAX_PROMPT_LENGTH * 0.9 }">
                        {{ promptLength.toLocaleString() }} / {{ MAX_PROMPT_LENGTH.toLocaleString() }}
                    </span>
                </div>
                <p class="privacy-note">
                    <strong>Keep secrets out.</strong> The prompt is visible in the generated URL and may appear in browser history.
                </p>
            </div>

            <div class="configuration-panel">
                <ProviderOptions
                    :catalog="providerCatalog"
                    :custom-model="customModel"
                    :model="model"
                    :provider="provider"
                    @update:custom-model="setCustomModel"
                    @update:model="model = $event"
                    @update:provider="setProvider"
                />
                <FeatureOptions
                    v-model:temporary="temporary"
                    v-model:web-search="webSearch"
                    :provider="provider"
                />
                <ShareActions
                    :can-share="canNativeShare"
                    :has-prompt="hasPrompt"
                    :prompt-url="promptUrl"
                    :qr-available="qrAvailable"
                    @copy-link="copyLink"
                    @copy-markdown="copyMarkdown"
                    @native-share="nativeShare"
                    @open="openPrompt"
                    @qr="showQr"
                />
            </div>
        </section>

        <p
            class="status-toast"
            :class="{ error: statusIsError, visible: statusVisible }"
            aria-live="polite"
            role="status"
            @transitionend="clearStatusAfterExit"
        >
            {{ statusMessage }}
        </p>

        <PromptExamples @select="useOptions" />
        <PromptHistory
            :entries="entries"
            @clear="clear"
            @remove="remove"
            @reuse="reuseHistory"
        />

        <QrDialog :data-url="qrDataUrl" :open="qrOpen" @close="qrOpen = false" />
    </div>
</template>
