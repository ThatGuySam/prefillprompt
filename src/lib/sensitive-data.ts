export type SensitiveDataKind
    = 'api-key'
        | 'cloud-credential'
        | 'database-credential'
        | 'private-key'

export interface SensitiveDataFinding {
    kind: SensitiveDataKind
    label: string
}

const MAX_SCAN_LENGTH = 12_000
const PLACEHOLDER_WORDS = [
    'changeme',
    'dummy',
    'example',
    'placeholder',
    'redacted',
    'sample',
]

const TOKEN_PATTERNS: Array<{
    kind: SensitiveDataKind
    label: string
    pattern: RegExp
}> = [
    {
        kind: 'api-key',
        label: 'an Anthropic API key',
        pattern: /\bsk-ant-[\w-]{20,}\b/,
    },
    {
        kind: 'api-key',
        label: 'an OpenAI-style API key',
        pattern: /\bsk-[\w-]{20,}\b/,
    },
    {
        kind: 'api-key',
        label: 'a Google API key',
        pattern: /\bAIza[\w-]{35}\b/,
    },
    {
        kind: 'api-key',
        label: 'a GitHub token',
        pattern: /\b(?:gh[pousr]_\w{30,255}|github_pat_\w{40,255})\b/,
    },
    {
        kind: 'api-key',
        label: 'a Slack token',
        pattern: /\bxox[baprs]-[\w-]{20,}\b/,
    },
    {
        kind: 'api-key',
        label: 'a live Stripe secret key',
        pattern: /\bsk_live_\w{20,}\b/,
    },
]

function isPlaceholder(value: string) {
    const normalized = value.toLowerCase()
    return PLACEHOLDER_WORDS.some(word => normalized.includes(word))
        || /x{8,}|0{12,}/i.test(value)
}

export function findSensitiveData(value: string): SensitiveDataFinding | null {
    const input = value.slice(0, MAX_SCAN_LENGTH)
    if (!input) {
        return null
    }

    if (/-----BEGIN [A-Z\d ]*PRIVATE KEY-----/.test(input)) {
        return {
            kind: 'private-key',
            label: 'a private key',
        }
    }

    for (const detector of TOKEN_PATTERNS) {
        const match = input.match(detector.pattern)?.[0]
        if (match && !isPlaceholder(match)) {
            return {
                kind: detector.kind,
                label: detector.label,
            }
        }
    }

    const hasAwsAccessId = /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/.test(input)
    const awsSecret = input.match(
        /\baws_secret_access_key\s*[:=]\s*["']?([A-Z\d/+=]{40})/i,
    )?.[1]
    if (hasAwsAccessId && awsSecret && !isPlaceholder(awsSecret)) {
        return {
            kind: 'cloud-credential',
            label: 'AWS credentials',
        }
    }

    const databaseCredential = input.match(
        /\b(?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?|redis):\/\/[^/\s:@]+:([^@\s/]{8,})@/i,
    )?.[1]
    if (databaseCredential && !isPlaceholder(databaseCredential)) {
        return {
            kind: 'database-credential',
            label: 'a database password',
        }
    }

    return null
}
