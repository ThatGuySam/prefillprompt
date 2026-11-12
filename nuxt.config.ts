export default defineNuxtConfig({
    compatibilityDate: '2026-07-29',
    devtools: { enabled: false },
    srcDir: 'src/',
    dir: {
        // Nuxt resolves this relative to srcDir when srcDir is customized.
        public: '../public',
    },
    css: ['~/assets/css/main.css'],
    routeRules: {
        '/': { prerender: true },
        // The prompt is in the address, so the preview is never cached, indexed, or sent as a referrer.
        '/open': { headers: { 'Cache-Control': 'private, no-store', 'Referrer-Policy': 'no-referrer', 'X-Robots-Tag': 'noindex, nofollow' } },
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
                routes: [
                    { pattern: 'prefillprompt.com', custom_domain: true },
                    { pattern: 'www.prefillprompt.com', custom_domain: true },
                ],
                preview_urls: true,
                observability: {
                    enabled: false,
                },
            },
        },
    },
})
