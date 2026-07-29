<script setup lang="ts">
import { MAX_PROMPT_LENGTH } from '~/lib/prompt-links'

const route = useRoute()
const prompt = computed(() => {
    const value = Array.isArray(route.query.q) ? route.query.q[0] : route.query.q
    return typeof value === 'string' ? value.slice(0, MAX_PROMPT_LENGTH) : ''
})
const model = computed(() => {
    const value = Array.isArray(route.query.model) ? route.query.model[0] : route.query.model
    return typeof value === 'string' ? value : 'latest'
})
const status = ref('')
const failed = ref(false)
const promptField = ref<HTMLTextAreaElement>()

useSeoMeta({
    title: 'Open prompt in Gemini — PrefillPrompt',
    robots: 'noindex, nofollow',
})

async function copyAndOpen() {
    failed.value = false
    try {
        await navigator.clipboard.writeText(prompt.value)
        status.value = 'Copied. Opening Gemini…'
        window.location.assign('https://gemini.google.com/app')
    }
    catch {
        failed.value = true
        status.value = 'Copy the selected prompt, then open Gemini.'
        await nextTick()
        promptField.value?.focus()
        promptField.value?.select()
    }
}
</script>

<template>
    <main class="handoff-stage">
        <section class="handoff-card" aria-labelledby="handoff-title">
            <p class="handoff-mark" aria-hidden="true">
                G
            </p>
            <p class="eyebrow">
                One reliable handoff
            </p>
            <h1 id="handoff-title">
                Copy the prompt, then open Gemini.
            </h1>
            <p>
                Gemini does not publish a dependable prompt-link format, so PrefillPrompt uses the clipboard instead.
            </p>
            <textarea
                v-if="failed"
                ref="promptField"
                :value="prompt"
                readonly
                aria-label="Prompt to copy"
                rows="5"
            />
            <button :disabled="!prompt" @click="copyAndOpen">
                Copy prompt & open Gemini
                <span aria-hidden="true">→</span>
            </button>
            <small v-if="model !== 'latest'">
                Selected model hint: {{ model }}. Confirm it in Gemini.
            </small>
            <p class="handoff-status" aria-live="polite" role="status">
                {{ status }}
            </p>
        </section>
    </main>
</template>
