<script setup lang="ts">
defineProps<{
    canShare: boolean
    hasPrompt: boolean
    promptUrl: string
    qrAvailable: boolean
}>()

const emit = defineEmits<{
    copyLink: []
    copyMarkdown: []
    nativeShare: []
    open: []
    qr: []
}>()
</script>

<template>
    <section class="share-panel" aria-labelledby="share-title">
        <div class="section-heading compact">
            <div>
                <p class="eyebrow">
                    Share
                </p>
                <h2 id="share-title">
                    Send it your way
                </h2>
            </div>
        </div>

        <div class="share-grid">
            <button class="action-button primary" :disabled="!hasPrompt" @click="emit('copyLink')">
                <span aria-hidden="true">↗</span>
                Copy link
            </button>
            <button class="action-button" :disabled="!hasPrompt" @click="emit('copyMarkdown')">
                <span aria-hidden="true">[ ]</span>
                Markdown
            </button>
            <button class="action-button" :disabled="!hasPrompt || !qrAvailable" @click="emit('qr')">
                <span aria-hidden="true">▦</span>
                QR code
            </button>
            <button v-if="canShare" class="action-button" :disabled="!hasPrompt" @click="emit('nativeShare')">
                <span aria-hidden="true">⌁</span>
                Share
            </button>
        </div>

        <button class="open-button" :disabled="!hasPrompt" @click="emit('open')">
            Open prompt
            <span aria-hidden="true">→</span>
        </button>

        <p v-if="hasPrompt" class="generated-url">
            <span>Generated link</span>
            <output>{{ promptUrl }}</output>
        </p>
        <p v-if="hasPrompt && !qrAvailable" class="inline-warning">
            Shorten the prompt to export a reliable QR code.
        </p>
    </section>
</template>
