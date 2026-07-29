# Animation plans

Audit baseline: commit `72d1692`, using the Emil/animations.dev motion bar.
All four plans are applied and verified locally; deployment remains a separate
release action.

| Order | Plan | Status | Dependency |
| --- | --- | --- | --- |
| 1 | [001 — Refine feedback toast motion](001-refine-toast-motion.md) | DONE | None |
| 2 | [002 — Give the QR dialog spatial continuity](002-animate-qr-dialog.md) | DONE | Reuse tokens from 001 |
| 3 | [003 — Add restrained pointer press feedback](003-add-press-feedback.md) | DONE | Reuse tokens from 001 |
| 4 | [004 — Ship real reduced-motion and target-size variants](004-fix-motion-accessibility.md) | DONE | Execute with 001–003 |

Deliberately static: hero entrance, provider/model changes, prompt typing,
generated-URL updates, feature toggles, history reflow, and advanced-details
content. Those surfaces fail the frequency or functional-purpose gate.
