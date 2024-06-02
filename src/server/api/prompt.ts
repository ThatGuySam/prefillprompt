import assert from 'node:assert'

const UNCACHED_REDIRECT_CODE = 307

export default defineEventHandler(async (event) => {
    const { q: promptText } = getQuery(event)

    assert( typeof promptText === 'string', 'Expected prompt text to be a string' )
    assert( promptText.length > 0, 'Expected prompt text to be non-empty' )

    console.log(`Received query: `, promptText )
  
    await sendRedirect(
        event, 
        `https://chat.openai.com?q=${ encodeURIComponent(promptText) }`,
        UNCACHED_REDIRECT_CODE
    )
})