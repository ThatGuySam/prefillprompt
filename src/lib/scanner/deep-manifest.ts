import manifestJson from '~/data/scanner/deep.json'

export interface ScannerPiece {
    path: string
    bytes: number
    sha256: string
}

export interface ScannerFile {
    size: number
    sha256: string
    chunks: ScannerPiece[]
}

export interface DeepManifest {
    version: string
    base: string
    totalBytes: number
    files: { model: ScannerFile, tokenizer: ScannerFile, tokenizerConfig: ScannerFile }
}

export const deepManifest = manifestJson as DeepManifest

export function deepCacheName(manifest: DeepManifest) {
    return `prefillprompt-scanner-${manifest.version}`
}

export function pieceUrls(manifest: DeepManifest) {
    return Object.values(manifest.files).flatMap(file => file.chunks.map(piece => new URL(manifest.base + piece.path, location.origin).href))
}

// True when every piece of this version is already in the browser's cache, so a scan costs no download.
export async function isDeepScannerSaved(manifest: DeepManifest): Promise<boolean> {
    if (typeof caches === 'undefined')
        return false
    try {
        if (!(await caches.has(deepCacheName(manifest))))
            return false
        const cache = await caches.open(deepCacheName(manifest))
        const saved = new Set((await cache.keys()).map(request => request.url))
        return pieceUrls(manifest).every(url => saved.has(url))
    }
    catch {
        return false
    }
}
