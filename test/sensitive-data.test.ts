import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { findSensitiveData } from '../src/lib/sensitive-data.ts'

describe('sensitive-data warning', () => {
    it('detects high-confidence credentials without returning their value', () => {
        const findings = [
            findSensitiveData('token=sk-proj-1234567890abcdefghijklmnopqrstuv'),
            findSensitiveData('token=sk-ant-api03-1234567890abcdefghijklmnopqrstuv'),
            findSensitiveData('-----BEGIN PRIVATE KEY-----\nabc'),
            findSensitiveData('postgres://service:a-very-secret-password@example.com/app'),
            findSensitiveData(
                'AWS_ACCESS_KEY_ID=AKIA1234567890ABCDEF\n'
                + `AWS_SECRET_ACCESS_KEY=${'aB3/'.repeat(10)}`,
            ),
        ]

        assert.deepEqual(
            findings.map(finding => finding?.kind),
            ['api-key', 'api-key', 'private-key', 'database-credential', 'cloud-credential'],
        )
        assert.equal(findings[1]?.label, 'an Anthropic API key')
        for (const finding of findings) {
            assert.ok(finding)
            assert.deepEqual(Object.keys(finding).sort(), ['kind', 'label'])
        }
    })

    it('ignores ordinary prompt text and obvious placeholders', () => {
        assert.equal(findSensitiveData('Summarize the API design and list risks.'), null)
        assert.equal(
            findSensitiveData('Use sk-proj-example-placeholder in the documentation.'),
            null,
        )
        assert.equal(
            findSensitiveData('Contact sam@example.com or call 555-0100.'),
            null,
        )
    })
})
