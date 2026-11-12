import process from 'node:process'

// Build-time feature flags, read by src/lib/flags.ts. Off unless the build sets the variable.
const flagDefines = {
    __PROVIDER_COMPATIBILITY__: JSON.stringify(process.env.NUXT_PUBLIC_PROVIDER_COMPATIBILITY === 'true'),
}

export default defineNuxtConfig({
    compatibilityDate: '2026-07-29',
    devtools: { enabled: false },
    srcDir: 'src/',
    dir: {
        // Nuxt resolves this relative to srcDir when srcDir is customized.
        public: '../public',
    },
    css: ['~/assets/css/main.css'],
    vite: { define: flagDefines },
    routeRules: {
        '/': { prerender: true },
        // The prompt is in the address, so the preview is never cached, indexed, or sent as a referrer.
        '/open': { headers: { 'Cache-Control': 'private, no-store', 'Referrer-Policy': 'no-referrer', 'X-Robots-Tag': 'noindex, nofollow' } },
    },
    nitro: {
        preset: 'cloudflare-module',
        replace: flagDefines,
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
