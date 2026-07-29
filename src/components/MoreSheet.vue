<script setup lang="ts">
import type { ProviderId } from '~/lib/providers'
import { getProvider } from '~/lib/providers'

const props = defineProps<{
    canShare: boolean
    open: boolean
    provider: ProviderId
    qrAvailable: boolean
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
const canToggleWeb = computed(() => definition.value.capabilities.webSearch === 'supported')
const webIsAlwaysOn = computed(() => definition.value.capabilities.webSearch === 'always')
const canToggleTemporary = computed(() => definition.value.capabilities.temporary !== 'unavailable')
const temporaryLabel = computed(() => props.provider === 'claude' ? 'Incognito chat' : 'Temporary chat')
</script>

<template>
    <PhoneSheet :open="open" title="More" title-id="more-sheet-title" @close="emit('close')">
        <section class="sheet-section" aria-labelledby="share-actions-title">
            <h3 id="share-actions-title">
                Share & open
            </h3>
            <div class="sheet-action-list">
                <button @click="emit('openPrompt')">
                    <span>Open prompt</span>
                    <small>{{ definition.label }}</small>
                </button>
                <button @click="emit('copyMarkdown')">
                    <span>Copy Markdown</span>
                    <small>Button link</small>
                </button>
                <button :disabled="!qrAvailable" @click="emit('qr')">
                    <span>Show QR code</span>
                    <small>{{ qrAvailable ? 'Scan to open' : 'Prompt is too long' }}</small>
                </button>
                <button v-if="canShare" @click="emit('nativeShare')">
                    <span>Share…</span>
                    <small>System share sheet</small>
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
                    <small>Ask {{ definition.label }} to start in search mode.</small>
                </span>
                <input
                    type="checkbox"
                    :checked="webSearch"
                    @change="emit('update:webSearch', ($event.target as HTMLInputElement).checked)"
                >
            </label>
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
                    @change="emit('update:temporary', ($event.target as HTMLInputElement).checked)"
                >
            </label>
            <p v-if="provider === 'gemini'" class="sheet-note">
                Gemini uses a copy-and-open handoff because Google does not publish a dependable prompt-link contract.
            </p>
        </section>

        <nav class="sheet-links" aria-label="Project links">
            <a href="https://github.com/ThatGuySam/prefillprompt/issues" target="_blank" rel="noreferrer">Help</a>
            <a href="https://github.com/ThatGuySam/prefillprompt" target="_blank" rel="noreferrer">GitHub</a>
        </nav>
    </PhoneSheet>
</template>
