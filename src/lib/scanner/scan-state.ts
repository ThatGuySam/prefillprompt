// What the on-device scan is doing, as one value, and the pure rules that move it along.

export type ScanState
    = | { step: 'checking' }
        | { step: 'offer', bytes: number }
        | { step: 'downloading', loaded: number, total: number }
        | { step: 'preparing' }
        | { step: 'scanning', part: number, parts: number }
        | { step: 'dangerous', by: 'quick check' | 'deep scan' }
        | { step: 'caution' }
        | { step: 'clear' }
        | { step: 'unavailable', reason: string }

// Deep-scan score at or above which the prompt is called dangerous, and the band below it that
// asks for a careful read. Chosen in docs/research/browser-ml-prompt-danger-detection-2026-11-12.md.
export const DANGEROUS_SCORE = 0.99
export const CAUTION_SCORE = 0.9

export function deepVerdict(score: number): ScanState {
    if (score >= DANGEROUS_SCORE)
        return { step: 'dangerous', by: 'deep scan' }
    return score >= CAUTION_SCORE ? { step: 'caution' } : { step: 'clear' }
}

export interface ConnectionHint {
    saveData?: boolean
    effectiveType?: string
}

// A saved scanner costs nothing to use. Otherwise the download starts on its own only when the
// browser reports a fast connection and no data saver; on slow, metered, or unknown connections
// the reader decides.
export function startsAutomatically(saved: boolean, connection: ConnectionHint | undefined): boolean {
    if (saved)
        return true
    return connection?.saveData !== true && connection?.effectiveType === '4g'
}

// The sentence shown under the header for each step.
export function scanDetail(state: ScanState): string {
    const megabytes = (bytes: number) => Math.max(1, Math.round(bytes / 1e6))
    switch (state.step) {
        case 'checking': return 'Checking on this device'
        case 'offer': return `One-time ${megabytes(state.bytes)} MB download. Runs on this device.`
        case 'downloading': return `Downloading scanner · ${megabytes(state.loaded)} of ${megabytes(state.total)} MB`
        case 'preparing': return 'Preparing scanner on this device'
        case 'scanning': return state.parts > 1 ? `Scanning on this device · part ${state.part} of ${state.parts}` : 'Scanning on this device'
        case 'dangerous': return state.by === 'quick check'
            ? 'Our quick on-device check is highly confident. Read it closely before you send it.'
            : 'Our on-device scanner is highly confident. Read it closely before you send it.'
        case 'caution': return 'Our on-device scanner found some signs of an attack.'
        case 'clear': return 'Scanned on this device. A clean scan is not a guarantee.'
        case 'unavailable': return `The deeper scan did not run: ${state.reason}.`
    }
}

export function scanHeader(state: ScanState): string {
    switch (state.step) {
        case 'checking':
        case 'downloading':
        case 'preparing':
        case 'scanning': return 'Scanning prompt'
        case 'offer': return 'Deeper scan available'
        case 'dangerous': return 'This prompt looks dangerous'
        case 'caution': return 'Read this prompt closely'
        case 'clear': return 'No warning found'
        case 'unavailable': return 'Quick check only'
    }
}

export const isBusy = (state: ScanState) => ['checking', 'downloading', 'preparing', 'scanning'].includes(state.step)
