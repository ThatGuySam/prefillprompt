# Making browser prompt scanning affordable on a slow connection

Research memo, 2026-11-14. PrefillPrompt needs to warn recipients about dangerous shared prompts without sending their text to an inference server. The previous memo selected Horizon's mmBERT-small classifier, but its roughly 243 MB compressed download is too expensive for a first visit on a phone. This memo investigates a cheap first scan, a smaller model, and a download experience that tells the reader what has actually been checked.

## Scope

- Extend [the November 12 memo](browser-ml-prompt-danger-detection-2026-11-12.md) and [its evidence](evidence/browser-ml-prompt-danger-detection-2026-11-12/README.md). Preserve its measured findings, while revisiting its deployment recommendation.
- Cover model reduction, safe-skip cascades, storage, delivery, device signals, progress, built-in models, and precedents. Browser inference remains local. Offline preparation of a model is a future option.
- This is desk research. No model weights were downloaded, no inference or benchmarks ran, and no training, browser launch, or CPU-heavy job ran. Arithmetic below is calculated, not measured performance. Only this memo was created.
- MB means decimal megabytes. MiB means 1,048,576 bytes. Raw model size, HTTP transfer size, browser storage, and inference memory are different quantities.

## Short answer

Sam's proposed flow is useful, with two changes. A first-stage result should mean either "warning already justified", "eligible to skip a deeper scan under a tested policy", or "unknown". An obvious warning does not need a 243 MB download to reconfirm it. An unknown prompt needs a choice to download or continue with a visible incomplete-scan state. The absence of a regex match is not evidence of safety.

The most promising model work is to audit the existing export's precision, then test vocabulary reduction with recovery training. Horizon's card says its quantized export has **int8 embeddings**. That does not establish that all backbone weights are int8. A size accounting hypothesis explains almost the entire 268 MB model as 98 MB of int8 embeddings plus 169 MB of higher-precision backbone. If that hypothesis is right, quantizing the remaining eligible weights could save roughly 126 MB before changing vocabulary or architecture. The export script also calls ordinary dynamic quantization, so graph inspection is needed before treating this saving as available. [Horizon card](https://huggingface.co/Horizon-Labs/prompt-injection-guard-small/blob/main/README.md), [export source](https://raw.githubusercontent.com/horizon-ai-labs/agent-io-guards/main/train/export_onnx.py).

A 32,768-token mmBERT-small has about 54.8M parameters instead of 140.5M in a published trimming experiment. Combining that vocabulary with broad int8 quantization suggests a model near 55 MB before graph overhead, plus a smaller tokenizer. That is an engineering target, not a working injection detector or measured download. The experiment also found that trimming an already fine-tuned mmBERT could collapse its performance. [Trimming experiment](https://huggingface.co/blog/lbourdois/introduction-to-trimming).

Caching makes repeat use cheaper, but cannot promise permanent installation or inference-only visits. After navigation, cached files still need parsing, session creation, and possibly shader compilation. Eviction, private browsing, storage failures, model updates, and browser data clearing can require another download. Chrome's built-in Prompt API is an optional desktop experiment, not the mobile fallback. [Chrome requirements](https://developer.chrome.com/docs/ai/prompt-api), [storage policies](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria).

## What the workspace already establishes

The evidence scripts use local model files, a 512-token truncation limit, and Transformers.js 4.3.2. Their `dtype: 'fp32'` argument selects the locally renamed `model.onnx`; it does not prove the weights inside are fp32. The browser test disables browser caching and serves files from localhost. Its timings therefore establish neither first-download time nor repeat-visit cache behavior. See [evaluation script](evidence/browser-ml-prompt-danger-detection-2026-11-12/eval.mjs) and [browser page](evidence/browser-ml-prompt-danger-detection-2026-11-12/browser/page.html).

The earlier results remain a useful warning about the task itself. Horizon caught 17 of 24 hand-written link threats at 0.5, 10 at 0.9, and 6 at 0.99. Its 0.99 result had no flags among the 180 hand-written benign near misses. These are small evaluator-written sets, with training overlap in some public corpora. They cannot calibrate a safe-skip rule for real shared links. The failed 23 MB embedding-similarity baseline caught only 2 of 24 held-out link attacks at a threshold with almost no false alarms. See [sample summary](evidence/browser-ml-prompt-danger-detection-2026-11-12/summary.sample.json), [link cases](evidence/browser-ml-prompt-danger-detection-2026-11-12/link-threat.json), and [near-miss scores](evidence/browser-ml-prompt-danger-detection-2026-11-12/horizon-pi-small.near-miss.jsonl).

Today's [redirect helper](../../src/lib/prompt-redirect.ts) sends only regex hits to `/open`. Clean-looking `/api/prompt` requests usually redirect straight to a provider. The existing API contract intentionally preserves this behavior. Browser scanning cannot examine a request on which no PrefillPrompt page loads. A future scanner can cover new `/open` links immediately, but covering every legacy API link would require a separate product decision about the redirect contract. A sender-controlled `scanned=true`, signature from the sender, model name, or prior builder check cannot establish recipient-side safety.

The current app has no Transformers.js dependency, model installer, service worker, or ML cache implementation. [The preview](../../src/pages/open.vue) computes regex signals. Prompt length is capped at 12,000 characters and shared URLs at 15,000 bytes in [prompt-links.ts](../../src/lib/prompt-links.ts). Those character limits do not ensure that an entire prompt fits a 512-token model window.

## What the evidence says

### 1. A progress animation cannot fix the transfer budget

The table estimates ideal transfer time using `seconds = MB × 8 / Mbps`. The 0.4 Mbps and 1.6 Mbps columns are chosen slow and faster 3G-class scenarios, not guarantees about every network labeled "3G". They omit connection setup, retries, contention, runtime files, decompression, initialization, and inference.

| Payload | 0.4 Mbps | 1.6 Mbps | 10 Mbps |
| --- | --- | --- | --- |
| Earlier 302 MB raw model and tokenizer | 100.7 min | 25.2 min | 4.0 min |
| Earlier 243 MB gzip transfer | 81.0 min | 20.3 min | 3.2 min |
| Illustrative 175 MB package after better quantization | 58.3 min | 14.6 min | 2.3 min |
| Illustrative 60 MB compact package | 20.0 min | 5.0 min | 48 s |
| Illustrative 1 MB first-stage classifier | 20 s | 5 s | 0.8 s |

The old memo reports about 14 MB for its WASM runtime, or 27 MB with WebGPU support, plus a 588 KB JS bundle. Those are earlier artifact sizes, not new measurements. Even another 14 MB adds about 4.7 minutes at 0.4 Mbps. Lazy-load the inference library and the selected backend as well as the model. A tiny first stage should avoid importing ONNX Runtime at all.

The existing gzip estimate saves 59 MB against 302 MB, about 19.5%. Do not count that saving again when comparing a new compression strategy with the already-compressed baseline. Network compression also does not shrink decoded tensors or peak inference memory. After the model is reduced, a custom ORT Web build containing only required kernels could reduce runtime overhead further. Its saving is unmeasured and it adds build-maintenance effort. [ORT deployment choices](https://onnxruntime.ai/docs/tutorials/web/deploy.html).

### 2. Account for the embedding matrix before choosing a compression method

[mmBERT-small](https://huggingface.co/jhu-clsp/mmBERT-small) has 22 layers, a 256,000-token vocabulary, hidden width 384, and about 42M nonembedding parameters. Therefore its input embedding has `256,000 × 384 = 98,304,000` weights, roughly 70% of all parameters. Parameter dominance and byte dominance differ when parts of the graph use different precision.

| Technique | Size accounting estimate | Effort and important condition |
| --- | --- | --- |
| Audit and quantize eligible remaining backbone weights to int8 | If about 42M backbone weights are fp32 today, replacing four bytes with one saves about 126 MB. Full-weight int8 accounting is about 141 MB plus graph overhead and the existing 34 MB tokenizer. | Best model-specific first investigation. Exact initializer dtypes and eligible operators are unverified. Quantization changes logits and may change warning thresholds. |
| Reduce vocabulary to 65,536 tokens | Int8 embedding falls from 98.3 MB to 25.2 MB, saving 73.1 MB before tokenizer savings. | Moderate to high effort. Preserve special tokens, byte coverage, merge dependencies, and tokenizer-to-embedding ID alignment. |
| Reduce vocabulary to 32,768 tokens | Int8 embedding becomes 12.6 MB, saving 85.7 MB. Together with roughly 42M int8 backbone weights, about 55 MB of weights remain. | Published parameter reduction exists, but a recovered, recalibrated prompt detector does not follow automatically. |
| Int4 embedding alone | Ideal packed weights save about 49.2 MB against int8, before block scales and graph metadata. | Only useful if the exact browser backend supports the exported gather/dequantization graph. |
| Int4 backbone after full int8 | Ideal saving is about another 21 MB for 42M weights, before scales and exceptions. | Less saving than the vocabulary step. Do not assume every operator accepts four-bit tensors. |
| FP16 backbone from fp32 | Ideal saving about 84 MB for 42M weights. Full model near 183 MB before tokenizer and graph overhead under this precision hypothesis. | Potential WebGPU compromise. It is not a universal WASM compatibility or speed guarantee. |
| Drop half the transformer layers | Removes roughly half the backbone, not half the embedding. About 21 MB if backbone is int8, about 84 MB if fp32. | Needs recovery training or distillation and fresh evaluation. Dropping layers leaves the large vocabulary intact. |

All table values are arithmetic scenarios, not inspected graph totals or compressed HTTP sizes. Savings cannot be added across incompatible starting points. A useful compact-model planning target is **60 to 80 MB raw including tokenizer**, then a separately measured wire budget. It is not yet a release candidate.

Vocabulary pruning must alter both the tokenizer and the embedding row map. Deleting JSON entries alone corrupts IDs. Keeping the entire tokenizer while remapping removed tokens to unknown tokens preserves neither meaning nor attack coverage. Removing rare Unicode tokens can cause language and obfuscation blind spots. Smaller vocabularies also produce longer token sequences, increasing window count and inference cost. A frequent-token list mined only from ordinary English prompts is especially risky for a multilingual security detector. These are engineering implications of the method. [Vocabulary-trimming implementation](https://github.com/asahi417/lm-vocab-trimmer), [trimming paper](https://aclanthology.org/2023.findings-emnlp.981/).

The strongest directly relevant experiment trimmed mmBERT before fine-tuning. Its French named-entity task and English GLUE results establish feasibility, not injection recall. Prefer training or recovering the detector with the final vocabulary. Test multilingual text, code, URLs, control markers, confusables, and encoded instructions explicitly. The 34 MB tokenizer is worth compressing and avoiding duplicate formats, but minifying JSON cannot remove embedding weights.

### 3. "Supports int4" must name the operator, backend, and release

ONNX Runtime's quantization tooling supports blockwise four-bit weight quantization for selected constant-weight MatMul and Gather operators. QOperator exports use `MatMulNBits` and `GatherBlockQuantized`. The guide requires ORT 1.20 or later for quantized Gather, while standard ONNX int4 tensors require opset 21. Those are export and format requirements, not proof that a prebuilt browser backend contains a compatible kernel. [ORT quantization guide](https://onnxruntime.ai/docs/performance/model-optimizations/quantization.html), [ONNX int4 representation](https://onnx.ai/onnx/technical/int4.html).

There is stronger evidence than a generic current support table. Transformers.js 4.3.2 declares `onnxruntime-web` version `1.31.0-dev.20260914-8d85527a0`. At that referenced source revision, the WebGPU table and resolver register both `GatherBlockQuantized` and `MatMulNBits`. The MatMul implementation handles four-bit packing and rejects some unsupported zero-point layouts. This establishes an available WebGPU implementation path. It does not establish that Wolf's complete graph loads, that WASM contains the same kernels, or that every phone provides usable WebGPU. [Pinned package](https://raw.githubusercontent.com/huggingface/transformers.js/4.3.2/packages/transformers/package.json), [pinned WebGPU table](https://raw.githubusercontent.com/microsoft/onnxruntime/8d85527a0/js/web/docs/webgpu-operators.md), [resolver](https://raw.githubusercontent.com/microsoft/onnxruntime/8d85527a0/js/web/lib/wasm/jsep/webgpu/op-resolve-rules.ts), [four-bit MatMul implementation](https://raw.githubusercontent.com/microsoft/onnxruntime/8d85527a0/js/web/lib/wasm/jsep/webgpu/ops/matmulnbits.ts).

Transformers.js accepts `q4` and `q4f16` selections for compatible published artifacts. A dtype option selects a file and execution configuration; it does not quantize Horizon at download time or manufacture missing kernels. Current `main` operator tables can be ahead of the runtime bundled with Transformers.js 4.3.2. Require an exact export, pinned runtime, and backend compatibility matrix before offering int4 to phones. [Dtype guide](https://huggingface.co/docs/transformers.js/en/guides/dtypes).

The earlier local Wolf Defender edge result failed in the browser on `GatherBlockQuantized`. Its current card describes 22 layers reduced to 16, vocabulary cut to 128k, one recovery epoch with teacher distillation, and a 58.13 MB export with int8 linear weights and int4 embeddings. Its native-ORT agreement panel has only 34 examples. This is a direct precedent for combined reduction. The pinned WebGPU evidence justifies a later test of that backend rather than declaring int4 impossible. It does not reverse the earlier browser failure or establish safety accuracy. [Wolf Defender edge](https://huggingface.co/patronus-studio/wolf-defender-prompt-injection-edge).

Dynamic int8, calibrated static int8, and quantization-aware training are different offline preparation choices. Compare their exported operators and recovered task accuracy. GPTQ or AWQ labels do not supply missing browser kernels. Mixed precision can leave sensitive parts at higher precision. Reducing dimensions or precision can improve transfer without improving inference speed if the backend dequantizes into larger buffers. No such speedup was measured here.

Unstructured pruning is lower priority. Setting weights to zero does not shrink a dense ONNX tensor or guarantee sparse browser kernels. Structured width or layer reduction removes bytes, but changes the model. Adapter or LoRA files are small only because a base model still exists somewhere. Neither is a first-download shortcut for a browser that lacks that base. [DistilBERT](https://arxiv.org/abs/1910.01108), [TinyBERT](https://arxiv.org/abs/1909.10351).

### 4. Smaller existing models and a custom student

The earlier memo already tested the tempting alternatives. Prompt Guard 2 22M downloaded about 82 MB including tokenizer, but caught only 1 of 24 link threats at 0.9. TestSavant's roughly 19 MB package had too many false alarms. The MiniLM similarity baseline was small but weak. A smaller file does not improve the recipient experience if it supplies misleading reassurance.

Retain those models as experimental baselines, with their licensing and browser-operator limits, rather than substitute one solely on size. Harmful-content detectors answer a different question from whether a link asks the recipient's assistant to misuse its tools or memory. The right target may be a custom classifier of recipient-impacting actions. The sender's apparent intent is not fully recoverable from the text alone. [Prompt Guard card](https://huggingface.co/meta-llama/Llama-Prompt-Guard-2-22M), [TestSavant card](https://huggingface.co/testsavantai/prompt-injection-defender-tiny-v0-onnx).

A useful low-cost student baseline is hashed character n-grams with a linear classifier. With `2^18` features and one binary weight vector, weights cost about 1.05 MB at fp32 or 0.262 MB at int8, plus bias, scales, metadata, and JS. This is a proposed budget. It needs no vocabulary JSON or ONNX runtime, and character features can preserve some obfuscation clues. Collisions, unseen wording, languages, and semantic threats remain weaknesses. Do not call it validated because linear text classification is established. [HashingVectorizer](https://scikit-learn.org/stable/modules/generated/sklearn.feature_extraction.text.HashingVectorizer.html), [fastText compression](https://fasttext.cc/blog/2017/10/02/blog-post.html).

For a neural student, compare a small-vocabulary, shallow encoder or character model with a trimmed mmBERT. Distill teacher logits as one training signal, but add independent human labels for memory poisoning, credential collection, forwarding, and fetch-and-follow requests. Horizon's own misses must not become the student's ground truth. Layer dropping, width reduction, and tokenization changes need recovery. A future 10 to 30 MB student is a project target, not a sourced accuracy claim.

### 5. A cascade needs a low-risk exit and an immediate warning exit

The proposed order is:

1. Decode the URL once using the app's canonical parser. Keep the original text visible. Compute bounded normalized variants for checks. Do not fetch URLs, execute content, or recursively decode without limits.
2. Run the existing rules on original and relevant normalized text. Show an existing justified warning immediately. A model may add detail later, but must not clear that warning.
3. Reuse a local completed verdict only for the exact prompt and relevant destination context, with matching model, rule, tokenizer, normalization, windowing, and threshold versions. A hash is a cache key, not a safety certificate. Keep verdict caching optional and bounded because prompt hashes can identify guessable text.
4. Run a tiny student if and when its safe-skip policy has passed validation. Use separate low and high thresholds. Between them, abstain. Unsupported languages, excessive length, high token fragmentation, hidden content, decoding failures, or input outside the validation population force abstention.
5. If a deeper model is needed and already cached, load and run it. Otherwise offer the actual download size and an incomplete-scan alternative. An obviously dangerous prompt can remain warned without installing the model.

This differs from "unknown or dangerous always downloads". Spend the download on cases where it may change the result. An immutable, first-party reviewed template can skip a model for the exact reviewed text. Arbitrary text slots, a familiar prefix, a sender reputation claim, or semantic similarity do not inherit that review.

There is no supported numerical safe cutoff today. The earlier 0.9 and 0.99 thresholds govern when to warn, not when it is safe to stop checking. Classifier softmax is not a calibrated probability of harm. [Calibration research](https://proceedings.mlr.press/v70/guo17a.html), [selective classification](https://arxiv.org/abs/1705.08500).

Choose a skip policy by its **attack escape rate**, `P(skip | attack)`, while also measuring `P(attack | skip)`, benign coverage, false warnings, and the fraction requiring download. Contamination among skipped prompts depends on real attack prevalence. High overall accuracy on a mostly benign sample can conceal a useless detector.

One validation procedure is to set an acceptable added miss budget, choose the threshold on development data, freeze it, and evaluate on independent attack families and ordinary links. For zero escapes among `n` independent held-out attacks, the one-sided 95% binomial upper bound is `1 - 0.05^(1/n)`. About 299 zero-escape cases bound that rate near 1%, and 2,995 near 0.1%. These are calculated examples under fixed-threshold, representative independent sampling. Hundreds of variants of one attack are not hundreds of independent attack families. Searching thresholds on the same holdout invalidates this calculation. [Binomial bounds](https://www.itl.nist.gov/div898/handbook/prc/section2/prc241.htm), [risk control](https://arxiv.org/abs/2208.02814).

The bound covers stage-one escapes only. It does not cover attacks the final classifier misses, malicious linked content never inspected, or adaptive attackers who optimize against a public model. The earlier evidence and adaptive-attack studies rule out a general proof of safety. Prefer "No warning found by basic checks" or "Deeper scan not run". [The Attacker Moves Second](https://arxiv.org/abs/2510.09023), [guardrail evasion study](https://arxiv.org/abs/2504.11168).

Expected bytes also need the right denominator. With a 1 MB first stage, 243 MB deep model, and 10% escalation probability, one cold prompt costs an estimated `1 + 0.1 × 243 = 25.3 MB` on average. That is about 90% less than always installing. The unlucky recipient still faces the whole download. Over ten independent prompts, the chance of at least one installation is `1 - 0.9^10 = 65.1%`. At 1% escalation it is 9.6%. These scenarios assume independent prompts and a surviving cache. Measure cold browsers, download completion, and bytes per browser, not only skipped prompts.

### 6. Cache the files, but model installation as recoverable state

Transformers.js already uses Cache API storage in browsers. Start with that cache and immutable model URLs. A service worker is not required to use Cache API from the page or inference worker. Do not add three independent complete copies in Cache API, IndexedDB, and OPFS. The default cache is a download optimization, not a transaction protocol or a permanence promise. Cache writes can fail while inference still succeeds. [Pinned environment](https://raw.githubusercontent.com/huggingface/transformers.js/4.3.2/packages/transformers/src/env.js), [pinned hub loader](https://raw.githubusercontent.com/huggingface/transformers.js/4.3.2/packages/transformers/src/utils/hub.js), [Cache API](https://developer.mozilla.org/en-US/docs/Web/API/Cache).

| Mechanism | Best use here | Limits |
| --- | --- | --- |
| Cache API | Complete immutable responses and the least custom integration with Transformers.js | Explicit application storage, not ordinary HTTP freshness behavior. Partial 206 responses cannot be stored with `Cache.put()`. |
| OPFS | A custom installer that streams and checkpoints chunks with file-like access | Adds loader work. Still subject to origin storage policy. Reading the final model may still allocate a full buffer. |
| IndexedDB | Small manifests, chunk completion records, bounded verdict metadata; model blobs if chosen as the one backend | Transactions and blobs do not make storage permanent. Large serialization or copies can increase memory. |
| HTTP browser cache | Reuse from ordinary versioned HTTP requests | Separate from application installation bookkeeping. Evictable and partitioned. |
| In-memory worker session | Repeated inference while the page remains alive | Navigation, tab termination, or disposal loses the session. This is the actual inference-only fast path. |

Use `navigator.storage.estimate()` as a hint before installation and `persist()` after the reader opts into keeping the model. Check the returned persistence grant. Neither a quota estimate nor unused device RAM promises that a 300 MB install or inference allocation will succeed. Handle `QuotaExceededError`, denied storage, private mode, incomplete writes, and corrupt files as normal branches. [OPFS](https://developer.mozilla.org/en-US/docs/Web/API/File_System_API/Origin_private_file_system), [persistence](https://developer.mozilla.org/en-US/docs/Web/API/StorageManager/persist), [estimate](https://developer.mozilla.org/en-US/docs/Web/API/StorageManager/estimate).

WebKit's Safari 17 policy gives browser origins a quota up to roughly 60% of disk, and other embedded WebKit apps roughly 15%, with aggregate limits and exceptions. These are ceilings, not space reservations. Storage pressure can evict an origin. WebKit's tracking-prevention policy also describes deletion of script-writable storage after seven days of Safari use without interaction with the site, with special treatment for installed home-screen apps. This is not a universal timer of seven wall-clock days. A casual recipient is exactly the user for whom cached installation cannot be assumed. [WebKit storage policy](https://webkit.org/blog/14403/updates-to-storage-policy/), [ITP storage policy](https://webkit.org/blog/10218/full-third-party-cookie-blocking-and-more/).

Treat an installation as complete only after every required artifact for a pinned manifest is present and checked. Include runtime, model, tokenizer, config, backend, hashes, lengths, and format versions. Use a temporary installation namespace, then commit a small completed-manifest record. Keep the last known working version until the replacement is complete if quota permits. Provide "Remove downloaded scanner" and check actual files at the next visit. Re-run the cheap rules even when an exact ML verdict is cached.

### 7. Resume at chunk boundaries without depending on background execution

For the first implementation, completed-file reuse and restart-on-failure may be enough once the model is small. If long transfers remain, immutable independently addressable chunks make recovery clearer than a single huge request. With one active transfer, a proposed 4 MiB chunk size bounds ordinary lost work to one chunk, about 84 seconds at 0.4 Mbps. Multiple incomplete concurrent chunks multiply that bound. This size is a judgment to evaluate, not an optimum established by research.

Publish a manifest with exact compressed and decoded lengths and a hash per chunk. Persist verified chunks, resume missing ones, limit concurrency on slow links, and verify the final artifact. Custom chunk assembly needs a loader integration. Merely splitting an ONNX file does not let inference start early, and ONNX external-data support is not an automatic resumable downloader. [ORT large models](https://onnxruntime.ai/docs/tutorials/web/large-models.html).

Chunking also reopens an option the earlier memo ruled out for a monolithic file. Workers Static Assets allow individual files up to 25 MiB. Separate 4 MiB objects fit that limit and could be served on the site's own origin. This is an inferred deployment option that avoids an R2 dependency but adds assembly and release-management work. R2 is still the simpler way to serve an unchanged large model file. Neither option reduces total first-download bytes by itself. [Workers limits](https://developers.cloudflare.com/workers/platform/limits/).

HTTP `Range`, `ETag`, and `If-Range` can resume an immutable representation, but offsets must refer to the same encoded bytes. Do not append an unexpected 200 response to a partial file. Cache API rejects storing a 206 response directly. Keep partial bytes in OPFS or IndexedDB, or use independently fetched complete chunk objects. R2's Workers API supports ranges but documents that it does not support `If-Range` conditionals. A Worker proxy must handle the validator itself. [Range requests](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Range_requests), [R2 Workers API](https://developers.cloudflare.com/r2/api/workers/workers-api-reference/), [Cache API specification](https://w3c.github.io/ServiceWorker/#cache-put).

A service worker can own caching and coordinate page requests. It is not a durable daemon, and mobile browsers can suspend or terminate work. Background Fetch is intended for long transfers but lacks Safari and Firefox support. Do not require it, Background Sync, a screen wake lock, or an installed PWA just to inspect a shared link. Keep the prompt preview usable, say "Keep this page open while downloading", checkpoint completed chunks, and recover after interruption. [Background Fetch](https://developer.mozilla.org/en-US/docs/Web/API/Background_Fetch_API), [service worker lifetime](https://developer.chrome.com/docs/workbox/service-worker-lifecycle), [page visibility](https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API).

Deduplicate installation within a page and across tabs where possible. A same-origin Web Lock can prevent two recipients' tabs from downloading the same version concurrently. Fall back to idempotent chunk writes where unavailable. Prompts and scores need not pass through the service worker or leave the page. [Web Locks](https://developer.mozilla.org/en-US/docs/Web/API/Web_Locks_API).

### 8. R2 and compression improve delivery, not the underlying model

Serve a pinned version from a production R2 custom domain, with an immutable path such as a content hash. Use appropriate `Content-Type`, long-lived `Cache-Control`, CORS for the site, validators, and accessible length or range headers. Configure cache eligibility explicitly for ONNX and JSON. They are not standard cacheable extensions. The documented 512 MB CDN object cap on Free, Pro, and Business plans accommodates the existing model. `r2.dev` is a development endpoint and a custom domain is needed for Cloudflare cache integration. Edge cache saves origin work and latency. It does not remove the recipient's first transfer. [R2 public buckets](https://developers.cloudflare.com/r2/buckets/public-buckets/), [R2 CORS](https://developers.cloudflare.com/r2/buckets/cors/), [cache defaults](https://developers.cloudflare.com/cache/concepts/default-cache-behavior/).

Never cache `/open?...q=...`, prompt-bearing HTML, or API redirects in the model service worker. Existing private, no-store headers and the no-referrer policy must remain. Model requests should contain only public version and artifact identifiers. First-party hosting avoids telling a model CDN that this recipient opened a PrefillPrompt page. Public model downloads still reveal IP and timing to hosting infrastructure. Hosting at a popular model CDN does not establish reuse from another website. Chrome partitions its ordinary HTTP cache by site, and Cache API storage belongs to the application origin. [HTTP cache partitioning](https://developer.chrome.com/blog/http-cache-partitioning), [Cache API](https://developer.mozilla.org/en-US/docs/Web/API/Cache).

Precompress at build or release time, not on the Worker per request. Negotiate normal HTTP Brotli with gzip fallback and optionally Zstandard after compatibility checks. JSON usually has more redundancy than quantized weights. Do not promise a particular Brotli-versus-gzip saving without inspecting the actual new package. Cloudflare's automatic compression has content-type, size, and configuration conditions; an `.onnx` suffix alone does not ensure compression. [Cloudflare compression](https://developers.cloudflare.com/speed/optimization/content/compression/), [compression rules](https://developers.cloudflare.com/rules/compression-rules/).

Normal HTTP `Content-Encoding` and JavaScript `DecompressionStream` are different capabilities. The compatibility data lists HTTP Zstandard in Chrome 123+, Firefox 126+, and Safari 26.3+, while JavaScript Zstandard decompression is not broadly available. Downloading a `.zst` or `.br` blob does not ensure that API can decode it. Prefer native HTTP decoding for whole responses. For resumable compressed chunks, independently compress each complete chunk or serve an explicitly versioned identity representation. Do not mix offsets across gzip, Brotli, Zstandard, and identity responses. Cloudflare documents additional range and compression cache behavior that needs a deployment check. [HTTP encoding support](https://raw.githubusercontent.com/mdn/browser-compat-data/main/http/headers/Content-Encoding.json), [DecompressionStream support](https://raw.githubusercontent.com/mdn/browser-compat-data/main/api/DecompressionStream.json), [Cloudflare range/compression behavior](https://developers.cloudflare.com/cache/reference/range-requests/).

### 9. Decide whether to download with consent and capability hints

Use these signals to reduce resource use, never to assign a safer verdict to a prompt:

| Situation | Proposed behavior |
| --- | --- |
| Exact complete compatible model already cached | Run cheap checks, then load the cached model if deeper scanning is needed. No permission for the same transfer is needed because there is no transfer. |
| `saveData === true`, Save-Data header, slow-2g, 2g, or 3g hint | Do not start a large uncached download automatically. Offer its actual size, a rough estimate, cancellation, and basic-check-only continuation. |
| Connection API absent | Treat bandwidth and metering as unknown. Show the same choice. Absence does not mean Wi-Fi. |
| Good network hint or Wi-Fi | Still disclose the large first download. Wi-Fi may be tethered or metered. |
| Low approximate device memory or insufficient estimated storage | Default to basic checks and optional download only if the runtime can load. Do not imply that a smaller device needs weaker safety. |
| Offline with complete model cached | Try local scanning. If loading fails, retain basic results and label the missing deeper scan. |
| Offline or installation declined, failed, canceled, or evicted | Show "Basic checks only. Deeper scan not run." Keep existing warnings and the full readable prompt. |

The Network Information API has limited support. `effectiveType` reflects recent throughput and latency, not a cellular radio generation or data-plan price. Save-Data is an explicit reduced-data preference. `deviceMemory` is approximate and coarsened, with limited browser support. None is an admission ticket or a reliable RAM budget. Feature-detect each. [Network Information](https://developer.mozilla.org/en-US/docs/Web/API/Network_Information_API), [effectiveType](https://developer.mozilla.org/en-US/docs/Web/API/NetworkInformation/effectiveType), [Save-Data](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Save-Data), [deviceMemory](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/deviceMemory).

Offer a clear **Download scanner** action and **Continue with basic checks**. Keep a previous download preference separate from a verdict. A retained preference may authorize a same-version retry, but should not silently authorize arbitrarily larger future releases. Do not run a separate speed test that itself transfers megabytes. If estimating completion time, use actual download throughput and label it approximate. Automatic installation is a later product choice after size and completion evidence exist.

### 10. Progress must show download, preparation, and scanning separately

"Scanning prompt" is a good umbrella label, but a download is not inference progress. Show the prompt and any immediate warning throughout. Use named stages inside the graphic:

| State | Suggested visible wording | Progress source |
| --- | --- | --- |
| Cheap checks | "Checking prompt" | Usually too brief for a percent. Do not delay it to animate. |
| Choice required | "Deeper scanning needs a download of about X MB" | Actual release manifest and cached missing bytes. |
| First install | "Downloading scanner. X of Y MB" | Verified artifact or chunk bytes, with approximate remaining time only when stable. |
| Files downloaded | "Preparing scanner on this device" | Indeterminate unless initialization exposes real steps. |
| Inference | "Scanning prompt on this device" | Indeterminate for one pass, or "Checking section 2 of 5" for windowed scoring. |
| Complete with no warning | "No warning found in this scan" | Explicit completed result, with scope available. |
| Canceled or unavailable | "Basic checks only. Deeper scan not run" | Terminal partial result. Never a full completed checkmark. |
| Cached later visit | "Loading saved scanner", then "Scanning prompt" | No fake download phase. |
| Same live session | "Scanning prompt" | Inference only, unless a previous exact verdict is reused. |

Do not combine phases into a smooth invented percentage such as 95% download and 5% inference. The last 5% could take longer on a phone than the earlier network phase. Chrome's own model-download guidance uses determinate download progress followed by indeterminate preparation. [Download UI guidance](https://developer.chrome.com/docs/ai/inform-users-of-model-download).

Pinned Transformers.js progress needs care under HTTP compression. Its byte reader uses `Content-Length`, while Fetch's readable stream contains decoded bytes and that header may describe the encoded representation. Dividing those counts can exceed 100%. Use a manifest denominator in the same representation as the counter. Native HTTP decoding makes exact live wire-byte progress difficult. Label decoded artifact progress accurately, or use separately compressed chunk objects with known encoded sizes. Resource Timing distinguishes encoded and decoded totals after loading. Do not display a tokenizer's completion as the whole installation. The loader can also emit download events for cache reads, so an event label alone cannot distinguish network transfer from saved-file loading. [Pinned byte reader](https://raw.githubusercontent.com/huggingface/transformers.js/4.3.2/packages/transformers/src/utils/hub/utils.js), [pinned loader](https://raw.githubusercontent.com/huggingface/transformers.js/4.3.2/packages/transformers/src/utils/hub.js), [encoded size](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceResourceTiming/encodedBodySize), [decoded size](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceResourceTiming/decodedBodySize).

Use a Web Worker for custom inference so the progress graphic remains responsive. Start with one or two WASM threads, not all reported cores. Multithreaded WASM needs cross-origin isolation and deployment checks. WebGPU may reduce inference time, but cannot reduce download size unless it enables a smaller compatible artifact. Avoid silently downloading both GPU and CPU weight variants after an initialization failure. [Web Workers](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers), [ORT deployment](https://onnxruntime.ai/docs/tutorials/web/deploy.html).

Use native `<progress>` or a labeled progressbar, omit the numeric value for indeterminate phases, announce stage changes with a polite status region, honor reduced motion, and preserve keyboard focus. A progressbar is not itself a live announcement of every update. Keep Cancel and Retry accessible. Use `AbortController` for transfer cancellation and discard stale inference results when the prompt changes. [Progress semantics](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Roles/progressbar_role), [status semantics](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Roles/status_role), [abort behavior](https://developer.mozilla.org/en-US/docs/Web/API/AbortController).

Long prompts need a visible coverage policy. Do not mark a 12,000-character prompt fully scanned after scoring only its first 512 tokens. Use bounded overlapping windows with a maximum score and evaluated thresholds, or label a partial scan. More windows increase both compute and the chance of at least one false warning. Base64 expansion and smaller vocabularies can increase the number of windows. The budgets for input normalization, tokenization, and window count belong in the scanner version.

### 11. Built-in browser models cannot replace a universal small detector

Chrome's Prompt API is available to web pages beginning with Chrome 148 according to its current documentation. Its documented hardware gate includes at least 22 GB free disk, and either more than 4 GB VRAM or a qualifying CPU with at least 16 GB RAM. Android and iOS are unsupported. Check `LanguageModel.availability()` with the exact intended options. Only an already-available installation could avoid this site's model transfer without triggering a different large download. [Prompt API](https://developer.chrome.com/docs/ai/prompt-api).

Even there, a generative model asked "is this prompt dangerous?" is a different classifier. It needs its own attack evaluation, structured-output handling, and abstention policy. Browser-managed models update without an app-pinnable JavaScript version and may disappear under resource pressure. Use it only as an evaluated optional additional check. Do not make basic link access depend on it. [Model lifecycle](https://developer.chrome.com/docs/ai/understand-built-in-model-management).

Microsoft Edge documents an experimental desktop Prompt API with Phi-4-mini and Aion variants. Firefox's AI runtime documentation describes privileged browser and extension contexts, not a portable web-page inference API. Mozilla and WebKit oppose the proposed Prompt API. Apple's Foundation Models documentation is a native Swift framework and does not establish a Safari JavaScript endpoint. Chrome's Translator and Language Detector APIs cannot classify prompt danger. [Edge](https://learn.microsoft.com/en-us/microsoft-edge/web-platform/prompt-api), [Firefox runtime](https://firefox-source-docs.mozilla.org/toolkit/components/ml/), [Mozilla position](https://github.com/mozilla/standards-positions/issues/1213), [WebKit position](https://github.com/WebKit/standards-positions/issues/495), [Apple framework](https://developer.apple.com/documentation/foundationmodels.md).

Avoid a generic Prompt API polyfill as a download shortcut. Chrome's experimental polyfill can use cloud providers, which violates this task's local-only constraint, or Transformers.js, which still needs model downloads and origin-local caching. [Polyfill design](https://developer.chrome.com/docs/ai/prompt-api-polyfill).

### 12. Precedents offer design patterns, not mobile success rates

| Product or project | Direct observation | Lesson for PrefillPrompt and limit |
| --- | --- | --- |
| Firefox Translations | Mozilla described an approximately 20 MiB English-to-French model, installed on demand and used offline. Current help exposes language installation and removal. | Package the capability actually needed and let users remove it. This is browser-managed storage, not evidence that a site's cache survives equally well. [Architecture](https://hacks.mozilla.org/2024/05/experimenting-with-local-alt-text-generation-in-firefox-nightly/), [help](https://support.mozilla.org/en-US/kb/website-translation). |
| Firefox PDF alt text | Mozilla describes small quantized models below 200 MB, separate inference execution, and model distribution through Remote Settings. | Small task-specific models and isolation are established product choices. Laptop latency and privileged browser distribution do not establish slow-3G usability. [Mozilla write-up](https://hacks.mozilla.org/2024/05/experimenting-with-local-alt-text-generation-in-firefox-nightly/). |
| Whisper Web | Its worker lazily creates one pipeline, forwards loading progress, reuses it, and disposes it on model changes. Its code selects a special revision for medium models to avoid running out of memory. | Reuse the live session, report file progress, and budget runtime memory separately from download bytes. This is source-code evidence, not a measured retention study. [Worker source](https://raw.githubusercontent.com/xenova/whisper-web/main/src/worker.js). |
| WebLLM | Its docs expose initialization progress and cache-backed repeat loads. Its cache example distinguishes Cache API, IndexedDB, OPFS, and an extension-backed cross-origin option. | Separate loading from inference and make storage inspectable and removable. Sharing models across ordinary sites is not automatic. [Basic usage](https://webllm.mlc.ai/docs/user/basic_usage.html), [cache example](https://github.com/mlc-ai/web-llm/blob/main/examples/cache-usage/README.md). |
| Chrome built-in AI | Chrome manages resumable downloads, updates, purges, and preparation progress outside the page lifecycle. | Copy the honest stages, but do not assume a normal site gets Chrome's privileged background downloader. [Lifecycle](https://developer.chrome.com/docs/ai/understand-built-in-model-management). |

An open WebLLM issue reports a confusing "loading from cache" message despite empty inspected storage. It is one unresolved report, not proof of a general cache bug. It supports checking actual bytes and cache availability rather than trusting a progress label. None of these sources supplies a controlled abandonment rate or successful first-scan rate for a 243 MB classifier on slow-3G phones. [Issue 670](https://github.com/mlc-ai/web-llm/issues/670).

## What works

- Keep the zero-download rules and readable preview useful on their own. Show a warning as soon as one is justified.
- Make model installation explicit, cancelable, versioned, and recoverable. Show incomplete scanning as a distinct result.
- Audit export precision before assuming a new architecture is necessary. Reduce vocabulary and tokenizer together if recovery and multilingual evaluation justify it.
- Train a tiny first-stage classifier to abstain. Require an independent safe-skip evaluation before allowing it to suppress a deeper check.
- Cache one pinned package, reuse a live worker session, and expose removal. Use an immutable R2 origin and ordinary HTTP compression.
- Treat bandwidth, model accuracy, calibration, installation completion, peak memory, and browser support as separate release criteria.

## What to avoid

- Calling regex-negative, low-softmax, short, English, or familiar-looking text "safe" without evidence.
- Letting a sender-supplied model name, scan flag, or reputation bypass recipient checks.
- Downloading a large model just to confirm a warning already shown, or silently switching to server inference after failure.
- Assuming `q4` means every ONNX graph runs in every ORT Web backend. A current source table is not a pinned-release test.
- Trimming a fine-tuned tokenizer without recovery and a correct embedding map, or assuming English-only compression preserves multilingual security coverage.
- Treating cached files as a resident inference session, storage quotas as available RAM, or a service worker as permanent background execution.
- Caching prompt URLs in an offline shell or building a network telemetry system that silently collects recipients' prompt text.
- Hiding an hour-long transfer under a scanning animation, inventing percentages, or delaying a completed cheap result for visual effect.

## Recommendation

Ranked by likely bytes avoided per implementation effort, with the uncertainty kept visible:

| Rank | Action | Expected saving and effort |
| --- | --- | --- |
| 1 | Avoid unnecessary cold downloads. Rules warn immediately; optional deeper scanning has a visible partial state. Reuse a complete cached package. | Up to the entire 243 MB model/tokenizer transfer per avoided install, plus deferred runtime files. Low to moderate product and loader effort. The fraction of visitors who avoid installation is unknown. A learned safe-skip route requires additional validation. |
| 2 | Audit the Horizon ONNX precision and try broader int8 quantization if eligible weights remain fp32. | Conditional estimate about 126 MB raw saved. Moderate export and validation effort, without first changing vocabulary or retraining. If the graph is already fully quantized, this opportunity disappears. |
| 3 | Trim mmBERT vocabulary and tokenizer together, then recover and recalibrate. | A 32,768-token int8 embedding saves about 85.7 MB raw, plus unmeasured tokenizer savings. Higher effort than export quantization. Combined with a quantized backbone, target roughly 60 to 80 MB raw package. |

Ordinary gzip or Brotli serving is basic delivery work and should accompany every path. The existing 243 MB baseline already includes gzip, so no additional compression saving can be ranked honestly without new artifact measurements. Int4, layer dropping, and a custom neural student come after the three actions above. A tiny linear student is worth an inexpensive future experiment but has no established safe-skip rate here.

For a first release, limit ML scanning to `/open`, retain all rule warnings, and require a clear choice before a large cold installation. Use Transformers.js's cache first, a worker for inference, and honest separate stages. Do not promise that most prompts skip the model until representative data supports that claim. Under the current evidence, a basic-only result is more defensible than an unvalidated "confidently safe" exit.

For the next research or implementation pass, the first decisive observation is an initializer-and-operator inventory of the existing exact ONNX artifact. It would distinguish the inexpensive quantization opportunity from the need for training. Then evaluate candidate exports and a tiny student on independent link attacks and near misses, including multilingual and adaptive cases. Only after that should an idle test device measure cold installation, interrupted resume, evicted-cache recovery, peak memory, and warm scans on Chrome Android and iOS Safari. None of that work ran in this pass.

## What shipped (2026-11-14, Claude)

Sam asked for the cascade, the 4 MiB pieces, and the tiny first pass. Measured results of the build that shipped:

- **Weight-only int8.** ONNX Runtime's dynamic quantization (int8 weights and activations) was tried first, per tensor and per channel. Both moved scores enough to drop link-threat catches at 0.9 from 10 to 7 or 8 of 24. Storing only the weights as int8, with one scale per output column and fp32 arithmetic (`scripts/scanner/quantize.py`), gave 142 MB with the same calls: on 1,243 rows (link set, NotInject, a quarter of the corpus sample) link threats stayed at 10 of 24 at 0.9 and 6 at 0.99, the 180 near-miss prompts kept the same 2 flags at 0.9 and none at 0.99, and the median score moved 0.0003.
- **Pieces.** 44 gzipped pieces of at most 4 MiB, 124 MB to download (the 34 MB tokenizer gzips to 5.3 MB). The ONNX Runtime WASM file adds 14.8 MB raw, 3.8 MB gzipped.
- **First pass.** Hashed character and word n-grams, 2^20 int8 weights (1.05 MB, 0.74 MB gzipped). Trained on the cached corpora, OpenAssistant opening prompts, and half of NotInject. The calibration rule first gave a 0.898 threshold, which still flagged 8 of 2,774 held-out safe prompts, so the threshold was fixed at 0.999. A second near-miss set written after that choice flagged 0 of 95. At 0.999 it catches 789 of 1,116 held-out attacks and 1 of 24 link-style threats; link-style threats are left to the deep scan. Report: [`first-pass.report.txt`](evidence/browser-ml-prompt-danger-detection-2026-11-12/first-pass.report.txt).
- **Measured in headless Chrome 157 on a Mac, served by `wrangler dev`.** Quick-check warning in about 0.1 s; first deep scan of a short prompt about 3.4 s including a localhost download; later visits about 2.5 s, all in "Preparing" (assembling and checking 142 MB from the cache and starting the session). Phones were not measured.

## Claim check

| Claim | Evidence and scope | Conclusion or remaining check |
| --- | --- | --- |
| The current package is too expensive on slow 3G | Earlier 243 MB gzip size, with explicit 0.4 Mbps arithmetic | About 81 minutes ideal transfer. Estimate, not a phone benchmark. |
| Most parameters are embeddings | Published 256,000 vocabulary and width 384 | 98.304M embedding weights. Does not by itself establish byte share in a mixed-precision file. |
| Better quantization can save about 126 MB | Card says int8 embeddings, size accounting fits a fp32 backbone, export script calls dynamic quantization | Plausible conditional opportunity. **Verified after this pass (2026-11-14, Claude):** the local `model.onnx` used in the earlier evaluation contains no `MatMulInteger` or `DynamicQuantizeLinear` nodes and only two `DequantizeLinear` nodes, so the backbone matrix multiplies are fp32 and only the embedding is int8. The saving is available; its accuracy cost is still unmeasured. |
| Vocabulary reduction can yield about 55M weights | Published mmBERT-small trimming experiment | Architecture feasibility. Injection performance after recovery remains unknown. |
| Int4 is deployable in a browser | ORT tooling and current backend operator sources, alongside an earlier local missing-kernel failure | Only for a specific compatible graph and runtime. No new browser validation. |
| A cascade can save 90% for one cold prompt | Assumed 1 MB first stage and 10% escalation | Scenario arithmetic, not observed traffic coverage. Repeated use changes the probability of installation. |
| A low score can safely bypass the model | No representative independent safe-skip evaluation exists locally | Not established. Use abstention and an explicit incomplete-scan state. |
| Caching makes later scans inference-only | Cache specifications plus initialization behavior and eviction policies | Only a live reused session is inference-only. Later visits normally reload cached artifacts. |
| Safari allows a model this large | WebKit quota policy permits large origin storage in some circumstances | Capacity ceiling only. Eviction, ITP, denied storage, and memory remain separate risks. |
| Background Fetch solves interruption everywhere | Browser compatibility data excludes major target browsers | Optional enhancement only. Checkpointed foreground downloads are the portable design. |
| Built-in models solve the worst-case phone | Chrome and Edge requirements, Firefox context restrictions, WebKit position | No universal phone replacement established. |
| Other products prove this download is acceptable | Direct docs and source show lazy loading and caching patterns | No primary evidence found for acceptable slow-3G completion rates at this size. |

## Sources

The source ledger below records distinct documents opened and read in this pass, including targeted relevant sections rather than claiming every long specification was read cover to cover. Abstract-only papers and partial access are labeled. Search snippets are discovery leads, not read sources. Equivalent HTML, raw, and rendered views of one document count once.

### Model reduction

- M01. [Horizon small card](https://huggingface.co/Horizon-Labs/prompt-injection-guard-small/blob/main/README.md). Read. Model scope, training, normalization, and int8-embedding export passages.
- M02. [mmBERT-small card](https://huggingface.co/jhu-clsp/mmBERT-small). Read. Architecture table, embedding and backbone parameters.
- M03. [mmBERT paper](https://arxiv.org/abs/2509.06888). Read. Abstract only. Multilingual encoder design.
- M04. [Horizon ONNX export](https://raw.githubusercontent.com/horizon-ai-labs/agent-io-guards/main/train/export_onnx.py). Read. Complete short script. Dynamic quantization recipe.
- M05. [Horizon repository](https://github.com/horizon-ai-labs/agent-io-guards). Read. README and training/export layout.
- M06. [Trimming experiments](https://huggingface.co/blog/lbourdois/introduction-to-trimming). Read. mmBERT tables, token coverage, and fine-tuning order. First-party experiment, not injection evaluation.
- M07. [Vocabulary trimming paper](https://aclanthology.org/2023.findings-emnlp.981/). Read. Abstract only. Scope and vocabulary reduction method.
- M08. [Load what you need](https://aclanthology.org/2020.sustainlp-1.16/). Read. Abstract only. Smaller multilingual BERT models.
- M09. [Vocabulary trimmer](https://github.com/asahi417/lm-vocab-trimmer). Read. README method and usage.
- M10. [ORT quantization](https://onnxruntime.ai/docs/performance/model-optimizations/quantization.html). Read. Dynamic, static, and four-bit export sections.
- M11. [WebGPU operator table](https://github.com/microsoft/onnxruntime/blob/main/js/web/docs/webgpu-operators.md). Read. Quantized operator rows. Also checked the pinned revision linked in section 3, counted once.
- M12. [WebGPU quantized Gather](https://github.com/microsoft/onnxruntime/blob/main/js/web/lib/wasm/jsep/webgpu/ops/gather-block-quantized.ts). Read. Packed weights and dequantization implementation on main.
- M13. [WebGPU four-bit MatMul](https://github.com/microsoft/onnxruntime/blob/main/js/web/lib/wasm/jsep/webgpu/ops/matmulnbits.ts). Read. Packed weights and input restrictions. Also checked pinned revision, counted once.
- M14. [WebGPU operator resolver](https://github.com/microsoft/onnxruntime/blob/main/js/web/lib/wasm/jsep/webgpu/op-resolve-rules.ts). Read. Kernel registrations. Also checked pinned revision, counted once.
- M15. [Native quantized Gather](https://github.com/microsoft/onnxruntime/blob/main/onnxruntime/contrib_ops/cpu/quantization/gather_block_quantized.cc). Read. Packed type handling. Native source does not establish WASM inclusion.
- M16. [Native MatMulNBits](https://github.com/microsoft/onnxruntime/blob/main/onnxruntime/contrib_ops/cpu/quantization/matmul_nbits.cc). Read. Inputs and accuracy settings.
- M17. [Transformers.js dtype guide](https://huggingface.co/docs/transformers.js/en/guides/dtypes). Read. Dtype selection and artifact availability.
- M18. [ORT float16](https://onnxruntime.ai/docs/performance/model-optimizations/float16.html). Read. Conversion and CPU restrictions.
- M19. [ORT graph optimization](https://onnxruntime.ai/docs/performance/model-optimizations/graph-optimizations.html). Read. Offline export and provider restrictions.
- M20. [ORT model format](https://onnxruntime.ai/docs/performance/model-optimizations/ort-format-models.html). Read. Runtime and model-format tradeoffs.
- M21. [ORT web builds](https://onnxruntime.ai/docs/build/web.html). Read. Minimal build and JSEP flags.
- M22. [ONNX int4 types](https://onnx.ai/onnx/technical/int4.html). Read. Packing and representation.
- M23. [Meta Prompt Guard 22M](https://huggingface.co/meta-llama/Llama-Prompt-Guard-2-22M). Read. Model scope and multilingual limitations.
- M24. [Wolf Defender edge](https://huggingface.co/patronus-studio/wolf-defender-prompt-injection-edge). Read. Size, pruning recipe, recovery, and native validation scope.
- M25. [NeuralTrust small](https://huggingface.co/NeuralTrust/prompt-guard-oss-small/blob/main/README.md). Read. Architecture, thresholds, and first-stage positioning.
- M26. [DistilBERT](https://arxiv.org/abs/1910.01108). Read. Abstract only. General NLP distillation results.
- M27. [TinyBERT](https://aclanthology.org/2020.findings-emnlp.372/). Read. Abstract only. Task-specific distillation.
- M28. [LayerDrop](https://arxiv.org/abs/1909.11556). Read. Abstract only. Training layers to be removable.
- M29. [MobileBERT](https://arxiv.org/abs/2004.02984). Read. Abstract only. Compact encoder architecture.
- M30. [MiniLM](https://arxiv.org/abs/2002.10957). Read. Abstract only. Attention distillation.
- M31. [Knowledge distillation](https://arxiv.org/abs/1503.02531). Read. Abstract only. Teacher-student method.
- M32. [ALBERT](https://arxiv.org/abs/1909.11942). Read. Abstract only. Factorized embeddings and parameter sharing.
- M33. [fastText supervised tutorial](https://fasttext.cc/docs/en/supervised-tutorial.html). Read. Classification, evaluation, and quantization workflow.
- M34. [fastText.zip](https://arxiv.org/abs/1612.03651). Read. Abstract only. Compression on other classification tasks.
- M35. [fastText WebAssembly](https://fasttext.cc/docs/en/webassembly-module.html). Read. Browser loading and quantized models.

### Cascades and safety

- C01. [Neural-network calibration](https://proceedings.mlr.press/v70/guo17a.html). Read. Abstract only. Calibration and temperature scaling.
- C02. [SelectiveNet](https://proceedings.mlr.press/v97/geifman19a.html). Read. Abstract only. Prediction and rejection tradeoff.
- C03. [Conformal Risk Control](https://arxiv.org/html/2208.02814v4). Read. Relevant full-text sections. Expected risk and exchangeability assumptions.
- C04. [Introduction to conformal prediction](https://arxiv.org/html/2107.07511v6). Read. Relevant full-text sections. Marginal versus subgroup guarantees.
- C05. [Selective calibration](https://arxiv.org/abs/2208.12084). Read. Abstract only. Confident wrong selective predictions.
- C06. [Selective-classification evaluation](https://arxiv.org/abs/2407.01032). Read. Abstract only. Undetected failures and metric pitfalls.
- C07. [The Attacker Moves Second](https://arxiv.org/html/2510.09023v1). Read. Relevant full-text sections. Adaptive attacks on filtering models.
- C08. [Bypassing LLM Guardrails](https://arxiv.org/html/2504.11168v1). Read. Relevant full-text sections. Character and algorithmic evasion.
- C09. [InjecGuard](https://arxiv.org/html/2410.22770v2). Read. Relevant full-text sections. Over-defense and NotInject.
- C10. [Classifier calibration](https://scikit-learn.org/stable/modules/calibration.html). Read. Reliability, data separation, and score interpretation.
- C11. [HashingVectorizer](https://scikit-learn.org/stable/modules/generated/sklearn.feature_extraction.text.HashingVectorizer.html). Read. Hashing, collisions, signed features, and n-grams.
- C12. [LogisticRegression](https://scikit-learn.org/stable/modules/generated/sklearn.linear_model.LogisticRegression.html). Read. Binary coefficient dimensions and sparsity.
- C13. [fastText commands](https://fasttext.cc/docs/en/cheatsheet.html). Read. Quantized model files and size-budget controls.
- C14. [fastText compressed language ID](https://fasttext.cc/blog/2017/10/02/blog-post.html). Read. First-party technical account. Different workload from danger detection.
- C15. [Bag of Tricks for Efficient Text Classification](https://arxiv.org/abs/1607.01759). Read. Abstract only. Shallow classifier baseline.
- C16. [NIST binomial intervals](https://www.itl.nist.gov/div898/handbook/prc/section2/prc241.htm). Read. Exact bounds for small failure counts.
- C17. [NIST proportions sample sizes](https://www.itl.nist.gov/div898/handbook/prc/section2/prc242.htm). Read. Sampling assumptions and approximation limits.
- C18. [Classification thresholds](https://scikit-learn.org/stable/modules/classification_threshold.html). Read. Separate probability estimates from action thresholds and avoid data reuse.
- C19. [Classifier evaluation](https://scikit-learn.org/stable/modules/model_evaluation.html). Read. Precision-recall definitions and threshold metrics.
- C20. [Selective classification](https://arxiv.org/abs/1705.08500). Read. Abstract only. Risk versus coverage with rejection.
- C21. [CaMeL](https://arxiv.org/abs/2503.18813). Read. Abstract only. Tool-time information-flow controls address a different boundary.
- C22. [Microsoft recommendation poisoning](https://www.microsoft.com/en-us/security/blog/2026/02/10/ai-recommendation-poisoning/). Read. Prompt-link telemetry and memory-poisoning examples.
- C23. [Varonis Reprompt](https://www.varonis.com/blog/reprompt). Read. Copilot query-link behavior and exfiltration chain.
- C24. [OWASP prevention guidance](https://cheatsheetseries.owasp.org/cheatsheets/LLM_Prompt_Injection_Prevention_Cheat_Sheet.html). Read. Multilayer controls, obfuscation, and limitations.
- C25. [OWASP prompt injection](https://genai.owasp.org/llmrisk/llm01-prompt-injection/). Read. Definitions and direct, indirect, and multilingual examples.
- C26. [NotInject dataset](https://huggingface.co/datasets/leolee99/NotInject). Read. Card and visible benign trigger-word examples.
- C27. [deepset dataset](https://huggingface.co/datasets/deepset/prompt-injections). Read. Card, examples, and small corpus scope.
- C28. [FrugalGPT](https://arxiv.org/abs/2305.05176). Read. Abstract only. API-cost cascades, not security guarantees.
- C29. [RouteLLM](https://arxiv.org/abs/2406.18665). Read. Abstract only. Preference-based routing, different objective.
- C30. [AgentDojo paper](https://arxiv.org/abs/2406.13352). Read. Abstract only. Agent and tool-output benchmark scope.
- C31. [AgentDojo code](https://github.com/ethz-spylab/agentdojo). Read. README attack and defense integration.
- C32. [SciPy binomial test](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.binomtest.html). Read. Trial, alternative, and confidence-interval definitions.
- C33. [statsmodels binomial intervals](https://www.statsmodels.org/stable/generated/statsmodels.stats.proportion.proportion_confint.html). Read. Exact interval choices and coverage caveats.

### Delivery and storage

- D01. [Cache API](https://developer.mozilla.org/en-US/docs/Web/API/Cache). Read. Complete responses, worker availability, and separate HTTP semantics.
- D02. [Storage quotas and eviction](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria). Read. Best effort, private mode, persistence, and proactive eviction.
- D03. [WebKit storage policy](https://webkit.org/blog/14403/updates-to-storage-policy/). Read. Safari quotas, eviction, and persistence heuristics.
- D04. [WebKit ITP storage policy](https://webkit.org/blog/10218/full-third-party-cookie-blocking-and-more/). Read. Seven Safari-use days and home-screen distinction.
- D05. [OPFS](https://developer.mozilla.org/en-US/docs/Web/API/File_System_API/Origin_private_file_system). Read. Byte access, quota, deletion, and workers.
- D06. [Storage persistence](https://developer.mozilla.org/en-US/docs/Web/API/StorageManager/persist). Read. Grant or denial and context restrictions.
- D07. [Storage estimates](https://developer.mozilla.org/en-US/docs/Web/API/StorageManager/estimate). Read. Approximate usage and quota.
- D08. [IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API). Read. Transactional structured data, files, and blobs.
- D09. [Transformers.js environment](https://huggingface.co/docs/transformers.js/en/api/env). Read. Current cache and host controls.
- D10. [Transformers.js custom usage](https://huggingface.co/docs/transformers.js/en/custom_usage). Read. Self-hosted model and runtime paths.
- D11. [Background Fetch](https://developer.mozilla.org/en-US/docs/Web/API/Background_Fetch_API). Read. Large-transfer purpose and browser limitations.
- D12. [Chrome Background Fetch](https://developer.chrome.com/blog/background-fetch). Read. Continued downloads, user controls, and events.
- D13. [Service workers](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API). Read. Scope, HTTPS, events, and lifecycle.
- D14. [Service worker lifecycle](https://developer.chrome.com/docs/workbox/service-worker-lifecycle). Read. Install, control, and update behavior.
- D15. [HTTP ranges](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Range_requests). Read. Resuming partial content.
- D16. [If-Range](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/If-Range). Read. Validators and full versus partial responses.
- D17. [Cache.put](https://developer.mozilla.org/en-US/docs/Web/API/Cache/put). Read. Persistence behavior and errors.
- D18. [Workbox range requests](https://developer.chrome.com/docs/workbox/modules/workbox-range-requests). Read. Serving ranges from a complete cached response.
- D19. [JavaScript decompression](https://developer.mozilla.org/en-US/docs/Web/API/DecompressionStream/DecompressionStream). Read. Format enumeration and feature checks.
- D20. [HTTP Content-Encoding](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Encoding). Read. Negotiation and encoded representation size.
- D21. [R2 public buckets](https://developers.cloudflare.com/r2/buckets/public-buckets/). Read. Custom domains, caching, and development endpoint limits.
- D22. [R2 CORS](https://developers.cloudflare.com/r2/buckets/cors/). Read. Origin access and exposed response headers.
- D23. [R2 Workers API](https://developers.cloudflare.com/r2/api/workers/workers-api-reference/). Read. Ranges, metadata, and missing If-Range support.
- D24. [R2 S3 compatibility](https://developers.cloudflare.com/r2/api/s3/api/). Read. GetObject ranges and HTTP metadata.
- D25. [Cloudflare cache defaults](https://developers.cloudflare.com/cache/concepts/default-cache-behavior/). Read. File eligibility and cacheable object cap.
- D26. [Cloudflare compression](https://developers.cloudflare.com/speed/optimization/content/compression/). Read. Algorithms, MIME conditions, and transforms.
- D27. [Storage Standard](https://storage.spec.whatwg.org/). Read. Best-effort and persistent storage buckets.
- D28. [Service Workers specification](https://w3c.github.io/ServiceWorker/#cache-put). Read. Normative rejection of 206 responses by Cache.put.
- D29. [Caching browser models](https://developer.chrome.com/docs/ai/cache-models). Read. Storage options and Cache API recommendation.
- D30. [Web storage guidance](https://web.dev/articles/storage-for-the-web). Read. Storage mechanism selection.
- D31. [Persistent storage guidance](https://web.dev/articles/persistent-storage). Read. Permission heuristics and request timing.
- D32. [Using Fetch](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch). Read. Streaming response handling.
- D33. [OPFS sync handles](https://developer.mozilla.org/en-US/docs/Web/API/FileSystemSyncAccessHandle). Read. Dedicated-worker byte operations.
- D34. [Cloudflare edge Cache API](https://developers.cloudflare.com/workers/runtime-apis/cache/). Read. Distinct edge semantics and range behavior.
- D35. [Transformers.js repository](https://github.com/huggingface/transformers.js). Read. README and current source organization.
- D36. [Transformers.js v3 environment](https://huggingface.co/docs/transformers.js/v3.0.0/api/env). Read. Historical cache design. Not used to establish v4-specific behavior.
- D37. [Cloudflare range behavior](https://developers.cloudflare.com/cache/reference/range-requests/). Read. Compression, conditional, and partial caching rules.
- D38. [Pinned hub loader](https://raw.githubusercontent.com/huggingface/transformers.js/4.3.2/packages/transformers/src/utils/hub.js). Read. Complete loading, cache failures, buffers, and progress events.
- D39. [Pinned cache selection](https://raw.githubusercontent.com/huggingface/transformers.js/4.3.2/packages/transformers/src/utils/cache.js). Read. Backend selection and inaccessible-cache fallback.
- D40. [Pinned byte reader](https://raw.githubusercontent.com/huggingface/transformers.js/4.3.2/packages/transformers/src/utils/hub/utils.js). Read. Content-Length accounting and buffer growth.
- D41. [Pinned environment defaults](https://raw.githubusercontent.com/huggingface/transformers.js/4.3.2/packages/transformers/src/env.js). Read. Browser and WASM cache defaults.
- D42. [Pinned progress types](https://raw.githubusercontent.com/huggingface/transformers.js/4.3.2/packages/transformers/src/utils/core.js). Read. File, aggregate, ready, and completion events.
- D43. [Background Fetch compatibility](https://raw.githubusercontent.com/mdn/browser-compat-data/main/api/BackgroundFetchManager.json). Read. No Safari or Firefox support in inspected data.
- D44. [JS decompression compatibility](https://raw.githubusercontent.com/mdn/browser-compat-data/main/api/DecompressionStream.json). Read. Format-specific Brotli and Zstandard support.
- D45. [HTTP encoding compatibility](https://raw.githubusercontent.com/mdn/browser-compat-data/main/http/headers/Content-Encoding.json). Read. Browser-specific native Brotli and Zstandard support.
- D46. [Response cloning](https://developer.mozilla.org/en-US/docs/Web/API/Response/clone). Read. Large-body buffering risk with unequal consumers.
- D47. [Content-Length](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Length). Read. Representation length and accessible header semantics.

### Device policy, progress, built-ins, and precedents

- U01. [Chrome Prompt API](https://developer.chrome.com/docs/ai/prompt-api). Read. Availability, supported platforms, hardware, and session behavior.
- U02. [Built-in AI setup](https://developer.chrome.com/docs/ai/get-started). Read. Availability states and user activation.
- U03. [Model download UI](https://developer.chrome.com/docs/ai/inform-users-of-model-download). Read. Download progress followed by indeterminate preparation.
- U04. [Network Information API](https://developer.mozilla.org/en-US/docs/Web/API/Network_Information_API). Read. Connection hints and limited browser support.
- U05. [effectiveType](https://developer.mozilla.org/en-US/docs/Web/API/NetworkInformation/effectiveType). Read. Recent throughput and latency classes.
- U06. [saveData](https://developer.mozilla.org/en-US/docs/Web/API/NetworkInformation/saveData). Read. Reduced-data user preference.
- U07. [deviceMemory](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/deviceMemory). Read. Approximation, coarsening, and limited support.
- U08. [Save-Data header](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Save-Data). Read. Explicit preference for reduced transfer.
- U09. [Firefox Translations help](https://support.mozilla.org/en-US/kb/website-translation). Read. Local translation and language install/remove controls.
- U10. [Mozilla local alt text](https://hacks.mozilla.org/2024/05/experimenting-with-local-alt-text-generation-in-firefox-nightly/). Read. Quantization, translation downloads, and process isolation.
- U11. [Firefox AI runtime](https://firefox-source-docs.mozilla.org/toolkit/components/ml/). Read. Privileged runtime and extension context.
- U12. [Whisper Web worker](https://raw.githubusercontent.com/xenova/whisper-web/main/src/worker.js). Read. Lazy pipeline, reuse, progress, disposal, and memory workaround.
- U13. [WebLLM basic usage](https://webllm.mlc.ai/docs/user/basic_usage.html). Read. Asynchronous first load and progress.
- U14. [WebLLM advanced usage](https://webllm.mlc.ai/docs/user/advanced_usage.html). Read. Workers and cache alternatives.
- U15. [WebLLM cache example](https://github.com/mlc-ai/web-llm/blob/main/examples/cache-usage/README.md). Read. Cache, IndexedDB, OPFS, and extension-based sharing.
- U16. [WebLLM cache-label report](https://github.com/mlc-ai/web-llm/issues/670). Read. One unresolved user report, not a proven general bug.
- U17. [Chrome model management](https://developer.chrome.com/docs/ai/understand-built-in-model-management). Read. Resumption, updates, version visibility, and purging.
- U18. [Prompt API polyfill](https://developer.chrome.com/docs/ai/prompt-api-polyfill). Read. Cloud versus local providers and per-origin downloads.
- U19. [MDN Prompt API](https://developer.mozilla.org/en-US/docs/Web/API/Prompt_API). Read. Security context and vendor-position links.
- U20. [Using Web Workers](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers). Read. Background computation, messages, and lifecycle.
- U21. [Encoded resource size](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceResourceTiming/encodedBodySize). Read. Body bytes before content decoding.
- U22. [Decoded resource size](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceResourceTiming/decodedBodySize). Read. Body bytes after content decoding.
- U23. [Mozilla Prompt API position](https://github.com/mozilla/standards-positions/issues/1213). Read. Negative position and interoperability concerns.
- U24. [WebKit Prompt API position](https://github.com/WebKit/standards-positions/issues/495). Read. Oppose position and resource/lifecycle concerns.
- U25. [WAI meter pattern](https://www.w3.org/WAI/ARIA/apg/patterns/meter/). Read. Progress must use progress semantics, not meter.
- U26. [WAI alert pattern](https://www.w3.org/WAI/ARIA/apg/patterns/alert/). Read. Focus and excessive-interruption cautions.
- U27. [Progressbar semantics](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Roles/progressbar_role). Read. Labeling and indeterminate numeric-value rules.
- U28. [Status semantics](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Roles/status_role). Read. Polite live updates without focus changes.
- U29. [AbortController](https://developer.mozilla.org/en-US/docs/Web/API/AbortController). Read. Cancelable fetch, response consumption, and streams.
- U30. [Readable streams](https://developer.mozilla.org/en-US/docs/Web/API/Streams_API/Using_readable_streams). Read. Reader and chunk-processing behavior.
- U31. [Web Locks](https://developer.mozilla.org/en-US/docs/Web/API/Web_Locks_API). Read. Same-origin tab and worker coordination.
- U32. [Page visibility](https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API). Read. Background throttling and hidden pages.
- U33. [Edge Prompt API](https://learn.microsoft.com/en-us/microsoft-edge/web-platform/prompt-api). Read. Experimental desktop models and hardware restrictions. Authorization banner appeared, but relevant body rendered.
- U34. [Apple Foundation Models](https://developer.apple.com/documentation/foundationmodels.md). Read. Native framework and Swift API. Markdown fallback read after JS-only HTML.

### Additional deployment and artifact checks

- X01. [ORT large models](https://onnxruntime.ai/docs/tutorials/web/large-models.html). Read. External-data paths and explicit browser loading.
- X02. [ORT Web deployment](https://onnxruntime.ai/docs/tutorials/web/deploy.html). Read. Runtime artifacts and deployment choices.
- X03. [Cloudflare Compression Rules](https://developers.cloudflare.com/rules/compression-rules/). Read. Rules, encoding negotiation, and response conditions.
- X04. [Cloudflare cache status](https://developers.cloudflare.com/cache/concepts/cache-responses/). Read. HIT, MISS, DYNAMIC, and BYPASS diagnostics.
- X05. [Transformers.js pinned package](https://raw.githubusercontent.com/huggingface/transformers.js/4.3.2/packages/transformers/package.json). Read. Exact ORT Web development-version dependency.
- X06. [TestSavant tiny card](https://huggingface.co/testsavantai/prompt-injection-defender-tiny-v0-onnx). Read. Architecture variants and task claims. Accuracy conclusions come from earlier local evidence.
- X07. [Workers limits](https://developers.cloudflare.com/workers/platform/limits/). Read. Static Asset file cap, file counts, and memory limits.
- X08. [Chrome HTTP cache partitioning](https://developer.chrome.com/blog/http-cache-partitioning). Read. Site-dependent cache keys and cross-site reuse limits.

## Research receipt

- Run ID: `bdo-20261114-7c92`.
- Skill: `sams-research`, SHA-256 `4249735c7353b55c3352211ea76b7bfc5e1f5ed7ace813b29d7c45e70cb22dd6`.
- Category: browser delivery, security classifier design, and product decision.
- Research date: 2026-11-14. Living docs and repository `main` views are observations on this date. They are not evidence that a capability shipped in the older pinned runtime.
- Throughput checkpoint: n/a, read-only investigation. Separate source collection covered model reduction, cascade safety, and delivery/storage. The memo integrates those findings with local code, device policy, progress, and precedents.
- Local evidence was read before online collection. Existing measurements were reused as historical evidence. Only small JSON summaries and transfer arithmetic were calculated here.
- Read-source count: **157 distinct source links**, deduplicated across researchers and equivalent raw/rendered views. **136** supplied relevant document, specification, code, report, or full-text passages. **21** were paper abstracts only and are explicitly marked. Pinned and current views of the same ORT source file count once. A historical Transformers.js v3 API page is separately labeled and does not validate v4 behavior.
- No model files, benchmark results, inference results, code changes, commits, pushes, deployments, or publication were produced.
- Unresolved checks: exact artifact tensor dtypes (operator inventory since done, see the claim check; per-tensor dtypes still not listed); pinned backend operator compatibility; recovered pruning and quantization accuracy; safe-skip coverage and escape rate; attack prevalence; real phone memory and latency; compressed wire sizes; deployed R2 range, compression, CORS, and cache behavior; interruption and Safari eviction recovery.

### Source-access gaps and discovery failures

These are not included in the 157 read-source count. A failed guessed path does not establish that a capability or file is absent.

| Source or attempted URL | Access result and consequence |
| --- | --- |
| [Horizon config](https://huggingface.co/Horizon-Labs/prompt-injection-guard-small/raw/main/config.json) and [mmBERT config](https://huggingface.co/jhu-clsp/mmBERT-small/raw/main/config.json) | Web tool could not retrieve these JSON pages. The model cards were accessible. Exact model initializer precision remains unverified. |
| Horizon root model page, file tree, quantized-file metadata page, and training-directory view | Model researcher reported failed access. The README blob and export script were read successfully. No model binary was downloaded. |
| [Pinned WebGPU Gather implementation](https://raw.githubusercontent.com/microsoft/onnxruntime/8d85527a0/js/web/lib/wasm/jsep/webgpu/ops/gather-block-quantized.ts) | Cache miss. Pinned operator table and registration were accessible. Current main Gather implementation was read. Exact complete-export compatibility still needs a later runtime test. |
| [Firefox translation-model inventory](https://mozilla.github.io/translations/firefox-models/) | Static page opened, but its live model list failed to load. Its current per-language sizes were not established. Historical size example comes from Mozilla's architecture article. |
| [Apple Foundation Models HTML](https://developer.apple.com/documentation/foundationmodels) | JavaScript-only response. The page's linked Markdown representation was read successfully and counted once. |
| [Tokenizers models reference](https://huggingface.co/docs/tokenizers/api/models) | Opened, but the page is an unfinished documentation stub. Not counted as substantive reading or used to establish tokenizer internals. |
| [Incorrect vocabulary-trimmer discovery path](https://github.com/andreasgrv/vocabtrimmer) | Cache miss. Replaced with a successfully read implementation and the ACL paper. |
| [Incorrect WebAssembly memory reference path](https://developer.mozilla.org/en-US/docs/Web/API/WebAssembly/Memory) | Inaccessible. Not used to establish memory limits. |
| [Incorrect selective-classification discovery path](https://proceedings.mlr.press/v70/geifman17a.html) | Inaccessible. Actual arXiv abstract read successfully. |
| [Candidate cascade code path](https://github.com/google-research/google-research/tree/master/llm_cascades) | Cache miss. Not used as evidence. |
| Guessed old Transformers.js `src/utils/hub.js`, `src/env.js`, and TypeScript paths under `main` or `v4.3.2` | Failed path discovery. The actual 4.3.2 files under `packages/transformers/src/` were read. |
| Guessed Horizon `export.py`, `quantize_embeddings.py`, and `quantize_onnx.py`, a guessed TestSavant path, and a Transformers.js dtype-source path | Failed discovery. The real Horizon export script, dtype guide, and TestSavant model card were read through working paths. |
| Later fastText tutorial text search | Transient find error after the tutorial had already opened and been read. The successful initial reading counts. |

Search-only leads included third-party browser-AI news, discussion threads, a recent browser-model cache paper, and generic device-API results. They were not used to substantiate claims or counted. Three unrelated arXiv pages accidentally opened during discovery were excluded. No inaccessible source or search snippet supports an absence claim in the recommendation.
