# Consumer AI prompt URL parameters, researched 2026-11-14

PrefillPrompt needs links whose advertised settings survive arrival at the destination. Keep the prompt links and the settings demonstrated in today's signed-in check. No current public evidence found in this pass establishes a ChatGPT Work-mode URL switch, a Claude effort query key, or a dependable native Gemini prompt URL. There are useful candidates for a small manual retest.

Research date: 2026-11-14. This extends [the original findings](provider-url-parameters-2026-11-14.md) and preserves [the signed-in manual results](../manual-link-check.md). No source code changed. No browser launched, account accessed, sign-in attempted, or challenge bypassed.

## How to read the evidence

- **Confirmed working** means Sam observed the destination UI in the 2026-11-14 manual check. The account, Firefox session, available models and rollout bound that observation. This research did not independently repeat it.
- **Reported working** means an identifiable external source describes the behavior or reverse-engineers its implementation. It is a lead unless current destination behavior was observed.
- **Reported broken** includes today's manual failures and dated external regressions. A failure is scoped to the tested URL and account.
- **Unknown** means no adequate evidence establishes current support. Missing documentation or an empty HTTP response cannot establish nonexistence.

The [source ledger](evidence/provider-url-parameters-2026-11-14/sources.md) records 169 distinct source links after removing query variants and excluding discovery/commit helper requests and destination probes. There were 197 distinct requested URL strings in total. The ledger includes publication or observation dates, access failures, irrelevant results and reliability. HTTP status 200 can mean an empty app shell or a human challenge. Requests used no cookies or credentials. Source pages, code examples, backend request fields, extension-injected behavior and destination UI observations remain separate evidence categories.

## ChatGPT

| Parameter or route | Status on 2026-11-14 | Evidence and newest relevant date | Recommendation |
| --- | --- | --- | --- |
| `q=<encoded prompt>` on `/` | Confirmed working | [Manual check](../manual-link-check.md), 2026-11-14. [Dated external tests](https://trevorfox.com/tools/seo/ai-prompt-link-generator/), updated 2026-11-13, describe automatic submission while logged out. | Keep. Do not promise that every client only prefills or never submits. |
| `prompt=<encoded prompt>` | Reported working | [Practitioner tests](https://trevorfox.com/tools/seo/ai-prompt-link-generator/), 2026-11-13, distinguish prefill from `q` submission. [Forum participants](https://community.openai.com/t/query-parameters-in-chatgpt/1027747) describe prefill and app mentions, 2026-01-13. | Worth testing when prefill without submission matters. No need to replace the locally working `q` without that test. |
| `hints=search` | Confirmed working | Manual check, 2026-11-14; external tests, 2026-11-13; [original practitioner report](https://community.openai.com/t/query-parameters-in-chatgpt/1027747), 2024-11-22. | Keep as a request to select Search. It does not prove a search actually ran. |
| `temporary-chat=true` | Confirmed working | Manual check, 2026-11-14. [Forum report](https://community.openai.com/t/query-parameters-in-chatgpt/1027747), 2024-12-19. | Keep with UI verification. The 2026-11-13 external test saw no visible logged-out effect, which does not contradict the signed-in result. |
| `model=instant`, `model=thinking`, `model=gpt-5` | Reported broken | Manual check, 2026-11-14, stayed on the account default in Chat. [Older model-switching userscript](https://github.com/MHSEA/openai-chatgpt-4o-auto-selector), last commit 2025-08-12, also says model query selection stopped working. | Stop promising that these select a model today. |
| Other `model` values, including current GPT-6 family names and `auto` | Unknown today | [2024 report](https://community.openai.com/t/gpt-ing-searching-without-the-plugin/1021771) lists historical slugs; [2025 URL-builder code](https://github.com/Andrej730/chatgpt-query) emits arbitrary values. Neither verifies present model selection. [Official Work help](https://help.openai.com/en/articles/20001275) describes current model availability, read 2026-11-14. | Do not infer URL support from API IDs, human model names or a tool accepting a `--model` argument. |
| Work-mode selector, such as a new query key or `/work` route | Unknown | Official Work help, read 2026-11-14, explains picker and plan controls but supplies no prompt-link query contract. Targeted public code and practitioner searches yielded no substantiated replacement. | No supported format to recommend. This is an evidence gap, not proof there is no internal switch. |
| `hints=reason` | Unknown today; weak historical report | [Zenn browser-shortcut post](https://zenn.dev/appseed246/articles/699dc5579b33f3) and [undated hints article](https://matthew.philogene.co.za/understanding-chatgpts-hints-parameter-a-ui-shortcut-not-a-search-window/), read 2026-11-14. No current model or effort verification. | Low-priority manual candidate. Do not label it Thinking or Work. |
| `reasoning_effort=…`, `thinking_effort=…`, `mode=work`, `work=true` | Unknown | No inspected source establishes these as consumer navigation parameters as of 2026-11-14. Request-body controls in clients are a different interface. | Do not ship guessed keys. |
| `oai-dm=1` | Unknown, excluded as evidence | [HN comment](https://news.ycombinator.com/item?id=49508562), September 2026, explicitly attributes its list to ChatGPT's own answer. | A generated list cannot establish support. |
| `#think=1`, `#extendedthink=1`, `#autoSubmit=1` | Reported working **with an extension only** | [Navigator README](https://github.com/chaofz/chatgpt-navigator) and [content script](https://raw.githubusercontent.com/chaofz/chatgpt-navigator/main/content/content.js), repo last commit 2026-06-28. | These belong to the extension. They do not establish native ChatGPT support. |

Official [Work and Codex help](https://help.openai.com/en/articles/20001275) separates the model availability of Chat and Work and describes selecting a model and reasoning level in the UI. **Inference:** this makes today's Chat-mode fallback plausible, but does not identify its cause. Entitlements, a retired slug or a changed frontend parser could also explain it. Do not turn that hypothesis into a claim that `model` works once any guessed Work key is added.

The MHSEA userscript's README is internally inconsistent: it says direct parameters no longer work but also skips its own automation when a particular parameter combination is present. Its blanket statement about Temporary Chat is superseded by today's local result. Treat it as historical corroboration of trouble with model URLs, not a current specification.

Recommended tested baseline:

```text
https://chatgpt.com/?q=<URL-encoded prompt>
https://chatgpt.com/?q=<URL-encoded prompt>&hints=search
https://chatgpt.com/?q=<URL-encoded prompt>&temporary-chat=true
```

Each optional setting passed separately today. Their combined behavior needs a separate check. Use `URLSearchParams`; encode the prompt as a value, including `&`, `#`, `+`, newlines and Unicode.

## Claude

| Parameter | Status on 2026-11-14 | Evidence and newest relevant date | Recommendation |
| --- | --- | --- | --- |
| `q=<encoded prompt>` on `/new` | Confirmed working | Manual check, 2026-11-14. [Historical regression issue](https://github.com/anthropics/claude-code/issues/8827), 2025-10-03, distinguishes earlier automatic answering from later behavior. | Keep. Expect Claude's untrusted-prefill warning. |
| `incognito=true` | Confirmed working | Manual check, 2026-11-14. [Official incognito help](https://support.claude.com/en/articles/12260368-use-incognito-chats), updated 2026-10-30, explains UI behavior, not a URL contract. | Keep with destination UI confirmation. |
| `model=claude-sonnet-5` | Confirmed working | Manual check, 2026-11-14. | This is the only current exact Claude web slug verified by the supplied manual check. |
| `model=claude-sonnet-4` | Reported broken | Manual check, 2026-11-14, silently kept the selected model. | Remove from any list advertised as verified consumer URL targets. |
| Other model slugs | Unknown today | [Official model/effort help](https://support.claude.com/en/articles/8664678-change-the-model-effort-and-thinking-settings), updated 2026-11-09, lists available model names. [Reverse-engineered `/new` reference](https://whtwnd.com/austegard.com/3mfcfa4kdpa2h), 2026-02-20, describes slug selection behind an account feature flag. | Model availability and URL acceptance need separate checks. A display name alone does not establish a slug. |
| `thinking=extended` without `model` | Reported broken | Manual check, 2026-11-14. The current builder emits this form for `latest-reasoning`. | Stop presenting this exact form as a verified thinking control. |
| `model=<compatible slug>&thinking=extended` | Reported working historically; unknown today | Reverse-engineered reference, 2026-02-20, says thinking is conditional on an explicit compatible model. No supplied manual result tests that combination. | Highest-priority Claude retest. The local failure does not establish that this combination fails. |
| `effort=…`, `effortLevel=…`, `reasoning_effort=…` | Unknown | Official model/effort help confirms separate effort and thinking UI controls, updated 2026-11-09. No inspected source establishes these query spellings. | Do not convert CLI configuration or Messages API fields into navigation keys. |

The older reverse-engineered reference also reports these `/new` keys. All remain unverified on today's consumer app. That source is one lineage, not independent confirmation for each row.

| Additional key | Status | Reported purpose | Newest behavioral evidence |
| --- | --- | --- | --- |
| `project=<UUID>` | Reported working | Scope the new chat to an accessible project. | 2026-02-20, [reference](https://whtwnd.com/austegard.com/3mfcfa4kdpa2h). |
| `attachment=<text>` | Reported working | Create a text attachment. | Same reference/date. |
| `skill-name=<name>` with a placeholder in `q` | Reported working | Substitute a skill name; may ask to enable it. | Same reference/date. |
| `mode=chat` | Reported working | Keep navigation in chat despite saved task/code preferences. | Same reference/date. |
| `error=<text>` | Reported working | Show an error notice. | Same reference/date. |
| `spotlight=memory` or `wiggle_egress` | Reported working | Open a gated overlay. | Same reference/date. |
| `modal=<name>` | Reported working | Internal modal navigation. | Same reference/date. |
| `debug_show_all_prompt_chips` | Unknown in production | Debug display control. | Same reference/date. |

The reference describes `incognito` as a routing flag rather than the UI's privacy toggle. That conflicts with today's local result. Preserve both observations; do not weaken the newer observed result to fit older reverse engineering. It also cautions that model support and feature flags govern application of settings.

Official help currently names Fable 5.2, Haiku 5.5, Sonnet 5.5, Opus 5.5, Fable 5.1, Opus 5, Sonnet 5, Fable 5, Opus 4.7, Opus 4.6 and Sonnet 4.6 in its effort section. These are **display names**, not verified `/new?model=` values. Candidates such as `claude-sonnet-5-5` or `claude-opus-5-5` are inferred spellings, not findings that those links work. The help article also explains administrator restrictions and separate thinking and effort controls. [Official settings help](https://support.claude.com/en/articles/8664678-change-the-model-effort-and-thinking-settings).

Recommended baseline, with optional settings tested separately:

```text
https://claude.ai/new?q=<URL-encoded prompt>
https://claude.ai/new?q=<URL-encoded prompt>&model=claude-sonnet-5
https://claude.ai/new?q=<URL-encoded prompt>&incognito=true
```

The combined model/incognito form and settings without a prompt remain untested in the supplied record.

## Gemini

| Parameter or route | Status on 2026-11-14 | Evidence and newest relevant date | Recommendation |
| --- | --- | --- | --- |
| `/app?q=…` | Reported broken natively | [Dated external tests](https://trevorfox.com/tools/seo/ai-prompt-link-generator/), 2026-11-13, report ignored prompts while logged out. [Launcher code](https://raw.githubusercontent.com/quochuydev/gemini-url-launcher/main/content.js), repo updated 2026-04-24, implements `q` by DOM insertion. | Do not promise native prefill. Extension behavior does not establish native support. |
| `/app?prompt=…` | Unknown natively; reported working with extension | [Gemini URL Prompt listing](https://chromewebstore.google.com/detail/gemini-url-prompt/kdbgjkfdooaiompgeckjbegnnccchmma), updated 2026-01-31, explicitly supplies this behavior. | Do not advertise an extension-specific key as a Google capability. |
| `/?prompt_text=…` | Reported broken | [Original deep-link author](https://note.com/tyaperujp01/n/n562f7aa10b54), updated 2026-06-04, added a June failure warning. External tests updated 2026-11-13 also found it ignored while logged out. | A concrete retest candidate, not a replacement for the handoff yet. |
| `prompt_action=prefill` | Reported working historically; unknown today | Original author's 2025-12-22 examples; [mir's follow-up](https://note.com/mir4545/n/nc040c760226f), updated 2026-01-17, records breakage on January 12 and prefill recovery on January 17. June warning is newer contrary evidence for the underlying feature. | If testing `prompt_text`, include this key and confirm it waits for Send. |
| `/canvas`, `/guided-learning`, `/deepresearch`, `/image-gen`, `/veo`, `/gem/<GemID>` with `prompt_text` | Reported working historically; unknown today | Original deep-link examples and January follow-up. The January author learned the method from the original author, so these are not two independent discoveries. Original author's June 2026 warning weakens the earlier claim. | Tool routing and prompt arrival need separate observations. These routes do not establish model selection. |
| `model=…` or a model-specific consumer deep link | Unknown | No inspected public source establishes one today. [Gemini web client code](https://raw.githubusercontent.com/HanaokaYuzu/Gemini-API/42f89a77308e4f809c399f4899f8c0d830e7b46d/src/gemini_webapi/constants.py), dated 2026-10-01, uses account-discovered identifiers and request headers. | Do not translate a web-client header or API model ID into a URL query value. |
| Chrome `@gemini` to `/prompt` | Reported working through Chrome integration; not a reusable plain link | [Official Chrome shortcut help](https://support.google.com/gemini/answer/14886647?hl=en), read 2026-11-14. [Dated developer observation](https://discuss.ai.google.dev/t/set-prompt-to-aistudio-via-url-query-parameter/77309), 2025-04-03, identifies `x-omnibox-gemini` as a request header. | An ordinary link cannot attach that header. No account/cookie reproduction attempted. |
| `gemini://…`, Android intents or iOS app links carrying arbitrary prompt/model | Unknown | No adequate current contract found. [Official mobile help](https://support.google.com/gemini/answer/14554984?hl=en) explains supported app entry points but supplies no prompt/model URL contract in inspected text. | Do not publish a guessed mobile scheme. AI Studio, Gemini CLI and Google Search AI Mode are different destinations. |

Plain HTTP returned a signed-out shell for `/app?q=hello`, `/?prompt_text=hello&prompt_action=prefill` and the Canvas variant, preserving the URLs. This does not show whether a signed-in frontend reads the parameters. The [local Gemini failure](../manual-link-check.md) concerns the copy-and-open handoff, not a controlled test of these native deep links.

Recommended destination remains `https://gemini.google.com/app` plus an explicit copy/paste handoff. Repairing the handoff needs its own investigation. The evidence does not establish a dependable native prompt URL to replace it.

## Perplexity

| Parameter | Status on 2026-11-14 | Evidence and newest relevant date | Recommendation |
| --- | --- | --- | --- |
| `q=<encoded query>` on `/search` | Confirmed working | Manual check, 2026-11-14; [live official OpenSearch descriptor](https://www.perplexity.ai/opensearch.xml), fetched 2026-11-14; [Raycast source](https://raw.githubusercontent.com/raycast/extensions/main/extensions/perplexity/src/ask-perplexity.tsx), read 2026-11-14. | Keep. Opening starts a search. |
| `s=o` | Confirmed working as part of the tested format | Manual check and official OpenSearch descriptor, 2026-11-14. | Keep the officially emitted format. Its individual semantic meaning and necessity were not isolated. |
| `copilot=true` | Reported broken, historically intermittent | [qutebrowser discussion](https://github.com/qutebrowser/qutebrowser/discussions/8435), 2025-10-02, reports another regression after a repair. External logged-out tests, 2026-11-13, found no visible effect. | Do not advertise Pro or research activation. Requires a fresh signed-in entitlement-aware test. |
| `focus=internet`, `scholar`, `youtube`, `reddit`, `wolfram`, `writing` | Reported working historically; unknown signed in today | [Practitioner's own shortcut setup](https://atomicego.com/ai-search/using-perplexity-for-search), published 2024-06-01. External logged-out tests, 2026-11-13, saw no visible focus effect. | Retest only if focus/source selection is still offered in the relevant account UI. Preserve `scholar` as the reported URL spelling, not an invented `academic` alias. |
| `model=<value>` | Unknown | No current inspected source proves model selection through a navigation query. [Current consumer-client source](https://github.com/anxkhn/perplexity-mcp) chooses models in authenticated requests; read 2026-11-14. | Consumer backend IDs and Sonar API model names do not establish URL support. |
| `incognito=true` or `is_incognito=true` | Unknown as URL controls | [Pinned client source](https://raw.githubusercontent.com/anxkhn/perplexity-mcp/a69f8efede324ad8065242be7bf9dbdab4416209/perplexity/client.py), 2026-11-14 revision, puts `is_incognito` in the request payload. | A payload flag is not a verified query parameter. |
| `pro=true`, `mode=copilot`, `mode=research` or a deep-research query key | Unknown | No inspected source establishes these as native navigation keys as of 2026-11-14. MCP tool arguments are a different interface. | Do not infer a replacement for `copilot=true`. |

The official OpenSearch XML supplies this exact structure:

```text
https://www.perplexity.ai/search?s=o&q=<URL-encoded prompt>
```

Raycast also builds `perplexity-app://search?q=…` for the installed app. That is reported implementation evidence for a desktop handoff, not a verification of app model, Pro or incognito controls. The source was read, not executed. [Raycast code](https://raw.githubusercontent.com/raycast/extensions/main/extensions/perplexity/src/ask-perplexity.tsx).

## Maintaining consumer model identifiers

No checked public source provides a maintained, verified, cross-provider list of **consumer navigation slugs**. The strongest reusable sources have narrower scopes:

| Source | Useful evidence | Limitation for PrefillPrompt |
| --- | --- | --- |
| [Official ChatGPT Work help](https://help.openai.com/en/articles/20001275), [Claude settings help](https://support.claude.com/en/articles/8664678-change-the-model-effort-and-thinking-settings), [Claude release notes](https://support.claude.com/en/articles/12138966-release-notes) | First-party consumer availability and changes. Claude release notes updated 2026-11-12. | Human names, plans and UI support do not establish query slugs. |
| [HanaokaYuzu Gemini web client](https://github.com/HanaokaYuzu/Gemini-API), [pinned identifier code](https://raw.githubusercontent.com/HanaokaYuzu/Gemini-API/42f89a77308e4f809c399f4899f8c0d830e7b46d/src/gemini_webapi/constants.py) | Maintained consumer-app reverse engineering. The 2026-10-01 revision explicitly deprecates hardcoded model enumeration in favor of account discovery. | Requires account-specific runtime discovery for authoritative availability. Header identifiers are not URL values. No client installed or authenticated here. |
| [anxkhn Perplexity client](https://github.com/anxkhn/perplexity-mcp), [pinned catalog logic](https://raw.githubusercontent.com/anxkhn/perplexity-mcp/a69f8efede324ad8065242be7bf9dbdab4416209/perplexity/models.py) | Consumer model discovery, fallback and cache logic. Public revision checked on 2026-11-14. | Unofficial, account-tier dependent, and unrelated to proving navigation query support. |
| [OpenAI subscription devkit model loader](https://github.com/openai/sign-in-with-chatgpt-devkit/blob/main/packages/local/src/models.ts), [Codex model loader](https://github.com/openai/codex/blob/main/codex-rs/model-provider/src/models_endpoint.rs) | First-party code describing model discovery for subscription integrations. | Different product interface and authenticated catalog. Do not treat it as a static public ChatGPT URL registry. |
| [Models.dev](https://models.dev/) and [source](https://github.com/anomalyco/models.dev) | Public, maintained model metadata and provider mappings. | API/SDK metadata, pricing and capabilities. It does not solve the consumer URL verification gap. |
| [spullara/models](https://github.com/spullara/models), [Codex-slug list](https://github.com/BillZong/codex-models-slug), Raycast model catalogs | Additional discovery leads. | Catalogs, saved local models or Codex availability cannot verify `/new?model=` or `/?model=`. |

**Recommendation, an implementation judgment:** maintain a small allowlist of tested consumer URL slugs. Store provider, exact slug, consumer display name, plan/rollout conditions, last manual verification date, source URL and observed fallback. Use official consumer release notes to queue retests. Use public reverse-engineered clients to discover candidates. Keep broad API catalogs as search metadata if useful, but do not label their entries as working consumer destinations. The only current exact URL slug established by the supplied check is Claude's `claude-sonnet-5`.

## Smallest useful manual retest

Use a harmless distinctive prompt. Start with the account on a different setting so a fallback is visible. Observe prompt arrival, selected mode, exact model and effort separately. Check each option alone before combining it. No account work was performed in this research.

1. ChatGPT `https://chatgpt.com/?prompt=pp-url-check` versus `?q=pp-url-check`, signed in and signed out. Record whether either submits automatically.
2. ChatGPT `?q=pp-url-check&hints=reason`. Record Chat/Work, picker and effort. This is weakly sourced and lower priority than inspecting a legitimate Work entry link copied from the UI.
3. Claude `https://claude.ai/new?q=pp-url-check&model=claude-sonnet-5&thinking=extended`, compared with the same URL without thinking. Then try a current explicitly supported model with the appropriate thinking UI available. This isolates the explicit-model condition missing from the earlier test.
4. Claude `?q=pp-url-check&mode=chat`, then `attachment=pp-attachment-check` separately. These are concrete historical candidates. Test `project` only with a project UUID the operator already owns.
5. Gemini `https://gemini.google.com/?prompt_text=pp-url-check&prompt_action=prefill`, then `/app` and `/canvas` with the same query. Record tool selection separately from prefill. January success is superseded by later failure reports until retested.
6. Perplexity `?s=o&q=pp-url-check&copilot=true` and `?s=o&q=pp-url-check&focus=scholar`, each against the baseline. Inspect the selected mode/source and any Pro usage indicator. Passing the query through a redirect is insufficient.

There is no adequately sourced new Work selector, Claude effort key, Gemini model key or Perplexity model/incognito URL switch to recommend testing as if it were established. Invented keys would be exploratory guesses and should be labeled that way.

## Research receipt

- Run ID: `pp-url-20261114-84c93a7f`.
- Question category: current consumer-app capabilities and regressions.
- Skill: `/Users/athena/Code/notes-search/.agents/skills/sams-research/SKILL.md`; hash recorded in the evidence ledger.
- Method: local source inspection, public search, source-body reads and ordinary signed-out HTTP GETs. No browser or credentials.
- Access gaps: Perplexity help/changelog endpoints often returned 403; Reddit often returned empty shells or challenge pages; some guessed repository paths returned 404. Search snippets did not upgrade those sources to verified evidence.
- Unresolved: current Work URL routing; Claude explicit-model/thinking combination and effort navigation; Gemini native prefill after June regression; signed-in Perplexity focus/Pro controls; a public cross-provider consumer URL-slug registry.
- Saved locally under `docs/research/`. No commit, push, deployment or live UI verification.
