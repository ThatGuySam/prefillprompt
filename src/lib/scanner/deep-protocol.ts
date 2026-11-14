import type { DeepManifest } from './deep-manifest'

export interface DeepScanRequest {
    id: number
    prompt: string
    manifest: DeepManifest
}

export type DeepScanReply
    = | { type: 'download', loaded: number, total: number, fetched: boolean }
        | { type: 'preparing' }
        | { type: 'scanning', part: number, parts: number }
        | { type: 'result', id: number, score: number }
        | { type: 'error', id: number, message: string }
