# Codex review notes for PrefillPrompt

Captured from the merged [PR #1](https://github.com/ThatGuySam/prefillprompt/pull/1)
on 2026-07-29 after merge commit
`be2d35a9a5f983b1d4d07ea12d9a4fde055d4deb`.

This document preserves the review text verbatim and is the source of truth for
the launch fixes implemented by PR #2 on 2026-08-07. The original comments
remain unchanged below; implementation status is tracked separately so the
review record stays auditable.

## Review summary

[Codex review summary](https://github.com/ThatGuySam/prefillprompt/pull/1#pullrequestreview-4813408546)

````text

### 💡 Codex Review

Here are some automated review suggestions for this pull request.

**Reviewed commit:** `fbf16b1853`


<details> <summary>ℹ️ About Codex in GitHub</summary>
<br/>

[Your team has set up Codex to review pull requests in this repo](https://chatgpt.com/codex/cloud/settings/general). Reviews are triggered when you
- Open a pull request for review
- Mark a draft as ready
- Comment "@codex review".

If Codex has suggestions, it will comment; otherwise it will react with 👍.




Codex can also answer questions or update the PR. Try commenting "@codex address that feedback".

</details>
````

## Inline notes

All eight notes are unresolved, non-outdated P2 review threads from
`chatgpt-codex-connector[bot]`.

| # | Area | Location | Exact comment |
| --- | --- | --- | --- |
| 1 | Static assets | [`src/public/robots.txt:1`](https://github.com/ThatGuySam/prefillprompt/pull/1#discussion_r3678441323) | [Open exact comment](https://github.com/ThatGuySam/prefillprompt/pull/1#discussion_r3678441323) |
| 2 | Provider/model catalog | [`src/lib/model-catalog.ts:95`](https://github.com/ThatGuySam/prefillprompt/pull/1#discussion_r3678441327) | [Open exact comment](https://github.com/ThatGuySam/prefillprompt/pull/1#discussion_r3678441327) |
| 3 | Empty share actions | [`src/components/MoreSheet.vue:38-42`](https://github.com/ThatGuySam/prefillprompt/pull/1#discussion_r3678441332) | [Open exact comment](https://github.com/ThatGuySam/prefillprompt/pull/1#discussion_r3678441332) |
| 4 | Encoded URL size | [`src/lib/prompt-links.ts:9`](https://github.com/ThatGuySam/prefillprompt/pull/1#discussion_r3678441335) | [Open exact comment](https://github.com/ThatGuySam/prefillprompt/pull/1#discussion_r3678441335) |
| 5 | Gemini clipboard fallback | [`src/pages/handoff.vue:29-34`](https://github.com/ThatGuySam/prefillprompt/pull/1#discussion_r3678441337) | [Open exact comment](https://github.com/ThatGuySam/prefillprompt/pull/1#discussion_r3678441337) |
| 6 | Removed exact models | [`src/lib/model-catalog.ts:104-107`](https://github.com/ThatGuySam/prefillprompt/pull/1#discussion_r3678441338) | [Open exact comment](https://github.com/ThatGuySam/prefillprompt/pull/1#discussion_r3678441338) |
| 7 | History persistence | [`src/composables/usePromptHistory.ts:25-27`](https://github.com/ThatGuySam/prefillprompt/pull/1#discussion_r3678441340) | [Open exact comment](https://github.com/ThatGuySam/prefillprompt/pull/1#discussion_r3678441340) |
| 8 | Node engine/test runner | [`package.json:21`](https://github.com/ThatGuySam/prefillprompt/pull/1#discussion_r3678441343) | [Open exact comment](https://github.com/ThatGuySam/prefillprompt/pull/1#discussion_r3678441343) |

## Implementation status in PR #2

| # | Result | Regression evidence |
| --- | --- | --- |
| 1 | Assets moved to root `public/` with an explicit `dir.public` override. | `test/static-assets.test.ts` plus clean artifact hash checks |
| 2 | Perplexity exposes one default choice and no ineffective model hints. | `test/model-catalog.test.ts` |
| 3 | Open, Markdown, QR, and native share stay disabled until the prompt link is valid. | `test/review-regressions.test.ts` |
| 4 | Serialized links are capped at 15,000 bytes. | `test/prompt-links.test.ts` |
| 5 | Clipboard denial reveals a direct Gemini link. | `test/review-regressions.test.ts` |
| 6 | Removed exact models remain visible as unavailable saved selections. | `test/model-catalog.test.ts` |
| 7 | Optional browser storage failures are contained. | `test/safe-storage.test.ts` |
| 8 | Tests use the `tsx` import hook and pass on Node 20.20.2. | full 24-test suite on Node 20.20.2 |

### 1. Serve static assets from the configured public directory

Source: [exact Codex comment](https://github.com/ThatGuySam/prefillprompt/pull/1#discussion_r3678441323)

````text
**<sub><sub>![P2 Badge](https://img.shields.io/badge/P2-yellow?style=flat)</sub></sub>  Serve static assets from the configured public directory**

With `srcDir: 'src/'` and no `dir.public` override, Nuxt still resolves its public directory from the project root, so files added under `src/public` are not emitted at `/robots.txt`, `/favicon.svg`, `/site.webmanifest`, `/sitemap.xml`, or `/og-prefillprompt.png`. The new head metadata and manifest therefore reference 404s, and the deleted root-level favicon leaves no served replacement; move these files to the root `public/` directory or explicitly configure `dir.public`.

Useful? React with 👍 / 👎.
````

### 2. Exclude providers that cannot accept model hints

Source: [exact Codex comment](https://github.com/ThatGuySam/prefillprompt/pull/1#discussion_r3678441327)

````text
**<sub><sub>![P2 Badge](https://img.shields.io/badge/P2-yellow?style=flat)</sub></sub>  Exclude providers that cannot accept model hints**

When users browse or search models, this combines aliases and catalog entries for every provider, including Perplexity even though its registry declares models unavailable and `buildProviderUrl` ignores the selected model in the Perplexity branch. Consequently choices such as “Perplexity · Latest reasoning” and exact Perplexity models appear selectable but produce exactly the same redirect as the default; filter model choices using the provider capability instead of offering options that have no effect.

Useful? React with 👍 / 👎.
````

### 3. Disable share actions until a prompt exists

Source: [exact Codex comment](https://github.com/ThatGuySam/prefillprompt/pull/1#discussion_r3678441332)

````text
**<sub><sub>![P2 Badge](https://img.shields.io/badge/P2-yellow?style=flat)</sub></sub>  Disable share actions until a prompt exists**

When the composer is empty, the primary copy button is disabled but the More sheet still enables Open prompt, Markdown, QR, and native sharing. These actions generate a URL with an empty `q`; opening or scanning it reaches `/api/prompt`, which returns `400 Prompt is required`, while the other actions distribute the same unusable link. Pass the prompt-valid state into this sheet and disable these actions until non-whitespace input exists.

Useful? React with 👍 / 👎.
````

### 4. Bound the encoded URL instead of only the prompt length

Source: [exact Codex comment](https://github.com/ThatGuySam/prefillprompt/pull/1#discussion_r3678441335)

````text
**<sub><sub>![P2 Badge](https://img.shields.io/badge/P2-yellow?style=flat)</sub></sub>  Bound the encoded URL instead of only the prompt length**

For long non-ASCII prompts, the 12,000-code-unit limit permits links far larger than the production request-URL limit because `URLSearchParams` percent-encodes UTF-8 bytes. For example, 12,000 CJK characters produce a share URL of roughly 108 KB, so the browser or Cloudflare can reject the request before `/api/prompt` reaches its decoded-length validation even though the UI accepted and copied it. Validate the serialized share URL size or reduce the prompt limit according to its encoded byte length.

Useful? React with 👍 / 👎.
````

### 5. Provide a Gemini navigation path after clipboard denial

Source: [exact Codex comment](https://github.com/ThatGuySam/prefillprompt/pull/1#discussion_r3678441337)

````text
**<sub><sub>![P2 Badge](https://img.shields.io/badge/P2-yellow?style=flat)</sub></sub>  Provide a Gemini navigation path after clipboard denial**

When clipboard access is unavailable or denied, this fallback reveals and selects the prompt but never provides a way to open Gemini: the only navigation call is in the successful `try` branch, and pressing the unchanged button simply retries the same failing clipboard operation. In that browser state, users can manually copy the selected text but cannot complete the advertised copy-and-open flow without leaving the site themselves; expose a direct Gemini link or let the post-failure action navigate independently.

Useful? React with 👍 / 👎.
````

### 6. Preserve or reset exact models removed from the catalog

Source: [exact Codex comment](https://github.com/ThatGuySam/prefillprompt/pull/1#discussion_r3678441338)

````text
**<sub><sub>![P2 Badge](https://img.shields.io/badge/P2-yellow?style=flat)</sub></sub>  Preserve or reset exact models removed from the catalog**

When a weekly catalog refresh removes or renames an exact model that remains in local storage or prompt history, this fallback displays the provider's “Latest” choice while leaving the underlying `model` value unchanged. The user therefore sees Latest but generated links still send the obsolete exact model ID, making the visible selection disagree with the shared behavior. Represent the missing model explicitly or normalize the stored selection to `latest` when applying this fallback.

Useful? React with 👍 / 👎.
````

### 7. Isolate history persistence from successful share actions

Source: [exact Codex comment](https://github.com/ThatGuySam/prefillprompt/pull/1#discussion_r3678441340)

````text
**<sub><sub>![P2 Badge](https://img.shields.io/badge/P2-yellow?style=flat)</sub></sub>  Isolate history persistence from successful share actions**

When `localStorage.setItem` throws because storage is denied or its quota is exhausted, `save()` propagates the exception into unrelated actions. A successfully copied link is then reported as “Clipboard access was blocked,” Open prompt never reaches `window.open`, a completed native share is reported as failed, and QR generation is misreported as a length error. Catch persistence failures within the history composable so optional local history cannot change the outcome of the primary share operations.

Useful? React with 👍 / 👎.
````

### 8. Align the Node engine range with the test runner

Source: [exact Codex comment](https://github.com/ThatGuySam/prefillprompt/pull/1#discussion_r3678441343)

````text
**<sub><sub>![P2 Badge](https://img.shields.io/badge/P2-yellow?style=flat)</sub></sub>  Align the Node engine range with the test runner**

The package advertises Node `>=20.0.0`, but the new test command requires `--experimental-strip-types`, which Node 20 does not support; invoking it with Node 20.20.2 exits immediately with `node: bad option: --experimental-strip-types`. Because `pnpm check` includes this command, users in a declared-supported environment cannot run the project verification. Raise the engine floor to a Node release that supports the flag or use a TypeScript test runner compatible with Node 20.

Useful? React with 👍 / 👎.
````
