import assert from 'node:assert/strict'
import test from 'node:test'
import { arrangeDestinations, buildDestinationUrl, DESTINATION_STORAGE_KEY, readPreferredDestination, savePreferredDestination } from '../src/lib/destinations.ts'

const prompt = 'Summarize this & that'
const ids = (list: Array<{ id: string }>) => list.map(destination => destination.id)

test('a first visit with no provider asks the reader to choose', () => {
    const result = arrangeDestinations({ preferred: null, apps: true, prompt })
    assert.equal(result.selected, null)
    assert.equal(result.remember, true)
    assert.deepEqual(ids(result.list), ['chatgpt-app', 'chatgpt-web', 'claude-app', 'claude-web', 'gemini-web', 'perplexity-web'])
})

test('the remembered choice is preselected and listed first', () => {
    const result = arrangeDestinations({ preferred: 'claude-app', apps: true, prompt })
    assert.equal(result.selected, 'claude-app')
    assert.equal(result.list[0]!.id, 'claude-app')
    assert.equal(result.list.length, 6)
    assert.equal(result.remember, true)
})

test('a provider in the link wins for this visit and is not saved', () => {
    const result = arrangeDestinations({ linked: 'chatgpt', preferred: null, apps: true, prompt })
    assert.equal(result.selected, 'chatgpt-app')
    assert.deepEqual(ids(result.list).slice(0, 2), ['chatgpt-app', 'chatgpt-web'])
    assert.equal(result.remember, false)
    // A reader who saved a website gets the linked provider's website, and the same for apps.
    assert.equal(arrangeDestinations({ linked: 'chatgpt', preferred: 'claude-web', apps: true, prompt }).selected, 'chatgpt-web')
    assert.equal(arrangeDestinations({ linked: 'claude', preferred: 'chatgpt-app', apps: true, prompt }).selected, 'claude-app')
    // A saved choice for the same provider decides between its app and its website.
    assert.equal(arrangeDestinations({ linked: 'chatgpt', preferred: 'chatgpt-web', apps: true, prompt }).selected, 'chatgpt-web')
})

test('touch devices are offered websites only, which open an installed app themselves', () => {
    const result = arrangeDestinations({ linked: 'claude', preferred: 'claude-app', apps: false, prompt })
    assert.equal(result.selected, 'claude-web')
    assert.ok(result.list.every(destination => destination.surface === 'web'))
})

test('app links use each vendor\'s documented form, and websites keep the link\'s options', () => {
    assert.equal(buildDestinationUrl('chatgpt-app', { prompt }), 'codex://new?prompt=Summarize%20this%20%26%20that')
    assert.equal(buildDestinationUrl('claude-app', { prompt }), 'claude-cli://open?q=Summarize%20this%20%26%20that')
    assert.equal(buildDestinationUrl('claude-web', { prompt, temporary: true }), 'https://claude.ai/new?q=Summarize+this+%26+that&incognito=true')
    assert.equal(buildDestinationUrl('chatgpt-web', { prompt, webSearch: true }), 'https://chatgpt.com/?q=Summarize+this+%26+that&hints=search')
    assert.equal(buildDestinationUrl('gemini-web', { prompt })!.split('?')[0], '/handoff')
})

test('Claude Code is not offered for a prompt longer than its deep link accepts', () => {
    const long = 'a'.repeat(5001)
    assert.equal(buildDestinationUrl('claude-app', { prompt: long }), null)
    assert.ok(!ids(arrangeDestinations({ preferred: 'claude-app', apps: true, prompt: long }).list).includes('claude-app'))
})

test('the choice survives in storage and bad or blocked storage is ignored', () => {
    const values = new Map<string, string>()
    const storage = () => ({ getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => void values.set(key, value), removeItem: (key: string) => void values.delete(key) })
    assert.equal(readPreferredDestination(storage), null)
    savePreferredDestination(storage, 'claude-app')
    assert.equal(values.get(DESTINATION_STORAGE_KEY), 'claude-app')
    assert.equal(readPreferredDestination(storage), 'claude-app')
    values.set(DESTINATION_STORAGE_KEY, 'not-a-destination')
    assert.equal(readPreferredDestination(storage), null)
    const blocked = () => {
        throw new Error('blocked')
    }
    assert.equal(readPreferredDestination(blocked), null)
})
