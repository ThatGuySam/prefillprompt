<script setup lang="ts">
defineProps<{
    error: {
        statusCode?: number
        statusMessage?: string
    }
}>()
</script>

<template>
    <main class="error-page">
        <p class="eyebrow">
            {{ error.statusCode ?? 404 }}
        </p>
        <h1>That prompt link does not exist.</h1>
        <p>{{ error.statusMessage ?? 'Check the URL or make a new prompt link.' }}</p>
        <a class="open-button" href="/">Build a prompt link</a>
    </main>
</template>
