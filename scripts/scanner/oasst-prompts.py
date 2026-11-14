"""Extracts the opening user message of each OpenAssistant oasst2 conversation for training the
scanner's first pass.

Usage:
  curl -L -o <dir>/train.parquet "https://huggingface.co/datasets/OpenAssistant/oasst2/resolve/refs%2Fconvert%2Fparquet/default/train/0000.parquet"
  uv run --no-project --with pyarrow python -I scripts/scanner/oasst-prompts.py <dir>/train.parquet <out.json>
"""

import json, sys
import pyarrow.parquet as pq
table = pq.read_table(sys.argv[1], columns=["text", "role", "parent_id", "lang", "deleted", "review_result"]).to_pylist()
prompts = [{"text": r["text"], "lang": r["lang"]} for r in table if r["role"] == "prompter" and r["parent_id"] is None and not r["deleted"] and r["review_result"] is not False]
json.dump(prompts, open(sys.argv[2], "w"), ensure_ascii=False)
print(len(prompts), "initial prompts")
