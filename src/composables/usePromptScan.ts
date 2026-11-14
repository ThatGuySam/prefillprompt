import type { Ref } from 'vue'
import type { DeepScanReply } from '~/lib/scanner/deep-protocol'
import type { FirstPassModel } from '~/lib/scanner/first-pass'
import type { ConnectionHint, ScanState } from '~/lib/scanner/scan-state'
import firstPassSettings from '~/data/scanner/first-pass.json'
import { deepManifest, isDeepScannerSaved } from '~/lib/scanner/deep-manifest'
import { firstPassScore } from '~/lib/scanner/first-pass'
import { deepVerdict, startsAutomatically } from '~/lib/scanner/scan-state'

let firstPassModel: Promise<FirstPassModel> | null = null

function loadFirstPass(): Promise<FirstPassModel> {
    firstPassModel ??= (async () => {
        const response = await fetch(`/scanner/${firstPassSettings.file}`)
        if (!response.ok || !response.body)
            throw new Error(`HTTP ${response.status}`)
        const bytes = await new Response(response.body.pipeThrough(new DecompressionStream('gzip'))).arrayBuffer()
        return { ...firstPassSettings, weights: new Int8Array(bytes) }
    })()
    firstPassModel.catch(() => {
        firstPassModel = null
    })
    return firstPassModel
}

// Runs the on-device scan for a prompt: the quick first pass, then, unless it is already sure,
// the deep scan in a Web Worker. Only runs in the browser and only while `enabled` is true.
export function usePromptScan(prompt: Ref<string>, enabled: Ref<boolean>) {
    const state = ref<ScanState>({ step: 'checking' })
    let worker: Worker | null = null
    let request = 0

    function deepScan() {
        const id = ++request
        state.value = { step: 'downloading', loaded: 0, total: deepManifest.totalBytes }
        worker ??= new Worker(new URL('../lib/scanner/deep-worker.ts', import.meta.url), { type: 'module' })
        worker.onmessage = (event: MessageEvent<DeepScanReply>) => {
            const reply = event.data
            if ('id' in reply && reply.id !== id)
                return
            if (reply.type === 'download')
                state.value = reply.fetched ? { step: 'downloading', loaded: reply.loaded, total: reply.total } : { step: 'preparing' }
            else if (reply.type === 'preparing')
                state.value = { step: 'preparing' }
            else if (reply.type === 'scanning')
                state.value = { step: 'scanning', part: reply.part, parts: reply.parts }
            else if (reply.type === 'result')
                state.value = deepVerdict(reply.score)
            else
                state.value = { step: 'unavailable', reason: reply.message }
        }
        worker.onerror = () => {
            state.value = { step: 'unavailable', reason: 'the scanner could not start in this browser' }
        }
        worker.postMessage({ id, prompt: prompt.value, manifest: toRaw(deepManifest) })
    }

    async function run() {
        const text = prompt.value
        state.value = { step: 'checking' }
        try {
            const model = await loadFirstPass()
            if (text !== prompt.value)
                return
            if (firstPassScore(model, text) >= model.threshold) {
                state.value = { step: 'dangerous', by: 'quick check' }
                return
            }
        }
        catch {
            // A missing first pass only loses the shortcut; the deep scan still decides.
        }
        if (typeof Worker === 'undefined' || typeof DecompressionStream === 'undefined' || typeof WebAssembly === 'undefined') {
            state.value = { step: 'unavailable', reason: 'this browser cannot run it' }
            return
        }
        const connection = (navigator as Navigator & { connection?: ConnectionHint }).connection
        if (startsAutomatically(await isDeepScannerSaved(deepManifest), connection))
            deepScan()
        else
            state.value = { step: 'offer', bytes: deepManifest.totalBytes }
    }

    onMounted(() => {
        watch([prompt, enabled], () => {
            if (enabled.value && prompt.value)
                run()
        }, { immediate: true })
    })
    onBeforeUnmount(() => worker?.terminate())

    return { state, deepScan }
}
