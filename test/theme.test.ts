import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'

const css = readFileSync(
    new URL('../src/assets/css/main.css', import.meta.url),
    'utf8',
)
const app = readFileSync(
    new URL('../src/app.vue', import.meta.url),
    'utf8',
)

describe('theme contracts', () => {
    it('preserves a system-driven dark theme', () => {
        const darkMode = css.slice(css.indexOf('@media (prefers-color-scheme: dark)'))

        assert.match(darkMode, /color-scheme:\s*dark/)
        assert.match(darkMode, /--paper:\s*#08111f/)
        assert.match(darkMode, /--surface:\s*#111a28/)
        assert.match(darkMode, /\.phone-composer[\s\S]*background:\s*rgb\(17 26 40/)
        assert.match(darkMode, /\.qr-dialog img[\s\S]*background:\s*white/)
    })

    it('publishes light and dark browser chrome colors', () => {
        assert.match(app, /media:\s*'\(prefers-color-scheme: light\)'/)
        assert.match(app, /content:\s*'#fffdf8'/)
        assert.match(app, /media:\s*'\(prefers-color-scheme: dark\)'/)
        assert.match(app, /content:\s*'#08111f'/)
    })
})
