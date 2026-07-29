<script setup lang="ts">
import type { ProviderId } from '~/lib/providers'
import {
    modelAliases,

    providers,
} from '~/lib/providers'

interface CatalogModel {
    id: string
    name: string
}

defineProps<{
    catalog: CatalogModel[]
    customModel: string
    model: string
    provider: ProviderId
}>()

const emit = defineEmits<{
    'update:customModel': [value: string]
    'update:model': [value: string]
    'update:provider': [value: ProviderId]
}>()
</script>

<template>
    <section class="options-panel" aria-labelledby="destination-title">
        <div class="section-heading">
            <div>
                <p class="eyebrow">
                    Destination
                </p>
                <h2 id="destination-title">
                    Choose where it opens
                </h2>
            </div>
            <span class="change-hint">Change anytime</span>
        </div>

        <div class="field-grid">
            <label class="field">
                <span>AI service</span>
                <select
                    :value="provider"
                    data-testid="provider-select"
                    @change="emit('update:provider', ($event.target as HTMLSelectElement).value as ProviderId)"
                >
                    <option
                        v-for="option in providers"
                        :key="option.id"
                        :value="option.id"
                    >
                        {{ option.label }} · {{ option.destination }}
                    </option>
                </select>
            </label>

            <label class="field">
                <span>Model mode <small>best effort</small></span>
                <select
                    :value="model"
                    data-testid="model-select"
                    @change="emit('update:model', ($event.target as HTMLSelectElement).value)"
                >
                    <option
                        v-for="alias in modelAliases"
                        :key="alias.id"
                        :value="alias.id"
                    >
                        {{ alias.label }}
                    </option>
                </select>
            </label>
        </div>

        <details class="advanced-options">
            <summary>Use an exact model ID</summary>
            <label class="field">
                <span>Experimental model hint</span>
                <input
                    :value="customModel"
                    list="model-catalog"
                    placeholder="For example: o3 or anthropic/claude…"
                    autocomplete="off"
                    @input="emit('update:customModel', ($event.target as HTMLInputElement).value)"
                >
            </label>
            <datalist id="model-catalog">
                <option
                    v-for="catalogModel in catalog"
                    :key="catalogModel.id"
                    :value="catalogModel.id"
                >
                    {{ catalogModel.name }}
                </option>
            </datalist>
            <p class="field-note">
                A recognized model ID can select its service automatically. The catalog stays current via
                OpenRouter, but consumer chat sites may ignore or change model URL hints.
            </p>
        </details>
    </section>
</template>
