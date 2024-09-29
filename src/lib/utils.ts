import { hasWindow } from 'std-env'

import type { LLMModel } from '~/lib/types'

export function getSiteHost() {
    if (!hasWindow && window?.location?.href?.length > 2) {
        return window.location.host
    }

    return undefined
}

export function isModel(modelName: unknown): modelName is LLMModel {
    if (typeof modelName !== 'string') {
        return false
    }

    return ['chatgpt', 'claude', 'perplexity'].includes(modelName)
}
