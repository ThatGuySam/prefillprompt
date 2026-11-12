<script setup lang="ts">
import type { DestinationId } from '~/lib/destinations'
import { arrangeDestinations, buildDestinationUrl, getDestination, readPreferredDestination, savePreferredDestination } from '~/lib/destinations'
import { tryOpenApp } from '~/lib/open-destination'
import { isProviderId, MAX_PROMPT_LENGTH, parseBooleanParam } from '~/lib/prompt-links'
import { detectSafetySignals } from '~/lib/prompt-safety'

const route = useRoute()
const first = (value: unknown) => (Array.isArray(value) ? value[0] : value)
const text = (value: unknown) => (typeof first(value) === 'string' ? first(value) as string : undefined)

const prompt = computed(() => (text(route.query.q) ?? '').slice(0, MAX_PROMPT_LENGTH))
const linked = computed(() => {
    const provider = text(route.query.s) ?? text(route.query.m)
    return isProviderId(provider) ? provider : undefined
})
const options = computed(() => ({
    prompt: prompt.value,
    model: text(route.query.model),
    webSearch: parseBooleanParam(first(route.query.web)),
    temporary: parseBooleanParam(first(route.query.temporary)),
}))
const signals = computed(() => detectSafetySignals(prompt.value))
const attack = computed(() => signals.value.some(signal => signal.tier === 'attack'))

// Apps and the saved choice are only known in the browser, so the server renders websites only.
const apps = ref(false)
const preferred = ref<DestinationId | null>(null)
const picked = ref<DestinationId | null>(null)
const arrangement = computed(() => arrangeDestinations({ linked: linked.value, preferred: preferred.value, apps: apps.value, prompt: prompt.value }))
const selected = computed(() => picked.value ?? arrangement.value.selected)
// True when the link or the saved choice already picked a destination, before the reader touched anything.
const startedWithChoice = computed(() => arrangement.value.selected !== null)
const status = ref('')
const fallback = ref<{ label: string, url: string } | null>(null)
const opening = ref(false)

useSeoMeta({
    title: 'Open this prompt — PrefillPrompt',
    robots: 'noindex, nofollow',
    referrer: 'no-referrer',
})

onMounted(() => {
    apps.value = window.matchMedia('(pointer: fine)').matches
    preferred.value = readPreferredDestination(() => window.localStorage)
})

async function open() {
    if (!selected.value || opening.value) {
        return
    }
    const destination = getDestination(selected.value)
    const url = buildDestinationUrl(destination.id, options.value)
    if (!url) {
        return
    }
    if (arrangement.value.remember) {
        savePreferredDestination(() => window.localStorage, destination.id)
    }
    fallback.value = null
    if (destination.surface === 'web') {
        window.location.assign(url)
        return
    }

    opening.value = true
    status.value = `Opening ${destination.label}…`
    const handedOff = await tryOpenApp(url)
    opening.value = false
    if (handedOff) {
        status.value = `Sent to ${destination.label}. The prompt is filled in and waits for you to send it.`
        return
    }
    const website = getDestination(destination.fallback!)
    status.value = `${destination.label} did not open on this device.`
    fallback.value = { label: website.label, url: buildDestinationUrl(website.id, options.value)! }
}
</script>

<template>
    <main class="handoff-stage">
        <section class="handoff-card open-card" aria-labelledby="open-title">
            <p class="eyebrow">
                Shared prompt
            </p>
            <h1 id="open-title">
                Read it, then choose where to open it.
            </h1>

            <div
                v-if="signals.length"
                class="open-warning"
                :class="{ 'open-warning-attack': attack }"
                role="alert"
            >
                <strong>{{ attack ? 'This prompt looks like an attack.' : 'Read this prompt carefully before you send it.' }}</strong>
                <ul>
                    <li v-for="signal in signals" :key="signal.id">
                        {{ signal.explanation }}
                        <NuxtLink :to="`/safety#${signal.id}`">
                            Why?
                        </NuxtLink>
                    </li>
                </ul>
            </div>

            <pre class="open-prompt" tabindex="0" aria-label="The prompt">{{ prompt }}</pre>

            <!-- With a choice already made, the button comes first and the list waits behind "Open somewhere else". -->
            <button v-if="startedWithChoice" :disabled="!prompt || !selected || opening" @click="open">
                Open in {{ getDestination(selected!).label }}
                <span aria-hidden="true">→</span>
            </button>
            <component :is="startedWithChoice ? 'details' : 'div'" v-if="prompt" class="open-change">
                <summary v-if="startedWithChoice">
                    Open somewhere else
                </summary>
                <fieldset class="open-destinations">
                    <legend>{{ startedWithChoice ? 'Choose another place' : 'Where do you want to open it?' }}</legend>
                    <label v-for="destination in arrangement.list" :key="destination.id">
                        <input
                            type="radio"
                            name="destination"
                            :value="destination.id"
                            :checked="selected === destination.id"
                            @change="picked = destination.id"
                        >
                        <span>
                            <strong>{{ destination.label }}</strong>
                            <small>{{ destination.hint }}</small>
                        </span>
                    </label>
                </fieldset>
            </component>
            <button v-if="!startedWithChoice" :disabled="!prompt || !selected || opening" @click="open">
                {{ selected ? `Open in ${getDestination(selected).label}` : 'Choose where to open it' }}
                <span aria-hidden="true">→</span>
            </button>
            <a
                v-if="fallback"
                class="handoff-open-link"
                :href="fallback.url"
                rel="noreferrer"
            >
                Open on the {{ fallback.label }} instead
                <span aria-hidden="true">→</span>
            </a>
            <small v-if="prompt">
                {{ arrangement.remember
                    ? 'Your choice is remembered on this device for links that do not name an AI.'
                    : 'This link names an AI, so your saved choice is left as it is.' }}
                Nothing is sent until you open it.
            </small>
            <small v-else>
                This link has no prompt in it.
            </small>
            <p class="handoff-status" aria-live="polite" role="status">
                {{ status }}
            </p>
        </section>
    </main>
</template>
