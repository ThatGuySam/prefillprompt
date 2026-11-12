/**
 * Build-time feature flags. Each one is off unless the build sets its
 * environment variable, so a normal production build ships none of them.
 *
 * `nuxt.config.ts` replaces the `__NAME__` constants below at build time.
 * Outside a Nuxt build (the Node test runner) they are undefined and read as
 * off; a test turns one on with `test/helpers/enable-provider-compatibility.ts`
 * before it loads app code.
 */
declare const __PROVIDER_COMPATIBILITY__: boolean | undefined

/**
 * The July 2026 builder work: a "recipient decides" option, the /choose
 * page, compatibility notices, a secret warning, and web search sent as
 * prompt text. Turn on with NUXT_PUBLIC_PROVIDER_COMPATIBILITY=true.
 *
 * Exported on its own as well, because the bundler can drop flagged code
 * from the build when it branches on a plain constant.
 */
export const PROVIDER_COMPATIBILITY: boolean
    = typeof __PROVIDER_COMPATIBILITY__ !== 'undefined' && __PROVIDER_COMPATIBILITY__ === true

export const flags = {
    providerCompatibility: PROVIDER_COMPATIBILITY,
}
