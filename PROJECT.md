# PrefillPrompt project contract

PrefillPrompt builds shareable prompt links. Nuxt and Nitro run on Cloudflare Workers. See the [README](README.md) for the URL contract, feature flags, and contributors' entry point.

## Daily work

- Work in the existing checkout on `main`. See [Trunk policy](docs/workflows/trunk-policy.md) for Git hook setup.
- Use the Node version in `.node-version` and pnpm through Corepack. Install dependencies with `pnpm install --frozen-lockfile`.
- Start Nuxt with `pnpm dev` on port 3000. Stop the process with Ctrl-C in its terminal.
- Run one test with `node --import tsx --test test/<name>.test.ts`. Run lint for specific paths with `pnpm exec eslint <paths>`.
- Run `pnpm check` for lint, type checking, tests, and the Cloudflare build. The build writes local output and does not publish it.
- Run `node --import tsx --test test/git-policy.test.ts` to exercise the Git guards in disposable repositories.

## Publication and recovery

| Action | Effect and verification |
| --- | --- |
| `git push origin main` | Publishes commits to GitHub. Verify the remote SHA and GitHub checks. The repository's CI workflows do not deploy the production Worker. |
| `pnpm deploy:preview` | Uploads an approved Worker preview named `launch`. Use `pnpm probe --base <url>` on the emitted URL. |
| `pnpm deploy:blue` | Uploads an approved Worker preview named `blue`. Use the same probe against that preview. |
| `pnpm build:cloudflare` then `pnpm exec wrangler deploy` | Publishes to the production Worker. Obtain explicit rollout approval and first run `node scripts/scanner/build-deep.mjs --check`. Verify with `pnpm probe`. Revert to the previous Worker deployment through Cloudflare if production checks fail. |

Production compute runs on request. The app keeps prompt history in the browser and computes redirects from the incoming URL. The catalog is checked into Git and bundled with the app. OpenRouter downtime leaves the last checked-in catalog usable.

## Catalog automation

`pnpm models:update` updates the local generated catalog from OpenRouter. The scheduled workflow opens a short-lived pull request only when the generated file changes and passes `pnpm check`. Keep GitHub Actions' default permissions read-only and leave “Allow GitHub Actions to create and approve pull requests” enabled for this workflow. Only the publishing job requests write permissions.

`gh workflow run update-model-catalog.yml --ref main` starts the same workflow manually. Check the run and, when a catalog changed, review the generated diff before merging. A failed or empty update leaves `main` at its last verified catalog.

## Starter baseline

The repository was reconciled with `ThatGuySam/project-starter` v2.2.0 (`c8ba45f0d9527e3f81ac5d2d7f274fcb0f526b58`). The Git hooks, guard tests, and ruleset come from that baseline. PrefillPrompt uses its existing Node, pnpm, ESLint, and Cloudflare toolchain.
