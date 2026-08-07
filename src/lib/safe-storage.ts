export interface BrowserStorage {
    getItem: (key: string) => string | null
    removeItem: (key: string) => void
    setItem: (key: string, value: string) => void
}

export function readStorage(storage: BrowserStorage, key: string) {
    try {
        return storage.getItem(key)
    }
    catch {
        return null
    }
}

export function writeStorage(storage: BrowserStorage, key: string, value: string) {
    try {
        storage.setItem(key, value)
        return true
    }
    catch {
        return false
    }
}

export function removeStorage(storage: BrowserStorage, key: string) {
    try {
        storage.removeItem(key)
        return true
    }
    catch {
        return false
    }
}
