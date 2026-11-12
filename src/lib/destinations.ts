// Where a prompt can be opened: an AI's own app through its documented deep link, or its
// website. The reader picks one on the preview screen, and the choice is remembered.

import type { PromptLinkOptions } from './prompt-links.ts'
import type { ProviderId } from './providers.ts'
import type { BrowserStorageSource } from './safe-storage.ts'
import { buildGeminiHandoffPath, buildProviderUrl } from './prompt-links.ts'
import { readStorage, writeStorage } from './safe-storage.ts'

export type DestinationId = 'chatgpt-app' | 'chatgpt-web' | 'claude-app' | 'claude-web' | 'gemini-web' | 'perplexity-web'

export interface Destination {
    id: DestinationId
    provider: ProviderId
    surface: 'app' | 'web'
    label: string
    hint: string
    // The website to offer when the app does not open.
    fallback?: DestinationId
}

export const DESTINATION_STORAGE_KEY = 'prefillprompt:destination'

// Claude Code's deep link accepts at most this many characters of prompt.
export const CLAUDE_CODE_PROMPT_LIMIT = 5000

export const destinations: Destination[] = [
    { id: 'chatgpt-app', provider: 'chatgpt', surface: 'app', label: 'ChatGPT app', hint: 'Codex in the ChatGPT desktop app. It can run commands. Waits for you to send.', fallback: 'chatgpt-web' },
    { id: 'chatgpt-web', provider: 'chatgpt', surface: 'web', label: 'ChatGPT website', hint: 'chatgpt.com. A phone opens the app when it is installed.' },
    { id: 'claude-app', provider: 'claude', surface: 'app', label: 'Claude Code', hint: 'Claude Code in a terminal. It can run commands. Waits for you to send.', fallback: 'claude-web' },
    { id: 'claude-web', provider: 'claude', surface: 'web', label: 'Claude website', hint: 'claude.ai. A phone opens the app when it is installed.' },
    { id: 'gemini-web', provider: 'gemini', surface: 'web', label: 'Gemini', hint: 'Copies the prompt, then opens gemini.google.com.' },
    { id: 'perplexity-web', provider: 'perplexity', surface: 'web', label: 'Perplexity', hint: 'Starts a search on perplexity.ai.' },
]

export function getDestination(id: DestinationId) {
    return destinations.find(destination => destination.id === id)!
}

export function isDestinationId(value: unknown): value is DestinationId {
    return typeof value === 'string' && destinations.some(destination => destination.id === value)
}

// The address to open. App links follow each vendor's documented form and only fill the
// prompt in; the reader still sends it. Returns null when the app cannot take this prompt.
export function buildDestinationUrl(id: DestinationId, options: PromptLinkOptions): string | null {
    const destination = getDestination(id)
    if (id === 'chatgpt-app') {
        return `codex://new?prompt=${encodeURIComponent(options.prompt)}`
    }
    if (id === 'claude-app') {
        return options.prompt.length > CLAUDE_CODE_PROMPT_LIMIT ? null : `claude-cli://open?q=${encodeURIComponent(options.prompt)}`
    }
    if (id === 'gemini-web') {
        return buildGeminiHandoffPath({ ...options, provider: 'gemini' })
    }
    return buildProviderUrl({ ...options, provider: destination.provider })
}

export function readPreferredDestination(storage: BrowserStorageSource): DestinationId | null {
    const saved = readStorage(storage, DESTINATION_STORAGE_KEY)
    return isDestinationId(saved) ? saved : null
}

export function savePreferredDestination(storage: BrowserStorageSource, id: DestinationId) {
    return writeStorage(storage, DESTINATION_STORAGE_KEY, id)
}

export interface Arrangement {
    // Preselected destination, or null when the reader has to choose first.
    selected: DestinationId | null
    // Destinations in display order, the preselected one first.
    list: Destination[]
    // Whether opening should save the choice. A link that names a provider is a one-off.
    remember: boolean
}

// Decides what the preview screen offers. A provider named in the link wins for this visit
// and leaves the saved preference alone. Otherwise the saved preference comes first.
// `apps` is false on touch devices, where the website link already opens an installed app.
export function arrangeDestinations({ linked, preferred, apps, prompt }: {
    linked?: ProviderId
    preferred: DestinationId | null
    apps: boolean
    prompt: string
}): Arrangement {
    const available = destinations.filter(destination =>
        (apps || destination.surface === 'web') && buildDestinationUrl(destination.id, { prompt }) !== null,
    )
    const usable = (id: DestinationId | null | undefined) => available.find(destination => destination.id === id)
    const first = (chosen: Destination | undefined, rest: Destination[]) =>
        chosen ? [chosen, ...rest.filter(destination => destination.id !== chosen.id)] : rest

    if (linked) {
        const ofProvider = available.filter(destination => destination.provider === linked)
        // The saved choice still says whether this reader wants apps or websites.
        const saved = usable(preferred)
        const selected = (saved?.provider === linked ? saved : undefined)
            ?? ofProvider.find(destination => destination.surface === saved?.surface)
            ?? ofProvider[0]
        const others = available.filter(destination => destination.provider !== linked)
        return { selected: selected?.id ?? null, list: first(selected, [...ofProvider, ...others]), remember: false }
    }

    const selected = usable(preferred)
    return { selected: selected?.id ?? null, list: first(selected, available), remember: true }
}
