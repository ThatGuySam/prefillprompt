# Animation audit

The original desktop-card motion plans were retired with the rejected
interface. The current iPhone-style implementation applies the Emil /
animations.dev craft bar directly:

| Surface | Pattern | Timing | Reduced motion |
| --- | --- | --- | --- |
| Phone | One container entrance | 420 ms, ease-out expo | 160 ms fade |
| First-run tip | Short contextual reveal | 220 ms in, 130 ms out | Fade only |
| AI/model results | Origin-aware popover | 180 ms in, 130 ms out | Fade only |
| More and Library | iOS bottom sheet | 320 ms in, 180 ms out | Fade only |
| Copy status | Reversible toast | 180 ms in, 140 ms out | Fade only |
| Pointer press | `scale(0.97)` | 120 ms | Static |
| QR | Centered modal | 220 ms in, 150 ms out | Fade only |

Typing, search filtering, keyboard navigation, model selection, option toggles,
and history changes stay immediate.

The full information-architecture, Gemini, catalog, accessibility, and motion
rationale is in
[`docs/progressive-disclosure-audit.md`](../docs/progressive-disclosure-audit.md).
