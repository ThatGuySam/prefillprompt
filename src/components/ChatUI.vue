<script setup type="ts" lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useClipboard } from '@vueuse/core'
import type { Writeable } from 'type-fest'

defineEmits(['update:body'])

// Docs - https://vueuse.org/core/useClipboard/
const { copy } = useClipboard()
// Docs - https://vueuse.org/core/useShare/
const shareApi = useShare()
// Docs - https://ui.nuxt.com/components/notification#usage
const toast = useToast()

const noKeyboard = true
const defaultMockupWidth = 375
const defaultMockupRatio = 1.6

// Define the models with their icons
// Icones - https://icones.js.org/
const initialModels = [
    { id: 'chatgpt', label: 'ChatGPT', icon: 'simple-icons:openai' },
    { id: 'claude', label: 'Claude', icon: 'simple-icons:anthropic' },
    { id: 'perplexity', label: 'Perplexity', icon: 'simple-icons:perplexity' },
] as const

type ModelOption = typeof initialModels[number]

const models = ref([...initialModels])

const promptInput = ref(null)
const body = ref('')

/** Selected model */
const selectedModelId = ref<ModelOption['id']>('chatgpt')
const selectedModel = computed(() =>
    models.value.find(model => model.id === selectedModelId.value),
)

function getPromptUrl() {
    const host = window?.location?.host
    const protocol = host?.includes('localhost') ? 'http' : 'https'

    const params = new URLSearchParams()
    params.append('q', body.value)
    params.append('m', selectedModelId.value)

    return `${protocol}://${host}/api/prompt?${params.toString()}`
}

const hasAnyInput = computed(() => {
    return body.value?.trim().length > 0
})
const promptUrl = computed(() => {
    return getPromptUrl()
})

function copyPromptUrl() {
    if (!process.client) {
        throw new Error('This function can only be called on the client side')
    }

    copy(getPromptUrl())

    toast.add({
        title: 'Copied!',
        description: 'The Prompt URL has been copied to your clipboard.',
        // status: 'success',
        timeout: 2000,
    })
}

function webShare() {
    shareApi.share({
        title: 'Share Prompt',
        text: 'Check out this Prompt',
        url: promptUrl.value,
    })
}

const shareMethods = [
    {
        name: 'Copy',
        icon: 'i-heroicons-link',
        action: copyPromptUrl,
    },
    // {
    //     name: 'QR Code',
    //     icon: 'heroicons-outline:qrcode',
    //     action: 'qr',
    // // },
]

if (shareApi.isSupported) {
    shareMethods.push({
        name: 'Prompt',
        icon: 'i-heroicons-arrow-up-on-square',
        action: webShare,
    })
}

onMounted(() => {
    // nextTick(() => {
    //     // Auto focus on the content editable
    //     if (promptInput.value) {
    //         console.log('promptInput', promptInput.value.focus)
    //     // this.$refs[promptInput].value.focus()
    //     }
    // })
})
</script>

<template>
    <div
        class="builder-device-wrapper max-w-sm w-full"
        :style="{
            width: defaultMockupWidth,
        }"
    >
        <div
            class="builder-device-ratio relative"
            :style="{
                aspectRatio: 1 / defaultMockupRatio,
            }"
        >
            <div
                class="builder-device-outer absolute inset-0 border border-3 border-gray-300 overflow-hidden shadow-2xl p-5"
                style="border-radius: 30px;"
            >
                <div
                    class="builder-device-inner w-full h-full shadow-2xl overflow-hidden pb-8"
                >
                    <div class="builder-device-background relative w-full h-full">
                        <div class="builder-device-top-bar w-full text-xs font-semibold flex justify-between rounded-t-lg py-2 px-4">
                            <div class="time">
                                1:24
                            </div>

                            <div class="network">
                                6G
                            </div>
                        </div>

                        <div
                            class="builder-device-message-frame relative w-full h-full flex flex-col rounded-2xl"
                        >
                            <div class="builder-device-message-frame-upper h-full flex flex-col">
                                <div
                                    :class="[
                                        'builder-device-frame-header w-full rounded-t-lg p-2',
                                        'flex flex-row justify-between items-center',
                                    ]"
                                >
                                    <Icon
                                        name="heroicons-outline:menu"
                                        size="24"
                                        opacity="0.5"
                                    />
                                    <div class="font-medium text-center">
                                        PrefillPrompt
                                    </div>
                                    <a :href="promptUrl" target="_blank">
                                        <Icon
                                            name="heroicons-outline:pencil-alt"
                                            size="24"
                                            :opacity="hasAnyInput ? 1 : 0.5"
                                        />
                                    </a>
                                </div>

                                <div class="builder-device-messages-area w-full h-full flex flex-col justify-around items-center space-y-3 py-6 px-2">
                                    <div class="border-3 border-dashed border-current rounded-xl p-3">
                                        <div class="relative text-center w-48 h-48">
                                            <div
                                                class="empty-message absolute inset-0 flex items-center justify-center"
                                                :style="{
                                                    opacity: Number(!hasAnyInput),
                                                }"
                                            >
                                                Type a Prompt you want to share
                                            </div>
                                            <template v-if="hasAnyInput">
                                                <UButton
                                                    v-for="method in shareMethods"
                                                    :key="method.name"
                                                    :icon="method.icon"
                                                    size="xl"
                                                    padded
                                                    square
                                                    color="white"
                                                    class="scale-150 p-4 mx-4"
                                                    @click="method.action"
                                                />
                                            </template>
                                        </div>
                                    </div>

                                    <div
                                        class="font-bold text-xl"
                                        :style="{
                                            opacity: Number(hasAnyInput),
                                        }"
                                    >
                                        <USelectMenu
                                            v-if="selectedModel"
                                            v-model="selectedModelId"
                                            :options="models"
                                            value-attribute="id"
                                        >
                                            <!-- Leading slot to show only the icon when closed -->
                                            <template #leading>
                                                <Icon
                                                    :name="selectedModel.icon"
                                                    size="16"
                                                />
                                            </template>
                                            <template #option="{ option: model }">
                                                <Icon
                                                    :name="model.icon"
                                                    size="16"
                                                />
                                                <span class="truncate">{{ model.label }}</span>
                                            </template>
                                            <!-- Default slot to customize options -->
                                            <!-- <template #default="model">
                                                <div class="flex items-center space-x-2">
                                                    <UIcon :name="model" class="w-5 h-5" />
                                                    Test
                                                </div>
                                            </template> -->
                                        </USelectMenu>
                                        <div
                                            class="flex gap-2 text-xs text-center"
                                        >
                                            <a :href="promptUrl" class="text-blue-500" target="_blank">
                                                <button class="border border-blue-500 rounded px-2 py-1">Test Link</button>
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div
                                class="builder-device-keyboard-area w-full" :class="[
                                    noKeyboard ? '' : 'h-full',
                                ]"
                            >
                                <div class="flex items-end space-x-2 px-2">
                                    <span class="inline-flex h-full items-end font-light text-gray-500">
                                        <Icon
                                            name="heroicons-outline:camera"
                                            class="p-1"
                                            :style="{
                                                height: 34,
                                                width: 34,
                                            }"
                                        />
                                    </span>
                                    <div
                                        class="flex items-center w-full border border-gray-700 overflow-hidden"
                                        :style="{
                                            'border-radius': '1em',
                                        }"
                                    >
                                        <ContentEditable
                                            ref="promptInput"
                                            v-model="body"
                                            contenteditable
                                            autofocus
                                            tag="span"
                                            role="textbox"
                                            type="text"
                                            name="body"
                                            aria-label="Message Body"
                                            class="outline-none block text-left w-full border-0 px-4"
                                            placeholder=""
                                        />

                                        <span class="inline-flex h-full items-end font-light text-gray-500">
                                            <svg
                                                xmlns="http://www.w3.org/2000/svg"
                                                class="h-8 w-8"
                                                viewBox="0 0 20 20"
                                                fill="currentColor"
                                            >
                                                <path
                                                    fill-rule="evenodd"
                                                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z"
                                                    clip-rule="evenodd"
                                                />
                                            </svg>
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
