"""Store the deep scanner's fp32 matrix-multiply weights as int8.

The published Horizon-Labs/prompt-injection-guard-small "int8" export only quantizes the
embedding table; every MatMul weight in the 22 layers is still fp32. This script stores each
of those weights as int8 with one scale per output column, followed by a DequantizeLinear
node, the same pattern the export already uses for its embedding. The arithmetic stays fp32.
ONNX Runtime's dynamic quantization was tried first: it also quantizes activations, and that
moved scores enough to drop link-threat catches from 10 to 7 of 24 at 0.9.

Usage:
  uv run --no-project --with onnx==1.19.1 --with numpy python -I scripts/scanner/quantize.py <in.onnx> <out.onnx>
"""

import sys

import numpy as np
import onnx
from onnx import helper, numpy_helper

source, target = sys.argv[1], sys.argv[2]
model = onnx.load(source)
graph = model.graph
initializers = {tensor.name: tensor for tensor in graph.initializer}
consumers = {}
for node in graph.node:
    for name in node.input:
        consumers.setdefault(name, []).append(node)

converted = 0
saved_bytes = 0
new_nodes = []
for node in graph.node:
    weight_name = node.input[1] if node.op_type == "MatMul" and len(node.input) > 1 else None
    tensor = initializers.get(weight_name)
    if tensor is None or tensor.data_type != onnx.TensorProto.FLOAT or len(tensor.dims) != 2:
        new_nodes.append(node)
        continue
    if len(consumers[weight_name]) != 1:
        new_nodes.append(node)
        continue
    weight = numpy_helper.to_array(tensor)
    scale = np.abs(weight).max(axis=0) / 127.0
    scale[scale == 0] = 1.0
    quantized = np.clip(np.round(weight / scale), -127, 127).astype(np.int8)

    graph.initializer.remove(tensor)
    graph.initializer.extend([
        numpy_helper.from_array(quantized, f"{weight_name}_int8"),
        numpy_helper.from_array(scale.astype(np.float32), f"{weight_name}_scale"),
        numpy_helper.from_array(np.zeros(scale.shape, dtype=np.int8), f"{weight_name}_zero"),
    ])
    new_nodes.append(helper.make_node(
        "DequantizeLinear",
        [f"{weight_name}_int8", f"{weight_name}_scale", f"{weight_name}_zero"],
        [weight_name],
        name=f"{weight_name}_dequantize",
        axis=1,
    ))
    new_nodes.append(node)
    converted += 1
    saved_bytes += weight.size * 3

del graph.node[:]
graph.node.extend(new_nodes)
onnx.checker.check_model(model)
onnx.save(model, target)
print(f"converted {converted} MatMul weights, about {saved_bytes / 1e6:.1f} MB smaller; wrote {target}")
