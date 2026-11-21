# Repository agent instructions

Read [PROJECT.md](PROJECT.md) for commands, deployment boundaries, and the catalog workflow. Read any scoped agent instructions before editing their directory.

## Work on main

- Implement, verify, and commit small changes on `main` in this checkout. Use Conventional Commits and push to `origin/main` when authorized.
- Create or switch to a branch, worktree, or detached checkout only when a human requests it explicitly. Keep approved branches short-lived. See [Trunk policy](docs/workflows/trunk-policy.md) for setup and grants.
- Open a pull request when the user requests one. The scheduled catalog workflow has a documented exception for generated data.
- Keep unfinished user-visible behavior behind a default-off build flag if it can safely coexist with production behavior. See [Feature flags](README.md#feature-flags).
- Inspect Git status and diffs before editing or staging. Preserve unrelated work, stage explicit paths, and reconcile divergence on `main`. Run `pnpm check` and the staged `prek` guards before committing. Keep the Git hooks enabled and use fast-forward pushes.
- A commit, push, preview upload, and production rollout each have distinct effects. Verify and report each state separately. Obtain authorization for external effects that the task does not already require.

## Verify claims and protect data

- Follow the [change workflow](docs/workflows/change-loop.md). Keep evidence and outstanding decisions in the repo's plan or handoff for the work.
- Record authoritative sources and transformations for consequential data. Mark unknowns explicitly and keep private data, tokens, and local environment files out of commits and logs.
- Use frozen lockfiles and full-length commit SHAs for Actions. Allow at least seven days for new tool and dependency releases to age unless the user authorizes an exception.
- Prefer request-driven or scheduled compute and durable authoritative inputs. Document any state that must survive a restart. Keep automation idempotent and preserve the last known good output when checks fail.
