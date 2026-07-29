<script setup lang="ts">
import type { PromptHistoryEntry } from '~/composables/usePromptHistory'

defineProps<{
    entries: PromptHistoryEntry[]
}>()

const emit = defineEmits<{
    clear: []
    remove: [id: string]
    reuse: [entry: PromptHistoryEntry]
}>()
</script>

<template>
    <section v-if="entries.length" class="history-section" aria-labelledby="history-title">
        <div class="section-heading history-heading">
            <div>
                <p class="eyebrow">
                    Stored on this device
                </p>
                <h2 id="history-title">
                    Recent prompt links
                </h2>
            </div>
            <button class="text-button" @click="emit('clear')">
                Clear all
            </button>
        </div>

        <ul class="history-list">
            <li v-for="entry in entries" :key="entry.id">
                <button class="history-reuse" @click="emit('reuse', entry)">
                    <span>{{ entry.prompt }}</span>
                    <small>{{ entry.provider }} · Reuse</small>
                </button>
                <button class="history-remove" :aria-label="`Remove ${entry.prompt.slice(0, 30)} from history`" @click="emit('remove', entry.id)">
                    ×
                </button>
            </li>
        </ul>
    </section>
</template>
