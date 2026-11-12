/**
 * Build-time feature flags. Each one is off unless the build sets its
 * environment variable, so a normal production build ships none of them.
 *
 * `nuxt.config.ts` replaces the `__NAME__` constants below at build time.
 * Outside a Nuxt build (the Node test runner) they are undefined and read as
 * off; a test turns one on by setting the global before importing app code,
 * as `test/helpers/enable-provider-compatibility.ts` does.
 */
declare const __PROVIDER_COMPATIBILITY__: boolean | undefined

export const flags = {
    /**
     * The July 2026 builder work: a "recipient decides" option, the /choose
     * page, compatibility notices, a secret warning, and web search sent as
     * prompt text. Turn on with NUXT_PUBLIC_PROVIDER_COMPATIBILITY=true.
     */
    providerCompatibility:
    typeof __PROVIDER_COMPATIBILITY__ !== 'undefined' && __PROVIDER_COMPATIBILITY__ === true,
}
