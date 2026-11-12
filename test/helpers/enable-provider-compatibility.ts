// Import this first in a test file to run it with the providerCompatibility
// flag on. The flag is read when app modules load, and each test file runs in
// its own process, so this does not leak into other files.
(globalThis as { __PROVIDER_COMPATIBILITY__?: boolean }).__PROVIDER_COMPATIBILITY__ = true
