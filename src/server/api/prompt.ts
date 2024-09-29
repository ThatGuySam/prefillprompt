import assert from 'node:assert'
import { isModel } from '~/lib/utils'

const UNCACHED_REDIRECT_CODE = 307

export default defineEventHandler(async (event) => {
    const {
        q: promptText,
        m: modelName = 'chatgpt',
    } = getQuery(event)

    assert(typeof promptText === 'string', 'Expected prompt text to be a string')
    assert(promptText.length > 0, 'Expected prompt text to be non-empty')

    // Assert the model name is valid
    assert(isModel(modelName), `Invalid model name: ${modelName}`)

    console.log(`Received query: `, promptText)

    if (modelName === 'chatgpt') {
        await sendRedirect(
            event,
            `https://chat.openai.com?q=${encodeURIComponent(promptText)}`,
            UNCACHED_REDIRECT_CODE,
        )
        return
    }

    // Claude URL API
    if (modelName === 'claude') {
        await sendRedirect(
            event,
            `https://claude.ai/new?q=${encodeURIComponent(promptText)}`,
            UNCACHED_REDIRECT_CODE,
        )
        return
    }

    if (modelName === 'perplexity') {
        await sendRedirect(
            event,
            `https://www.perplexity.ai/search?q=${encodeURIComponent(promptText)}`,
            UNCACHED_REDIRECT_CODE,
        )
        return
    }

    throw new Error(`Model ${modelName} is not yet supported`)
})
