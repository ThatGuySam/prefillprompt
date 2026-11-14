// Packs the deep scanner model into 4 MiB gzipped pieces under public/scanner/deep/<version>/
// and writes the manifest the site pins at build time to src/data/scanner/deep.json.
// The pieces are generated, not committed. Deploy scripts run this with --check first.
//
// Build from scratch (Horizon-Labs/prompt-injection-guard-small, revision pinned below):
//   node scripts/scanner/build-deep.mjs --fetch <emptyWorkDir>
//   uv run --no-project --with onnx==1.19.1 --with numpy python -I scripts/scanner/quantize.py \
//     <workDir>/onnx/model_quantized.onnx <workDir>/model.onnx
//   node scripts/scanner/build-deep.mjs <workDir>
// Verify the pieces the manifest names are present and intact:
//   node scripts/scanner/build-deep.mjs --check

import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { gzipSync } from 'node:zlib'

const root = resolve(fileURLToPath(import.meta.url), '../../..')
const REPOSITORY = 'Horizon-Labs/prompt-injection-guard-small'
const REVISION = '2efc2ed5abecd21eb45c2506d231a65d6e392b85'
const SOURCE_FILES = ['onnx/model_quantized.onnx', 'tokenizer.json', 'tokenizer_config.json', 'LICENSE', 'NOTICE']
const CHUNK_BYTES = 4 * 1024 * 1024
const publicRoot = join(root, 'public/scanner/deep')
const manifestPath = join(root, 'src/data/scanner/deep.json')
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex')

async function fetchSources(workDir) {
    mkdirSync(join(workDir, 'onnx'), { recursive: true })
    const sums = await (await fetch(`https://huggingface.co/${REPOSITORY}/resolve/${REVISION}/SHA256SUMS`)).text()
    for (const file of SOURCE_FILES) {
        const response = await fetch(`https://huggingface.co/${REPOSITORY}/resolve/${REVISION}/${file}`)
        if (!response.ok)
            throw new Error(`${file}: HTTP ${response.status}`)
        const bytes = new Uint8Array(await response.arrayBuffer())
        const expected = sums.split('\n').find(line => line.endsWith(`  ${file}`))?.split(' ')[0]
        if (expected && expected !== sha256(bytes))
            throw new Error(`${file}: checksum does not match SHA256SUMS`)
        writeFileSync(join(workDir, file), bytes)
        console.log(`fetched ${file}`)
    }
}

function pack(workDir) {
    const sources = { model: 'model.onnx', tokenizer: 'tokenizer.json', tokenizerConfig: 'tokenizer_config.json' }
    const raw = Object.fromEntries(Object.entries(sources).map(([key, file]) => [key, readFileSync(join(workDir, file))]))
    const version = sha256(Object.values(raw).map(bytes => sha256(bytes)).join('')).slice(0, 12)
    const directory = join(publicRoot, version)
    rmSync(publicRoot, { recursive: true, force: true })
    mkdirSync(directory, { recursive: true })

    const files = {}
    for (const [key, bytes] of Object.entries(raw)) {
        const chunks = []
        for (let offset = 0, index = 0; offset < bytes.length; offset += CHUNK_BYTES, index += 1) {
            const packed = gzipSync(bytes.subarray(offset, offset + CHUNK_BYTES), { level: 9 })
            const path = `${sources[key]}.${String(index).padStart(3, '0')}.gz`
            writeFileSync(join(directory, path), packed)
            chunks.push({ path, bytes: packed.length, sha256: sha256(packed) })
        }
        files[key] = { size: bytes.length, sha256: sha256(bytes), chunks }
    }
    for (const notice of ['LICENSE', 'NOTICE'])
        writeFileSync(join(directory, notice), readFileSync(join(workDir, notice)))

    const totalBytes = Object.values(files).flatMap(file => file.chunks).reduce((sum, chunk) => sum + chunk.bytes, 0)
    const manifest = { version, source: `https://huggingface.co/${REPOSITORY}/tree/${REVISION}`, base: `/scanner/deep/${version}/`, totalBytes, files }
    writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 4)}\n`)
    console.log(`version ${version}: ${Object.values(files).reduce((n, file) => n + file.chunks.length, 0)} pieces, ${(totalBytes / 1e6).toFixed(1)} MB to download`)
}

function check() {
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
    const problems = []
    for (const file of Object.values(manifest.files)) {
        for (const chunk of file.chunks) {
            const path = join(root, 'public', manifest.base, chunk.path)
            if (!existsSync(path))
                problems.push(`missing ${chunk.path}`)
            else if (sha256(readFileSync(path)) !== chunk.sha256)
                problems.push(`checksum mismatch ${chunk.path}`)
        }
    }
    const stale = existsSync(publicRoot) ? readdirSync(publicRoot).filter(name => name !== manifest.version) : []
    stale.forEach(name => problems.push(`stale version folder public/scanner/deep/${name}`))
    if (problems.length) {
        console.error(`Deep scanner pieces are not ready for version ${manifest.version}:\n  ${problems.join('\n  ')}\nRebuild them with the steps at the top of scripts/scanner/build-deep.mjs.`)
        process.exit(1)
    }
    console.log(`deep scanner ${manifest.version}: all pieces present`)
}

const [first, second] = process.argv.slice(2)
if (first === '--check')
    check()
else if (first === '--fetch')
    await fetchSources(resolve(second))
else
    pack(resolve(first))
