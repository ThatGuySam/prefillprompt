<script setup lang="ts">
/**
 * Stolen from https://github.com/hl037/vue-contenteditable/tree/master and modified to work with Nuxt 3
 */
import { computed, onMounted, ref, watch } from 'vue'

const props = defineProps({
    tag: String,
    contenteditable: {
        type: [Boolean, String],
        default: true,
    },
    modelValue: String,
    noHtml: {
        type: Boolean,
        default: true,
    },
    noNl: {
        type: Boolean,
        default: false,
    },

})

const emit = defineEmits({
    'returned': String,
    'update:modelValue': String,
})

function replaceAll(str: string, search: string, replacement: string) {
    return str.split(search).join(replacement)
}

const element = ref<HTMLElement | null>()

function currentContent() {
    return props.noHtml
        // eslint-disable-next-line unicorn/prefer-dom-node-text-content
        ? element.value!.innerText
        : element.value!.innerHTML
}

function updateContent(newContent: string) {
    if (props.noHtml) {
        // eslint-disable-next-line unicorn/prefer-dom-node-text-content
        element.value!.innerText = newContent
    }
    else {
        element.value!.innerHTML = newContent
    }
}

function update() {
    emit('update:modelValue', currentContent())
}

function onPaste(event: any) {
    event.preventDefault()
    let text = (event.originalEvent || event).clipboardData.getData('text/plain')
    if (props.noNl) {
        text = replaceAll(text, '\r\n', ' ')
        text = replaceAll(text, '\n', ' ')
        text = replaceAll(text, '\r', ' ')
    }
    window.document.execCommand('insertText', false, text)
}
function onKeypress(event: any) {
    if (event.key === 'Enter' && props.noNl) {
        event.preventDefault()
        emit('returned', currentContent())
    }
}

onMounted(() => {
    updateContent(props.modelValue ?? '')
})

watch(() => props.modelValue, (newValue) => {
    if (newValue !== currentContent()) {
        updateContent(newValue ?? '')
    }
})

watch(() => props.noHtml, () => {
    updateContent(props.modelValue ?? '')
})

watch(() => props.tag, () => {
    updateContent(props.modelValue ?? '')
}, { flush: 'post' })
</script>

<template>
    <component
        :is="tag"
        ref="element"
        :contenteditable="contenteditable"
        @input="update"
        @blur="update"
        @paste="onPaste"
        @keypress="onKeypress"
    />
</template>
