# Evidence for the browser ML detection memo

These are the scripts and inputs behind `../../browser-ml-prompt-danger-detection-2026-11-12.md`, kept as they ran on 2026-11-12. They are one-off research scripts, not product code, and opt out of the repo's lint rules.

## What is here

| File | Purpose |
| --- | --- |
| `datasets.mjs` | Builds the evaluation rows: a seeded corpus sample, NotInject, the link-threat set, and the perturbed variants. Also holds the normalization pass tested in the memo. |
| `eval.mjs` | Scores every row with one local ONNX classifier through Transformers.js. `--full` scores the whole corpus. |
| `analyze.mjs`, `analyze-full.mjs`, `inspect.mjs` | Summaries and the texts behind selected results. |
| `embed.mjs`, `knn.mjs` | The MiniLM exemplar-similarity baseline. |
| `browser/` | A static server, a test page, and a headless Chrome driver for load and latency timing. |
| `link-threat.json` | 24 link-style threats and 24 ordinary share prompts, hand-written from Microsoft's and Varonis's published examples. |
| `summary.sample.json`, `report.sample.txt` | Output of `analyze.mjs` for the six models in the first run. |
| `horizon-pi-small.full.summary.json`, `protectai-v2.report.txt` | Output of the two later runs. |

## What is not here

- **Corpora.** Read from the `main` worktree's `.cache/safety/`, which `scripts/safety/fetch.mjs` there downloads and hashes. NotInject was fetched from the Hugging Face datasets server (`leolee99/NotInject`, 339 rows).
- **Model files.** Each model was downloaded from Hugging Face into its own folder as `<name>/onnx/model.onnx` beside its `config.json` and tokenizer files. The memo's table names each repository and file.
- **The regex module.** `analyze.mjs` imports a copy of `src/lib/prompt-safety.ts` from the `main` worktree as `prompt-safety.snapshot.mts` (SHA-256 prefix `b5e14f5ed3f4`).

## Running it again

```bash
mkdir runner && cd runner && npm init -y && npm install @huggingface/transformers@4.3.2 playwright-core
cp ../*.mjs . && cp <main worktree>/src/lib/prompt-safety.ts prompt-safety.snapshot.mts
node eval.mjs <model> <modelsDir> <corpusDir> <dirWithNotinjectAndLinkThreatJson> <outDir>
node --experimental-strip-types analyze.mjs <outDir> <corpusDir> <dirWithNotinjectAndLinkThreatJson>
```

`browser/check.mjs` resolves `playwright-core` from `/tmp/pp-ml-eval/runner/`; change that path to your runner folder. It launches installed Google Chrome, headless.
