<script setup lang="ts">
import type { ProviderId, RecipientChoice } from '~/lib/providers'
import { getCompatibilityNotices } from '~/lib/compatibility'
import { getProvider } from '~/lib/providers'

const props = defineProps<{
    canShare: boolean
    model: string
    open: boolean
    promptReady: boolean
    provider: ProviderId
    qrAvailable: boolean
    recipientChoice?: RecipientChoice
    temporary: boolean
    webSearch: boolean
}>()

const emit = defineEmits<{
    'close': []
    'copyMarkdown': []
    'nativeShare': []
    'openPrompt': []
    'qr': []
    'update:temporary': [value: boolean]
    'update:webSearch': [value: boolean]
}>()

const definition = computed(() => getProvider(props.provider))
const notices = computed(() => getCompatibilityNotices({
    prompt: '',
    provider: props.provider,
    model: props.model,
    recipientChoice: props.recipientChoice,
    temporary: props.temporary,
    webSearch: props.webSearch,
}))
const canToggleWeb = computed(() =>
    Boolean(props.recipientChoice)
    || (
        definition.value.capabilities.webSearch !== 'unavailable'
        && definition.value.capabilities.webSearch !== 'always'
    ),
)
const webIsAlwaysOn = computed(() =>
    !props.recipientChoice && definition.value.capabilities.webSearch === 'always',
)
const canToggleTemporary = computed(() =>
    Boolean(props.recipientChoice)
    || definition.value.capabilities.temporary !== 'unavailable',
)
const temporaryLabel = computed(() => {
    if (props.recipientChoice) {
        return 'Private / temporary chat'
    }
    return props.provider === 'claude' ? 'Incognito chat' : 'Temporary chat'
})
const webNotice = computed(() =>
    notices.value.find(notice => notice.feature === 'webSearch')?.message,
)
const temporaryNotice = computed(() =>
    notices.value.find(notice => notice.feature === 'temporary')?.message,
)
</script>

<template>
    <PhoneSheet :open="open" title="More" title-id="more-sheet-title" @close="emit('close')">
        <section class="sheet-section" aria-labelledby="share-actions-title">
            <h3 id="share-actions-title">
                Share & open
            </h3>
            <div class="sheet-action-list">
                <button :disabled="!promptReady" @click="emit('openPrompt')">
                    <span>Open prompt</span>
                    <small>{{ !promptReady ? 'Add a prompt first' : recipientChoice ? 'Recipient decides' : definition.label }}</small>
                </button>
                <button :disabled="!promptReady" @click="emit('copyMarkdown')">
                    <span>Copy Markdown</span>
                    <small>{{ promptReady ? 'Button link' : 'Add a prompt first' }}</small>
                </button>
                <button :disabled="!promptReady || !qrAvailable" @click="emit('qr')">
                    <span>Show QR code</span>
                    <small>{{ !promptReady ? 'Add a valid prompt first' : qrAvailable ? 'Scan to open' : 'Prompt is too long' }}</small>
                </button>
                <button v-if="canShare" :disabled="!promptReady" @click="emit('nativeShare')">
                    <span>Share…</span>
                    <small>{{ promptReady ? 'System share sheet' : 'Add a prompt first' }}</small>
                </button>
            </div>
        </section>

        <section
            v-if="canToggleWeb || webIsAlwaysOn || canToggleTemporary || provider === 'gemini'"
            class="sheet-section"
            aria-labelledby="conversation-options-title"
        >
            <h3 id="conversation-options-title">
                Conversation
            </h3>
            <label v-if="canToggleWeb" class="sheet-toggle">
                <span>
                    <strong>Web search</strong>
                    <small>
                        {{ recipientChoice
                            ? 'Ask the selected AI to search before answering.'
                            : `Ask ${definition.label} to search before answering.` }}
                    </small>
                </span>
                <input
                    type="checkbox"
                    :checked="webSearch"
                    :aria-describedby="webSearch && webNotice ? 'web-search-warning' : undefined"
                    @change="emit('update:webSearch', ($event.target as HTMLInputElement).checked)"
                >
            </label>
            <span class="sr-only" role="status" aria-live="polite">
                {{ webSearch ? webNotice : '' }}
            </span>
            <p
                v-if="webSearch && webNotice"
                id="web-search-warning"
                class="sheet-warning"
            >
                {{ webNotice }}
            </p>
            <p v-else-if="webIsAlwaysOn" class="sheet-note">
                Perplexity searches the web by default.
            </p>
            <label v-if="canToggleTemporary" class="sheet-toggle">
                <span>
                    <strong>{{ temporaryLabel }}</strong>
                    <small>Best effort — confirm after opening.</small>
                </span>
                <input
                    type="checkbox"
                    :checked="temporary"
                    :aria-describedby="temporary && temporaryNotice ? 'temporary-chat-warning' : undefined"
                    @change="emit('update:temporary', ($event.target as HTMLInputElement).checked)"
                >
            </label>
            <span class="sr-only" role="status" aria-live="polite">
                {{ temporary ? temporaryNotice : '' }}
            </span>
            <p
                v-if="temporary && temporaryNotice"
                id="temporary-chat-warning"
                class="sheet-warning"
            >
                {{ temporaryNotice }}
            </p>
            <p v-if="provider === 'gemini' && !recipientChoice" class="sheet-note">
                Gemini uses a reviewable copy-and-open handoff because direct prompt links can auto-submit or vary by session.
            </p>
        </section>

        <nav class="sheet-links" aria-label="Project links">
            <a href="https://github.com/ThatGuySam/prefillprompt/issues" target="_blank" rel="noreferrer">Help</a>
            <a href="https://github.com/ThatGuySam/prefillprompt" target="_blank" rel="noreferrer">GitHub</a>
        </nav>
    </PhoneSheet>
</template>
