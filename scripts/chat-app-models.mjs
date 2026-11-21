// OpenRouter lists API models. The chat apps only open a subset: no batch or free
// tiers, media or embedding models, coding agents, dated snapshots, open-weight
// releases, or API speed tiers.
const notInChatApps = [
    /:/,
    /-\d{4}-\d{2}-\d{2}$/,
    /-\d{4}$/,
    /(?:^|-)(?:image|audio|tts|transcribe|embedding|realtime|search-preview)(?:-|$)/,
    /(?:^|-)codex(?:-|$)/,
    /deep-research/,
    /(?:^|-)oss(?:-|$)/,
    /safeguard/,
    /nano-banana/,
    /-instruct$/,
    /-16k$/,
    /-preview$/,
    /-fast$/,
]

export function isChatAppModel(id) {
    const name = id.split('/').at(-1) ?? id
    return !notInChatApps.some(pattern => pattern.test(name))
}
