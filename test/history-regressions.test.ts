import type { Ref } from 'vue'
import type { PromptLinkOptions } from '../src/lib/prompt-links.ts'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'
import { computed, ref } from 'vue'
import { parse } from 'vue/compiler-sfc'
import * as links from '../src/lib/prompt-links.ts'
import * as providers from '../src/lib/providers.ts'
import * as storage from '../src/lib/safe-storage.ts'

// Execute the real setup/composable code with browser boundaries controlled.
function evaluate(source: string, globals: Record<string, unknown> = {}) {
    const exports = {}
    const context = {
        exports,
        ref,
        computed,
        watch: () => {},
        onMounted: () => {},
        onBeforeUnmount: () => {},
        window: { setTimeout: () => 1, clearTimeout: () => {}, localStorage: null },
        DOMException,
        require: (name: string) => {
            const modules: Record<string, unknown> = {
                '~/lib/prompt-links': links,
                '~/lib/providers': providers,
                '~/lib/safe-storage': storage,
                'qrcode': { toDataURL: globals.perform },
            }
            if (!(name in modules))
                throw new Error(`Unexpected import: ${name}`)
            return modules[name]
        },
        ...globals,
    }
    const compiled = ts.transpileModule(source.replaceAll('import.meta.client', 'true'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    })
    runInNewContext(compiled.outputText, context)
    return context as typeof context & { harness: Builder }
}

interface Builder {
    prompt: Ref<string>
    webSearch: Ref<boolean>
    copyLink: () => Promise<void>
    copyMarkdown: () => Promise<unknown>
    nativeShare: () => Promise<void>
    showQr: () => Promise<void>
}

function setupBuilder(perform: () => Promise<string>) {
    const saved: PromptLinkOptions[] = []
    const file = readFileSync(new URL('../src/components/PromptBuilder.vue', import.meta.url), 'utf8')
    const script = parse(file).descriptor.scriptSetup!.content
    const context = evaluate(`${script}\nglobalThis.harness = { prompt, webSearch, copyLink, copyMarkdown, nativeShare, showQr }`, {
        perform,
        navigator: { clipboard: { writeText: perform }, share: perform },
        usePromptHistory: () => ({ save: (value: PromptLinkOptions) => saved.push({ ...value }) }),
    })
    return { builder: context.harness, saved }
}

for (const action of ['copyLink', 'copyMarkdown', 'nativeShare', 'showQr'] as const) {
    describe(action, () => {
        it('saves the original prompt and options when editing continues during sharing', async () => {
            let finish!: (value: string) => void
            const pending = new Promise<string>((resolve) => {
                finish = resolve
            })
            const { builder, saved } = setupBuilder(() => pending)
            builder.prompt.value = 'Prompt A'
            builder.webSearch.value = true
            const task = builder[action]()
            builder.prompt.value = 'Prompt B'
            builder.webSearch.value = false
            finish('data:image/png;base64,test')
            await task
            assert.equal(saved.length, 1)
            assert.equal(saved[0].prompt, 'Prompt A')
            assert.equal(saved[0].webSearch, true)
        })
        it('does not save history after a failed share', async () => {
            const { builder, saved } = setupBuilder(() => Promise.reject(new Error('Permission denied')))
            builder.prompt.value = 'Keep this draft'
            await builder[action]()
            assert.equal(saved.length, 0)
            assert.equal(builder.prompt.value, 'Keep this draft')
        })
    })
}

interface History {
    entries: Ref<Array<PromptLinkOptions & { id: string, createdAt: string }>>
    save: (options: PromptLinkOptions) => void
    remove: (id: string) => void
}

function setupHistory() {
    const source = readFileSync(new URL('../src/composables/usePromptHistory.ts', import.meta.url), 'utf8')
    const context = evaluate(source)
    return (context.exports as { usePromptHistory: () => History }).usePromptHistory()
}

describe('history identity', () => {
    it('does not duplicate a restored entry that was saved again after removal', () => {
        const history = setupHistory()
        const options = { prompt: 'Same question', provider: 'chatgpt' as const, webSearch: true }
        history.save(options)
        const removed = history.entries.value[0]
        history.remove(removed.id)
        history.save(options)
        history.save(removed)
        assert.equal(history.entries.value.length, 1)
        assert.equal(history.entries.value[0].prompt, options.prompt)
    })
    it('ignores property order and false flags but preserves distinct search options', () => {
        const history = setupHistory()
        history.save({ prompt: 'Question', provider: 'chatgpt' })
        history.save({ webSearch: false, provider: 'chatgpt', prompt: 'Question' })
        assert.equal(history.entries.value.length, 1)
        history.save({ prompt: 'Question', provider: 'chatgpt', webSearch: true })
        assert.equal(history.entries.value.length, 2)
    })
    it('keeps only the latest six distinct prompts', () => {
        const history = setupHistory()
        for (let i = 0; i < 8; i++) history.save({ prompt: `Question ${i}` })
        assert.equal(history.entries.value.length, 6)
        assert.equal(history.entries.value[0].prompt, 'Question 7')
    })
})
