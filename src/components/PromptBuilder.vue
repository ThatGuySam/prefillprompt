<script setup lang="ts">
import type { ModelChoice } from '~/lib/model-catalog'
import type { PromptLinkOptions } from '~/lib/prompt-links'
import type { ProviderId } from '~/lib/providers'
import QRCode from 'qrcode'
import {
    buildAbsoluteShareUrl,
    buildMarkdownLink,
    MAX_PROMPT_LENGTH,
    MAX_QR_URL_LENGTH,
} from '~/lib/prompt-links'
import { getProvider, isModelAlias } from '~/lib/providers'

const prompt = ref('')
const provider = ref<ProviderId>('chatgpt')
const model = ref('latest')
const webSearch = ref(false)
const temporary = ref(false)
const origin = ref('https://prefillprompt.com')
const canNativeShare = ref(false)
const activeSheet = ref<'library' | 'more' | null>(null)
const qrDataUrl = ref('')
const qrOpen = ref(false)
const showTip = ref(false)
const statusMessage = ref('')
const statusVisible = ref(false)
const statusIsError = ref(false)
const copied = ref(false)
let statusTimer: number | undefined
let copiedTimer: number | undefined

const { clear, entries, remove, save } = usePromptHistory()

const hasPrompt = computed(() => prompt.value.trim().length > 0)
const currentProvider = computed(() => getProvider(provider.value))
const options = computed<PromptLinkOptions>(() => ({
    prompt: prompt.value,
    provider: provider.value,
    model: model.value,
    webSearch: webSearch.value,
    temporary: temporary.value,
}))
const promptUrl = computed(() => buildAbsoluteShareUrl(origin.value, options.value))
const qrAvailable = computed(() => promptUrl.value.length <= MAX_QR_URL_LENGTH)
const choiceHint = computed(() => {
    if (provider.value === 'gemini') {
        return model.value === 'latest'
            ? 'Gemini uses a reliable copy + open handoff.'
            : 'Gemini uses copy + open — confirm this model there.'
    }
    if (!isModelAlias(model.value)) {
        return 'Exact model hint — confirm it after opening.'
    }
    if (model.value !== 'latest') {
        return 'Model preference — confirm it after opening.'
    }
    return ''
})

onMounted(() => {
    origin.value = window.location.origin
    canNativeShare.value = typeof navigator.share === 'function'
    showTip.value = window.localStorage.getItem('prefillprompt-tip-dismissed') !== '1'

    const stored = window.localStorage.getItem('prefillprompt-selection')
    if (stored) {
        try {
            const selection = JSON.parse(stored) as { provider?: ProviderId, model?: string }
            if (
                selection.provider
                && ['chatgpt', 'claude', 'gemini', 'perplexity'].includes(selection.provider)
                && selection.model
            ) {
                provider.value = selection.provider
                model.value = selection.model
            }
        }
        catch {
            window.localStorage.removeItem('prefillprompt-selection')
        }
    }
})

watch([provider, model], ([nextProvider, nextModel]) => {
    if (import.meta.client) {
        window.localStorage.setItem('prefillprompt-selection', JSON.stringify({
            provider: nextProvider,
            model: nextModel,
        }))
    }
})

watch(provider, (value) => {
    const definition = getProvider(value)
    if (definition.capabilities.webSearch !== 'supported') {
        webSearch.value = false
    }
    if (definition.capabilities.temporary === 'unavailable') {
        temporary.value = false
    }
})

watch(prompt, (value) => {
    if (value.trim() && showTip.value) {
        dismissTip()
    }
})

onBeforeUnmount(() => {
    if (statusTimer !== undefined) {
        window.clearTimeout(statusTimer)
    }
    if (copiedTimer !== undefined) {
        window.clearTimeout(copiedTimer)
    }
})

function dismissTip() {
    showTip.value = false
    if (import.meta.client) {
        window.localStorage.setItem('prefillprompt-tip-dismissed', '1')
    }
}

function selectModel(choice: ModelChoice) {
    provider.value = choice.provider
    model.value = choice.model
}

function announce(message: string, error = false) {
    if (statusTimer !== undefined) {
        window.clearTimeout(statusTimer)
    }
    statusMessage.value = message
    statusIsError.value = error
    statusVisible.value = true
    statusTimer = window.setTimeout(() => {
        statusVisible.value = false
        statusTimer = undefined
    }, 2800)
}

function clearStatusAfterExit(event: TransitionEvent) {
    if (event.propertyName === 'opacity' && !statusVisible.value) {
        statusMessage.value = ''
    }
}

async function copyText(value: string, message: string) {
    try {
        await navigator.clipboard.writeText(value)
        save(options.value)
        announce(message)
        return true
    }
    catch {
        announce('Clipboard access was blocked.', true)
        return false
    }
}

async function copyLink() {
    if (!hasPrompt.value) {
        return
    }

    if (await copyText(promptUrl.value, 'Prompt link copied.')) {
        copied.value = true
        if (copiedTimer !== undefined) {
            window.clearTimeout(copiedTimer)
        }
        copiedTimer = window.setTimeout(() => {
            copied.value = false
            copiedTimer = undefined
        }, 1800)
    }
}

function copyMarkdown() {
    activeSheet.value = null
    return copyText(
        buildMarkdownLink(promptUrl.value, provider.value, prompt.value),
        'Markdown link copied.',
    )
}

function openPrompt() {
    activeSheet.value = null
    save(options.value)
    window.open(promptUrl.value, '_blank', 'noopener,noreferrer')
}

async function nativeShare() {
    activeSheet.value = null
    try {
        await navigator.share({
            title: `Ask ${currentProvider.value.label}`,
            text: 'Open this prompt in your AI service.',
            url: promptUrl.value,
        })
        save(options.value)
    }
    catch (error) {
        if (!(error instanceof DOMException && error.name === 'AbortError')) {
            announce('The share sheet could not be opened.', true)
        }
    }
}

async function showQr() {
    activeSheet.value = null
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
    webSearch.value = Boolean(next.webSearch)
    temporary.value = Boolean(next.temporary)
}

function selectFromLibrary(next: PromptLinkOptions) {
    useOptions(next)
    announce('Prompt loaded.')
}
</script>

<template>
    <section class="phone-frame" aria-label="Prompt link builder">
        <div class="phone-screen">
            <div class="phone-status" aria-hidden="true">
                <span>9:41</span>
                <span class="dynamic-island" />
                <span class="phone-signals">
                    <i />
                    <i />
                    <i />
                </span>
            </div>

            <header class="phone-header">
                <button
                    class="icon-button"
                    aria-label="Open prompt library"
                    data-testid="library-button"
                    @click="activeSheet = 'library'"
                >
                    <svg aria-hidden="true" viewBox="0 0 24 24">
                        <path d="M5 4.5h14v15H5zM8 8h8M8 11.5h8M8 15h5" />
                    </svg>
                </button>
                <div>
                    <p class="phone-title">
                        PrefillPrompt
                    </p>
                    <span>{{ currentProvider.label }}</span>
                </div>
                <button
                    class="icon-button"
                    aria-label="More options"
                    data-testid="more-button"
                    @click="activeSheet = 'more'"
                >
                    <svg aria-hidden="true" viewBox="0 0 24 24">
                        <circle cx="5" cy="12" r="1.25" />
                        <circle cx="12" cy="12" r="1.25" />
                        <circle cx="19" cy="12" r="1.25" />
                    </svg>
                </button>
            </header>

            <div class="conversation-area">
                <Transition name="coachmark">
                    <aside v-if="showTip" class="first-run-tip">
                        <button aria-label="Dismiss getting started tip" @click="dismissTip">
                            ×
                        </button>
                        <strong>Make a prompt link</strong>
                        <p>Choose an AI, type the starting prompt, then tap the arrow to copy.</p>
                    </aside>
                </Transition>

                <div v-if="!showTip" class="empty-state" aria-hidden="true">
                    <svg viewBox="0 0 36 36">
                        <path d="M8 10.5h13v15H8zM13 15h8M13 19h5M23 14h5l-3-3M28 14l-3 3" />
                    </svg>
                    <span>One prompt. Any AI.</span>
                </div>
            </div>

            <p
                class="phone-toast"
                :class="{ error: statusIsError, visible: statusVisible }"
                aria-live="polite"
                role="status"
                @transitionend="clearStatusAfterExit"
            >
                {{ statusMessage }}
            </p>

            <div class="phone-composer">
                <ModelCombobox
                    :model="model"
                    :provider="provider"
                    @select="selectModel"
                />
                <p v-if="choiceHint" class="model-choice-hint">
                    {{ choiceHint }}
                </p>
                <div class="prompt-composer">
                    <label class="sr-only" for="prompt-input">Prompt text</label>
                    <textarea
                        id="prompt-input"
                        v-model="prompt"
                        data-testid="prompt-input"
                        :maxlength="MAX_PROMPT_LENGTH"
                        rows="1"
                        placeholder="Message to share"
                    />
                    <button
                        class="send-button"
                        :class="{ copied }"
                        :disabled="!hasPrompt"
                        :aria-label="copied ? 'Prompt link copied' : 'Copy prompt link'"
                        data-testid="copy-link-button"
                        @click="copyLink"
                    >
                        <svg v-if="copied" aria-hidden="true" viewBox="0 0 24 24">
                            <path d="m6 12 4 4 8-9" />
                        </svg>
                        <svg v-else aria-hidden="true" viewBox="0 0 24 24">
                            <path d="M12 19V5M7 10l5-5 5 5" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>

        <LibrarySheet
            :entries="entries"
            :open="activeSheet === 'library'"
            @clear="clear"
            @close="activeSheet = null"
            @remove="remove"
            @select="selectFromLibrary"
        />
        <MoreSheet
            v-model:temporary="temporary"
            v-model:web-search="webSearch"
            :can-share="canNativeShare"
            :open="activeSheet === 'more'"
            :provider="provider"
            :qr-available="qrAvailable"
            @close="activeSheet = null"
            @copy-markdown="copyMarkdown"
            @native-share="nativeShare"
            @open-prompt="openPrompt"
            @qr="showQr"
        />
        <QrDialog :data-url="qrDataUrl" :open="qrOpen" @close="qrOpen = false" />
    </section>
</template>
