# Command Effects

- `Tease:` Command names should reveal their blast radius.
- `Lede:` Read-only inspection, local mutation, and external mutation use
  distinct verbs so humans and agents can reason about authority before
  execution.
- `Why it matters:`
  - A harmless-looking command that deploys or rewrites files defeats explicit
    authorization.
  - Predictable verbs make automation safer and handoffs more precise.
- `Go deeper:`
  - Record project commands in `PROJECT.md`.
  - Prefer plan/apply pairs for consequential mutations.

## Vocabulary

| Verb | Expected effect |
|---|---|
| `check`, `audit`, `plan`, `preview`, `status`, `verify` | Read-only |
| `format`, `fix`, `generate`, `init`, `apply` | Local write unless explicitly scoped otherwise |
| `publish`, `deploy`, `push`, `merge`, `send` | External write |

## Contract

- Read-only commands return evidence without modifying tracked files, local
  state, or remote systems.
- Local-write commands identify affected paths and preserve unrelated work.
- External-write commands identify the exact remote target, consequential
  automation, rollback, and postcondition before acting.
- A command with both read-only and mutating behavior must default to read-only
  and require an explicit apply verb or flag.
- Idempotent operations report a clean no-op when the desired state already
  exists.
- Scripts never treat a successful local step as authority for the next remote
  step.
