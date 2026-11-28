# Prompt safety switch

On November 27, 2026, Sam chose to turn off PrefillPrompt's safety checks by default. ChatGPT puts prefilled text in the input field for review, and Claude shows its own warning. PrefillPrompt can restore its checks if abuse appears.

With the switch off, `/api/prompt` uses its normal provider routing, including Gemini's clipboard handoff. Direct `/open` links still show the prompt and remember the reader's destination on that device. The page skips the safety checks and model downloads. QR codes use the same links as before.

To restore the safety interstitial and scanner, use `NUXT_PUBLIC_PROMPT_SAFETY=true pnpm build:cloudflare` as the build step in the [production deploy procedure](../PROJECT.md#publication-and-recovery). Run the documented scanner asset check before the build in either mode. The switch is baked into the build, so change it at build time and redeploy.

Verify a safety-enabled deployment with `NUXT_PUBLIC_PROMPT_SAFETY=true pnpm probe`. Run `pnpm probe` for a default deployment. Either command accepts `--base <origin>` for a preview.

## November 27 rollout

`pnpm check` passed, and the local Worker passed all 32 URL probes with safety off. Production preflight found all 44 chunks missing under `public/scanner/deep/b7737a17069a/`. The pinned model sources were also absent locally, so the documented rebuild could not run offline and the rollout stopped before upload.
