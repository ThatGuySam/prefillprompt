export default defineNuxtConfig({
    compatibilityDate: '2026-07-29',
    devtools: { enabled: false },
    srcDir: 'src/',
    css: ['~/assets/css/main.css'],
    routeRules: {
        '/': { prerender: true },
    },
    nitro: {
        preset: 'cloudflare-module',
        prerender: {
            routes: ['/'],
            crawlLinks: false,
        },
        cloudflare: {
            deployConfig: true,
            nodeCompat: true,
            wrangler: {
                name: 'prefillprompt-preview',
                compatibility_date: '2026-07-29',
                compatibility_flags: ['nodejs_compat'],
                workers_dev: true,
                preview_urls: true,
                observability: {
                    enabled: false,
                },
            },
        },
    },
})
