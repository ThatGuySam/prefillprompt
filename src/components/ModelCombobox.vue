<script setup lang="ts">
import type { ModelChoice } from '~/lib/model-catalog'
import type { ProviderId } from '~/lib/providers'
import {
    filterModelChoices,
    findModelChoice,
} from '~/lib/model-catalog'

const props = defineProps<{
    model: string
    provider: ProviderId
}>()

const emit = defineEmits<{
    select: [choice: ModelChoice]
}>()

const input = ref<HTMLInputElement>()
const isOpen = ref(false)
const query = ref('')
const activeIndex = ref(0)
const listboxId = useId()

const selectedChoice = computed(() => findModelChoice(props.provider, props.model))
const searchQuery = computed(() =>
    query.value === selectedChoice.value.label ? '' : query.value,
)
const results = computed(() => filterModelChoices(searchQuery.value))
const activeChoice = computed(() => results.value[activeIndex.value])
const activeId = computed(() =>
    isOpen.value && activeChoice.value
        ? `${listboxId}-option-${activeIndex.value}`
        : undefined,
)

watch(selectedChoice, (choice) => {
    if (!isOpen.value) {
        query.value = choice.label
    }
}, { immediate: true })

watch(results, (choices) => {
    if (!choices.length) {
        activeIndex.value = -1
    }
    else if (activeIndex.value < 0 || activeIndex.value >= choices.length) {
        activeIndex.value = 0
    }
})

function open() {
    isOpen.value = true
    activeIndex.value = 0
    nextTick(() => input.value?.select())
}

function close({ restore = true } = {}) {
    isOpen.value = false
    activeIndex.value = 0
    if (restore) {
        query.value = selectedChoice.value.label
    }
}

function select(choice: ModelChoice) {
    emit('select', choice)
    query.value = choice.label
    isOpen.value = false
    nextTick(() => input.value?.select())
}

function onInput(event: Event) {
    query.value = (event.target as HTMLInputElement).value
    isOpen.value = true
    activeIndex.value = 0
}

function moveActive(direction: 1 | -1) {
    if (!isOpen.value) {
        open()
        return
    }
    if (!results.value.length) {
        return
    }

    activeIndex.value = (
        activeIndex.value + direction + results.value.length
    ) % results.value.length
}

function onKeydown(event: KeyboardEvent) {
    if (event.key === 'ArrowDown') {
        event.preventDefault()
        moveActive(1)
    }
    else if (event.key === 'ArrowUp') {
        event.preventDefault()
        moveActive(-1)
    }
    else if (event.key === 'Enter' && isOpen.value && activeChoice.value) {
        event.preventDefault()
        select(activeChoice.value)
    }
    else if (event.key === 'Escape' && isOpen.value) {
        event.preventDefault()
        close()
    }
    else if (event.key === 'Tab') {
        close()
    }
}
</script>

<template>
    <div class="model-combobox">
        <label class="sr-only" :for="`${listboxId}-input`">AI and model</label>
        <svg class="model-combobox-icon" aria-hidden="true" viewBox="0 0 24 24">
            <path d="M12 3.5 14 8l4.5 2-4.5 2-2 4.5-2-4.5-4.5-2L10 8l2-4.5Z" />
            <path d="m18.5 15 .8 1.8 1.7.7-1.7.8-.8 1.7-.7-1.7-1.8-.8 1.8-.7.7-1.8Z" />
        </svg>
        <input
            :id="`${listboxId}-input`"
            ref="input"
            :value="query"
            role="combobox"
            aria-autocomplete="list"
            :aria-controls="listboxId"
            :aria-expanded="isOpen"
            :aria-activedescendant="activeId"
            autocomplete="off"
            autocapitalize="off"
            spellcheck="false"
            data-testid="model-combobox"
            @blur="close()"
            @focus="open"
            @input="onInput"
            @keydown="onKeydown"
        >
        <svg class="model-combobox-chevron" aria-hidden="true" viewBox="0 0 20 20">
            <path d="m6 8 4 4 4-4" />
        </svg>

        <Transition name="model-popover">
            <ul
                v-if="isOpen"
                :id="listboxId"
                class="model-listbox"
                role="listbox"
                aria-label="AI and model choices"
            >
                <li
                    v-for="(choice, index) in results"
                    :id="`${listboxId}-option-${index}`"
                    :key="choice.key"
                    role="option"
                    :aria-selected="index === activeIndex"
                    :class="{ active: index === activeIndex }"
                    @pointerdown.prevent="select(choice)"
                >
                    <span class="model-option-copy">
                        <strong>{{ choice.providerLabel }}</strong>
                        <span>{{ choice.modelLabel }}</span>
                    </span>
                    <small>{{ choice.kind === 'exact' ? 'Exact' : choice.kind === 'unavailable' ? 'Unavailable' : 'Flexible' }}</small>
                </li>
                <li v-if="!results.length" class="model-empty" role="presentation">
                    No matching AI or model
                </li>
            </ul>
        </Transition>
        <span class="sr-only" aria-live="polite">
            {{ isOpen ? `${results.length} choices available` : '' }}
        </span>
    </div>
</template>
