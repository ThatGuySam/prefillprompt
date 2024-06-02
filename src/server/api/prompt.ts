import assert from 'node:assert'
export default defineEventHandler((event) => {
    const { q: promptText } = getQuery(event)

    assert( typeof promptText === 'string', 'Expected prompt text to be a string' )
    assert( promptText.length > 0, 'Expected prompt text to be non-empty' )

    console.log(`Received query: `, promptText )
  
    return {
        body: {
            message: `Hello, ${promptText}!`
        }
    }
})