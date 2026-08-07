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
})
