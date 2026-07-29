<script setup lang="ts">
const props = defineProps<{
    open: boolean
    title: string
    titleId: string
}>()

const emit = defineEmits<{
    close: []
}>()

const dialogElement = ref<HTMLDialogElement>()
let returnFocus: HTMLElement | null = null

watch(
    () => props.open,
    async (isOpen) => {
        if (!isOpen) {
            return
        }

        returnFocus = document.activeElement instanceof HTMLElement
            ? document.activeElement
            : null

        await nextTick()
        if (dialogElement.value && !dialogElement.value.open) {
            dialogElement.value.showModal()
        }

        const preferredFocus = dialogElement.value?.querySelector<HTMLElement>('[data-autofocus]')
        preferredFocus?.focus()
    },
)

function closeFromBackdrop(event: MouseEvent) {
    const dialog = event.currentTarget as HTMLDialogElement
    const bounds = dialog.getBoundingClientRect()
    const outside = event.clientX < bounds.left
        || event.clientX > bounds.right
        || event.clientY < bounds.top
        || event.clientY > bounds.bottom

    if (outside) {
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
    <Transition name="phone-sheet" @after-leave="restoreFocus">
        <div v-if="open" class="phone-sheet-layer" @keydown.esc.prevent.stop="emit('close')">
            <dialog
                ref="dialogElement"
                class="phone-sheet"
                :aria-labelledby="titleId"
                aria-modal="true"
                @cancel.prevent="emit('close')"
                @click="closeFromBackdrop"
            >
                <header class="phone-sheet-header">
                    <h2 :id="titleId">
                        {{ title }}
                    </h2>
                    <button
                        class="icon-button sheet-close"
                        aria-label="Close"
                        data-autofocus
                        @click="emit('close')"
                    >
                        <svg aria-hidden="true" viewBox="0 0 24 24">
                            <path d="m7 7 10 10M17 7 7 17" />
                        </svg>
                    </button>
                </header>
                <div class="phone-sheet-body" @click.stop>
                    <slot />
                </div>
            </dialog>
        </div>
    </Transition>
</template>
