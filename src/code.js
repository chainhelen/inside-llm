// Short teaching equivalents, not copy-and-paste replacements for production code.
export const code = {
  tokens: [
    "tokenizer.rs / encode",
    [
      `let ids = tokenizer.encode(text)?;
// "你好，世界！"
// [109266, 3709, 96748, 6115]`,
      `// ID selects a row; no multiplication.
let row = embedding.lookup(token_id)?;
// row.len() == 2048`,
      `for token in input.chunks_exact(2048) {
    // one token's 2048 features
}
// T tokens: a flat buffer of T * 2048 values`,
    ],
  ],
  matrix: [
    "qwen_projection.rs / project",
    [
      `// Logical shapes:
// input [1,H] × W [H,O] → output [1,O]
let output = projection.project(input)?;`,
      `// Stored weights: [O,H]
for row in weight.chunks_exact(H) {
    output.push(dot(row, input));
}
// One dot product fills one output position.`,
      `// One scale and bias per group of 64 weights.
let weight = code as f32 * scale + bias;
// bits=6: code in 0..=63
// group_size=64: 64 weights share parameters`,
    ],
  ],
  norm: [
    "ops.rs / rmsnorm; qwen_affine.rs",
    [
      `let r = (mean(input.map(square)) + epsilon).sqrt();
for i in 0..input.len() {
    output[i] = (input[i] / r) * gamma[i];
}
// gamma: learned norm.weight`,
      `fn sigmoid(g: f32) -> f32 {
    1.0 / (1.0 + (-g).exp())
}
// Scalar formula; apply separately to each i.
let silu = g * sigmoid(g);`,
      `let m = max(scores);
let e = scores.map(|s| exp(s - m));
let p = e / sum(e);
// Subtracting max makes exp more stable.
// p sums to 1.`,
    ],
  ],
  heads: [
    "qwen_full_attention.rs / project",
    [
      `let qg = self.q.project(row)?;
for head in qg.chunks_exact(2 * self.dim) {
    let q = &head[..self.dim];
    let gate = &head[self.dim..];
}
// dim=256; 16 blocks of 512`,
      `// Flat index for Q [T,H,D]:
let offset = (token * heads + head) * dim;
let one_head = &queries[offset..offset + dim];
// one token + one head → dim numbers`,
      `let kv_head = q_head / (q_heads / kv_heads);
// 16 Q heads, 2 KV heads
// Q 0..7  → KV 0
// Q 8..15 → KV 1`,
    ],
  ],
  attention: [
    "qwen_full_attention.rs / project, causal_attention, finish",
    [
      `let mut q = rmsnorm(head, &q_scale, epsilon)?;
rope(&mut q, rotary, pos, theta);
// rotary=64, head dim=256
// pairs: (0,32), (1,33), …, (31,63)`,
      `for t in 0..tokens {
    for j in 0..=t {
        scores.push(dot(Q[t], K[j]) / sqrt(dim));
    }
    // No future key enters this softmax.
}`,
      `let probabilities = softmax(&scores);
for i in 0..dim {
    for j in 0..=t {
        output[i] += probabilities[j] * V[j][i];
    }
}`,
      `for i in 0..attended.len() {
    gated[i] = attended[i] * sigmoid(gates[i]);
}
let attention_output = out_proj.project(&gated)?;
let h = add(original_input, &attention_output)?;`,
    ],
  ],
  linear: [
    "qwen_conv.rs; qwen_recurrent.rs; qwen_output_gate.rs",
    [
      `for channel in 0..8192 {
    let sum = causal_conv(history, channel, 4);
    output[channel] = silu(sum);
}
// Each channel has its own four kernel taps.`,
      `for token in tokens {
    for head in 0..32 {
        let state = &mut states[head];
        update(state, token, head);
    }
}
// states[head] survives the next token.`,
      `// Logical S[key,value] orientation:
let decayed = alpha * S;
let prediction = k * decayed;
let delta = beta * (v - prediction);
S = decayed + outer(k, delta);
let readout = q * S;`,
      `// Two separate destinations:
next_token_state[head] = S;
let normed = rmsnorm(readout, gamma, epsilon);
let gated = normed * silu(z); // elementwise
let output = out_proj.project(concat_heads(gated));`,
    ],
  ],
  router: [
    "qwen_pipeline.rs / forward_text_router; qwen_router.rs / route",
    [
      `let h = add(x, attention_output)?;
let moe_input = post_attention_norm.apply(&h)?;
// FFN has not run yet.`,
      `for weight in router_weight.chunks_exact(2048) {
    logits.push(dot(weight, input));
}
// 256 small router rows, not 256 expert FFNs`,
      `let routes = moe_input
    .chunks_exact(2048)
    .map(|row| router.route(row))
    .collect::<Result<Vec<_>, _>>()?;
// route = { expert_ids: 8 IDs, weights: 8 scalars }`,
    ],
  ],
  experts: [
    "qwen_experts.rs / apply; qwen_shared_expert.rs / apply",
    [
      `let gate = self.gate.project(input)?;
let up = self.up.project(input)?;
// input: 2048, gate: 512, up: 512
// Each expert owns separate weights.`,
      `for (&g, &u) in gate.iter().zip(&up) {
    hidden.push(silu(g) * u);
}
let output = self.down.project(&hidden)?;
// 512 → 2048`,
      `for (&id, &weight) in ids.iter().zip(weights) {
    let output = run_expert(id, input)?;
    for (sum, value) in combined.iter_mut().zip(output) {
        *sum += weight * value;
    }
}`,
      `let logit = self.output_gate.project(input)?[0];
let s = sigmoid(logit);
for value in raw_output {
    output.push(value * s);
}
// Then: layer_output = h + routed + shared`,
    ],
  ],
  generation: [
    "qwen_model.rs; qwen_lm_head.rs; generation.rs",
    [
      `let mut hidden = embeddings;
for layer in layers { // 40 layers
    hidden = layer.forward(&hidden)?;
}
// Each layer contains attention + MoE.`,
      `let normalized = final_norm.apply(last_token)?;
let logits = lm_head.project(&normalized)?;
let next_id = argmax(&logits);
// Comparing logits does not require softmax.`,
      `for _ in 0..max_new_tokens {
    let logits = model.forward(&ids)?;
    let next = argmax(logits);
    if eos_ids.contains(&next) { break; }
    ids.push(next);
    emit(next);
}
// Recomputes the entire prefix each time.`,
    ],
  ],
  gpu: [
    "earlier lesson / add.metal; device_add.rs",
    [
      `kernel void add_vectors(
    device const float* left [[buffer(0)]],
    device const float* right [[buffer(1)]],
    device float* out [[buffer(2)]],
    uint id [[thread_position_in_grid]]) {
    out[id] = left[id] + right[id];
}`,
      `encoder.dispatchThreads_threadsPerThreadgroup(
    MTLSize { width: n, height: 1, depth: 1 },
    MTLSize { width: group, height: 1, depth: 1 },
);
// n = all logical threads
// group = threads per threadgroup`,
      `// Initialization:
library → function → compute_pipeline
// Per request:
buffers → encoder → dispatch → commit
// Read results only after completion.`,
    ],
  ],
  ane: [
    "ane_ops.rs; ane_runtime.rs; native/ane_runtime.m",
    [
      `// Public Core ML configuration:
config.computeUnits = CPUAndNeuralEngine;
// This allows CPU execution too.

// Current implementation:
// private ANE framework, errors propagate.`,
      `// Rust builds the MIL graph and input list.
let result = worker.apply(graph, tensors)?;
// Objective-C bridge prepares an ANE request:
// model + input IOSurfaces + output IOSurfaces
// _ANEClient evaluateWithModel: ... request: ...`,
      `// This runtime's row layout:
let bytes = columns * 2; // fp16
let row_bytes = ((bytes + 63) / 64) * 64;
// Padding is a storage detail.
// Logical matrix shape stays unchanged.`,
      `// All activation-dependent tensor arithmetic:
ANE: matvec, norm, conv, RoPE, attention,
     SwiGLU, gates, weighted sums, residuals
// Host preparation and control:
CPU: tokenize, decode weights, lookup, index,
     constants, select IDs, generation loop`,
    ],
  ],
  precision: [
    "ane_ops.rs / norm, swiglu; docs/03-full-ane.md",
    [
      `// Algebraically identical:
silu_a = g / (1 + exp(-g));
silu_b = (g / 2) * (1 + tanh(g / 2));
// Finite-precision intermediates can differ.
// Compare accuracy and speed on actual hardware.`,
      `let s = max(max_abs(x), sqrt(epsilon));
// ANE request 1:
small = x / s;
ratio = sqrt(epsilon) / s;
// ANE request 2, materialized inputs:
y = small / sqrt(mean(small²) + ratio²);`,
      `relative_L2 = norm(ane_logits - cpu_logits)
            / norm(cpu_logits);
// Measured full checkpoint: 0.028470
// First top-8 match; second generated ID differs.
// Check numbers, then generation, then speed.`,
    ],
  ],
};
export const quizzes = {
  tokens: {
    q: ["2048 表示什么？", "What does 2048 mean?"],
    a: [
      ["每个 token 的特征数", "Features per token"],
      ["模型有 2048 层", "2048 model layers"],
    ],
    correct: 0,
  },
  matrix: {
    q: [
      "[1,2048] × W → [1,512]，图中 W 是？",
      "[1,2048] × W → [1,512]. What is the logical shape of W?",
    ],
    a: [
      ["[512,2048]", "[512,2048]"],
      ["[2048,512]", "[2048,512]"],
    ],
    correct: 1,
  },
  norm: {
    q: ["哪个结果必须加起来等于 1？", "Which output must sum to 1?"],
    a: [
      ["RMSNorm", "RMSNorm"],
      ["softmax", "softmax"],
    ],
    correct: 1,
  },
  heads: {
    q: ["Q head 11 使用哪个 KV head？", "Which KV head does Q head 11 use?"],
    a: [
      ["KV head 1", "KV head 1"],
      ["KV head 11", "KV head 11"],
    ],
    correct: 0,
  },
  attention: {
    q: ["当前 token 2 可以看 token 3 吗？", "May token 2 attend to token 3?"],
    a: [
      ["可以，因为已经有 K/V", "Yes, because K/V exist"],
      ["不可以，因果限制会屏蔽", "No, causal masking blocks it"],
    ],
    correct: 1,
  },
  linear: {
    q: ["下一个 token 用哪个 S？", "Which S does the next token use?"],
    a: [
      ["同一个 head 更新后的 S", "Updated S of the same head"],
      ["上一头的 readout", "Readout from the previous head"],
    ],
    correct: 0,
  },
  router: {
    q: ["给 256 个专家打分，意味着？", "Scoring 256 experts means…"],
    a: [
      ["已执行全部 256 个 FFN", "All 256 FFNs have executed"],
      ["只算了路由分数", "Only router scores were computed"],
    ],
    correct: 1,
  },
  experts: {
    q: ["共享专家的 s 怎么用？", "How is the shared-expert scalar s used?"],
    a: [
      [
        "每个 raw_output[i] 都乘同一个 s",
        "Every raw_output[i] uses the same s",
      ],
      ["s 是一张 2048×2048 的矩阵", "s is a 2048×2048 matrix"],
    ],
    correct: 0,
  },
  generation: {
    q: [
      "当前未缓存的生成器每轮做什么？",
      "What does this uncached generator run each round?",
    ],
    a: [
      ["只计算新 token", "Only the new token"],
      ["重算完整历史", "The complete prefix again"],
    ],
    correct: 1,
  },
  gpu: {
    q: ["第二个 MTLSize 描述什么？", "What does the second MTLSize describe?"],
    a: [
      ["每个 threadgroup 的大小", "Size of each threadgroup"],
      ["另启动一个 GPU", "A second GPU"],
    ],
    correct: 0,
  },
  ane: {
    q: [
      "cpuAndNeuralEngine 能保证只用 ANE 吗？",
      "Does cpuAndNeuralEngine guarantee ANE-only execution?",
    ],
    a: [
      ["能", "Yes"],
      ["不能，也允许 CPU", "No, CPU is also allowed"],
    ],
    correct: 1,
  },
  precision: {
    q: [
      "首个 token 相同能证明数值等价吗？",
      "Does matching the first token prove numerical equivalence?",
    ],
    a: [
      ["不能，还要比较数值与更多输入", "No; compare values and more inputs"],
      ["能，生成文本就是证明", "Yes; generated text proves it"],
    ],
    correct: 0,
  },
};
