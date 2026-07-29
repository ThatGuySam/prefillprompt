<script setup lang="ts">
import type { PromptHistoryEntry } from '~/composables/usePromptHistory'
import type { PromptLinkOptions } from '~/lib/prompt-links'

defineProps<{
    entries: PromptHistoryEntry[]
    open: boolean
}>()

const emit = defineEmits<{
    clear: []
    close: []
    remove: [id: string]
    select: [options: PromptLinkOptions]
}>()

const examples: Array<PromptLinkOptions & { title: string }> = [
    {
        title: 'Explain unfamiliar code',
        prompt: 'Explain what this code does, identify the riskiest assumption, and suggest one simpler implementation. I will paste the code next.',
        provider: 'chatgpt',
        model: 'latest-reasoning',
    },
    {
        title: 'Polish a rough note',
        prompt: 'Rewrite the note I paste next so it is concise, specific, and sounds like me. Preserve every factual claim and flag anything ambiguous.',
        provider: 'claude',
        model: 'latest',
    },
    {
        title: 'Compare current options',
        prompt: 'Compare the three strongest current options for the product I name next. Use recent primary sources, show the tradeoffs, and recommend who each option is best for.',
        provider: 'perplexity',
        model: 'latest',
    },
]

function select(options: PromptLinkOptions) {
    emit('select', options)
    emit('close')
}
</script>

<template>
    <PhoneSheet :open="open" title="Library" title-id="library-sheet-title" @close="emit('close')">
        <section class="sheet-section" aria-labelledby="examples-title">
            <h3 id="examples-title">
                Try an example
            </h3>
            <div class="library-list">
                <button v-for="example in examples" :key="example.title" @click="select(example)">
                    <strong>{{ example.title }}</strong>
                    <span>{{ example.prompt }}</span>
                </button>
            </div>
        </section>

        <section v-if="entries.length" class="sheet-section" aria-labelledby="recent-title">
            <div class="sheet-section-heading">
                <h3 id="recent-title">
                    Recent
                </h3>
                <button class="sheet-text-button" @click="emit('clear')">
                    Clear
                </button>
            </div>
            <ul class="history-list">
                <li v-for="entry in entries" :key="entry.id">
                    <button class="history-use" @click="select(entry)">
                        <span>{{ entry.prompt }}</span>
                        <small>{{ entry.provider }}</small>
                    </button>
                    <button
                        class="history-remove"
                        :aria-label="`Remove ${entry.prompt.slice(0, 30)} from history`"
                        @click="emit('remove', entry.id)"
                    >
                        ×
                    </button>
                </li>
            </ul>
        </section>
    </PhoneSheet>
</template>
