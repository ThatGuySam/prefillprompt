import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
    readStorage,
    removeStorage,
    writeStorage,
} from '../src/lib/safe-storage.ts'

const deniedStorage = {
    getItem() {
        throw new DOMException('Denied', 'SecurityError')
    },
    removeItem() {
        throw new DOMException('Denied', 'SecurityError')
    },
    setItem() {
        throw new DOMException('Full', 'QuotaExceededError')
    },
}

describe('optional browser storage', () => {
    it('contains denied reads and writes without changing the primary action outcome', () => {
        assert.equal(readStorage(deniedStorage, 'history'), null)
        assert.equal(writeStorage(deniedStorage, 'history', '[]'), false)
        assert.equal(removeStorage(deniedStorage, 'history'), false)
    })

    it('contains failures while acquiring the storage object itself', () => {
        const deniedWindow = Object.defineProperty({}, 'localStorage', {
            get() {
                throw new DOMException('Denied', 'SecurityError')
            },
        }) as { localStorage: Storage }
        const storage = () => deniedWindow.localStorage

        assert.equal(readStorage(storage, 'history'), null)
        assert.equal(writeStorage(storage, 'history', '[]'), false)
        assert.equal(removeStorage(storage, 'history'), false)
    })

    it('treats unavailable storage as an optional capability', () => {
        assert.equal(readStorage(null, 'history'), null)
        assert.equal(writeStorage(null, 'history', '[]'), false)
        assert.equal(removeStorage(null, 'history'), false)
    })
})
