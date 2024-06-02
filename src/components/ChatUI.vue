<script type="ts">
import { defineComponent } from 'vue'

export default defineComponent({
    setup() {
        return {
            qrSvg: 'test',
            recipient: 'test',
            body: 'test',
            isAtCopyUrl: false,
            copyUrl: 'test',
            canWebShare: false,
            hasAnyInput: false,
            noKeyboard: false,
            defaultMockupWidth: 375,
            defaultMockupRatio: 1.6,
        }
    },
})
</script>

<template>
    <div
        class="builder-device-wrapper max-w-sm w-100 border border-blue-500"
        :style="{
            width: defaultMockupWidth,
        }"
    >
        <div
            class="builder-device-ratio relative border border-red-500"
            :style="{
                // paddingTop: `${defaultMockupRatio*100}%`
                aspectRatio: 1 / defaultMockupRatio,
            }"
        >
            <div
                class="builder-device-outer absolute inset-0 border-3 overflow-hidden shadow-2xl p-5 border border-yellow-500"
                style="border-radius: 30px;"
            >
                <div
                    class="builder-device-inner w-full h-full shadow-2xl overflow-hidden pb-8 border border-purple-500"
                >
                    <div class="builder-device-background relative w-full h-full">
                        <div class="builder-device-top-bar w-full text-xs font-semibold flex justify-between rounded-t-lg py-2 px-4">
                            <div class="time">
                                1:24
                            </div>

                            <div class="network">
                                5G
                            </div>
                        </div>

                        <div
                            class="builder-device-message-frame relative w-full h-full flex flex-col rounded-2xl"
                        >
                            <div class="builder-device-message-frame-upper h-full flex flex-col divide-y dark:divide-gray-700">
                                <div
                                    :class="[
                                        'builder-device-frame-header w-full bg-gray-100 dark:bg-gray-800 rounded-t-lg p-2',
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
                                    <Icon
                                        name="heroicons-outline:pencil-alt"
                                        size="24"
                                        opacity="0.5"
                                    />
                                </div>

                                <div class="builder-device-recipient w-full text-sm flex justify-between py-1">
                                    <label for="recipient" class="sr-only">
                                        Recipient Phone Number
                                    </label>
                                    <div class="flex rounded-md w-full">
                                        <span class="inline-flex items-center px-3 font-light text-gray-500">
                                            To:
                                        </span>
                                        <input
                                            id="recipient"
                                            type="text"
                                            name="recipient"
                                            class="flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-r-md border-gray-300 bg-transparent"
                                            placeholder=""
                                            inputmode="tel"
                                            :value="recipient"
                                            @input="$emit('update:recipient', $event.target.value)"
                                        >
                                    </div>
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
                                                Add a Recipient or Message
                                            </div>
                                            <div
                                                class="relative rounded overflow-hidden transition-opacity duration-200 ease-in-out"
                                                :style="{
                                                    opacity: Number(hasAnyInput),
                                                }"
                                                v-html="qrSvg"
                                            />
                                            <div
                                                class="camera-container absolute left-1/5 top-1/5 translate-x-1/2 translate-y-1/2 transition-opacity duration-200 ease-in-out"
                                                :style="{
                                                    height: '31%',
                                                    width: '31%',
                                                    opacity: Number(hasAnyInput),
                                                }"
                                            >
                                                <app-icon-shape
                                                    class="absolute inset-0 w-full text-white"
                                                    :style="{
                                                        stroke: 'rgb(0, 0, 0)',
                                                        strokeLocation: 'outside',
                                                        strokeWidth: 6,
                                                    }"
                                                    :path-style="{
                                                        transform: 'scale(.9)',
                                                        transformOrigin: 'center',
                                                    }"
                                                />
                                                <camera
                                                    class="absolute inset-0 w-full text-black"
                                                    :style="{
                                                        transform: 'scale(.45)',
                                                        transformOrigin: 'center',
                                                    }"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div
                                        class="font-bold text-xl"
                                        :style="{
                                            opacity: Number(hasAnyInput),
                                        }"
                                    >
                                        <div v-if="isAtCopyUrl">
                                            Scan to copy
                                        </div>
                                        <div
                                            v-else
                                            class="flex gap-2 text-xs text-center"
                                        >
                                            <a :href="copyUrl" class="text-blue-500">
                                                <button class="border border-blue-500 rounded px-2 py-1">Test Link</button>
                                            </a>
                                            <a href="#options" class="md:hidden text-blue-500">
                                                <button class="border border-blue-500 rounded px-2 py-1">Options</button>
                                            </a>

                                            <button
                                                v-if="canWebShare"
                                                class="border text-blue-500 border-blue-500 rounded px-2 py-1"
                                                @click="share"
                                            >
                                                Save
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div
                                class="builder-device-keyboard-area w-full" :class="[
                                    noKeyboard ? '' : 'h-full',
                                ]"
                            >
                                <div class="flex items-end space-x-4 px-2">
                                    <span class="inline-flex h-full items-end font-light text-gray-500">
                                        <camera
                                            class="p-1"
                                            :style="{
                                                height: 34,
                                                width: 34,
                                            }"
                                        />
                                    </span>
                                    <div
                                        class="flex items-center w-full border border-gray-300 overflow-hidden"
                                        :style="{
                                            'border-radius': '1em',
                                        }"
                                    >
                                        <!-- We use v-once so that out text cursor doesn't reset on keypress since we're in a contenteditable span -->
                                        <span
                                            v-once
                                            id="body"
                                            contenteditable
                                            role="textbox"
                                            type="text"
                                            name="body"
                                            aria-label="Message Body"
                                            class="outline-none block text-left w-full border-0 px-4"
                                            placeholder=""
                                            @input="$emit('update:body', $event.target.textContent)"
                                        >{{ body }}</span>

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
                                <div
                                    v-if="noKeyboard === false"
                                    class="font-medium"
                                >
                                    <keyboard
                                        class="w-full opacity-25 px-2"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
