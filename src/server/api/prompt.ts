import {
    encodedUrlLength,
    isProviderId,
    MAX_PROMPT_LENGTH,
    MAX_SHARE_URL_LENGTH,
    parseBooleanParam,
} from '~/lib/prompt-links'
import { promptRedirectLocation } from '~/lib/prompt-redirect'

const UNCACHED_REDIRECT_CODE = 307

function firstString(value: unknown) {
    return typeof value === 'string' ? value : undefined
}

export default defineEventHandler(async (event) => {
    const query = getQuery(event)
    const prompt = firstString(query.q)
    const requestedProvider = firstString(query.s) ?? firstString(query.m)
    const model = firstString(query.model)
    const requestUrl = getRequestURL(event).toString()

    setResponseHeaders(event, {
        'Cache-Control': 'private, no-store',
        'Referrer-Policy': 'no-referrer',
        'X-Robots-Tag': 'noindex, nofollow',
    })

    if (encodedUrlLength(requestUrl) > MAX_SHARE_URL_LENGTH) {
        throw createError({
            statusCode: 414,
            statusMessage: 'Prompt link is too long',
            data: { code: 'PROMPT_URL_TOO_LONG' },
        })
    }

    if (!prompt?.trim()) {
        throw createError({
            statusCode: 400,
            statusMessage: 'Prompt is required',
            data: { code: 'PROMPT_REQUIRED' },
        })
    }

    if (prompt.length > MAX_PROMPT_LENGTH) {
        throw createError({
            statusCode: 400,
            statusMessage: `Prompt must be ${MAX_PROMPT_LENGTH.toLocaleString()} characters or fewer`,
            data: { code: 'PROMPT_TOO_LONG' },
        })
    }

    if (requestedProvider && !isProviderId(requestedProvider)) {
        throw createError({
            statusCode: 400,
            statusMessage: `Unsupported service: ${requestedProvider}`,
            data: { code: 'UNSUPPORTED_SERVICE' },
        })
    }

    const destination = promptRedirectLocation({
        prompt,
        requestedProvider,
        model,
        webSearch: parseBooleanParam(query.web),
        temporary: parseBooleanParam(query.temporary),
    })

    return sendRedirect(event, destination, UNCACHED_REDIRECT_CODE)
})
