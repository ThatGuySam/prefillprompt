# Progressive disclosure audit

Date: 2026-07-29

## Outcome

The phone composer is the product. Its default view contains only:

1. Library
2. Product and current provider
3. More
4. AI + model combobox
5. Prompt field
6. Copy-link action

The prior desktop layout exposed navigation, hero copy, three product badges,
two destination controls, an exact-model disclosure, two feature toggles, five
share actions, a generated URL, four example cards, history, and footer copy at
once. The phone layout removes more than 90% of those persistent interface
elements from the initial view.

## Technique map

| Capability | Technique | Reason |
| --- | --- | --- |
| Provider, flexible mode, exact model | Editable combobox with manual list autocomplete | It is one selection from a large set, and the same field can filter by provider alias or model name. Selection is explicit; typing alone does not silently change the destination. |
| Web search and temporary chat | Contextual controls inside the More sheet | These are optional and provider-dependent. Unsupported controls are omitted instead of displayed as a wall of disabled settings. |
| Open, Markdown, QR, native share | Action list inside the More sheet | Copy link is the dominant action. Less common output formats remain one explicit tap away. |
| Examples and history | Library sheet | Both help people start or restore a prompt, but neither is part of composing every prompt. Browser-local history is visible only when it exists. |
| Exact-model and provider limitations | One conditional helper line | The warning appears next to the choice that creates the caveat, then disappears when it no longer applies. |
| First-use explanation | Dismissible coach mark with durable local storage | New users get one compact explanation. Dismissal or beginning to type stores completion so it does not return. |
| QR code | Focus-contained modal | QR is a separate, occasional task. The modal contains keyboard focus and returns it to its trigger after exit. |

## Interaction contracts

The combobox follows the WAI-ARIA Authoring Practices
[editable combobox with list autocomplete](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/):

- `Down Arrow` and `Up Arrow` move through suggestions.
- `Enter` commits the active suggestion.
- `Escape` closes without changing the previous selection.
- DOM focus stays in the input while `aria-activedescendant` identifies the
  active option.
- Provider aliases such as ChatGPT/OpenAI and Claude/Anthropic are included in
  the searchable text.

The sheets follow the WAI-ARIA
[modal dialog pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/):
focus moves inside on open, `Escape` closes, the page behind is inert, and focus
returns to the invoking control.

Apple's
[disclosure-control guidance](https://developer.apple.com/design/human-interface-guidelines/disclosure-controls)
supports keeping the most-used controls visible, hiding advanced functionality
until relevant, and maintaining a clear relationship between a disclosure
control and the content it reveals. The design uses one More control for
secondary actions and provider-specific options.

## Gemini decision

Chromium's source currently defines the Chrome-owned `@gemini` site shortcut as
`https://gemini.google.com/app?q={searchTerms}`, and Google's
[Gemini help page](https://support.google.com/gemini/answer/14886647) documents
entering a prompt through that Chrome shortcut. Google does not document the
query URL as a public deep-link API for third-party sites.

The previous implementation treated the Chromium template as a stable external
contract. Direct links can instead arrive with the prompt missing or behave
differently by browser, account, region, or rollout. Community reports also
describe inconsistent Gemini link and redirect behavior. PrefillPrompt now
uses a first-party handoff that:

1. preserves the complete prompt in the PrefillPrompt URL;
2. copies it after an explicit user gesture;
3. opens the stable Gemini app URL without undocumented parameters; and
4. asks the user to confirm any model preference in Gemini.

This costs one additional tap but does not silently lose the prompt.

## Model catalog

The checked-in catalog comes from OpenRouter's public
[`GET /api/v1/models`](https://openrouter.ai/docs/api/api-reference/models/get-models)
endpoint. The updater validates the response shape, recognizes OpenAI,
Anthropic, Google, and Perplexity prefixes, refuses implausibly small responses,
sorts deterministically, and avoids rewriting the file when the model set is
unchanged.

`.github/workflows/update-model-catalog.yml` runs weekly and on demand. When the
generated catalog changes, it runs the full project check and opens a pull
request instead of writing directly to the default branch.

OpenRouter model IDs are discovery data, not proof that a consumer chat product
accepts a model in its URL. Exact choices remain explicitly labeled as hints.

## Motion decisions

The animation audit uses the animations.dev/Emil vocabulary and implementation
bar:

- `phone-arrive`: one automatic entrance for the entire product container.
- `origin-aware popover`: AI/model results scale and fade from the combobox.
- `iOS sheet`: More and Library use
  `cubic-bezier(0.32, 0.72, 0, 1)` and move from the bottom edge.
- `feedback toast`: copy confirmation enters over 180 ms and exits over 140 ms.
- `press`: pointer press feedback uses `scale(0.97)` over 120 ms.

Typing, filtering, keyboard navigation, selection, and toggle changes are
deliberately immediate. Motion uses explicit `transform` and `opacity`
transitions; there is no `transition: all`. Reduced-motion variants remove
travel and scale while preserving opacity-based state cues.
