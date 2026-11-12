<script setup lang="ts">
import PromptBuilder from '~/components/PromptBuilder.vue'
import { PROVIDER_COMPATIBILITY } from '~/lib/flags'

// The flagged builder is loaded only in a build that turns the flag on. A normal build
// contains no reference to it, so its code is neither shipped to this page nor prefetched.
const Builder = PROVIDER_COMPATIBILITY
    ? defineAsyncComponent(() => import('~/components/PromptBuilderNext.vue'))
    : PromptBuilder
</script>

<template>
    <main class="app-stage">
        <h1 class="sr-only">
            PrefillPrompt — make a prompt people can use in one click
        </h1>
        <component :is="Builder" />
    </main>
</template>
