import type { PromptLinkOptions } from './prompt-links'
import { getProviderModelHint } from './prompt-links.ts'
import { isModelAlias } from './providers.ts'

export type CompatibilityFeature = 'handoff' | 'model' | 'temporary' | 'webSearch'

export interface CompatibilityNotice {
    feature: CompatibilityFeature
    message: string
}

export function getCompatibilityNotices(options: PromptLinkOptions): CompatibilityNotice[] {
    const provider = options.provider ?? 'chatgpt'
    const notices: CompatibilityNotice[] = []

    if (options.recipientChoice === 'provider') {
        notices.push({
            feature: 'handoff',
            message: 'The recipient will choose the AI and model before opening.',
        })
    }
    else if (options.recipientChoice === 'model') {
        notices.push({
            feature: 'handoff',
            message: `The recipient will choose a ${providerLabel(provider)} model and can switch AI.`,
        })
    }

    if (options.webSearch) {
        if (options.recipientChoice) {
            notices.push({
                feature: 'webSearch',
                message: 'The prompt asks the selected AI to search. Web access varies, so confirm it after opening.',
            })
        }
        else if (provider === 'perplexity') {
            notices.push({
                feature: 'webSearch',
                message: 'Perplexity searches the web by default.',
            })
        }
        else if (provider === 'chatgpt') {
            notices.push({
                feature: 'webSearch',
                message: options.model && options.model !== 'latest'
                    ? 'Search is requested in the prompt so the model hint is preserved. ChatGPT may still ignore either preference.'
                    : 'Search is requested in the prompt. ChatGPT decides whether to use the web.',
            })
        }
        else {
            notices.push({
                feature: 'webSearch',
                message: `The prompt asks ${providerLabel(provider)} to search. Confirm Web Search after opening.`,
            })
        }
    }

    if (options.temporary) {
        notices.push({
            feature: 'temporary',
            message: options.recipientChoice
                ? 'Private or temporary chat availability varies by AI. Turn it on after choosing.'
                : temporaryNotice(provider),
        })
    }

    if (options.model && options.model !== 'latest') {
        const exact = !isModelAlias(options.model)
        const serializedHint = getProviderModelHint(provider, options.model)
        notices.push({
            feature: 'model',
            message: provider === 'perplexity' || provider === 'gemini' || !serializedHint
                ? `${providerLabel(provider)} links cannot reliably select ${exact ? 'this exact model' : 'a model mode'}. Choose it after opening.`
                : `${exact ? 'Exact model' : 'Model mode'} is a best-effort hint. Confirm it after opening.`,
        })
    }

    if (provider === 'gemini' && !options.recipientChoice) {
        notices.push({
            feature: 'handoff',
            message: 'Gemini uses a copy-and-open handoff so the prompt is not lost.',
        })
    }

    return notices
}

function temporaryNotice(provider: NonNullable<PromptLinkOptions['provider']>) {
    switch (provider) {
        case 'chatgpt':
            return 'Temporary Chat is a best-effort link hint. Confirm it is on before sending.'
        case 'claude':
            return 'Incognito is a best-effort link hint. Confirm it is on before sending.'
        case 'gemini':
            return 'Turn on Temporary chat in Gemini before sending; the link cannot enable it.'
        case 'perplexity':
            return 'Turn on Incognito in Perplexity after opening; the link cannot enable it.'
    }
}

function providerLabel(provider: NonNullable<PromptLinkOptions['provider']>) {
    switch (provider) {
        case 'chatgpt':
            return 'ChatGPT'
        case 'claude':
            return 'Claude'
        case 'gemini':
            return 'Gemini'
        case 'perplexity':
            return 'Perplexity'
    }
}
