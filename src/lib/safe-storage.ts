export interface BrowserStorage {
    getItem: (key: string) => string | null
    removeItem: (key: string) => void
    setItem: (key: string, value: string) => void
}

export type BrowserStorageSource = BrowserStorage | null | undefined | (() => BrowserStorage | null | undefined)

function resolveStorage(source: BrowserStorageSource) {
    return typeof source === 'function' ? source() : source
}

export function readStorage(source: BrowserStorageSource, key: string) {
    try {
        return resolveStorage(source)?.getItem(key) ?? null
    }
    catch {
        return null
    }
}

export function writeStorage(source: BrowserStorageSource, key: string, value: string) {
    try {
        const storage = resolveStorage(source)
        if (!storage) {
            return false
        }
        storage.setItem(key, value)
        return true
    }
    catch {
        return false
    }
}

export function removeStorage(source: BrowserStorageSource, key: string) {
    try {
        const storage = resolveStorage(source)
        if (!storage) {
            return false
        }
        storage.removeItem(key)
        return true
    }
    catch {
        return false
    }
}
