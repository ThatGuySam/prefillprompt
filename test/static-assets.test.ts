import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { describe, it } from 'node:test'

const requiredAssets = [
    'favicon.svg',
    'og-prefillprompt.png',
    'robots.txt',
    'site.webmanifest',
    'sitemap.xml',
]

describe('production static assets', () => {
    it('keeps public assets in the directory explicitly configured for srcDir', () => {
        const config = readFileSync(
            new URL('../nuxt.config.ts', import.meta.url),
            'utf8',
        )

        assert.match(config, /public:\s*'\.\.\/public'/)
        for (const asset of requiredAssets) {
            assert.equal(
                existsSync(new URL(`../public/${asset}`, import.meta.url)),
                true,
                `${asset} should exist in root public/`,
            )
        }
    })
})
