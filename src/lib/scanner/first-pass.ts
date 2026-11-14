// The first pass of the on-device prompt scanner: a linear classifier over hashed character
// and word n-grams. Its weights are about 1 MB, so it runs on every preview before anything
// large downloads. It only ever raises a warning. Its threshold is set so that none of the
// held-out safe prompts reach it, and a prompt below the threshold still goes to the deep scan.
// Trained by scripts/scanner/train-first-pass.ts, which imports this file so training and the
// browser compute the same features.

export interface FirstPassModel {
    buckets: number
    bias: number
    scale: number
    threshold: number
    weights: Int8Array
}

const MAX_CHARACTERS = 6000
const CYRILLIC_LOOKALIKES: Record<string, string> = { а: 'a', е: 'e', о: 'o', с: 'c', р: 'p', х: 'x', у: 'y', і: 'i' }

// Undoes the character tricks measured in the browser-ML research: compatibility forms,
// Unicode tag characters that spell hidden ASCII, invisible characters, Cyrillic look-alikes,
// and "i g n o r e" letter spacing.
export function normalizeForScan(text: string): string {
    return text
        .normalize('NFKC')
        .replace(/[\u{E0020}-\u{E007E}]/gu, character => String.fromCodePoint(character.codePointAt(0)! - 0xE0000))
        .replace(/[\u200B-\u200F\u202A-\u202E\u2060-\u2064\u2066-\u2069\uFEFF\u{E0000}-\u{E001F}\u{E007F}]/gu, '')
        .replace(/[аеосрхуі]/g, character => CYRILLIC_LOOKALIKES[character]!)
        .replace(/(?:(?<=^|\s)\S(?: |$)){4,}/g, run => `${run.replace(/ /g, '')} `)
}

const FNV_OFFSET = 0x811C9DC5
const FNV_PRIME = 0x01000193

function hashRange(text: string, start: number, end: number, seed: number) {
    let hash = FNV_OFFSET ^ seed
    for (let index = start; index < end; index += 1) {
        hash ^= text.charCodeAt(index)
        hash = Math.imul(hash, FNV_PRIME)
    }
    return hash >>> 0
}

// Distinct bucket indexes for a prompt: character 3- to 5-grams, word unigrams, and word bigrams.
export function featureIndexes(prompt: string, buckets: number): Uint32Array {
    const mask = buckets - 1
    const text = ` ${normalizeForScan(prompt).toLowerCase().replace(/\s+/g, ' ').slice(0, MAX_CHARACTERS)} `
    const found = new Set<number>()
    for (let size = 3; size <= 5; size += 1) {
        for (let start = 0; start + size <= text.length; start += 1)
            found.add(hashRange(text, start, start + size, size) & mask)
    }
    const words = text.match(/[\p{L}\p{N}_]+/gu) ?? []
    for (let index = 0; index < words.length; index += 1) {
        const word = words[index]!
        found.add(hashRange(word, 0, word.length, 101) & mask)
        if (index > 0) {
            const pair = `${words[index - 1]} ${word}`
            found.add(hashRange(pair, 0, pair.length, 102) & mask)
        }
    }
    return Uint32Array.from(found)
}

export function firstPassScore(model: FirstPassModel, prompt: string): number {
    const indexes = featureIndexes(prompt, model.buckets)
    if (indexes.length === 0)
        return 0
    let sum = 0
    for (const index of indexes)
        sum += model.weights[index]!
    const logit = model.bias + (model.scale * sum) / Math.sqrt(indexes.length)
    return 1 / (1 + Math.exp(-logit))
}
