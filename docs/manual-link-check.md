# Manual link check

Click each link in your own browser, signed in, and compare what happens with the **Expect** column. This covers what the automated probe can't: whether ChatGPT, Claude, Gemini, and Perplexity still honor the model, thinking, web search, and temporary-chat parameters. `pnpm probe` already proves that PrefillPrompt builds the right redirect.

- Opening a link only prefills a prompt. Don't press send unless you want to.
- If a destination ignores a parameter, note it and update `providers.ts` (`capabilities`) so the app stops promising it.
- To test a branch preview, replace `https://prefillprompt.com` with the preview origin.

## ChatGPT

| Link | Expect |
| --- | --- |
| [Basic](https://prefillprompt.com/api/prompt?s=chatgpt&q=hello+from+prefillprompt) | New chat, composer prefilled with the prompt |
| [Latest fast](https://prefillprompt.com/api/prompt?s=chatgpt&q=hello+from+prefillprompt&model=latest-fast) | Model picker shows Instant |
| [Latest reasoning](https://prefillprompt.com/api/prompt?s=chatgpt&q=hello+from+prefillprompt&model=latest-reasoning) | Model picker shows Thinking |
| [Explicit model](https://prefillprompt.com/api/prompt?s=chatgpt&q=hello+from+prefillprompt&model=gpt-5) | Model picker shows GPT-5, or falls back to the default without an error |
| [Web search](https://prefillprompt.com/api/prompt?s=chatgpt&q=hello+from+prefillprompt&web=1) | Search is switched on |
| [Temporary chat](https://prefillprompt.com/api/prompt?s=chatgpt&q=hello+from+prefillprompt&temporary=1) | Temporary chat is active |

## Claude

| Link | Expect |
| --- | --- |
| [Basic](https://prefillprompt.com/api/prompt?s=claude&q=hello+from+prefillprompt) | New chat, composer prefilled with the prompt |
| [Latest reasoning](https://prefillprompt.com/api/prompt?s=claude&q=hello+from+prefillprompt&model=latest-reasoning) | Extended thinking is on |
| [Temporary chat](https://prefillprompt.com/api/prompt?s=claude&q=hello+from+prefillprompt&temporary=1) | Incognito chat is active |
| [Explicit model](https://prefillprompt.com/api/prompt?q=hello+from+prefillprompt&model=anthropic%2Fclaude-sonnet-4) | Opens Claude; model picker shows Sonnet 4, or the default without an error |

## Perplexity

| Link | Expect |
| --- | --- |
| [Basic](https://prefillprompt.com/api/prompt?s=perplexity&q=hello+from+prefillprompt) | A search for the prompt starts |

## Gemini

| Link | Expect |
| --- | --- |
| [Basic](https://prefillprompt.com/api/prompt?s=gemini&q=hello+from+prefillprompt) | PrefillPrompt's handoff page opens; **Copy prompt & open Gemini** copies the prompt and opens Gemini |
| [Latest fast](https://prefillprompt.com/api/prompt?s=gemini&q=hello+from+prefillprompt&model=latest-fast) | Same handoff page; the model hint is shown |

## Edge cases

| Link | Expect |
| --- | --- |
| [Special characters](https://prefillprompt.com/api/prompt?s=claude&q=R%C3%A9sum%C3%A9+%26+%22quotes%22+%231+100%25+%3D%3F%2B+%E6%97%A5%E6%9C%AC%E8%AA%9E+%F0%9F%98%80) | The prompt arrives exactly as `Résumé & "quotes" #1 100% =?+ 日本語 😀`, with the line intact |
| [Missing prompt](https://prefillprompt.com/api/prompt?s=claude) | JSON error 400, `PROMPT_REQUIRED` |
| [Unknown service](https://prefillprompt.com/api/prompt?s=bogus&q=hi) | JSON error 400, `UNSUPPORTED_SERVICE` |
| [Provider inferred from model](https://prefillprompt.com/api/prompt?q=hello+from+prefillprompt&model=openai%2Fgpt-5) | Opens ChatGPT |
