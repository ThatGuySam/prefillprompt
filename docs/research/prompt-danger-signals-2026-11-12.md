# Which Traits Mark a Dangerous Prefilled Prompt

Research memo, 2026-11-12. Sam asked for keywords or traits that mean "prompt injection or something dangerous" about 99% of the time, so the preview screen can warn before a shared prompt is opened, plus a set of 100 common dangerous prompts with short explanations.

## Scope

- Prompts that arrive through a PrefillPrompt link and are opened in a chat or, since the app links were added, in a coding agent that can run commands.
- Evidence: counts over public labeled datasets, fetched and hashed by `scripts/safety/fetch.mjs`, and three published descriptions of the attack mechanisms.
- Out of scope: a classifier model, non-English coverage, and whether a destination's own defenses stop an attack.

## Short Answer

The famous phrases do not work. On 6,581 malicious and 17,111 benign prompts, "ignore all previous instructions" was malicious in 35.5% of its matches, because thousands of ordinary shared templates open with that line. Jailbreak-persona wording reached 58.0%.

Two traits pass a 99% bar with more than 2,600 matches each: telling an agent to **send email to a named address** (99.7%) and **fake chat-control markers** such as `<|assistant|>` (99.6%). Nine more describe a risky action that almost never appears in ordinary prompts but has too few matches to claim 99%. Those are shown as a softer caution.

## What the Evidence Says

`node --experimental-strip-types scripts/safety/measure.mjs` wrote these counts to `src/data/safety/signal-measurements.json`. Precision is malicious matches divided by all matches. "Benign per 10,000" is how often a signal fires on ordinary prompts, and it does not depend on how many attack prompts the corpora happen to hold.

| Signal | Tier | Malicious matches | Benign matches | Precision | Benign per 10,000 |
| --- | --- | ---: | ---: | ---: | ---: |
| `send-to-address` | attack | 2,686 | 8 | 99.7% | 4.7 |
| `fake-chat-tokens` | attack | 2,691 | 12 | 99.6% | 7 |
| `hidden-text` | caution | 2 | 1 | 66.7% | 0.6 |
| `image-exfiltration` | caution | 3 | 3 | 50.0% | 1.8 |
| `credential-access` | caution | 60 | 2 | 96.8% | 1.2 |
| `file-upload` | caution | 30 | 0 | 100.0% | 0 |
| `reverse-shell` | caution | 0 | 0 | no matches | 0 |
| `remote-code` | caution | 0 | 4 | 0.0% | 2.3 |
| `destructive-command` | caution | 22 | 5 | 81.5% | 2.9 |
| `approval-bypass` | caution | 0 | 1 | 0.0% | 0.6 |
| `encoded-payload` | caution | 2 | 1 | 66.7% | 0.6 |
| `data-exfiltration` | unreliable | 4 | 0 | 100.0% | 0 |
| `ignore-instructions` | unreliable | 481 | 872 | 35.5% | 509.6 |
| `jailbreak-persona` | unreliable | 218 | 158 | 58.0% | 92.3 |
| `system-prompt-leak` | unreliable | 19 | 12 | 61.3% | 7 |
| `system-role-line` | unreliable | 28 | 72 | 28.0% | 42.1 |
| `secrecy` | unreliable | 16 | 33 | 32.6% | 19.3 |
| `memory-write` | unreliable | 3 | 23 | 11.5% | 13.4 |

Tiers are set by rule and enforced by `test/prompt-safety.test.ts`:

- **attack**: precision of at least 99% over 50 or more matches.
- **caution**: at most 10 benign matches per 10,000, with a documented attack mechanism, but not enough matches to claim 99%.
- **unreliable**: everything else. Measured and kept in the code for the example set, never shown as a warning.

### Why the caution signals are still worth showing

- **Hidden text.** Unicode tag characters are invisible in most interfaces and still read by models. Johann Rehberger called this "ASCII smuggling" on 2024-01-14: "because it is often not rendered in the UI, the special text remains unnoticable to users." The detector ignores the tag sequences inside flag emoji and single zero-width characters, which ordinary text uses.
- **Image links that carry data.** Simon Willison describes the attack as one where "an attacker tricks the bot into rendering a Markdown image that leaks data encoded in the URL to an external server", with dated cases in GitLab Duo (2025-05-23) and Superhuman AI (2026-01-12).
- **Agent actions.** OWASP's LLM01:2025 lists unauthorized use of the functions a model can call and command execution in connected systems as outcomes of prompt injection. The shell signals (reading key files, uploading a local file, remote control, downloading and running code, deleting system paths, switching off confirmations) name those actions directly.

### Limits

- Nearly all support for the two attack-tier signals comes from one corpus, Microsoft's LLMail-Inject, whose attackers were trying to make an email agent send mail. Their precision would be lower on a corpus with more ordinary requests to email someone. The benign rates, 4.7 and 7 per 10,000, come from 17,111 unrelated prompts and are the sturdier numbers.
- The "regular" prompts from jailbreak_llms were labeled by their source channel, not read one by one, so some are jailbreak-like. That lowers measured precision for the unreliable signals; it does not change their order of magnitude.
- The benign corpora hold few coding-agent prompts. Benign rates for the shell signals may be higher among developers, who do share install commands that pipe to a shell.
- `reverse-shell`, `approval-bypass` and `remote-code` matched no malicious prompt in these corpora, and `image-exfiltration` matched three. They are included on mechanism, not on these counts. A fill-in slot in an image address is not enough on its own: many ordinary templates fetch stock photos that way, so the signal also requires the prompt to mention private data.
- A prompt that matches nothing is not safe. These are plain patterns and are easy to evade.

## The 100 Examples

`src/data/safety/dangerous-prompts.json` holds 100 real prompts copied verbatim from the datasets whose licenses allow it (MIT and Apache-2.0), each with an explanation of 20 words or fewer and a link to the matching section of `/safety`. "Most common" is operational: 6,351 malicious prompts were grouped by technique, techniques were ranked by count, and inside a technique the most repeated texts come first. No technique takes more than about ten slots, because the corpora differ in size for reasons unrelated to how common an attack is. This ranks attacks within these datasets, not in the world.

| Technique | Malicious prompts counted | Examples |
| --- | ---: | ---: |
| `send-to-address` | 2,686 | 11 |
| `jailbreak-roleplay` | 1,086 | 11 |
| `secret-extraction` | 612 | 11 |
| `risky-shell-task` | 515 | 10 |
| `ignore-instructions` | 465 | 8 |
| `instruction-hijack` | 257 | 5 |
| `jailbreak-persona` | 206 | 4 |
| `fake-chat-tokens` | 183 | 4 |
| `agent-email-injection` | 165 | 4 |
| `credential-access` | 60 | 4 |
| `agent-harmful-action` | 28 | 4 |
| `system-role-line` | 27 | 4 |
| `file-upload` | 25 | 4 |
| `secrecy` | 14 | 4 |
| `system-prompt-leak` | 11 | 4 |
| `memory-write` | 3 | 3 |
| `image-exfiltration` | 3 | 2 |
| `encoded-payload` | 2 | 2 |
| `agent-data-theft` | 1 | 1 |
| `hidden-text` | 1 | 0 |

Prompts with sexual or violent wording were left out. Long prompts are cut at 400 characters and marked `truncated`, with a SHA-256 of the full text.

## Recommendation

Show a red "looks like an attack" warning only for the two attack-tier signals. Show an amber "read this before you send it" note for the nine caution signals. Show nothing for the famous phrases. Link every warning to a plain explanation.

What would change this: a labeled corpus of real shared links, or of coding-agent prompts, would let the caution signals be measured properly and could promote or retire them.

## Sources

| Dataset | Labels | License | Where | Revision |
| --- | --- | --- | --- | --- |
| `jailbreak-llms-jailbreak` | malicious | MIT | [raw.githubusercontent.com](https://raw.githubusercontent.com/verazuo/jailbreak_llms/da87f4bab9901a4fdfb8a9a63c0d2543f75b055a/data/prompts/jailbreak_prompts_2023_12_25.csv) | `da87f4bab990` |
| `jailbreak-llms-regular` | benign | MIT | [raw.githubusercontent.com](https://raw.githubusercontent.com/verazuo/jailbreak_llms/da87f4bab9901a4fdfb8a9a63c0d2543f75b055a/data/prompts/regular_prompts_2023_12_25.csv) | `da87f4bab990` |
| `injecagent-data-stealing` | malicious | MIT | [raw.githubusercontent.com](https://raw.githubusercontent.com/uiuc-kang-lab/InjecAgent/623f1bf3ad8ed35abe71f9f9d8fd9d99ad65aeea/data/attacker_cases_ds.jsonl) | `623f1bf3ad8e` |
| `injecagent-direct-harm` | malicious | MIT | [raw.githubusercontent.com](https://raw.githubusercontent.com/uiuc-kang-lab/InjecAgent/623f1bf3ad8ed35abe71f9f9d8fd9d99ad65aeea/data/attacker_cases_dh.jsonl) | `623f1bf3ad8e` |
| `cyberseceval-prompt-injection` | malicious | unstated in repository metadata; measured only, not redistributed | [raw.githubusercontent.com](https://raw.githubusercontent.com/meta-llama/PurpleLlama/ef5a7748472f17c39d37960de4fd3a63e368d362/CybersecurityBenchmarks/datasets/prompt_injection/prompt_injection.json) | `ef5a7748472f` |
| `bipia-text-attacks` | malicious | unstated in repository metadata; measured only, not redistributed | [raw.githubusercontent.com](https://raw.githubusercontent.com/microsoft/BIPIA/5a48626aece9739ce587ffdbcb2b7badcfd9d8ba/benchmark/text_attack_test.json) | `5a48626aece9` |
| `agentdojo-workspace` | malicious | MIT | [raw.githubusercontent.com](https://raw.githubusercontent.com/ethz-spylab/agentdojo/c0cc91e6010f00b70092594e22d060a50239ade3/src/agentdojo/default_suites/v1/workspace/injection_tasks.py) | `c0cc91e6010f` |
| `agentdojo-banking` | malicious | MIT | [raw.githubusercontent.com](https://raw.githubusercontent.com/ethz-spylab/agentdojo/40085c04a2af60e6b07ac5509989fab295d530cc/src/agentdojo/default_suites/v1/banking/injection_tasks.py) | `40085c04a2af` |
| `agentdojo-slack` | malicious | MIT | [raw.githubusercontent.com](https://raw.githubusercontent.com/ethz-spylab/agentdojo/afec80f291397a0814e8fe5b9ff24510c9551b1b/src/agentdojo/default_suites/v1/slack/injection_tasks.py) | `afec80f29139` |
| `agentdojo-travel` | malicious | MIT | [raw.githubusercontent.com](https://raw.githubusercontent.com/ethz-spylab/agentdojo/f37fa6ad1b33d100972dfc80e269ed63c794661e/src/agentdojo/default_suites/v1/travel/injection_tasks.py) | `f37fa6ad1b33` |
| `prompts-chat` | benign | unstated in repository metadata; measured only, not redistributed | [raw.githubusercontent.com](https://raw.githubusercontent.com/f/prompts.chat/acfc3fb9d23a6f01d6612dc8730d298c2c2e520c/prompts.csv) | `acfc3fb9d23a` |
| `redcode-exec-bash` | malicious | MIT | [github.com](https://github.com/AI-secure/RedCode/tree/664e4793dc7309f98b8271baed5bbc04d6ef4c39/dataset/RedCode-Exec/bash2text_dataset_json) | `664e4793dc73` |
| `deepset-prompt-injections` | mixed (label 1 = injection) | Apache-2.0 | [huggingface.co](https://huggingface.co/datasets/deepset/prompt-injections) | `4f61ecb038e9` |
| `llmail-inject` | malicious | MIT | [huggingface.co](https://huggingface.co/datasets/microsoft/llmail-inject-challenge) | `1063bdf01ec8` |
| `gandalf-ignore-instructions` | malicious | MIT | [huggingface.co](https://huggingface.co/datasets/Lakera/gandalf_ignore_instructions) | `04737b65e90a` |

- [OWASP LLM01:2025 Prompt Injection](https://genai.owasp.org/llmrisk/llm01-prompt-injection/)
- [Johann Rehberger, "ASCII Smuggler Tool: Crafting Invisible Text and Decoding Hidden Codes"](https://embracethered.com/blog/posts/2024/hiding-and-finding-text-with-unicode-tags/) (2024-01-14)
- [Simon Willison, posts tagged markdown-exfiltration](https://simonwillison.net/tags/markdown-exfiltration/)

## Research Receipt

- Run ID: `pds-20261112-a`
- Skill: `sams-research`, SKILL.md SHA-256 prefix `4249735c7353`
- Category: security and product decision
- Research date: 2026-11-12
- Source-access gaps: HackAPrompt is gated and was not used. CyberSecEval and prompts.chat have no license in their repository metadata, so they were counted but not copied. Only the first 3,000 rows of LLMail-Inject Phase 1 were fetched. BIPIA and AgentDojo were fetched and dropped, because their attack strings are ordinary tasks or code templates.
- Unresolved checks: precision on real shared links; non-English prompts; a second attack corpus for the two attack-tier signals.
