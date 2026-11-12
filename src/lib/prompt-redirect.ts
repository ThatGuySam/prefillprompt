// Where a prompt link goes next. Used by the /api/prompt route and checked against the
// hand-written probe cases.

import type { ProviderId } from './providers.ts'
import { buildGeminiHandoffPath, buildOpenPath, buildProviderUrl, isProviderId, resolveProvider } from './prompt-links.ts'
import { detectSafetySignals } from './prompt-safety.ts'

export interface PromptRedirectInput {
    prompt: string
    requestedProvider?: string
    model?: string
    webSearch?: boolean
    temporary?: boolean
}

// A link goes straight to its provider, as it always has: the one it names, else the one its
// model implies, else ChatGPT. The one exception is a prompt that trips a safety signal. That
// link stops at the preview screen so the reader sees the warning before anything opens. The
// preview only gets a provider the link named itself, so an unnamed link lets the reader choose.
export function promptRedirectLocation({ prompt, requestedProvider, model, webSearch, temporary }: PromptRedirectInput) {
    const options = { prompt, model, webSearch, temporary }

    if (detectSafetySignals(prompt).length > 0) {
        const named: ProviderId | undefined = isProviderId(requestedProvider) ? requestedProvider : undefined
        return buildOpenPath({ ...options, provider: named })
    }

    const provider = resolveProvider(requestedProvider, model)
    if (provider === 'gemini') {
        return buildGeminiHandoffPath({ ...options, provider })
    }
    return buildProviderUrl({ ...options, provider })
}
