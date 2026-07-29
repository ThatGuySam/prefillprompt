import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'

const css = readFileSync(
    new URL('../src/assets/css/main.css', import.meta.url),
    'utf8',
)
const promptBuilder = readFileSync(
    new URL('../src/components/PromptBuilder.vue', import.meta.url),
    'utf8',
)
const qrDialog = readFileSync(
    new URL('../src/components/QrDialog.vue', import.meta.url),
    'utf8',
)

describe('motion contracts', () => {
    it('animates only explicit composite properties', () => {
        assert.doesNotMatch(css, /transition:\s*all\b/)
        assert.match(
            css,
            /opacity var\(--motion-feedback-exit\) var\(--ease-out-quad\)/,
        )
        assert.match(
            css,
            /transform var\(--motion-dialog-enter\) var\(--ease-out-expo\)/,
        )
        assert.doesNotMatch(css, /transition:\s*150ms ease/)
    })

    it('keeps reduced motion informative without movement', () => {
        const reducedMotion = css.slice(
            css.indexOf('@media (prefers-reduced-motion: reduce)'),
        )

        assert.match(reducedMotion, /\.status-toast[\s\S]*transform: none/)
        assert.match(reducedMotion, /\.qr-dialog-enter-from \.qr-dialog,[\s\S]*transform: none/)
        assert.match(reducedMotion, /transition: opacity var\(--motion-reduced\)/)
        assert.doesNotMatch(reducedMotion, /0\.01ms/)
        assert.doesNotMatch(reducedMotion, /\*\s*,\s*\*::before/)
    })

    it('gates smooth scrolling behind the no-preference query', () => {
        const preferenceQuery = css.indexOf('@media (prefers-reduced-motion: no-preference)')
        const smoothScroll = css.indexOf('scroll-behavior: smooth')

        assert.ok(preferenceQuery >= 0)
        assert.ok(smoothScroll > preferenceQuery)
        assert.match(promptBuilder, /window\.scrollTo\(\{ top: 0 \}\)/)
    })

    it('keeps toast content mounted through its visual exit', () => {
        const announceBody = promptBuilder.slice(
            promptBuilder.indexOf('function announce'),
            promptBuilder.indexOf('function clearStatusAfterExit'),
        )

        assert.match(promptBuilder, /const statusVisible = ref\(false\)/)
        assert.match(promptBuilder, /@transitionend="clearStatusAfterExit"/)
        assert.match(promptBuilder, /event\.propertyName === 'opacity' && !statusVisible\.value/)
        assert.doesNotMatch(announceBody, /statusMessage\.value = ''/)
    })

    it('keeps the QR surface modal until its exit completes', () => {
        assert.match(qrDialog, /dialogElement\.value\.showModal\(\)/)
        assert.match(qrDialog, /<Transition name="qr-dialog" @after-leave="restoreFocus">/)
        assert.doesNotMatch(qrDialog, /<dialog[\s\S]{0,160}\sopen(?:\s|>)/)
    })
})
