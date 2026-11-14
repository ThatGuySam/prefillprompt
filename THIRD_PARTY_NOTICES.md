# Third-party notices

## Lobe Icons

The provider logo paths in `src/components/ProviderIcon.vue` are vendored from
`@lobehub/icons-static-svg@1.94.0`.

Copyright (c) 2023 LobeHub

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

Upstream license:
https://github.com/lobehub/lobe-icons/blob/master/LICENSE

Provider names and logos remain trademarks of their respective owners. Their
appearance identifies the destination service and does not imply endorsement.

## On-device prompt scanner

### prompt-injection-guard-small

The deep scanner served from `/scanner/deep/` is
`Horizon-Labs/prompt-injection-guard-small` at revision
`2efc2ed5abecd21eb45c2506d231a65d6e392b85`, with its matrix-multiply weights
stored as int8 by `scripts/scanner/quantize.py`. It is licensed under the Apache
License, Version 2.0. Its `LICENSE` and `NOTICE` files are served beside the
model pieces. The NOTICE reads, in part:

    prompt-injection-guard-small
    Copyright 2026 Horizon Labs

    It is a fine-tuned version of mmBERT-small, which is licensed under the MIT
    License. Copyright (c) the mmBERT authors (Johns Hopkins University CLSP)

Source: https://huggingface.co/Horizon-Labs/prompt-injection-guard-small

### ONNX Runtime Web

`onnxruntime-web` (MIT License, Copyright (c) Microsoft Corporation) runs the
deep scanner and its WebAssembly runtime is served from this site.

### Tokenizers.js

`@huggingface/tokenizers` (Apache License, Version 2.0, Copyright Hugging Face)
tokenizes prompts for the deep scanner.

### First-pass training data

The first-pass weights in `public/scanner/` were trained by
`scripts/scanner/train-first-pass.ts` on the datasets listed in
`src/data/safety/sources.json`, the OpenAssistant oasst2 conversations
(Apache License, Version 2.0, https://huggingface.co/datasets/OpenAssistant/oasst2),
and leolee99/NotInject (MIT License, https://huggingface.co/datasets/leolee99/NotInject).
