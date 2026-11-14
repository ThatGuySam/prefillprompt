# Provider URL parameters: what works on 2026-11-14

PrefillPrompt redirects to ChatGPT, Claude, Gemini, and Perplexity with query strings that ask each site to prefill a prompt and, where possible, pick a model, a thinking mode, web search, or a temporary chat. None of these parameters are documented public APIs. This memo records what a signed-in manual check found, what was learned about why, and what is still unknown.

## How this was checked

- Sam clicked every link in [docs/manual-link-check.md](../manual-link-check.md) in Firefox, signed in, on 2026-11-14. Per-link results are in that file.
- `pnpm probe` checks the PrefillPrompt side over plain HTTP: each `/api/prompt` link redirects to the expected destination URL. It cannot see whether the destination honors a parameter.
- A signed-out headless Chrome run on 2026-11-09 stopped at a Cloudflare "Verify you are human" challenge on ChatGPT, Claude, and Perplexity. Automated browser checks of the destinations are not viable signed out, and signed-in automation would use Sam's real accounts.

## Results by parameter

| Destination | Parameter we send | Result |
| --- | --- | --- |
| ChatGPT | `q` | Works |
| ChatGPT | `hints=search` | Works |
| ChatGPT | `temporary-chat=true` | Works |
| ChatGPT | `model=instant` (latest fast) | Ignored |
| ChatGPT | `model=thinking` (latest reasoning) | Ignored. Opens in Chat mode on the account default (GPT-6 on a Pro account, not 6.1). Thinking models live in ChatGPT's Work mode, which no known parameter selects |
| ChatGPT | `model=gpt-5` | Ignored |
| Claude | `q` | Works. Claude shows its own "Use caution before running this prompt" banner on prefilled prompts |
| Claude | `incognito=true` | Works |
| Claude | `model=claude-sonnet-5` | Works |
| Claude | `model=claude-sonnet-4` | Ignored. Retired model slugs fall back to the selected model |
| Claude | `thinking=extended` | Ignored. Claude now shows an effort level (for example "Opus 5.5 Medium"), so the setting has likely changed |
| Perplexity | `s=o&q` | Works signed out and signed in |
| Gemini | handoff page, then paste | Failed in the manual check; the failing step is not yet known |
| Gemini | model hint | Ignored. No known Gemini URL parameter selects a model |

Special characters, emoji, and Japanese text survive the full redirect into Claude unchanged.

## What we learned

- **Model links need current web slugs.** Claude accepts a model slug only when claude.ai still offers that model. The model list PrefillPrompt suggests comes from OpenRouter's API catalog, which uses API names and includes retired models and API-only variants (`:batch`, `-fast`, image, audio, codex). Those names are not the same set the chat sites accept.
- **The model list has been stale since July.** The weekly `Update model catalog` workflow has failed every run since 2026-10-05. It builds the list and pushes an `automation/model-catalog-*` branch, then fails with "GitHub Actions is not permitted to create or approve pull requests". The repository setting "Allow GitHub Actions to create and approve pull requests" fixes it. The shipped catalog is from 2026-07-29.
- **ChatGPT has two modes.** Chat and Work. Model and thinking selection appear to depend on Work mode. Sam heard that OpenAI plans to merge the modes, so parameters that fail today may start working again.
- **Missing prompts should still open a chat.** A link without `q` used to return a 400 page. Sam wants it to open a new chat with the requested model and settings. Implemented the same day.

## Open questions

- Is there a ChatGPT URL parameter that selects Work mode or a specific model?
- What parameter, if any, sets Claude's thinking or effort level from a URL?
- Does any Gemini URL accept a prompt or model?
- Which model slugs does each chat site accept today, and is there a public source that tracks them?
