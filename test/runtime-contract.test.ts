import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'

function readRepositoryFile(path: string) {
    return readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')
}

describe('runtime and workflow contracts', () => {
    it('declares the Node floor required by the frozen Cloudflare toolchain', () => {
        const packageJson = JSON.parse(readRepositoryFile('package.json')) as {
            engines?: { node?: string }
        }
        const pinnedNode = readRepositoryFile('.node-version').trim()
        const readme = readRepositoryFile('README.md')

        assert.equal(packageJson.engines?.node, '>=22.0.0')
        assert.equal(pinnedNode, '22.16.0')
        assert.match(readme, /requires Node 22 or newer/)
        assert.doesNotMatch(readme, /supporting Node 20/)
    })

    it('enables pnpm before setup-node attempts to restore its cache', () => {
        for (const path of [
            '.github/workflows/ci.yml',
            '.github/workflows/update-model-catalog.yml',
        ]) {
            const workflow = readRepositoryFile(path)
            const enablePnpm = workflow.indexOf('run: corepack enable')
            const setupNode = workflow.indexOf('uses: actions/setup-node@v4')

            assert.ok(enablePnpm >= 0, `${path} must enable pnpm`)
            assert.ok(setupNode >= 0, `${path} must set up Node`)
            assert.ok(enablePnpm < setupNode, `${path} must enable pnpm before setup-node`)
        }
    })

    it('runs the complete launch check for pull requests and main', () => {
        const workflow = readRepositoryFile('.github/workflows/ci.yml')

        assert.match(workflow, /pull_request:/)
        assert.match(workflow, /push:/)
        assert.match(workflow, /- main/)
        assert.match(workflow, /run: pnpm check/)
    })
})
