# 003 — Add restrained pointer press feedback

- **Commit:** 72d1692
- **Severity:** MEDIUM
- **Category:** Physicality & origin
- **Estimated scope:** 1 file, ~35 lines

## Problem

The share, open, QR download, and example controls react to hover but provide no
physical receipt when pressed. The example hover also translates the hover
target itself, which can produce a flicker loop near its lower edge.

## Where

| File | Lines | What's there |
| --- | --- | --- |
| `src/assets/css/main.css` | 421–473 | Share/open hover states |
| `src/assets/css/main.css` | 538–552 | Example-card hover lift |

### Current code

```css
.example-card:hover {
    border-color: #83a7e8;
    transform: translateY(-2px);
}
```

## Target

Use a brief scale-on-press only on the accepted controls:

```css
.action-button,
.open-button,
.download-button,
.example-card {
    transition: transform 120ms cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

.action-button:not(:disabled):active:not(:focus-visible),
.open-button:not(:disabled):active:not(:focus-visible),
.download-button:active:not(:focus-visible),
.example-card:active:not(:focus-visible) {
    transform: scale(0.97);
}
```

Move hover selectors into
`@media (hover: hover) and (pointer: fine)`, and remove the example-card
translation entirely. Under reduced motion, remove the transform transition
and active transform.

**Why these values:** `scale(0.97)` is felt rather than visibly collapsing;
120ms is immediate for a press; the asymmetric curve gives a prompt response
without bounce. `:not(:focus-visible)` keeps keyboard activation immediate.

## Conventions to follow

- Reuse `--ease-out-quad` and a `--motion-press: 120ms` token.
- Keep color and border hover feedback unchanged, but pointer-gated.

## Steps

1. Add the press-duration token.
2. Add explicit transform transitions to only the four control families.
3. Add pointer press states excluding `:focus-visible`.
4. Remove the hover lift from `.example-card`.
5. Gate existing hover styles to fine pointers.
6. Add the no-transform reduced-motion variant.

## Out of scope

- Do not animate selects, toggles, typing, history rows, navigation, or model
  changes.
- Do not add hover scale or lift.

## Verification

**Build**

- [x] Type-check, lint, tests, and Cloudflare build pass.

**Behavior**

- [x] Pointer/touch press scales accepted controls to exactly `0.97`.
- [x] Keyboard activation stays immediate.
- [x] Example-card hover never changes its position.
- [x] Touch devices do not receive hover-only styling.
- [x] Reduced-motion users get no press movement.

**Feel**

- [x] Presses should be felt but not visibly inflate or collapse the control.
