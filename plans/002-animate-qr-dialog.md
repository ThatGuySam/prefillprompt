# 002 — Give the QR dialog spatial continuity

- **Commit:** 72d1692
- **Severity:** MEDIUM
- **Category:** Missed opportunity
- **Estimated scope:** 2 files, ~55 lines

## Problem

The occasional QR dialog and full-screen backdrop appear and disappear in one
frame. A centered modal can use a restrained pop-in so the state change reads
as one surface, while its focus must remain inside until the exit completes.

## Where

| File | Lines | What's there |
| --- | --- | --- |
| `src/components/QrDialog.vue` | 8–62 | `v-if` dialog and focus restoration |
| `src/assets/css/main.css` | 635–687 | Static backdrop and centered dialog |

### Current code

```vue
<div v-if="open" class="dialog-backdrop">
    <dialog class="qr-dialog" open>
```

```ts
if (!isOpen) {
    await nextTick()
    returnFocus?.focus()
}
```

## Target

Wrap the conditional root in Vue's built-in transition:

```vue
<Transition name="qr-dialog" @after-leave="restoreFocus">
    <div v-if="open" class="dialog-backdrop">
```

Open the nested native dialog with `showModal()` so focus stays contained and
the page remains inert through the leave transition. Close the native dialog
and restore its trigger only in `after-leave`. Because modal dialogs enter the
browser's top layer, center the panel with fixed `inset: 0` and auto margins;
keep the native `::backdrop` transparent so the custom backdrop can fade.

Use a centered, composite-only entrance and a shorter mirrored exit:

```css
.qr-dialog-enter-active {
    transition: opacity 220ms cubic-bezier(0.19, 1, 0.22, 1);
}

.qr-dialog-leave-active {
    transition: opacity 150ms cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

.qr-dialog-enter-active .qr-dialog,
.qr-dialog-leave-active .qr-dialog {
    transform-origin: center;
    transition-property: opacity, transform;
}

.qr-dialog-enter-from .qr-dialog {
    opacity: 0;
    transform: translateY(8px) scale(0.96);
}

.qr-dialog-leave-to .qr-dialog {
    opacity: 0;
    transform: translateY(4px) scale(0.98);
}
```

The backdrop fades from `opacity: 0`. Under reduced motion, remove every
transform and retain a 160ms opacity transition.

**Why these values:** a modal is a larger occasional surface, so 220ms is
trackable; the strong curve front-loads the response; `scale(0.96)` is
near-full and never reads as appearing from nothing; the 150ms exit respects
the user's dismissal.

## Conventions to follow

- Reuse the motion tokens in `src/assets/css/main.css`.
- The existing toast is the local exemplar for class-driven CSS transitions.
- A centered transform origin is correct for this modal.

## Steps

1. Move closing focus restoration into a named `restoreFocus` function.
2. Restore focus from the transition's `after-leave` event, not when `open`
   first becomes false.
3. Wrap the conditional backdrop in `<Transition name="qr-dialog">`.
4. Add explicit backdrop and dialog enter/leave transition classes.
5. Use `showModal()` and keep containment active until `after-leave`.
6. Center the promoted top-layer dialog independently of its wrapper.
7. Add an opacity-only reduced-motion variant.

## Out of scope

- Do not change QR generation, download behavior, sizing, or dialog content.
- Do not add bounce, spring physics, blur animation, or a new dependency.

## Verification

**Build**

- [x] Type-check, lint, tests, and Cloudflare build pass.

**Behavior**

- [x] The modal enters from `translateY(8px) scale(0.96)` and exits downward.
- [x] Escape, backdrop click, and close button all play the exit.
- [x] Focus stays contained during exit and returns to the QR trigger
      only after the dialog is removed.
- [x] Under reduced motion, only opacity changes.

**Feel**

- [x] Inspect entry and exit; the panel should read as centered and
      responsive, without bounce or a second child entrance.
