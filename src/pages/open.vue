<script setup lang="ts">
import type { Destination, DestinationId } from '~/lib/destinations'
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
const ready = ref(false)
const arrangement = computed(() => arrangeDestinations({ linked: linked.value, preferred: preferred.value, apps: apps.value, prompt: prompt.value }))
// The place the link or the saved choice points at. It gets the one big button; the rest wait behind the toggle.
const primary = computed(() => arrangement.value.selected ? getDestination(arrangement.value.selected) : null)
const others = computed(() => arrangement.value.list.filter(destination => destination.id !== primary.value?.id))
const expanded = ref(false)
const urlFor = (destination: Destination) => buildDestinationUrl(destination.id, options.value) ?? undefined
const status = ref('')
const fallback = ref<{ label: string, url: string } | null>(null)
const opening = ref(false)

useSeoMeta({
    title: 'Open this prompt — PrefillPrompt',
    robots: 'noindex, nofollow',
    referrer: 'no-referrer',
})
// The list is held back until the saved choice is known, so it does not flash before collapsing.
// Without scripts there is no saved choice to wait for, so the plain links show straight away.
useHead({ noscript: [{ innerHTML: '<style>.open-places-pending{visibility:visible}</style>' }] })

onMounted(() => {
    apps.value = window.matchMedia('(pointer: fine)').matches
    preferred.value = readPreferredDestination(() => window.localStorage)
    ready.value = true
})

// Every place is a real link, so one click opens it. A website link is left to navigate on its
// own. An app link is handed to the system here, so the page can say when the app did not open.
async function open(destination: Destination, event: MouseEvent) {
    if (opening.value) {
        event.preventDefault()
        return
    }
    if (arrangement.value.remember) {
        savePreferredDestination(() => window.localStorage, destination.id)
    }
    fallback.value = null
    if (destination.surface === 'web') {
        return
    }

    event.preventDefault()
    const url = urlFor(destination)
    if (!url) {
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

            <!-- One frame. With a place already chosen it is a single button with a toggle; the toggle
                 opens the rest of the places inside the same frame, each with its own Open link. -->
            <div
                v-if="prompt && arrangement.list.length"
                class="open-places"
                :class="{ 'open-places-pending': !ready }"
            >
                <div v-if="primary" class="open-primary">
                    <a
                        :href="urlFor(primary)"
                        rel="noreferrer"
                        data-testid="open-primary"
                        @click="open(primary, $event)"
                    >
                        Open in {{ primary.label }}
                        <span aria-hidden="true">→</span>
                    </a>
                    <button
                        v-if="others.length"
                        type="button"
                        :aria-expanded="expanded"
                        aria-controls="open-other-places"
                        data-testid="open-toggle"
                        @click="expanded = !expanded"
                    >
                        <span class="sr-only">Other places to open it</span>
                        <svg aria-hidden="true" viewBox="0 0 20 20">
                            <path d="m6 8 4 4 4-4" />
                        </svg>
                    </button>
                </div>
                <div
                    id="open-other-places"
                    class="open-rows"
                    :class="{ 'open-rows-collapsed': primary && !expanded }"
                >
                    <ul :aria-label="primary ? 'Other places to open it' : 'Places to open it'">
                        <li v-for="destination in others" :key="destination.id">
                            <span>
                                <strong>{{ destination.label }}</strong>
                                <small>{{ destination.hint }}</small>
                            </span>
                            <a
                                :href="urlFor(destination)"
                                rel="noreferrer"
                                :aria-label="`Open in ${destination.label}`"
                                :data-testid="`open-${destination.id}`"
                                @click="open(destination, $event)"
                            >
                                Open
                            </a>
                        </li>
                    </ul>
                </div>
            </div>
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
                    ? 'The place you open is remembered on this device for links that do not name an AI.'
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
