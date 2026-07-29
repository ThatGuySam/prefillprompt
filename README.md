# PrefillPrompt

PrefillPrompt turns a prompt into a shareable link that opens a new conversation in ChatGPT, Claude, Gemini, or Perplexity. Choose a service, model or mode, then copy the URL, export a Markdown button or QR code, use the native share sheet, or open the result yourself.

> [!IMPORTANT]
> The prompt is part of the URL. Anyone who receives the link—and systems that record URLs—can read it. Do not put secrets or sensitive personal information in a shared prompt.

<p align="center">
  <img src="https://github.com/user-attachments/assets/aa52c8e6-5ad7-4370-b40b-b89b95bff19b" width="360" alt="PrefillPrompt prompt-link builder">
</p>

## Features

- ChatGPT, Claude, Gemini, and Perplexity destinations
- Service and model selection, including the stable aliases `latest`, `latest-fast`, and `latest-reasoning`
- ChatGPT web-search links
- Experimental temporary or incognito conversation links where the destination supports them
- Copyable URLs and Markdown buttons
- QR-code export and native Web Share where the browser supports it
- Prompt examples and browser-local history
- A stateless Nuxt application deployed with Cloudflare Workers and Static Assets

History and preferences stay in the current browser. PrefillPrompt does not sync them between devices.

## Try an example

| Destination | Prompt | Link |
| --- | --- | --- |
| ChatGPT with web search | Research the current state of Web Platform Baseline and cite primary sources. | [Open prompt](https://prefillprompt.com/api/prompt?s=chatgpt&model=latest-reasoning&web=true&q=Research%20the%20current%20state%20of%20Web%20Platform%20Baseline%20and%20cite%20primary%20sources.) |
| Claude | Turn these rough release notes into a concise customer announcement. | [Open prompt](https://prefillprompt.com/api/prompt?s=claude&model=latest&q=Turn%20these%20rough%20release%20notes%20into%20a%20concise%20customer%20announcement.) |
| Gemini | Compare three ways to add offline support to a Nuxt app, including tradeoffs. | [Open prompt](https://prefillprompt.com/api/prompt?s=gemini&model=latest-fast&q=Compare%20three%20ways%20to%20add%20offline%20support%20to%20a%20Nuxt%20app%2C%20including%20tradeoffs.) |
| Perplexity | Find primary sources explaining Cloudflare Workers Static Assets routing. | [Open prompt](https://prefillprompt.com/api/prompt?s=perplexity&q=Find%20primary%20sources%20explaining%20Cloudflare%20Workers%20Static%20Assets%20routing.) |

## Prompt-link API

`GET https://prefillprompt.com/api/prompt` redirects the browser to the selected service with the prompt and supported options.

| Query key | Required | Meaning |
| --- | --- | --- |
| `q` | Yes | The URL-encoded prompt text. Newlines and Unicode are supported. |
| `s` | No | Service ID or recognized service alias. Supported IDs are `chatgpt`, `claude`, `gemini`, and `perplexity`. A provider-specific model may imply its service; otherwise the default is ChatGPT. |
| `m` | No | Legacy name for the service. It is used only when `s` is absent. New links should use `s`. |
| `model` | No | A provider model ID or the alias `latest`, `latest-fast`, or `latest-reasoning`. |
| `web` | No | Set to `true` or `1` to request ChatGPT web search. |
| `temporary` | No | Set to `true` or `1` to request ChatGPT Temporary Chat or Claude Incognito. Experimental. |

For example:

```text
https://prefillprompt.com/api/prompt?s=chatgpt&model=latest-reasoning&web=true&q=Compare%20the%20latest%20browser%20automation%20standards
```

```text
https://prefillprompt.com/api/prompt?s=chatgpt&temporary=true&q=Help%20me%20brainstorm%20three%20names%20for%20a%20weekend%20prototype
```

### Provider caveats

PrefillPrompt launches third-party web applications; those applications do not provide a single stable, documented URL API for every model and mode.

- Model and mode controls are best-effort. A service may ignore an option, fall back to its default, rename a model, or require a particular account, plan, region, or feature rollout.
- The `latest*` aliases intentionally move to the latest known-good mapping. Use an explicit model ID when reproducibility matters.
- `web` currently targets ChatGPT web search. Other services choose their own search behavior.
- `temporary` currently maps to ChatGPT Temporary Chat and Claude Incognito. Gemini and Perplexity have no verified URL switch for this mode.
- Gemini and Perplexity do not publish stable URL controls for selecting consumer models or modes, so those destinations may use their account defaults.
- Temporary or incognito mode is not a privacy guarantee. Confirm the destination UI shows the requested mode before sending sensitive content.
- The OpenRouter catalog is useful for discovering model names, but it is not authoritative for consumer web-app URL controls. PrefillPrompt does not treat OpenRouter availability as proof that a model can be selected by URL.

## Local development

```bash
git clone https://github.com/ThatGuySam/prefillprompt.git
cd prefillprompt
pnpm install
pnpm dev
```

The development server is available at `http://localhost:3000`.

## Commands

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Start the Nuxt development server. |
| `pnpm build` | Create the standard production build. |
| `pnpm build:cloudflare` | Build Nuxt for Cloudflare Workers and Static Assets. |
| `pnpm preview` | Preview the Cloudflare-targeted build locally. |
| `pnpm lint` | Run ESLint. |
| `pnpm typecheck` | Run Nuxt and Vue TypeScript checks. |
| `pnpm test` | Run the automated test suite once. |
| `pnpm check` | Run lint, typecheck, tests, and the Cloudflare build. |
| `pnpm deploy:preview` | Upload a Cloudflare Worker version and print its preview URL without promoting it to production. |

Before sharing a Cloudflare preview:

```bash
pnpm check
pnpm deploy:preview
```

Review the emitted preview URL, including the homepage and each redirect path, before any production rollout.

## Architecture

- Nuxt renders the responsive prompt builder and browser-local state.
- A shared provider registry resolves services, models, aliases, and supported modes.
- The Nitro `/api/prompt` route validates a link and returns an uncached redirect without storing the prompt.
- Cloudflare serves prerendered frontend assets first and invokes the Worker for API routes.

## Contributing

1. Fork and clone the repository.
2. Create a focused branch.
3. Make the change and add or update tests.
4. Run `pnpm check`.
5. Open a pull request describing the behavior change and verification.
