// Where a prompt link goes next. Used by the /api/prompt route and checked against the
// hand-written probe cases.

import type { ProviderId } from './providers.ts'
import { PROMPT_SAFETY } from './flags.ts'
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

// With safety checks on, flagged prompts and links with a prompt and a small model stop at
// the preview. Only an explicitly named provider is carried into the preview so readers can
// choose the destination for unnamed links.
export function promptRedirectLocation({ prompt: rawPrompt, requestedProvider, model, webSearch, temporary }: PromptRedirectInput) {
    const prompt = rawPrompt?.trim() ? rawPrompt : ''
    const options = { prompt, model, webSearch, temporary }

    if (PROMPT_SAFETY && (detectSafetySignals(prompt).length > 0 || (prompt && namesSmallModel(model)))) {
        const named: ProviderId | undefined = isProviderId(requestedProvider) ? requestedProvider : undefined
        return buildOpenPath({ ...options, provider: named })
    }

    const provider = resolveProvider(requestedProvider, model)
    if (provider === 'gemini' && prompt) {
        return buildGeminiHandoffPath({ ...options, provider })
    }
    return buildProviderUrl({ ...options, provider })
}
