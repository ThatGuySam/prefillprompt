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

        assert.match(reducedMotion, /\.phone-toast,[\s\S]*transform: translateX\(-50%\)/)
        assert.match(reducedMotion, /\.qr-dialog-enter-from \.qr-dialog,[\s\S]*transform: none/)
        assert.match(reducedMotion, /transition: opacity var\(--motion-reduced\)/)
        assert.doesNotMatch(reducedMotion, /0\.01ms/)
        assert.doesNotMatch(reducedMotion, /\*\s*,\s*\*::before/)
    })

    it('keeps typing, filtering, and keyboard navigation immediate', () => {
        assert.doesNotMatch(css, /scroll-behavior:\s*smooth/)
        assert.doesNotMatch(css, /\.model-listbox li\s*\{[^}]*transition/)
        assert.doesNotMatch(promptBuilder, /window\.scrollTo/)
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

    it('uses origin-aware popovers and an iOS-style disclosure sheet', () => {
        assert.match(css, /\.model-listbox[\s\S]*transform-origin: bottom center/)
        assert.match(css, /--ease-sheet: cubic-bezier\(0\.32, 0\.72, 0, 1\)/)
        assert.match(css, /\.phone-sheet-enter-from \.phone-sheet,[\s\S]*translateY\(100%\)/)
        assert.doesNotMatch(css, /transition:\s*all\b/)
    })

    it('keeps the QR surface modal until its exit completes', () => {
        assert.match(qrDialog, /dialogElement\.value\.showModal\(\)/)
        assert.match(qrDialog, /<Transition name="qr-dialog" @after-leave="restoreFocus">/)
        assert.doesNotMatch(qrDialog, /<dialog[\s\S]{0,160}\sopen(?:\s|>)/)
    })
})
