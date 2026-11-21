# Parked: provider URL parameters, missing-prompt links, model list

Entry point for the 2026-11-14 session that got prefillprompt.com serving again and rechecked which URL parameters ChatGPT, Claude, Gemini and Perplexity still honor. Check `git log` before trusting claims about code.

## Where things stand

As of 2026-11-21, at commit `d42f2a7` (on `origin/main`):

- prefillprompt.com is a Cloudflare Worker with custom-domain routes in `nuxt.config.ts`. Deployed 2026-11-14 from `40a6734`; the probe passed 30 of 30 on production. Later `main` commits (scanner, small-model preview) were not part of that deploy. Check whether a later session deployed them.
- A link with no prompt now opens a new chat that keeps the model and chat settings, instead of a 400 page (`9e1ee91`).
- ChatGPT and Gemini offer no model choices, because both ignore them. Temporary chat is marked supported for ChatGPT and Claude (`504b47c`).
- The model catalog was refreshed and filtered to models chat apps can open (`9726723`).
- PR #9 merged all of this on 2026-11-14.
- The repo setting "Allow GitHub Actions to create and approve pull requests" is now on (Sam confirmed with a screenshot, 2026-11-21).

## Read next

- [Manual link check](../manual-link-check.md): clickable checks with Sam's 2026-11-14 results and a "Candidates from research (untested)" section.
- [Findings memo](../research/provider-url-parameters-2026-11-14.md): what works, what was ignored, and why.
- [Codex research memo](../research/provider-url-parameters-research-2026-11-14.md): 169 sources checked; the ledger and scripts are in `../research/evidence/provider-url-parameters-2026-11-14/`.
- Brain note `codebase/prefillprompt-provider-urls` in the shared memory checkout.
- [Open-preview handoff](open-preview-and-flags-2026-11-12.md): the other session's scanner and preview work.

## Threads

- Claude Code session `54700ecf-f210-408d-a8ea-90162887f470`, reopen with `claude --resume 54700ecf-f210-408d-a8ea-90162887f470`. Holds the deploy and DNS debugging and the meeting transcript Sam pasted.

## Not written down elsewhere

- The merge of `origin/main` into the fix branch (`d567d9b`) kept both sides in `src/lib/prompt-redirect.ts`. A link that names a small model goes to the `/open` preview only when it has a prompt to scan. With no prompt it opens a new chat.
- Deploying from `main` needs the generated scanner files in `public/scanner/deep/` (about 119 MB, gitignored). They exist in Sam's main checkout. A clean checkout fails `scripts/scanner/build-deep.mjs --check`.
- The Cloudflare classifier blocked deleting DNS records through the MCP, so Sam deleted the old CNAMEs and the old Pages custom domain by hand.
- Sam heard that OpenAI may merge ChatGPT Work and Chat. If so, parameters that fail today may start working, so retest them then.
- Ten or more `automation/model-catalog-*` branches are on GitHub from the failed weekly job. They are stale.

## Next

1. Sam clicks the untested candidate links in the manual check and fills in the result cells: ChatGPT `prompt=`, Claude model plus `thinking=extended`, Gemini `prompt_text`.
2. Sam says which step of the Gemini handoff fails: the copy, Gemini opening, or the paste.
3. The [manual catalog run](https://github.com/ThatGuySam/prefillprompt/actions/runs/44950279745) passed and opened [PR #10](https://github.com/ThatGuySam/prefillprompt/pull/10).
4. [PR #7](https://github.com/ThatGuySam/prefillprompt/pull/7) brings the Node pin to 22.23.4. The trunk workflow and publication boundaries are in [PROJECT.md](../../PROJECT.md).
5. Ask Sam before deploying `main` to production. No standing approval.
