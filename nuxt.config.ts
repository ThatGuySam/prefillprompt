// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
    devtools: { enabled: true },
    srcDir: 'src/',
    modules: [
        '@nuxt/ui',
        'nuxt-icon',
        '@vueuse/nuxt',
    ],
    // Render modes - https://nuxt.com/docs/guide/concepts/rendering#hybrid-rendering
    routeRules: {
        // Homepage pre-rendered at build time
        '/': { ssr: false },
    },
})
