# Change Workflow

- `Tease:` Move from intent to proof without silent drift.
- `Lede:` The default loop is research -> plan -> task -> proof -> checkpoint ->
  continue, recommend, or stop.
- `Why it matters:`
  - Most drift happens between changing code and proving it still solves the
    intended problem.
  - Small proof-producing increments are easier to inspect, reverse, and hand
    off.
- `Go deeper:`
  - Keep plan and progress together.
  - Pause when evidence fails or scope changes.

## Loop

1. Inspect local instructions, status, existing evidence, and relevant history.
2. Research only the unresolved questions.
3. Choose a direction and record constraints, non-goals, and success proof.
4. Slice the work into bounded tasks with protected paths and escalation rules.
5. Implement one task on `main` in the primary checkout. Keep unfinished
   user-visible behavior behind a default-off flag rather than on a branch.
6. Run the narrowest proof-producing checks.
7. Record an anti-drift checkpoint:
   - goal;
   - changed paths;
   - evidence and revision;
   - remaining risk;
   - decision: continue, re-scope, recommend, or stop.
8. Continue only when the evidence and intent still align.

## Pause points

- after research when the request is exploratory;
- after planning when scope needs human choice;
- when a task would cross an unapproved external-effect boundary;
- after failed verification when the cause is not understood;
- when the checkout or remote has changed underneath the task;
- when a task seems to need a branch or worktree no human has approved;
- when an unknown would otherwise be filled with a guess.
