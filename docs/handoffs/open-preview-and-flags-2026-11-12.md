# Parked: /open preview, danger warnings, July work behind a flag

Entry point for the 2026-11-12 PrefillPrompt session. Other sessions have since pushed more to `main` (7 commits on origin by 2026-11-21, including a small-model preview, an on-device prompt scan and provider-capability fixes), so check `git log` before trusting any claim about code here.

## Where things stand

As of 2026-11-12, at commit `e0368db` (on `origin/main`):

- `/api/prompt` keeps its original contract. A link with no service opens ChatGPT. A prompt that trips a danger check goes to `/open` with the warning.
- `/open` is one rounded frame. Each place has its own Open link. With a place known (named in the link or saved), it shows one button with a toggle that expands the rest.
- The July 2026 builder work (recipient-decides option, `/choose`, compatibility notices, secret warning) was merged into `main` behind the build flag `providerCompatibility` (`src/lib/flags.ts`, env `NUXT_PUBLIC_PROVIDER_COMPATIBILITY=true`). Off in a normal build. `test/flags-off.test.ts` guards that.
- The July Nuxt/Vue upgrade was not applied. It is in commit `8ca3b92`.
- A preview version was uploaded (`pnpm deploy:preview`); probe passed 27 of 27. Production deploy was not done in this session. Check whether a later session deployed it before assuming.

## Read next

- [README](../../README.md): "Feature flags", "Prompt-link API", "The preview screen".
- [Danger signals memo](../research/prompt-danger-signals-2026-11-12.md): how the warning signals were measured.
- [Attack tracking sources memo](../research/prompt-attack-tracking-sources-2026-11-12.md): six feeds to follow for new attacks (MITRE ATLAS first) and a monthly routine. Written by a subagent; its findings were not re-verified.
- [Manual link check](../manual-link-check.md): clickable checks for each behavior.
- Brain note `codebase/prefillprompt` in the shared memory checkout.

## Threads

- Claude Code session `c6158f2e-fa33-4fbe-b075-12c1b8b926c7`, reopen with `claude --resume c6158f2e-fa33-4fbe-b075-12c1b8b926c7`. Holds the full design discussion with Sam.

## Not written down elsewhere

- Sam said (2026-11-12) `/api/prompt` must keep working as it always did and he may deprecate it if abused.
- The merge commit `6480daf` has four failing flag-on tests; `43b45ec` fixes them.
- The app rows (Claude Code, ChatGPT app) were never clicked, so the handoff with no website tab is unconfirmed.

## Next

1. Ask Sam whether to deploy to production (no standing approval).
2. Have Sam click Open beside Claude Code and ChatGPT app once on the preview.
3. Optionally build the monthly feed check from the tracking memo.
