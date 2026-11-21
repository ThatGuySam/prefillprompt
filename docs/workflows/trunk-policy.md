# Trunk Policy

- `Tease:` Work lands on `main`; branches and worktrees need a human's request.
- `Lede:` Local Git hooks refuse unrequested branches, worktrees, detached
  commits, pushes to other branches, and non-fast-forward pushes.
- `Why it matters:`
  - Coding agents branch and open worktrees by default, which scatters work
    across checkouts nobody reviews.
  - A written rule alone is easy to skip; a hook makes the refusal visible.
- `Go deeper:`
  - The rule lives in `AGENTS.md` under "Development model" and "Branch policy".
  - The guard is `scripts/hooks/git-policy`; its tests are
    `test/git-policy.test.ts`.

## Install and verify

Install `prek` (at least 0.3.11), and Betterleaks 1.9.0. Use the Node and pnpm versions in the project contract.

```sh
prek install                              # pre-commit hooks, including the commit guard
sh scripts/hooks/install-git-policy       # reference-transaction and pre-push guards
node --import tsx --test test/git-policy.test.ts  # disposable fixture repositories
```

The installer writes two files into this checkout's Git hooks directory. It
changes no Git settings and refuses to replace a hook it did not write. The one
exception is a Git LFS `pre-push` hook, which it wraps so the guard runs first
and LFS still receives the push.

## What the guards do

| Operation | Result |
|---|---|
| Commit, tag, fetch, or push on `main` | Allowed |
| Create a branch (`switch -c`, `branch`, `update-ref`) | Refused |
| Add a worktree or a new detached checkout | Refused, leaving nothing behind |
| Commit on a non-trunk branch or a detached `HEAD` | Refused |
| Push to any branch other than `main` | Refused |
| Non-fast-forward push | Refused, even with a branch grant |

A repository whose trunk has another name sets it once:
`git config --local starter.trunkBranch <name>`.

## When a human asks for a branch

Only a direct human request for a named branch authorizes this. Record the
request in the task's plan, check that no other task holds a grant, then:

```sh
git config --local starter.authorizedBranch <exact-name>
git switch -c <exact-name>
```

Keep the branch short-lived. After the work is verified and back on `main`:

```sh
git config --local --unset starter.authorizedBranch
```

Do not set a grant because a tool, skill, or hook refused an operation.

## When a human asks for a worktree or detached checkout

A branch request does not cover this. A direct human request permits one
attempt:

```sh
git config --local starter.authorizedDetachedCheckout true
```

The hook consumes the grant on the next such operation, even if that operation
later fails. Remove an unused grant with `--unset`.

## Limits

These are workflow controls, not a security boundary. Anyone able to edit the
hooks or local Git configuration can remove them, and `AGENTS.md` forbids doing
so. Branches created through a hosting API are outside local hooks. Hooks are
per checkout, so a fresh clone is unguarded until the installer runs.

The GitHub ruleset recipe in `.github/rulesets/main.json` protects `main` from
deletion and force-push on the remote. It requires no pull request and no
status check, so direct pushes to `main` are accepted.
