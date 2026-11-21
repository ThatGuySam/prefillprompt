import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'

const workflow = readFileSync(
    new URL('../.github/workflows/update-model-catalog.yml', import.meta.url),
    'utf8',
)

const prepareStart = workflow.indexOf('\n    prepare:')
const publishStart = workflow.indexOf('\n    publish:')

assert.notEqual(prepareStart, -1, 'catalog workflow must define a prepare job')
assert.notEqual(publishStart, -1, 'catalog workflow must define a publish job')

const prepareJob = workflow.slice(prepareStart, publishStart)
const publishJob = workflow.slice(publishStart)

describe('model catalog workflow credential isolation', () => {
    it('keeps install, generation, and validation outside the credentialed publisher', () => {
        assert.match(workflow, /\npermissions: \{\}\n/)
        assert.match(prepareJob, /permissions:\n\s+contents: read/)
        assert.match(prepareJob, /persist-credentials: false/)
        assert.match(prepareJob, /pnpm install --frozen-lockfile/)
        assert.match(prepareJob, /pnpm models:update/)
        assert.match(prepareJob, /pnpm check/)
        assert.doesNotMatch(prepareJob, /contents: write|pull-requests: write|GH_TOKEN|github\.token/)

        assert.doesNotMatch(publishJob, /pnpm|npm|node|corepack/)
    })

    it('limits publishing credentials to a pinned artifact publisher', () => {
        assert.match(publishJob, /needs: prepare/)
        assert.match(publishJob, /if: github\.ref == 'refs\/heads\/main' && needs\.prepare\.outputs\.changed == 'true'/)
        assert.match(publishJob, /permissions:\n\s+contents: write\n\s+pull-requests: write/)
        assert.match(publishJob, /GH_TOKEN: \$\{\{ github\.token \}\}/)
        assert.match(publishJob, /git add src\/data\/models\.generated\.json/)

        const actionRefs = [...publishJob.matchAll(/uses: [^@\s]+@([^\s#]+)/g)]
            .map(match => match[1])

        assert.deepEqual(actionRefs.length, 2)
        for (const ref of actionRefs) {
            assert.match(ref, /^[a-f0-9]{40}$/)
        }
    })
})
