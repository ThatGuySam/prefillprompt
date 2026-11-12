<script setup lang="ts">
import dataset from '~/data/safety/dangerous-prompts.json'
import measurements from '~/data/safety/signal-measurements.json'
import { safetySignals } from '~/lib/prompt-safety'

const REPOSITORY = 'https://github.com/ThatGuySam/prefillprompt/blob/main'
const measured = new Map(measurements.signals.map(signal => [signal.id, signal]))
const exampleFor = (id: string) => dataset.examples.find(example => example.technique === id)
const short = (value: string) => (value.length > 220 ? `${value.slice(0, 220)}…` : value)

const tiers = [
    { tier: 'attack', heading: 'Almost always an attack', note: 'At least 99 in 100 prompts with this trait were malicious in the prompts we measured. PrefillPrompt shows a red warning.' },
    { tier: 'caution', heading: 'Risky to run without reading', note: 'These almost never appear in ordinary prompts, but there were too few cases to measure 99 in 100. PrefillPrompt shows a caution.' },
    { tier: 'unreliable', heading: 'Common in attacks, and in harmless prompts too', note: 'Attackers use these, and so do many ordinary templates, so PrefillPrompt does not warn about them.' },
] as const

const sections = tiers.map(group => ({
    ...group,
    items: safetySignals.filter(signal => signal.tier === group.tier).map(signal => ({
        id: signal.id,
        title: signal.title,
        explanation: signal.explanation,
        measured: measured.get(signal.id),
        example: exampleFor(signal.id),
    })),
}))
// Attack styles in the example set that have no pattern of their own.
const signalIds = new Set(safetySignals.map(signal => signal.id))
const otherStyles = dataset.techniques
    .filter(technique => !signalIds.has(technique.id))
    .map(technique => ({ id: technique.id, example: exampleFor(technique.id)! }))
    .filter(style => style.example)

useSeoMeta({
    title: 'Why a prompt gets a warning — PrefillPrompt',
    description: 'Plain explanations of the traits that make a shared prompt risky, with real examples and the numbers behind each warning.',
})
</script>

<template>
    <main class="safety-page">
        <p class="eyebrow">
            PrefillPrompt safety
        </p>
        <h1>Why a prompt gets a warning</h1>
        <p>
            A prompt link fills in text that someone else wrote. Most are harmless. A few try to make
            your AI, or an agent that can act for you, do something you would not choose. Before you
            open a shared prompt, PrefillPrompt checks it for the traits below.
        </p>
        <p>
            A prompt with no warning is not proven safe. Read what you are about to send.
        </p>

        <section v-for="group in sections" :key="group.tier" :aria-labelledby="`tier-${group.tier}`">
            <h2 :id="`tier-${group.tier}`">
                {{ group.heading }}
            </h2>
            <p>{{ group.note }}</p>
            <article v-for="item in group.items" :id="item.id" :key="item.id" class="safety-item">
                <h3>{{ item.title }}</h3>
                <p>{{ item.explanation }}</p>
                <p v-if="item.measured" class="safety-numbers">
                    Measured: {{ item.measured.maliciousHits.toLocaleString() }} malicious and
                    {{ item.measured.benignHits.toLocaleString() }} ordinary prompts matched.
                    It fires on about {{ item.measured.benignHitsPer10k }} in 10,000 ordinary prompts.
                </p>
                <figure v-if="item.example">
                    <figcaption>A real example, from {{ item.example.source.id }}:</figcaption>
                    <pre>{{ short(item.example.text) }}</pre>
                </figure>
            </article>
        </section>

        <section aria-labelledby="other-styles">
            <h2 id="other-styles">
                Other attack styles in the example set
            </h2>
            <article v-for="style in otherStyles" :id="style.id" :key="style.id" class="safety-item">
                <h3>{{ style.example.title }}</h3>
                <p>{{ style.example.explanation }}</p>
                <figure>
                    <figcaption>A real example, from {{ style.example.source.id }}:</figcaption>
                    <pre>{{ short(style.example.text) }}</pre>
                </figure>
            </article>
        </section>

        <section aria-labelledby="where-from">
            <h2 id="where-from">
                Where this comes from
            </h2>
            <p>
                The checks were measured on {{ measurements.prompts.malicious.toLocaleString() }} malicious and
                {{ measurements.prompts.benign.toLocaleString() }} ordinary prompts from public research datasets.
                The examples are copied word for word from those datasets.
            </p>
            <ul>
                <li><a :href="`${REPOSITORY}/src/data/safety/dangerous-prompts.json`">The 100 example prompts</a>, each with a short explanation and its source</li>
                <li><a :href="`${REPOSITORY}/docs/research/prompt-danger-signals-2026-11-12.md`">The research memo</a>, with every number, the datasets, and the limits</li>
                <li><a href="https://genai.owasp.org/llmrisk/llm01-prompt-injection/">OWASP on prompt injection</a>, for a fuller explanation</li>
            </ul>
            <p>
                <NuxtLink to="/">
                    Back to PrefillPrompt
                </NuxtLink>
            </p>
        </section>
    </main>
</template>
