<script setup lang="ts">
import { flags } from '~/lib/flags'
</script>

<template>
    <main class="app-stage">
        <h1 class="sr-only">
            PrefillPrompt — make a prompt people can use in one click
        </h1>
        <LazyPromptBuilderNext v-if="flags.providerCompatibility" />
        <PromptBuilder v-else />
    </main>
</template>
