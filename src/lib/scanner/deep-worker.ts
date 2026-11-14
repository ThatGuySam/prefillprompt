// Web Worker for the deep scan. Downloads the model in verified pieces, keeps each piece in the
// Cache API so an interrupted or repeated download resumes, then scores the prompt with ONNX
// Runtime Web on this device. The session stays alive for later scans on the same page.

import type { DeepManifest, ScannerFile } from './deep-manifest'
import type { DeepScanReply, DeepScanRequest } from './deep-protocol'
import { Tokenizer } from '@huggingface/tokenizers'
import wasmModuleUrl from 'onnxruntime-web/ort-wasm-simd-threaded.mjs?url'
import wasmBinaryUrl from 'onnxruntime-web/ort-wasm-simd-threaded.wasm?url'
import * as ort from 'onnxruntime-web/wasm'
import { deepCacheName } from './deep-manifest'
import { normalizeForScan } from './first-pass'

const WINDOW_TOKENS = 512
const STRIDE_TOKENS = 384
const PARALLEL_DOWNLOADS = 2

ort.env.wasm.wasmPaths = { mjs: wasmModuleUrl, wasm: wasmBinaryUrl }
ort.env.wasm.numThreads = 1

const post = (reply: DeepScanReply) => globalThis.postMessage(reply)

async function sha256(bytes: ArrayBuffer) {
    const digest = await crypto.subtle.digest('SHA-256', bytes)
    return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('')
}

async function openCache(manifest: DeepManifest): Promise<Cache | null> {
    if (typeof caches === 'undefined')
        return null
    try {
        for (const name of await caches.keys()) {
            if (name.startsWith('prefillprompt-scanner-') && name !== deepCacheName(manifest))
                await caches.delete(name)
        }
        return await caches.open(deepCacheName(manifest))
    }
    catch {
        return null
    }
}

// Returns every piece's compressed bytes, from the cache when saved, else from the network.
async function downloadPieces(manifest: DeepManifest): Promise<Map<string, ArrayBuffer>> {
    const cache = await openCache(manifest)
    const pieces = Object.values(manifest.files).flatMap(file => file.chunks)
    const result = new Map<string, ArrayBuffer>()
    let loaded = 0
    let fetched = false
    const report = () => post({ type: 'download', loaded, total: manifest.totalBytes, fetched })

    const queue = [...pieces]
    async function next(): Promise<void> {
        const piece = queue.shift()
        if (!piece)
            return
        const url = new URL(manifest.base + piece.path, globalThis.location.origin).href
        const saved = await cache?.match(url)
        let bytes = saved ? await saved.arrayBuffer() : null
        if (bytes && await sha256(bytes) !== piece.sha256)
            bytes = null
        if (bytes) {
            loaded += piece.bytes
        }
        else {
            fetched = true
            const response = await fetch(url)
            if (!response.ok || !response.body)
                throw new Error(`download failed (HTTP ${response.status})`)
            const reader = response.body.getReader()
            const parts: Uint8Array[] = []
            for (let step = await reader.read(); !step.done; step = await reader.read()) {
                parts.push(step.value)
                loaded += step.value.length
                report()
            }
            bytes = await new Blob(parts as BlobPart[]).arrayBuffer()
            if (await sha256(bytes) !== piece.sha256)
                throw new Error('a downloaded piece failed its checksum')
            await cache?.put(url, new Response(bytes)).catch(() => {})
        }
        result.set(piece.path, bytes)
        report()
        return next()
    }
    await Promise.all(Array.from({ length: PARALLEL_DOWNLOADS }, next))
    return result
}

async function assemble(file: ScannerFile, pieces: Map<string, ArrayBuffer>): Promise<Uint8Array> {
    const output = new Uint8Array(file.size)
    let offset = 0
    for (const piece of file.chunks) {
        const stream = new Blob([pieces.get(piece.path)!]).stream().pipeThrough(new DecompressionStream('gzip'))
        const bytes = new Uint8Array(await new Response(stream).arrayBuffer())
        output.set(bytes, offset)
        offset += bytes.length
    }
    if (offset !== file.size || await sha256(output.buffer as ArrayBuffer) !== file.sha256)
        throw new Error('the assembled scanner failed its checksum')
    return output
}

interface Scanner { session: ort.InferenceSession, tokenizer: Tokenizer }
let loading: Promise<Scanner> | null = null

async function loadScanner(manifest: DeepManifest): Promise<Scanner> {
    const pieces = await downloadPieces(manifest)
    post({ type: 'preparing' })
    const text = async (file: ScannerFile) => new TextDecoder().decode(await assemble(file, pieces))
    const tokenizer = new Tokenizer(JSON.parse(await text(manifest.files.tokenizer)), JSON.parse(await text(manifest.files.tokenizerConfig)))
    const model = await assemble(manifest.files.model, pieces)
    pieces.clear()
    const session = await ort.InferenceSession.create(model, { executionProviders: ['wasm'], graphOptimizationLevel: 'all' })
    return { session, tokenizer }
}

// Token windows covering the whole prompt, each wrapped in the model's start and end tokens.
function windows(ids: number[]): number[][] {
    const [first, ...rest] = ids
    const last = rest.pop()!
    const span = WINDOW_TOKENS - 2
    const result: number[][] = []
    for (let start = 0; ; start += STRIDE_TOKENS) {
        result.push([first!, ...rest.slice(start, start + span), last])
        if (start + span >= rest.length)
            return result
    }
}

async function scan(prompt: string, manifest: DeepManifest): Promise<number> {
    loading ??= loadScanner(manifest)
    let scanner: Scanner
    try {
        scanner = await loading
    }
    catch (error) {
        loading = null
        throw error
    }
    const normalized = normalizeForScan(prompt)
    const texts = normalized === prompt ? [prompt] : [prompt, normalized]
    const jobs = texts.flatMap(text => windows(scanner.tokenizer.encode(text).ids))
    let highest = 0
    for (const [index, ids] of jobs.entries()) {
        post({ type: 'scanning', part: index + 1, parts: jobs.length })
        const dims = [1, ids.length]
        const feeds: Record<string, ort.Tensor> = {
            input_ids: new ort.Tensor('int64', BigInt64Array.from(ids, BigInt), dims),
            attention_mask: new ort.Tensor('int64', new BigInt64Array(ids.length).fill(1n), dims),
        }
        const output = await scanner.session.run(Object.fromEntries(Object.entries(feeds).filter(([name]) => scanner.session.inputNames.includes(name))))
        const [safe, attack] = Array.from(output[scanner.session.outputNames[0]!]!.data as Float32Array)
        const largest = Math.max(safe!, attack!)
        const score = Math.exp(attack! - largest) / (Math.exp(safe! - largest) + Math.exp(attack! - largest))
        highest = Math.max(highest, score)
    }
    return highest
}

globalThis.addEventListener('message', async (event: MessageEvent<DeepScanRequest>) => {
    const { id, prompt, manifest } = event.data
    try {
        post({ type: 'result', id, score: await scan(prompt, manifest) })
    }
    catch (error) {
        post({ type: 'error', id, message: error instanceof Error ? error.message : String(error) })
    }
})
