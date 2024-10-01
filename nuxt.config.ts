// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
    compatibilityDate: '2024-09-30',
    devtools: { enabled: false },
    srcDir: 'src/',
    modules: [
        '@nuxt/ui',
        '@vueuse/nuxt',
    ],
    // Render modes - https://nuxt.com/docs/guide/concepts/rendering#hybrid-rendering
    routeRules: {
        // Homepage pre-rendered at build time
        '/': { ssr: false },
    },
})
