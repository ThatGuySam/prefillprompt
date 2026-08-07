# Privacy and logging

PrefillPrompt is intentionally stateless at the application layer, but prompt
links are not private. The prompt is encoded in the URL so the receiving browser
and destination can use it.

## What the application stores

PrefillPrompt has no application database, account system, analytics SDK, or
advertising tracker. The checked-in Cloudflare configuration disables Worker
observability. The browser stores only these optional values in `localStorage`:

- the most recently selected provider and model;
- whether the first-run tip was dismissed; and
- up to six recent prompts and their share options.

Those values stay in the current browser profile. They are not synced or sent
to PrefillPrompt by application code. The app continues to share and open links
if browser storage is blocked or full. Clearing site data removes them.

## Where a prompt URL can appear

A shared prompt can be visible to anyone with the URL and may be retained by:

- browser history, bookmarks, the clipboard, QR scanners, and link-preview tools;
- Cloudflare or other network infrastructure that processes the request;
- the person or system receiving the link; and
- ChatGPT, Claude, Gemini, or Perplexity after the destination opens.

The app and redirect endpoint send a `no-referrer` policy, disable caching on
redirect responses, and mark prompt routes as `noindex`. Those controls reduce
accidental disclosure; they cannot make a URL secret or override a destination's
privacy, retention, account, or logging policies.

Do not put passwords, API keys, private customer data, health information, or
other sensitive content in a PrefillPrompt URL. For sensitive material, open the
destination directly and paste the prompt there after checking its current
privacy settings.

## Operator and platform behavior

Repository code does not enable request logging, but hosting providers may
process request metadata as part of security, reliability, abuse prevention, or
account-level logging configured outside this repository. Consult the current
Cloudflare and destination-provider policies for their retention behavior.
