<script setup lang="ts">
const props = defineProps<{
    dataUrl: string
    open: boolean
}>()

const emit = defineEmits<{
    close: []
}>()

const closeButton = ref<HTMLButtonElement>()
const dialogElement = ref<HTMLDialogElement>()
let returnFocus: HTMLElement | null = null

watch(
    () => props.open,
    async (isOpen) => {
        if (!isOpen) {
            return
        }

        if (!returnFocus) {
            returnFocus = document.activeElement instanceof HTMLElement
                ? document.activeElement
                : null
        }
        await nextTick()
        if (dialogElement.value && !dialogElement.value.open) {
            dialogElement.value.showModal()
        }
        closeButton.value?.focus()
    },
)

function closeFromDialogBackdrop(event: MouseEvent) {
    const dialog = event.currentTarget as HTMLDialogElement
    const bounds = dialog.getBoundingClientRect()
    const clickedOutside = event.clientX < bounds.left
        || event.clientX > bounds.right
        || event.clientY < bounds.top
        || event.clientY > bounds.bottom

    if (clickedOutside) {
        emit('close')
    }
}

function restoreFocus(element: Element) {
    const dialog = element.querySelector('dialog')
    if (dialog?.open) {
        dialog.close()
    }

    if (returnFocus?.isConnected) {
        returnFocus.focus()
    }

    returnFocus = null
}
</script>

<template>
    <Transition name="qr-dialog" @after-leave="restoreFocus">
        <div
            v-if="open"
            class="dialog-backdrop"
            @keydown.esc.prevent.stop="emit('close')"
        >
            <dialog
                ref="dialogElement"
                aria-labelledby="qr-title"
                aria-modal="true"
                class="qr-dialog"
                @cancel.prevent="emit('close')"
                @click="closeFromDialogBackdrop"
            >
                <button ref="closeButton" class="dialog-close" aria-label="Close QR code" @click="emit('close')">
                    ×
                </button>
                <p class="eyebrow">
                    Scan to open
                </p>
                <h2 id="qr-title">
                    Prompt QR code
                </h2>
                <img :src="dataUrl" alt="QR code for the generated prompt link" width="360" height="360">
                <a class="download-button" :href="dataUrl" download="prefillprompt-qr.png">
                    Download PNG
                </a>
                <p>Anyone who scans this can read the prompt from the URL.</p>
            </dialog>
        </div>
    </Transition>
</template>
