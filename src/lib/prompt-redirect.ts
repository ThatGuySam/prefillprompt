// Where a prompt link goes next. Used by the /api/prompt route and checked against the
// hand-written probe cases.

import type { ProviderId } from './providers.ts'
import { buildGeminiHandoffPath, buildOpenPath, buildProviderUrl, inferProviderFromModel, isProviderId } from './prompt-links.ts'
import { detectSafetySignals } from './prompt-safety.ts'

export interface PromptRedirectInput {
    prompt: string
    requestedProvider?: string
    model?: string
    webSearch?: boolean
    temporary?: boolean
}

// A link stops at the preview screen when it names no provider, so the reader can choose,
// or when the prompt trips a safety signal, so the reader sees the warning first. Any other
// link goes straight to the provider it names, as it always has.
export function promptRedirectLocation({ prompt, requestedProvider, model, webSearch, temporary }: PromptRedirectInput) {
    const provider: ProviderId | undefined = isProviderId(requestedProvider) ? requestedProvider : inferProviderFromModel(model)
    const options = { prompt, provider, model, webSearch, temporary }

    if (!provider || detectSafetySignals(prompt).length > 0) {
        return buildOpenPath(options)
    }
    if (provider === 'gemini') {
        return buildGeminiHandoffPath({ prompt, provider, model })
    }
    return buildProviderUrl({ ...options, provider })
}
