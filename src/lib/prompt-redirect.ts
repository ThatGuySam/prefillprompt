// Where a prompt link goes next. Used by the /api/prompt route and checked against the
// hand-written probe cases.

import type { ProviderId } from './providers.ts'
import { buildGeminiHandoffPath, buildOpenPath, buildProviderUrl, isProviderId, resolveProvider } from './prompt-links.ts'
import { detectSafetySignals } from './prompt-safety.ts'

export interface PromptRedirectInput {
    prompt?: string
    requestedProvider?: string
    model?: string
    webSearch?: boolean
    temporary?: boolean
}

// Small models (GPT-5.6 Luna, mini, nano, Haiku, Flash, Lite) follow injected
// instructions more readily, so a link that asks for one gets the on-device scan first.
const SMALL_MODEL = /(?:^|[-/_.:\s])(?:luna|mini|nano|haiku|flash|lite|small|tiny)(?=$|[-/_.:\s])/i

export function namesSmallModel(model: string | undefined) {
    return model !== undefined && SMALL_MODEL.test(model)
}

// A link goes straight to its provider, as it always has: the one it names, else the one its
// model implies, else ChatGPT. Two kinds of link stop at the preview screen instead, so the
// reader sees the prompt and the on-device scan before anything opens: a prompt that trips a
// safety signal, and a link that asks for a small model. The preview only gets a provider the
// link named itself, so an unnamed link lets the reader choose. A link without a prompt has
// nothing to scan, so it opens a new chat that keeps the model and chat settings.
export function promptRedirectLocation({ prompt: rawPrompt, requestedProvider, model, webSearch, temporary }: PromptRedirectInput) {
    const prompt = rawPrompt?.trim() ? rawPrompt : ''
    const options = { prompt, model, webSearch, temporary }

    if (detectSafetySignals(prompt).length > 0 || (prompt && namesSmallModel(model))) {
        const named: ProviderId | undefined = isProviderId(requestedProvider) ? requestedProvider : undefined
        return buildOpenPath({ ...options, provider: named })
    }

    const provider = resolveProvider(requestedProvider, model)
    if (provider === 'gemini' && prompt) {
        return buildGeminiHandoffPath({ ...options, provider })
    }
    return buildProviderUrl({ ...options, provider })
}
