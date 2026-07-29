<script setup lang="ts">
import type { ProviderId } from '~/lib/providers'
import { getProvider } from '~/lib/providers'

const props = defineProps<{
    provider: ProviderId
    temporary: boolean
    webSearch: boolean
}>()

const emit = defineEmits<{
    'update:temporary': [value: boolean]
    'update:webSearch': [value: boolean]
}>()

const definition = computed(() => getProvider(props.provider))
const webAvailable = computed(() => definition.value.capabilities.webSearch === 'supported')
const webAlwaysOn = computed(() => definition.value.capabilities.webSearch === 'always')
const temporaryAvailable = computed(() => definition.value.capabilities.temporary !== 'unavailable')
const temporaryLabel = computed(() => props.provider === 'claude' ? 'Incognito chat' : 'Temporary chat')
</script>

<template>
    <section class="feature-panel" aria-labelledby="features-title">
        <div class="section-heading compact">
            <div>
                <p class="eyebrow">
                    Optional
                </p>
                <h2 id="features-title">
                    Conversation features
                </h2>
            </div>
        </div>

        <div class="toggle-list">
            <label class="toggle-row" :class="{ disabled: !webAvailable }">
                <span>
                    <strong>Web search</strong>
                    <small v-if="webAlwaysOn">Perplexity searches the web by default.</small>
                    <small v-else-if="webAvailable">Ask ChatGPT to start in search mode.</small>
                    <small v-else>Not available through a verified URL for {{ definition.label }}.</small>
                </span>
                <input
                    type="checkbox"
                    :checked="webAvailable && webSearch"
                    :disabled="!webAvailable"
                    @change="emit('update:webSearch', ($event.target as HTMLInputElement).checked)"
                >
            </label>

            <label class="toggle-row" :class="{ disabled: !temporaryAvailable }">
                <span>
                    <strong>{{ temporaryLabel }}</strong>
                    <small v-if="temporaryAvailable">Experimental — confirm the mode at the destination.</small>
                    <small v-else>Not available through a verified URL for {{ definition.label }}.</small>
                </span>
                <input
                    type="checkbox"
                    :checked="temporaryAvailable && temporary"
                    :disabled="!temporaryAvailable"
                    @change="emit('update:temporary', ($event.target as HTMLInputElement).checked)"
                >
            </label>
        </div>
    </section>
</template>
