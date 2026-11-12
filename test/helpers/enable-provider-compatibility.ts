// Turns the providerCompatibility flag on for one test file. The flag is read
// when app modules load, so call this first and load app code afterwards with
// `await import(...)`. Each test file runs in its own process, so this does
// not leak into other files.
export function enableProviderCompatibility() {
    (globalThis as { __PROVIDER_COMPATIBILITY__?: boolean }).__PROVIDER_COMPATIBILITY__ = true
}
