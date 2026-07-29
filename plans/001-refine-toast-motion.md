# 001 — Refine feedback toast motion

- **Commit:** 72d1692
- **Severity:** HIGH
- **Category:** Easing & duration
- **Estimated scope:** 2 files, ~45 lines

## Problem

The feedback toast uses `transition: 150ms ease`, which defaults to every
animatable property. That can animate the error background unintentionally,
uses a weak curve for a deliberate entrance, and gives entry and exit the same
timing.

## Where

| File | Lines | What's there |
| --- | --- | --- |
| `src/assets/css/main.css` | 498–525 | Reversible toast opacity/translate state |

### Current code

```css
.status-toast {
    opacity: 0;
    transform: translateY(8px);
    transition: 150ms ease;
}

.status-toast.visible {
    opacity: 1;
    transform: translateY(0);
}
```

## Target

Add shared motion tokens and transition only composite properties:

```css
:root {
    --ease-out-quad: cubic-bezier(0.25, 0.46, 0.45, 0.94);
    --motion-feedback-enter: 180ms;
    --motion-feedback-exit: 140ms;
}

.status-toast {
    opacity: 0;
    transform: translateY(8px);
    transition:
        opacity var(--motion-feedback-exit) var(--ease-out-quad),
        transform var(--motion-feedback-exit) var(--ease-out-quad);
}

.status-toast.visible {
    opacity: 1;
    transform: translateY(0);
    transition-duration: var(--motion-feedback-enter);
}
```

Under `prefers-reduced-motion: reduce`, keep the opacity transition but set
both toast states to `transform: none`.

Keep the displayed message separate from the visible state: begin the exit by
removing `.visible`, then clear its content only after the opacity
`transitionend`. A new announcement can reverse an in-flight exit without the
toast shrinking or losing its replacement message.

**Why these values:** 180ms keeps feedback legible without slowing the action;
140ms gets dismissal out of the way; `translateY(8px)` is a small directional
hint; the asymmetric curve starts promptly and settles cleanly.

## Conventions to follow

- Motion tokens live in `src/assets/css/main.css` under `:root`.
- Keep the existing always-mounted, class-toggled toast because its CSS
  transition is interruptible.
- Do not animate the error background color.

## Steps

1. Add the exact curve and duration tokens under `:root`.
2. Replace the shorthand transition with explicit `opacity` and `transform`.
3. Give `.visible` the longer entry duration.
4. Add the fade-only reduced-motion variant.
5. Retain the message until the opacity exit completes.

## Out of scope

- Do not change toast copy, timeout, placement, or ARIA behavior.
- Do not introduce a motion library or keyframes.

## Verification

**Build**

- [x] Type-check, lint, tests, and Cloudflare build pass.

**Behavior**

- [x] Copy and Markdown actions enter over 180ms and exit over 140ms.
- [x] Trigger feedback again mid-flight; it retargets without jumping.
- [x] Error feedback changes color immediately.
- [x] Under reduced motion, the toast fades without moving.

**Feel**

- [x] Inspect the toast timing; it should respond immediately and settle,
      never drift.
