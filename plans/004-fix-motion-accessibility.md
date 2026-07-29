# 004 — Ship real reduced-motion and target-size variants

- **Commit:** 72d1692
- **Severity:** MEDIUM
- **Category:** Accessibility
- **Estimated scope:** 2 files, ~45 lines

## Problem

The current reduced-motion rule shortens every transition to `0.01ms`, which
removes both movement and meaningful fades without neutralizing transforms.
Explicit JavaScript smooth scrolling bypasses that CSS rule. Several controls
also fall below the 44×44px target minimum.

## Where

| File | Lines | What's there |
| --- | --- | --- |
| `src/assets/css/main.css` | 26–30, 809–815 | Global smooth scroll and blanket transition kill |
| `src/components/PromptBuilder.vue` | 184–192 | Explicit smooth-scroll request |
| `src/assets/css/main.css` | 95–127, 351–362, 575–582, 624–633, 677–687 | Undersized controls |

### Current code

```css
@media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
        scroll-behavior: auto !important;
        transition-duration: 0.01ms !important;
    }
}
```

```ts
window.scrollTo({ top: 0, behavior: 'smooth' })
```

## Target

- Put `scroll-behavior: smooth` inside
  `@media (prefers-reduced-motion: no-preference)`.
- Call `window.scrollTo({ top: 0 })` so the CSS preference controls behavior.
- Delete the blanket transition-duration override.
- Keep the toast and dialog opacity transitions under reduced motion while
  setting movement to `transform: none`.
- Disable press transforms under reduced motion.
- Give `.brand`, header links, `.advanced-options summary`, `.text-button`,
  `.history-remove`, and `.dialog-close` a minimum 44px target.

**Why these values:** reduced motion removes travel while preserving the state
change; 44px is the target minimum from the animation-accessibility audit.

## Conventions to follow

- Reduced-motion variants remain beside the global responsive media queries in
  `src/assets/css/main.css`.
- Do not use `!important`; scope each variant to the motion it changes.

## Steps

1. Move smooth scrolling into the no-preference media query.
2. Remove the explicit JavaScript behavior value.
3. Replace the blanket reduced-motion rule with component-specific variants.
4. Raise each cited interactive target to at least 44×44px without changing
   its visual label or semantics.

## Out of scope

- Do not change the page layout, copy, focus outline, or control semantics.
- Do not globally disable every transition or animation.

## Verification

**Build**

- [x] Type-check, lint, tests, and Cloudflare build pass.

**Behavior**

- [x] Normal mode scrolls reused prompts smoothly.
- [x] Reduced mode jumps immediately.
- [x] Reduced mode keeps toast/dialog fades and removes all transform motion.
- [x] Every cited target measures at least 44×44 CSS pixels.

**Feel**

- [x] Review both variants; reduced motion must still communicate state without
      any element travelling or scaling.
