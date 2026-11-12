<script setup lang="ts">
import type { ModelChoice } from '~/lib/model-catalog'
import type { ProviderId, RecipientChoice } from '~/lib/providers'
import {
    filterModelChoices,
    findModelChoice,
} from '~/lib/model-catalog'

const props = withDefaults(defineProps<{
    allowRecipientChoice?: boolean
    lockProvider?: boolean
    model: string
    provider: ProviderId
    recipientChoice?: RecipientChoice
}>(), {
    allowRecipientChoice: true,
    lockProvider: false,
})

const emit = defineEmits<{
    select: [choice: ModelChoice]
}>()

const input = ref<HTMLInputElement>()
const isOpen = ref(false)
const query = ref('')
const activeIndex = ref(-1)
const listboxId = useId()

const selectedChoice = computed(() =>
    findModelChoice(props.provider, props.model, props.recipientChoice),
)
const searchQuery = computed(() =>
    query.value === selectedChoice.value.label ? '' : query.value,
)
const results = computed(() => {
    const choices = filterModelChoices(searchQuery.value, 18, {
        includeRecipientChoices: props.allowRecipientChoice,
        provider: props.lockProvider ? props.provider : undefined,
    })

    if (
        !searchQuery.value
        && selectedChoice.value.kind === 'exact'
        && !choices.some(choice => choice.key === selectedChoice.value.key)
    ) {
        return [selectedChoice.value, ...choices].slice(0, 18)
    }

    return choices
})
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
    else if (activeIndex.value >= choices.length) {
        activeIndex.value = choices.length - 1
    }
})

watch(activeId, async (id) => {
    if (!id || !import.meta.client) {
        return
    }

    await nextTick()
    document.getElementById(id)?.scrollIntoView({
        block: 'nearest',
        inline: 'nearest',
    })
})

function open() {
    isOpen.value = true
    activeIndex.value = results.value.findIndex(
        choice => choice.key === selectedChoice.value.key,
    )
    nextTick(() => input.value?.select())
}

function close({ restore = true } = {}) {
    isOpen.value = false
    activeIndex.value = -1
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
    }
    if (!results.value.length) {
        return
    }

    activeIndex.value = activeIndex.value < 0
        ? direction === 1 ? 0 : results.value.length - 1
        : (
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
    <div class="model-combobox model-combobox-next">
        <label class="sr-only" :for="`${listboxId}-input`">AI and model</label>
        <svg
            v-if="selectedChoice.recipientChoice === 'provider'"
            class="model-combobox-icon"
            aria-hidden="true"
            viewBox="0 0 24 24"
        >
            <path d="M12 3.5 14 8l4.5 2-4.5 2-2 4.5-2-4.5-4.5-2L10 8l2-4.5Z" />
            <path d="m18.5 15 .8 1.8 1.7.7-1.7.8-.8 1.7-.7-1.7-1.8-.8 1.8-.7.7-1.8Z" />
        </svg>
        <ProviderIcon
            v-else
            class="model-combobox-provider-icon"
            :provider="selectedChoice.provider"
        />
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
                    :aria-selected="choice.key === selectedChoice.key"
                    :class="{ active: index === activeIndex }"
                    @mousedown.prevent
                    @click="select(choice)"
                >
                    <span
                        v-if="choice.recipientChoice === 'provider'"
                        class="model-option-recipient-icon"
                        aria-hidden="true"
                    >
                        <i />
                        <i />
                        <i />
                        <i />
                    </span>
                    <ProviderIcon
                        v-else
                        class="model-option-provider-icon"
                        :provider="choice.provider"
                    />
                    <span class="model-option-copy">
                        <strong>{{ choice.providerLabel }}</strong>
                        <span>{{ choice.modelLabel }}</span>
                    </span>
                    <small>
                        {{ choice.kind === 'recipient' ? 'Recipient' : choice.kind === 'exact' ? 'Exact' : choice.kind === 'unavailable' ? 'Unavailable' : 'Flexible' }}
                    </small>
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
