<script setup lang="ts">
import type { PromptLinkOptions } from '~/lib/prompt-links'

const emit = defineEmits<{
    select: [example: PromptLinkOptions]
}>()

const examples: Array<PromptLinkOptions & { title: string, description: string }> = [
    {
        title: 'Explain unfamiliar code',
        description: 'A reusable code-review starter for ChatGPT.',
        prompt: 'Explain what this code does, identify the riskiest assumption, and suggest one simpler implementation. I will paste the code next.',
        provider: 'chatgpt',
        model: 'latest-reasoning',
    },
    {
        title: 'Polish a rough note',
        description: 'Turn an unstructured draft into clear writing with Claude.',
        prompt: 'Rewrite the note I paste next so it is concise, specific, and sounds like me. Preserve every factual claim and flag anything ambiguous.',
        provider: 'claude',
        model: 'latest',
    },
    {
        title: 'Compare current options',
        description: 'Start a source-backed web comparison.',
        prompt: 'Compare the three strongest current options for the product I name next. Use recent primary sources, show the tradeoffs, and recommend who each option is best for.',
        provider: 'perplexity',
        model: 'latest',
    },
    {
        title: 'Make a learning plan',
        description: 'Create a practical study sequence with Gemini.',
        prompt: 'Create a four-week learning plan for the topic I provide next. Include weekly outcomes, short practice exercises, and a final project.',
        provider: 'gemini',
        model: 'latest-fast',
    },
]
</script>

<template>
    <section class="examples-section" aria-labelledby="examples-title">
        <div class="section-heading">
            <div>
                <p class="eyebrow">
                    Need a starting point?
                </p>
                <h2 id="examples-title">
                    Try an example prompt
                </h2>
            </div>
        </div>
        <div class="example-grid">
            <button
                v-for="example in examples"
                :key="example.title"
                class="example-card"
                @click="emit('select', example)"
            >
                <strong>{{ example.title }}</strong>
                <span>{{ example.description }}</span>
                <small>Use example →</small>
            </button>
        </div>
    </section>
</template>
