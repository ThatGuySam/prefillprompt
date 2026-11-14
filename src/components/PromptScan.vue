<script setup lang="ts">
import type { ScanState } from '~/lib/scanner/scan-state'
import { isBusy, scanDetail, scanHeader } from '~/lib/scanner/scan-state'

const props = defineProps<{ state: ScanState }>()
defineEmits<{ start: [] }>()

const busy = computed(() => isBusy(props.state))
const tone = computed(() => ({ dangerous: 'danger', caution: 'caution', clear: 'clear' } as Partial<Record<ScanState['step'], string>>)[props.state.step] ?? 'neutral')
</script>

<template>
    <section class="prompt-scan" :class="`prompt-scan-${tone}`" aria-label="On-device scan">
        <!-- Only the header is announced; the detail line changes too often to read aloud. -->
        <p class="prompt-scan-title" :class="{ 'prompt-scan-title-busy': busy }" role="status" aria-live="polite">
            {{ scanHeader(state) }}
        </p>
        <p class="prompt-scan-detail">
            {{ scanDetail(state) }}
        </p>
        <button
            v-if="state.step === 'offer'"
            type="button"
            class="prompt-scan-start"
            data-testid="scan-start"
            @click="$emit('start')"
        >
            Run deeper scan
        </button>
    </section>
</template>
