<template>
    <div class="site-shell">
        <header class="site-header">
            <a class="brand" href="/" aria-label="PrefillPrompt home">
                <svg aria-hidden="true" viewBox="0 0 40 40">
                    <rect x="3" y="8" width="20" height="24" rx="5" />
                    <path d="M11 16h7M11 21h5M23 17h5l6-6M23 23h5l6 6" />
                    <circle cx="34" cy="11" r="2" />
                    <circle cx="34" cy="29" r="2" />
                </svg>
                <span>PrefillPrompt</span>
            </a>
            <nav aria-label="Project links">
                <a href="https://github.com/ThatGuySam/prefillprompt/issues" target="_blank" rel="noreferrer">Help</a>
                <a href="https://github.com/ThatGuySam/prefillprompt" target="_blank" rel="noreferrer">GitHub</a>
            </nav>
        </header>

        <main>
            <section class="hero">
                <p class="hero-kicker">
                    One prompt. Any AI.
                </p>
                <h1>Make a prompt people can use in one click.</h1>
                <p>
                    Write it once, choose ChatGPT, Claude, Gemini, or Perplexity, then share a clean link,
                    Markdown button, or QR code.
                </p>
                <ul aria-label="Product highlights">
                    <li>No sign-up</li>
                    <li>Nothing stored on our server</li>
                    <li>Open source</li>
                </ul>
            </section>

            <PromptBuilder />
        </main>

        <footer class="site-footer">
            <p>Built for prompts worth sharing.</p>
            <p>
                Provider URL features can change. PrefillPrompt uses capability gates and preserves a safe default.
            </p>
        </footer>
    </div>
</template>
