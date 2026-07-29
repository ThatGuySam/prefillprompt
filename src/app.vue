<script setup lang="ts">
useHead({
    htmlAttrs: {
        lang: 'en',
    },
    link: [
        { rel: 'canonical', href: 'https://prefillprompt.com/' },
        { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' },
        { rel: 'manifest', href: '/site.webmanifest' },
    ],
    meta: [
        {
            name: 'theme-color',
            content: '#fffdf8',
            media: '(prefers-color-scheme: light)',
        },
        {
            name: 'theme-color',
            content: '#08111f',
            media: '(prefers-color-scheme: dark)',
        },
    ],
})

useSeoMeta({
    title: 'PrefillPrompt — One prompt, any AI',
    description: 'Create one-click prompt links for ChatGPT, Claude, Gemini, and Perplexity. Share them as a URL, Markdown button, or QR code.',
    ogTitle: 'PrefillPrompt — One prompt, any AI',
    ogDescription: 'Create one-click prompt links for ChatGPT, Claude, Gemini, and Perplexity.',
    ogImage: 'https://prefillprompt.com/og-prefillprompt.png',
    ogImageAlt: 'One prompt branching into four AI chat destinations',
    ogType: 'website',
    ogUrl: 'https://prefillprompt.com/',
    twitterCard: 'summary_large_image',
    twitterTitle: 'PrefillPrompt — One prompt, any AI',
    twitterDescription: 'Create one-click prompt links for ChatGPT, Claude, Gemini, and Perplexity.',
    twitterImage: 'https://prefillprompt.com/og-prefillprompt.png',
})
</script>

<template>
    <NuxtPage />
</template>
