# Where to Track New Prompt Attacks

Research memo, 2026-11-12. Sam asked whether there is "an ongoing list of prompt injections and prompting techniques for the bleeding edge that we can stay up to date with", so the warnings on the `/open` preview page stay current. This memo names the maintained sources, says how to follow each one by machine, and recommends six.

It extends [`prompt-danger-signals-2026-11-12.md`](prompt-danger-signals-2026-11-12.md), which measured the current signals, and sits beside [`browser-ml-prompt-danger-detection-2026-11-12.md`](browser-ml-prompt-danger-detection-2026-11-12.md), which covers a classifier model. Neither is repeated here.

## Scope

- In scope: sources that publish new prompt-injection, jailbreak and agent-abuse techniques, with the date of the latest update I observed on 2026-11-12 and a feed, repository path, dataset ID or API for each.
- Weighted most: attacks that arrive through a prefilled link (`?q=` links, share links, deep links into desktop apps and coding agents) and hidden text.
- Out of scope: building the watcher, writing new signals, and measuring them.
- "Observed" below means I opened the feed, API or page myself today. Anything else is marked unverified.

## Short Answer

No single maintained list exists. The work is split across three kinds of source that update at different speeds:

1. **Practitioner feeds** report an attack within days of its disclosure. They are the earliest public signal.
2. **Tool repositories** (garak, promptfoo, PyRIT) turn techniques into named test code within weeks to months.
3. **Registries** (MITRE ATLAS, the Arcanum taxonomy, OWASP) name and number a technique months later, with citations.

The closest thing to "the list" for PrefillPrompt is MITRE ATLAS. It now ships about monthly, its data is one YAML file on GitHub, and since 2026-09-15 it has a technique for exactly this product's surface: **AML.T0131, Crafted AI Assistant Links**.

The public attack datasets the project already measures against are frozen. Re-running `scripts/safety/fetch.mjs` will not surface new techniques. New techniques come from feeds; datasets are only for measuring a signal once someone has written it.

## What the Workspace Already Has

- `src/lib/prompt-safety.ts` holds 18 plain-pattern signals in three tiers. Two are attack tier, nine caution, seven unreliable.
- `scripts/safety/fetch.mjs` pins each dataset to its latest commit or Hugging Face revision and writes hashes to `src/data/safety/sources.json`. It has no step that watches for new techniques.
- The prior memo's open checks: precision on real shared links, and a second attack corpus for the two attack-tier signals. This memo does not close either.
- The app links the project now generates are `claude-cli://open?q=` and `codex://new?prompt=`. Those two destinations can run commands, so their advisories matter here.

## What the Evidence Says

### 1. The link-borne attack class now has a name, an ID and four dated cases

| Date | Case | Source | What it adds |
| --- | --- | --- | --- |
| 2025-07-15 | ChatGPT `?q=` auto-submit | [Tenable TRA-2025-22](https://www.tenable.com/security/research/tra-2025-22) (read) | The parameter filled and sent the prompt with no confirmation. OpenAI added auto-submit protections; Tenable does not say it re-tested the final fix. |
| 2025-10-04 | CometJacking, Perplexity Comet | [LayerX, now on akamai.com](https://www.akamai.com/blog/security/cometjacking-how-one-click-can-turn-perplexitys-comet-ai-browser-against-you) (read) | A query-string prompt read from memory and sent data out base64-encoded. Perplexity marked the report "Not Applicable". |
| 2026-02-10 | AI Recommendation Poisoning | [Microsoft Defender](https://www.microsoft.com/en-us/security/blog/2026/02/10/ai-recommendation-poisoning/) (read) | Already in the sibling memo. New here: Microsoft's hunting queries match the decoded `q` or `prompt` value against `remember`, `memory`, `trusted`, `authoritative`, `future`, `citation`, `cite`. |
| 2026-07-15 | PromptFiction, Claude Desktop | [Oasis Security](https://www.oasis.security/blog/claude-desktop-vulnerability) (read; updated 2026-07-28) | A `claude://` link made the app act with no send step. The harmful part was "folded out of view" below a harmless request. Fixed in 1.1.2321. The exact link format comes from secondary write-ups only. |
| 2026-08-18 | CoSnitch, Copilot Personal, CVE-2026-24301 | [Varonis](https://www.varonis.com/blog/cosnitch) (read; page shows no publication date) | `?q=` alone only prefilled. A second, undocumented parameter made it run on load. Data left base64-encoded through the assistant's own URL fetch. Reported December 2025, fixed 2026-08-18. |

MITRE ATLAS added **AML.T0131 Crafted AI Assistant Links** on 2026-09-15, with case study AML.CS0072 and two software entries for link-generator tools. Its text describes links "disguised as helpful actions, such as a 'Summarize with AI' button or a share link". I read this in `dist/v6/ATLAS-2026.10.yaml`.

Two things follow for PrefillPrompt. Both are inference.

- The observed harmful prefilled prompts are polite memory and fetch requests, not jailbreaks. The current `memory-write` signal is tier unreliable at 11.5% precision. A narrower pairing, a memory verb with a source-trust phrase, is the first candidate this tracking pass produces. It is unmeasured.
- ATLAS names tools in PrefillPrompt's own category as attack software. Tracking this technique is partly reputation defense.

### 2. Registries and taxonomies

| Source | Maintainer | Last update observed | Follow by | License | Good for | Weak for |
| --- | --- | --- | --- | --- | --- | --- |
| [MITRE ATLAS data](https://github.com/mitre-atlas/atlas-data) | MITRE | v2026.10, 2026-10-28. Eleven tagged releases in 2026. 129 techniques, 77 case studies. | [`releases.atom`](https://github.com/mitre-atlas/atlas-data/releases.atom); diff `dist/v6/ATLAS-<version>.yaml` on `created-date` | Apache-2.0 (LICENSE file) | **Establishes** a named technique with cited cases. 79 technique entries carry a 2026 created date. | Lags. No prompt strings. |
| [Arcanum PI Taxonomy](https://github.com/Arcanum-Sec/arc_pi_taxonomy) | Jason Haddix, Arcanum | v1.6.1, 2026-06-29. 172 nodes: 27 intents, 70 techniques, 63 evasions, 12 inputs. | [`CHANGELOG.md.atom`](https://github.com/Arcanum-Sec/arc_pi_taxonomy/commits/main/CHANGELOG.md.atom); `docs/data/taxonomy.json` | CC BY 4.0 | Checklist of evasions (Invisible Text, Bidirectional Text Override, Homoglyphs, Link Smuggling, URL Encoding and more). Stable codes. | One maintainer. Irregular releases. No incident dates. |
| [OWASP GenAI Security Project](https://genai.owasp.org/) | OWASP volunteers | Q3 2026 Exploit Roundup, 2026-10-08. Roundups also 2026-04-14 and 2026-07-08. Top 10 for LLM Applications 2026 dated 2026-08-03. | [`/feed/`](https://genai.owasp.org/feed/) | CC BY-SA 4.0 site-wide | Quarterly roundup is a **lead** list of real incidents mapped to the Top 10. | The roundup says it is not exhaustive and not an official publication. The Top 10 is a PDF download; I did not read its entries. |
| [NIST AI 100-2 E2025](https://csrc.nist.gov/pubs/ai/100/2/e2025/final) | NIST | Final, 2025-03-24. No successor named on the page. | None | Public domain | Vocabulary. | Static. Not a tracker. |
| [AI Incident Database](https://incidentdatabase.ai/) | Responsible AI Collaborative | Feed items dated 2026-11-08 | [`/rss.xml`](https://incidentdatabase.ai/rss.xml) | Not checked | Societal AI harms. | The six newest items were lawsuits and misidentification stories. Poor fit. |
| [AVID](https://avidml.org/) | AI Risk and Vulnerability Alliance | Repository 2026-03-26; blog 2026-03-18 | [`/index.xml`](https://avidml.org/index.xml), [`avidml/avid-db`](https://github.com/avidml/avid-db) | MIT | Model and library vulnerabilities. | Quiet for eight months. |
| CVE and GHSA | NVD, GitHub | NVD keyword "prompt injection": 42 CVEs published 2026-09-01 to 2026-11-12 | `services.nvd.nist.gov/rest/json/cves/2.0?keywordSearch=prompt%20injection`; GitHub `/advisories?affects=<package>` | Public | Bugs in the agents the app links open: 30 advisories for `@anthropic-ai/claude-code`, 17 of them in 2026, newest 2026-11-09; 2 for `@openai/codex`. | Mostly sandbox, path and command-parsing bugs in tools, not prompt wording. Filtering by CWE-1427 returned zero in both NVD and GHSA today, so keyword search is the only workable query. |

### 3. Tool repositories and datasets

| Source | Maintainer | Last update observed | Follow by | License | Good for | Weak for |
| --- | --- | --- | --- | --- | --- | --- |
| [garak](https://github.com/NVIDIA/garak) | NVIDIA | Probe commit 2026-11-06; v0.17.1, 2026-10-16 | [`garak/probes.atom`](https://github.com/NVIDIA/garak/commits/main/garak/probes.atom), [`releases.atom`](https://github.com/NVIDIA/garak/releases.atom) | Apache-2.0 | One file per technique family. New modules in the last year include `badchars` (2025-11), `sysprompt_extraction` (2026-03), `agent_breaker` (2026-04), `adaptive_attacks` (2026-06). Can generate test strings for recall. | Noisy commit stream. Aimed at model testing, not link screening. |
| [promptfoo](https://github.com/promptfoo/promptfoo) | Promptfoo | `src/redteam/strategies` 2026-10-09; release 0.125.1, 2026-10-25 | [`strategies.atom`](https://github.com/promptfoo/promptfoo/commits/main/src/redteam/strategies.atom) | MIT | Short file list that doubles as an obfuscation checklist (`homoglyph`, `arabicPresentationForms`, `authoritativeMarkupInjection`, `otherEncodings`, plugin `asciiSmuggling`). | Some attack generation is remote, so the repository shows names more than strings. |
| [promptfoo LM Security DB](https://www.promptfoo.dev/lm-security-db/) | Promptfoo | 985 findings; newest entry 2026-09-04 | No feed found | Not stated | Reviewed index of arXiv attack papers. | Two months behind today. Academic. |
| [PyRIT](https://github.com/microsoft/PyRIT) | Microsoft AI Red Team | `pyrit/datasets` 2026-11-12; v1.1.0, 2026-09-04 | [`jailbreak.atom`](https://github.com/microsoft/PyRIT/commits/main/pyrit/datasets/jailbreak.atom) | MIT | Jailbreak templates and converters. | Overlaps garak. `Azure/PyRIT` is archived; use `microsoft/PyRIT`. |
| [L1B3RT4S](https://github.com/elder-plinius/L1B3RT4S) | "Pliny" | 2026-10-28; before that 2026-02-17 | Commits Atom | AGPL-3.0 | Shows current jailbreak formatting per vendor. | Working payloads under a copyleft license: do not copy. Jailbreak wording is already tier unreliable here. |
| [0DIN](https://0din.ai/disclosures) | Mozilla | Newest public disclosure 2026-08-18 | No public feed. API and export are paid. | "For licensed users only" | Named jailbreak tactics. | 92 public, 796 hidden. All public entries are "Guardrail Jailbreak", which targets content policy, not the person opening a link. |
| Hugging Face datasets | Various | See below | `huggingface.co/api/datasets?search=prompt-injection&sort=lastModified` | Varies | Measuring a signal. | Not a technique feed. |

Hugging Face detail, from the API today:

- Everything in `sources.json` from Hugging Face is frozen: `microsoft/llmail-inject-challenge` (2025-05-16), `Lakera/gandalf_ignore_instructions` (2025-02-28), `deepset/prompt-injections` (2024-07-30). HackAPrompt's sets are gated and date from 2024-01 and 2025-07.
- Sorting the search by last modified returns mirrors and anonymous re-uploads first. It is a noisy lead list, not a feed to trust.
- Recent sets from identifiable publishers that may help measurement: `Horizon-Labs/prompt-injection-eval-suite` (2026-11-04, license "other", includes an over-defense split), `nvidia/Nemotron-RL-Agentic-Indirect-Prompt-Injection-v1` (2026-06-04, CC BY 4.0), `leolee99/NotInject` (2025-04-04, MIT, benign text that looks suspicious), `3nesdeniz/agentic-prompt-injection-boundary-pairs` (2026-07-15, CC BY 4.0, single uploader, quality unverified).

### 4. Practitioner feeds

| Source | Last post observed | Feed | Role |
| --- | --- | --- | --- |
| [Embrace The Red](https://embracethered.com/blog/) (Johann Rehberger) | 2026-10-13. Sixteen posts in 2026. | [`index.xml`](https://embracethered.com/blog/index.xml) | **Primary.** First-hand exploit write-ups with CVEs and fix status. A 2026-02-11 post covers hidden Unicode in agent skills (title seen, body not read). |
| [Simon Willison, prompt-injection tag](https://simonwillison.net/tags/prompt-injection/) | 2026-09-17. Twenty-four posts in 2026. | [`prompt-injection.atom`](https://simonwillison.net/tags/prompt-injection.atom), [`exfiltration-attacks.atom`](https://simonwillison.net/tags/exfiltration-attacks.atom) | **Lead with judgment.** Mostly links to other people's primaries with a short assessment. Follow the link before citing. |
| [Tenable research advisories](https://www.tenable.com/security/research) | Feed live, 10 items | [`/security/research/feed`](https://www.tenable.com/security/research/feed) | Primary for its own findings. Mostly not AI. |
| [Zenity Labs](https://labs.zenity.io/) | 2026-11-09 | None found | Primary. Enterprise agents and memory. Check by hand. |
| [Varonis Threat Labs](https://www.varonis.com/blog), [Oasis Security](https://www.oasis.security/blog) | CoSnitch and PromptFiction above | None found | Primary for the link-borne cases. No feed, so rely on ATLAS and the two feeds above to surface them. |
| [Google Bug Hunters blog](https://bughunters.google.com/blog) | 2026-11-11 | [`/feed/en`](https://bughunters.google.com/feed/en) | Vendor. Rarely about prompts. |
| arXiv | 2026-11-09; 1,149 results all-time | `export.arxiv.org/api/query?search_query=all:"prompt injection"&sortBy=submittedDate` | Lead. High volume; few papers yield a regex-visible trait. |

Checked and dropped:

- **Dead or archived:** `Azure/PyRIT`, `lakeraai/pint-benchmark`, `protectai/llm-guard` and `microsoft/BIPIA` are archived. `tldrsec/prompt-injection-defenses` last changed 2025-02-22, HarmBench 2024-08-05, JailbreakBench 2025-03-31, InjecAgent 2024-07, `verazuo/jailbreak_llms` 2024-12. The Invariant Labs blog stops at its 2025-06-24 Snyk acquisition post. PromptArmor's Substack feed stops at 2025-10-16.
- **Unverified, not recommended on today's evidence:** HiddenLayer and Noma (static fetch showed post titles without dates, no feed), PromptArmor's own site (posts did not render in a static fetch), Lakera's blog, Snyk Labs, and the Microsoft Security Blog feed (HTTP 403 to my client). Any of these may have a feed that only a browser sees.
- **Trail of Bits:** feed is live (2026-11-06) but none of its eight newest posts concerned prompt attacks.
- **OpenAI and Anthropic:** I found no advisory feed for either beyond the GitHub advisories on their agent repositories.

## What Works

- Follow people for speed and a registry for confirmation. The CoSnitch case shows the delay: reported December 2025, public August 2026, in OWASP's roundup October 2026. Crafted assistant links were public from Tenable in July 2025 and reached ATLAS in September 2026.
- Use GitHub's per-path Atom feeds. Every `commits/<branch>/<path>.atom` and `releases.atom` URL in the tables returned entries today, with no token.
- Treat each new technique as a question, not a pattern: can it arrive as text in a link, and does it leave a trait a plain pattern can see? Most cannot or do not.

## What to Avoid

- Do not add strings from a jailbreak repository as signals. The prior memo measured famous phrases at 35.5% and 58.0% precision.
- Do not treat CVE feeds as prompt intelligence. Of the 42 recent CVEs, most are command, path and request-forgery bugs in MCP servers and agents.
- Do not use Hugging Face "recently modified" as evidence of a new technique. It mostly shows re-uploads.
- Do not pay for a threat feed yet. 0DIN's public entries are all content-policy jailbreaks, which is not the harm PrefillPrompt warns about.
- Do not redistribute text from sources without a clear license (0DIN, L1B3RT4S under AGPL, sets marked "other").

## Recommendation

Follow these six. All have a working feed and an update inside the last five months.

| # | Source | Follow URL | Role |
| --- | --- | --- | --- |
| 1 | MITRE ATLAS | `https://github.com/mitre-atlas/atlas-data/releases.atom` | The record. Start from AML.T0131 and anything that cites it. |
| 2 | Embrace The Red | `https://embracethered.com/blog/index.xml` | Earliest first-hand reports. |
| 3 | Simon Willison | `https://simonwillison.net/tags/prompt-injection.atom` | Filter on everyone else, including vendors with no feed. |
| 4 | garak probes | `https://github.com/NVIDIA/garak/commits/main/garak/probes.atom` | Techniques as code; source of test strings. |
| 5 | Arcanum taxonomy | `https://github.com/Arcanum-Sec/arc_pi_taxonomy/commits/main/CHANGELOG.md.atom` | Evasion checklist for the hidden-text signal. |
| 6 | OWASP GenAI | `https://genai.owasp.org/feed/` | Quarterly incident roundup. |

While the app links exist, add one API call each for `@anthropic-ai/claude-code` and `@openai/codex` advisories.

The cheapest routine, as a judgment and not a measured optimum:

1. **Monthly, about 30 minutes.** Read new entries from the six feeds. A reader folder is enough. A small script beside `fetch.mjs` that prints entries newer than a stored date, plus ATLAS techniques whose `created-date` is new, would make it a single command.
2. **Triage each item with two questions.** Can it ride in a `?q=` link or app link? Does it have a trait a pattern can see? Drop it if either answer is no.
3. **Write the candidate, then measure benign first.** Run it through `scripts/safety/measure.mjs`. A candidate over 10 benign matches per 10,000 stops there.
4. **Tier by the existing rule.** Without 50 attack matches it can only be caution tier, whatever the feed said about it.
5. **Record the source** that prompted the signal next to it, with the date.

Three candidates from this pass, all inference and all unmeasured: a memory verb paired with a source-trust phrase; an instruction to fetch a URL built from encoded private data; and a prompt whose visible opening is followed by a long folded or blank stretch. The third is a display question as much as a signal: `/open` should show how long the whole prompt is.

### Limits

- A public list lags real attacks by months, and patched cases are the ones that get published.
- These sources supply attack descriptions. They supply no benign shared-link prompts, and the 99% bar depends on those. The benign corpora still hold few coding-agent prompts.
- New techniques usually arrive with a handful of examples. That is too few to reach the attack tier, so most additions will be caution tier.
- Anyone can test a link against open-source patterns until it passes. Tracking raises the cost of lazy reuse; it does not stop a determined sender.
- This would change the recommendation: a free, licensed feed of real malicious assistant links, or a vendor publishing its link-handling rules.

## Claim Check

| Claim | Observation | Limit |
| --- | --- | --- |
| No single maintained list exists | Every candidate in the brief was checked; each covers one slice | Absence claim. Limited to the sources listed and to static fetching. |
| ATLAS is roughly monthly and covers crafted links | Eleven release tags in 2026 (v5.2.0 to v5.6.0, then v2026.05 to v2026.10); AML.T0131 text read in the YAML | This year's pace, not a promise. |
| Attack datasets in use are frozen | Hugging Face `lastModified` and GitHub commit dates | A frozen date does not mean the data is wrong. |
| CWE-1427 is not a usable filter | Zero results from NVD `cweId` and GitHub `cwes` today | May change as taggers adopt it. |
| Vendors X have no feed | No `rel=alternate` link and common feed paths returned 404 | Static fetch cannot rule out a feed added by script. |

## Source Links

Registries
- [MITRE ATLAS data repository](https://github.com/mitre-atlas/atlas-data), [v2026.10 release](https://github.com/mitre-atlas/atlas-data/releases/tag/v2026.10) (2026-10-28), [AML.T0131](https://atlas.mitre.org/techniques/AML.T0131) (created 2026-09-15; read in the YAML, web page not opened)
- [Arcanum Prompt Injection Taxonomy](https://github.com/Arcanum-Sec/arc_pi_taxonomy), [hosted site](https://arcanum-sec.github.io/arc_pi_taxonomy/) (v1.6.1, 2026-06-29)
- [OWASP GenAI Exploit Roundup Q3 2026](https://genai.owasp.org/2026/10/08/genai-and-agentic-ai-exploit-roundup-q3-2026/) (2026-10-08), [Top 10 for LLM Applications 2026](https://genai.owasp.org/resource/owasp-genai-llm-top-10-2026/) (2026-08-03)
- [NIST AI 100-2 E2025](https://csrc.nist.gov/pubs/ai/100/2/e2025/final) (2025-03-24)
- [AI Incident Database](https://incidentdatabase.ai/), [AVID](https://avidml.org/)
- [NVD CVE API](https://nvd.nist.gov/developers/vulnerabilities), [GitHub global advisories API](https://docs.github.com/en/rest/security-advisories/global-advisories)

Tools and datasets
- [NVIDIA garak](https://github.com/NVIDIA/garak), [promptfoo](https://github.com/promptfoo/promptfoo), [promptfoo LM Security DB](https://www.promptfoo.dev/lm-security-db/), [Microsoft PyRIT](https://github.com/microsoft/PyRIT)
- [L1B3RT4S](https://github.com/elder-plinius/L1B3RT4S), [0DIN disclosures](https://0din.ai/disclosures), [0DIN threat feed description](https://0din.ai/docs/threat-feed/introduction)
- [Horizon-Labs/prompt-injection-eval-suite](https://huggingface.co/datasets/Horizon-Labs/prompt-injection-eval-suite), [nvidia/Nemotron-RL-Agentic-Indirect-Prompt-Injection-v1](https://huggingface.co/datasets/nvidia/Nemotron-RL-Agentic-Indirect-Prompt-Injection-v1), [leolee99/NotInject](https://huggingface.co/datasets/leolee99/NotInject)

Practitioners and link-borne cases
- [Embrace The Red](https://embracethered.com/blog/), [Simon Willison's prompt-injection tag](https://simonwillison.net/tags/prompt-injection/)
- [Tenable TRA-2025-22](https://www.tenable.com/security/research/tra-2025-22) (2025-07-15)
- [LayerX, CometJacking](https://www.akamai.com/blog/security/cometjacking-how-one-click-can-turn-perplexitys-comet-ai-browser-against-you) (2025-10-04)
- [Microsoft, AI Recommendation Poisoning](https://www.microsoft.com/en-us/security/blog/2026/02/10/ai-recommendation-poisoning/) (2026-02-10)
- [Oasis Security, PromptFiction](https://www.oasis.security/blog/claude-desktop-vulnerability) (2026-07-15), [technical report](https://www.oasis.security/resources/reports/claude-url-scheme-prompt-injection) (not read)
- [Varonis, CoSnitch](https://www.varonis.com/blog/cosnitch) (fix dated 2026-08-18)
- [Zenity Labs](https://labs.zenity.io/)

## Research Receipt

- Run ID: `pats-20261112-a`
- Skill: `sams-research`, SKILL.md SHA-256 prefix `4249735c7353`
- Category: security and product decision; source survey
- Research date: 2026-11-12
- Method: GitHub API for commit, release and archive state; Hugging Face API for dataset revisions; direct feed downloads; page fetches summarized by a small model, so quoted wording from pages is second-hand unless it came from a file I downloaded (ATLAS YAML, Arcanum JSON and changelog, feeds).
- Source-access gaps: Microsoft Security Blog feed returned 403. HiddenLayer, Noma and PromptArmor's site gave no post dates to a static fetch. The OWASP 2026 Top 10 entries and the Oasis technical report were not read. Two web searches, one on deep links into desktop apps and coding agents and one on recent invisible-Unicode techniques, were refused by the model's safety filter and were not retried, so those two areas rest on the sources above and on file and post names, not on a fresh search.
- Unresolved checks: whether any report covers `claude-cli://` or `codex://` links specifically; what garak `badchars` and the promptfoo strategies cover that the `hidden-text` detector does not (names seen, contents not read); the three candidate signals are unmeasured; Simon Willison's `markdown-exfiltration` tag returned no Atom feed at the guessed URL.
