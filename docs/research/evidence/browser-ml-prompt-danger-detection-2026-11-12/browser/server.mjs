// One-off research script, kept exactly as run on 2026-11-12 so the memo's numbers can be reproduced.
/* eslint-disable eslint-comments/no-unlimited-disable */
/* eslint-disable */
// Static server for the browser check. Usage: node server.mjs <port> <runnerDir> <modelsDir> [--isolated]
import { createReadStream, statSync } from 'node:fs'
import { createServer } from 'node:http'
import { extname, join, normalize } from 'node:path'

const [port, runnerDir, modelsDir, flag] = process.argv.slice(2)
const here = new URL('.', import.meta.url).pathname
const roots = { '/tjs/': join(runnerDir, 'node_modules/@huggingface/transformers/dist/'), '/ort/': join(runnerDir, 'node_modules/onnxruntime-web/dist/'), '/models/': `${modelsDir}/` }
const types = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.wasm': 'application/wasm', '.onnx': 'application/octet-stream' }
createServer((req, res) => {
    const path = decodeURIComponent(new URL(req.url, 'http://x').pathname)
    let file = path === '/page.html' ? join(here, 'page.html') : null
    for (const [prefix, root] of Object.entries(roots)) {
        if (path.startsWith(prefix)) {
            const candidate = normalize(join(root, path.slice(prefix.length)))
            if (candidate.startsWith(root)) file = candidate
        }
    }
    try {
        const stat = file && statSync(file)
        if (!stat?.isFile()) throw new Error('missing')
        const headers = { 'Content-Type': types[extname(file)] ?? 'application/octet-stream', 'Content-Length': stat.size }
        if (flag === '--isolated') Object.assign(headers, { 'Cross-Origin-Opener-Policy': 'same-origin', 'Cross-Origin-Embedder-Policy': 'require-corp' })
        res.writeHead(200, headers)
        createReadStream(file).pipe(res)
    }
    catch {
        res.writeHead(404).end('not found')
    }
}).listen(Number(port), '127.0.0.1', () => console.log(`listening ${port}`))
