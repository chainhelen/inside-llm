import {
  cacheWork,
  pdSchedule,
  splitDown,
  packedWeightBytes,
  vocabularySplit,
  near17Fp16,
} from "./advanced-math.js";
const range = (zh, en, min, max, value, step = 1) => ({
  label: { zh, en },
  min,
  max,
  value,
  step,
});
export const advancedIds = ["cache", "parallel", "resident", "verification"];
export function advancedControls(id, step) {
  const configs = {
    cache: [
      range("新增 decode 次数", "New decode calls", 1, 6, 3),
      range(
        "查看状态：KV / S / conv / pos",
        "Inspect: KV / S / conv / pos",
        0,
        3,
        0,
      ),
      range("示意 Prefill 用时", "Illustrative prefill duration", 1, 5, 2),
      range("0: CPU · 1: ANE → GPU", "0: CPU · 1: ANE → GPU", 0, 1, 1),
    ],
    parallel: [
      range("左分支中间通道数", "Left intermediate channels", 1, 3, 2),
      range("示意共享分支用时", "Illustrative shared-branch duration", 1, 8, 3),
      range("路由名单位置（从 0 开始）", "Route slot (zero-based)", 0, 7, 2),
      range("0: 合批前 · 1: 合批后", "0: Before batching · 1: After", 0, 1, 1),
    ],
    resident: [
      range("权重存储位数", "Stored weight bits", 4, 8, 6),
      range("跟踪一次 decode", "Follow one decode", 0, 3, 1),
      range(
        "0: ANE 8192 · 1: ANE 32768",
        "0: ANE 8192 · 1: ANE 32768",
        0,
        1,
        0,
      ),
      range(
        "0: GPU · 1: FP16 · 2: 复查",
        "0: GPU · 1: FP16 · 2: Recheck",
        0,
        2,
        1,
      ),
    ],
    verification: [
      range("接受的草稿前缀长度", "Accepted draft-prefix length", 0, 4, 3),
      range("一起验证的位置数 R", "Positions verified together R", 1, 8, 8),
      range(
        "0: GPU · 1: 调用 · 2: 验证 · 3: 生成",
        "0: GPU · 1: Call · 2: Verify · 3: Generate",
        0,
        3,
        0,
      ),
      range("每个输入数 = 2ⁿ", "Each input value = 2ⁿ", 8, 18, 17),
    ],
  };
  return configs[id] ? [configs[id][step]] : [];
}
export function drawAdvanced(id, step, values, lang, h) {
  const { tx, box, line, matrix, path, C, f, escape } = h,
    L = (zh, en) => (lang === "zh" ? zh : en),
    v = values[0];
  let s = "",
    formula = "";
  const note = (zh, en) => tx(380, 420, L(zh, en), 12);
  const bar = (x, y, w, label, color, sub = "") =>
    box(x, y, Math.max(w, 65), 44, label, sub, color);
  if (id === "cache") {
    if (step === 0) {
      const n = cacheWork(4, v);
      s += tx(
        380,
        55,
        L(
          "同样的 4-token 提示，同样多的 decode",
          "Same four-token prompt; same number of decode calls",
        ),
        17,
      );
      s += box(
        55,
        125,
        260,
        80,
        L("每次重算完整历史", "Recompute the full prefix"),
        `${n.uncached} token rows`,
        "orange",
      );
      s += box(
        445,
        125,
        260,
        80,
        L("先 Prefill，再复用状态", "Prefill, then reuse state"),
        `${n.cached} token rows`,
        "green",
      );
      for (let i = 0; i <= v; i++) {
        s += tx(100 + i * 88, 285, `${4 + i}`, 17);
        s += tx(100 + i * 88, 350, i === 0 ? "4" : "1", 17);
      }
      s += tx(
        380,
        245,
        L("每次调用处理多少行？", "Rows processed by each call"),
        14,
      );
      s += note(
        "行数只是计算示意，不代表速度提升倍数",
        "Row counts illustrate work, not a speedup prediction",
      );
      formula = `uncached = ${Array.from({ length: v + 1 }, (_, i) => 4 + i).join("+")} = ${n.uncached}; cached = 4 + ${v} = ${n.cached}`;
    }
    if (step === 1) {
      const names = ["K / V", "S", "Conv history", "Position"],
        shapes = [
          "[T,2,256] each / layer",
          "[32,128,128] / layer",
          "3 previous rows",
          "one position counter",
        ];
      for (let i = 0; i < 4; i++) {
        s += box(
          70 + (i % 2) * 350,
          85 + Math.floor(i / 2) * 155,
          270,
          95,
          names[i],
          shapes[i],
          v === i ? "green" : "blue",
          v === i,
        );
      }
      s += note(
        "10 个 full 层保存 KV；30 个 linear 层保存 S 与卷积历史",
        "10 full layers retain KV; 30 linear layers retain S and convolution history",
      );
      formula = L(
        `查看 ${names[v]}：请求之间独立，层与头之间也有各自的位置。`,
        `Inspect ${names[v]}: independent per request, with separate layer/head state.`,
      );
    }
    if (step === 2) {
      const serial = pdSchedule(v, 3, false),
        parallel = pdSchedule(v, 3, true),
        scale = 530 / serial.total;
      for (const [j, plan] of [serial, parallel].entries()) {
        const y = 110 + j * 165;
        s += tx(
          380,
          y - 35,
          j === 0
            ? L("串行请求", "Serial requests")
            : L("跨请求流水线", "Across-request pipeline"),
          18,
        );
        for (const [k, r] of [plan.a, plan.b].entries()) {
          const yy = y + k * 55;
          s += tx(70, yy + 24, k ? "B" : "A", 17);
          s += bar(
            115 + r.prefill[0] * scale,
            yy,
            (r.prefill[1] - r.prefill[0]) * scale,
            "Prefill",
            "purple",
          );
          s += bar(115 + r.decode[0] * scale, yy, 3 * scale, "Decode", "green");
        }
        s += tx(690, y + 60, `${plan.total}`, 22);
      }
      formula = `P=${v}, D=3 · serial=${serial.total} · pipeline=${parallel.total} (${L("示意时间单位", "illustrative time units")})`;
    }
    if (step === 3) {
      s += box(
        65,
        110,
        240,
        85,
        v ? "ANE prefill" : "CPU prefill",
        v ? "fp16 arithmetic" : "f32 arithmetic",
        "purple",
      );
      s += line(310, 150, 435, 150);
      s += box(
        445,
        110,
        240,
        85,
        L("缓存交接", "Cache handoff"),
        v ? "rounded values → f32" : "f32 values",
        "orange",
      );
      s += path("M565 200 L565 280 L435 280");
      s += box(
        145,
        245,
        280,
        85,
        v ? "GPU decode" : "CPU decode",
        v ? "top ID 95772" : "top ID 17",
        "green",
      );
      s += note(
        "M5 历史固定输入测试；两种调度一致，不等于两种精度一致",
        "Historical M5 fixed-input probe: equal schedules do not imply equal precision",
      );
      formula = v
        ? "ANE → GPU: rounded history remains rounded · decode logits relative L2 = 1.12203%"
        : "CPU reference: top IDs [198,17]";
    }
  }
  if (id === "parallel") {
    if (step === 0) {
      const hidden = [1, 2, 3, 4],
        w = [
          [1, 0],
          [0, 1],
          [1, 1],
          [-1, 2],
        ],
        r = splitDown(hidden, w, v);
      s += matrix(250, 80, [hidden], {
        cell: 62,
        label: "hidden [1,4]",
        color: "blue",
      });
      s += path("M280 150 L180 190");
      s += tx(180, 211, `hidden [1,${v}] ×`, 15);
      s += path("M470 150 L580 190");
      s += tx(580, 211, `hidden [1,${4 - v}] ×`, 15);
      s += box(
        55,
        225,
        250,
        95,
        `W_down [${v},2]`,
        `partial [${r.left.map(f).join(", ")}]`,
        "purple",
      );
      s += box(
        455,
        225,
        250,
        95,
        `W_down [${4 - v},2]`,
        `partial [${r.right.map(f).join(", ")}]`,
        "orange",
      );
      s += line(305, 274, 353, 274);
      s += tx(380, 282, "+", 28);
      s += line(450, 274, 407, 274);
      s += tx(380, 380, `output [${r.output.join(", ")}]`, 23);
      formula = L(
        "沿中间通道切分 down 的行，两个同宽输出相加；不拼接、不平均。",
        "Split down rows along intermediate channels; add equal-width outputs. Do not concatenate or average.",
      );
    }
    if (step === 1) {
      s += box(260, 45, 240, 70, "moe_input", "[1,2048]", "blue");
      s += path("M310 120 L180 180");
      s += path("M450 120 L580 180");
      s += box(
        45,
        190,
        270,
        90,
        "GPU: routed top 8",
        "demo duration = 5",
        "purple",
      );
      s += box(
        445,
        190,
        270,
        90,
        "ANE: shared expert",
        `demo duration = ${v}`,
        "orange",
      );
      s += path("M180 285 L180 340 L320 340");
      s += path("M580 285 L580 340 L440 340");
      s += box(290, 315, 180, 55, "routed + shared", "", "green");
      s += tx(380, 393, "+ original h", 17);
      s += note(
        "这次是两种专家分支并行，不是把每个专家切成两半",
        "These are two expert branches, not two halves of every expert",
      );
      formula = `serial=5+${v}=${5 + v}; ideal parallel=max(5,${v})=${Math.max(5, v)} · ${L("忽略调度开销的示意", "illustration excluding overhead")}`;
    }
    if (step === 2) {
      const ids = [3, 7, 12, 19, 24, 40, 81, 113];
      s += box(45, 170, 165, 80, "x", "[1,2048]", "blue");
      s += line(215, 210, 285, 210);
      s += matrix(
        295,
        65,
        ids.map((id, i) => [i === v ? `E${id}` : "·", "…"]),
        { cell: 37, label: "hidden [8,512]", color: "purple", highlight: v },
      );
      s += line(380, 210, 450, 210);
      s += box(
        460,
        130,
        235,
        80,
        `expert ${ids[v]}: W_down`,
        "[512,2048]",
        "purple",
      );
      s += box(
        460,
        280,
        235,
        70,
        "weighted reduce",
        "[8,2048] → [1,2048]",
        "green",
      );
      s += line(575, 215, 575, 270);
      s += note(
        "专家编号是示例；格子只标出路由位置，不是特征数值",
        "Illustrative expert IDs; cells identify route slots, not feature values",
      );
      formula = `route slot ${v} → expert ID ${ids[v]} → hidden[${v * 512} … ${(v + 1) * 512 - 1}]`;
    }
    if (step === 3) {
      const g = v ? 225 : 558;
      s += tx(
        380,
        65,
        L(
          "M3：40 层分支累计时间（ms）",
          "M3: accumulated branch time over 40 layers (ms)",
        ),
        19,
      );
      s += bar(100, 125, g * 0.8, `GPU ${g} ms`, "purple");
      if (v) s += bar(100, 235, 356 * 0.8, "ANE 356 ms", "orange");
      else
        s += tx(
          380,
          260,
          L(
            "先看优化前的 GPU 路由分支",
            "First inspect the original GPU routed branch",
          ),
          18,
        );
      s += box(95, 335, 260, 60, "GPU only: 916 ms", "", "green");
      s += box(405, 335, 260, 60, "GPU + ANE: 1022 ms", "", "orange");
      formula = v
        ? L(
            "合批后路由分支更快；每层仍要等待共享分支。下方是整步实测，不是上方相加。",
            "Batching speeds up routing, but each layer still waits for shared work. Whole-step results below are not sums of the bars.",
          )
        : L(
            "旧路由分支 558 ms；拖动查看合批后。Hi，单次 decode，三轮中位数。",
            "Original routed branch: 558 ms. Slide to compare. Hi prompt, one decode, three-round medians.",
          );
    }
  }
  if (id === "resident") {
    if (step === 0) {
      const mib = packedWeightBytes(2048, 8192, v) / 2 ** 20;
      s += box(
        45,
        130,
        245,
        105,
        L("压缩码常驻", "Resident packed codes"),
        `${v}-bit → ${mib} MiB`,
        "purple",
      );
      s += line(295, 180, 435, 180);
      s += box(
        445,
        130,
        270,
        105,
        "GPU: decode × input",
        "x [1,2048] → y [1,8192]",
        "green",
      );
      s += box(
        210,
        305,
        340,
        65,
        L("全部展开成 f32：64 MiB", "Fully expanded f32: 64 MiB"),
        "",
        "orange",
      );
      s += note(
        "只算权重码大小；未计 scale / bias，也不是 DRAM 流量实测",
        "Code payload only; excludes scale / bias and is not a DRAM traffic measurement",
      );
      formula = `2048 × 8192 × ${v}/8 = ${mib} MiB · ${L("实际第 0 层 QKV 为 6-bit", "actual layer-0 QKV uses 6 bits")}`;
    }
    if (step === 1) {
      const titles = [
        "Embedding",
        "40 layers",
        "lm_head + argmax",
        "Read token ID",
      ];
      s += `<rect x="45" y="100" width="515" height="200" rx="10" fill="${C.green}" stroke="#56614c"/>`;
      s += tx(
        380,
        75,
        L(
          "一次 decode 的一个 command buffer",
          "One command buffer for one decode",
        ),
        20,
      );
      titles.forEach((n, i) => {
        s += box(
          65 + i * 170,
          155,
          145,
          80,
          n,
          "",
          i === v ? "orange" : "blue",
          i === v,
        );
        if (i < 3) s += line(215 + i * 170, 195, 230 + i * 170, 195);
      });
      s += tx(645, 275, L("主机等待后读取", "Host reads after wait"), 12);
      s += tx(380, 350, "gate/up → expert_hidden → down", 20);
      s += note(
        "Syrix 的生成流程 + Kapitsa 的 Metal 算子；仍包含多次 dispatch",
        "Syrix generation flow + Kapitsa Metal operators; still multiple dispatches",
      );
      formula = L(
        `阶段 ${v + 1}：权重、缓存、中间值留在 GPU；主机在需要结果时等待。`,
        `Stage ${v + 1}: weights, state, and intermediates stay on the GPU; the host waits when the result is needed.`,
      );
    }
    if (step === 2) {
      const split = vocabularySplit(v ? 32768 : 8192);
      s += box(255, 40, 250, 70, "after final RMSNorm", "[1,2048]", "blue");
      s += path("M300 115 L180 180");
      s += path("M465 115 L580 180");
      s += box(
        45,
        190,
        285,
        90,
        `ANE W [2048,${split.ane}]`,
        `IDs 0 … ${split.lastAne}`,
        "orange",
      );
      s += box(
        430,
        190,
        285,
        90,
        `GPU W [2048,${split.gpu}]`,
        `IDs ${split.firstGpu} … 248319`,
        "purple",
      );
      s += tx(380, 335, "write input → ready → compute → done → merge", 15);
      s += tx(
        380,
        385,
        `M3: ${v ? "9.00" : "8.07"} ms vs GPU-only 7.37 ms`,
        19,
      );
      formula = L(
        "历史 17-token 测试：增加 ANE 份额反而更慢。ready/done 保证输入已写好、输出已完成。",
        "Historical 17-token test: a larger ANE share was slower. ready/done order input writes and completed output.",
      );
    }
    if (step === 3) {
      const scores =
        v === 1
          ? [near17Fp16(16.952305), near17Fp16(16.952019)]
          : [16.952305, 16.952019];
      s += tx(
        380,
        65,
        v === 0
          ? "GPU original"
          : v === 1
            ? "ANE fp16"
            : "Explicit GPU recheck",
        24,
      );
      s += box(85, 135, 245, 95, "ID 17", String(scores[0]), "blue", v !== 1);
      s += box(
        430,
        135,
        245,
        95,
        "ID 15",
        String(scores[1]),
        "orange",
        v === 1,
      );
      s += box(
        225,
        305,
        310,
        70,
        `selected ID ${v === 1 ? 15 : 17}`,
        v === 1
          ? L("同分时选较小 ID", "Tie: smaller ID")
          : L("按实际分数比较", "Compare actual scores"),
        "green",
      );
      formula = L(
        "新混合词表路径对接近分数显式 GPU 复算；经验阈值不保证所有输入等价。",
        "The new hybrid vocabulary path explicitly rechecks close scores on GPU; its heuristic is not a universal equivalence guarantee.",
      );
    }
  }
  if (id === "verification") {
    if (step === 0) {
      for (let i = 0; i < 5; i++) {
        s += box(
          65 + i * 140,
          125,
          115,
          75,
          `draft ${i + 1}`,
          "",
          i < v ? "green" : "gray",
          i === v,
        );
        if (i < 4) s += line(185 + i * 140, 160, 200 + i * 140, 160);
      }
      s += box(
        210,
        290,
        340,
        80,
        L("主模型验证并提交有效前缀", "Main model verifies the valid prefix"),
        `${v} accepted + correction`,
        "purple",
      );
      s += note(
        "图演示链式前缀；树式还需祖先掩码，只提交接受的那条路径",
        "This is a chain illustration; trees need ancestor masks and commit only the accepted path",
      );
      formula = L(
        `保留前 ${v} 个草稿，其余不直接写入正式缓存。这里不模拟真实采样器。`,
        `Keep ${v} draft tokens; rejected candidates are not committed to the cache. This is not the real sampler.`,
      );
    }
    if (step === 1) {
      s += matrix(
        65,
        100,
        Array.from({ length: v }, () => ["…", "…"]),
        { cell: 32, label: `X [${v},2048]` },
      );
      s += tx(190, 225, "×", 30);
      s += box(240, 165, 235, 95, "same W_QKV", "[2048,8192]", "purple");
      s += line(480, 210, 540, 210);
      s += box(550, 165, 170, 95, "QKV", `[${v},8192]`, "green");
      s += note(
        "R 是位置数，不是 head 数；8×8 是内部小块，不是整个矩阵",
        "R counts positions, not heads; 8×8 is an internal tile, not the whole matrix",
      );
      formula = `[${v},2048] × [2048,8192] → [${v},8192] · ${L("同一权重块供多行复用", "one weight tile reused across rows")}`;
    }
    if (step === 2) {
      const rows = [
        ["GPU time", "75.20 µs", "71.49 µs"],
        ["Python call", "133.0 µs", "146.7 µs"],
        ["Fixed 8-row verification", "76.26 ms", "76.77 ms"],
        ["65-token generation", "48.57 tok/s", "54.82 tok/s"],
      ];
      s += tx(380, 65, rows[v][0], 24);
      s += box(65, 140, 280, 100, "Apple kernel", rows[v][1], "blue");
      s += box(415, 140, 280, 100, "Ported kernel", rows[v][2], "purple");
      s += box(
        180,
        300,
        400,
        65,
        v === 3
          ? "22 rounds → 17 rounds"
          : L("计时边界不同，结论也不同", "Different timing boundaries"),
        "",
        "orange",
      );
      s += note(
        "2026-11-24 M4 记录，固定版本与输入；不是当前所有 MLX 的结论",
        "M4 record, 2026-11-24, fixed versions and input; not a claim about every current MLX build",
      );
      formula = L(
        "GPU 内核略快，调用/固定验证略慢；生成更快还包含验证轮数变化。",
        "GPU kernel slightly faster, call/fixed verification slightly slower; generation also changes the number of rounds.",
      );
    }
    if (step === 3) {
      const x = 2 ** v,
        over = x > 65504;
      s += box(45, 75, 240, 80, `x[i] = ${x}`, "x [1,2048] · BF16", "blue");
      s += path("M290 115 L350 115 L350 195 L420 195");
      s += path("M170 160 L170 300 L420 300");
      s += box(
        430,
        155,
        280,
        80,
        L("直接转 FP16", "Direct FP16 cast"),
        over ? "+Inf" : `${x}`,
        "orange",
      );
      s += box(
        430,
        275,
        280,
        80,
        L("先 RMSNorm，gamma=1", "RMSNorm first, gamma=1"),
        "≈ 1.0",
        "green",
      );
      s += note(
        "这一模型路径的数值范围有界；通用 BF16 矩阵接口没有这个前提",
        "This model path bounds its inputs; a general BF16 matmul API has no such precondition",
      );
      formula = `${L("数学点积", "Mathematical dot product")}: 2048 × ${x} = ${2048 * x} · fp16 max finite = 65504`;
    }
  }
  return {
    svg: `<svg viewBox="0 0 760 460" role="img" aria-labelledby="diagram-title"><title id="diagram-title">${escape(formula)}</title><defs><marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8" fill="none" stroke="#7c8573"/></marker></defs>${s}</svg>`,
    formula,
  };
}
export const advancedCode = {
  cache: [
    "comparison: session state / generation",
    [
      `// Earlier baseline: forward(all_ids) every time.
let state = model.prefill(prompt_ids)?;
// New cached path:
let logits = model.decode(new_id, &mut state)?;
// Historical K/V remain inputs to attention.`,
      `struct RequestState {
    full_layers: Vec<KvCache>,
    linear_layers: Vec<(StateMatrix, ConvHistory)>,
    position: usize,
}
// Each request owns independent logical state.`,
      `prefill_ane(A); // creates A's state
parallel {
    decode_gpu(A);
    prefill_ane(B); // independent state
}
decode_gpu(B);`,
      `// Widening preserves the rounded value:
let cached_f32 = cached_fp16 as f32;
// It cannot recover the original unrounded value.
// Compare the same inputs and full logits.`,
    ],
  ],
  parallel: [
    "comparison: compute.rs; routed_experts.metal",
    [
      `// Logical down weight: [M,H]
left  = hidden[..cut] * W_down[..cut,:];
right = hidden[cut..] * W_down[cut..,:];
output = left + right; // [1,H], not [1,2H]`,
      `parallel {
    routed = gpu.run_selected_experts(moe_input);
    shared = ane.run_shared_expert(moe_input);
}
wait_for_both();
output = original_h + routed + shared;`,
      `// route slot != expert ID
let start = slot * 512;
// GPU writes hidden [8,512].
routed_down(hidden_buffer, selected_weights);
// Weighted reduction returns [1,2048].`,
      `// Faster routed work can expose shared work.
ideal_merge_time = max(gpu_time, ane_time);
// Actual time also includes copies and sync.
// Compare parallel with both serial and GPU-only.`,
    ],
  ],
  resident: [
    "comparison: native/resident.cpp; resident_ane_head.hpp",
    [
      `// Logical W [2048,8192], stored as packed codes.
weight = code * group_scale + group_bias;
partial += input[k] * weight;
// Decode near the multiply; retain weight buffers.`,
      `encode_embedding(command_buffer);
for layer in layers {
    layer.encode(command_buffer, resident_buffers);
}
encode_lm_head_and_argmax(command_buffer);
commit_and_wait(command_buffer);
read_token_id();`,
      `gpu.write_fp16_input(surface);
gpu.signal(ready);
ane.wait(ready).project(0..ane_rows).signal(done);
gpu.project(ane_rows..vocab);
gpu.wait(done).merge_scores();`,
      `let tolerance = max(1., abs(best)) * 4. / 1024.;
if best - runner_up <= tolerance
    && best - ane_best <= tolerance {
    gpu.recompute_ane_interval();
}
// Explicit hybrid-mode heuristic, not pure-ANE fallback.`,
    ],
  ],
  verification: [
    "comparison: QKV verification experiments",
    [
      `draft = propose_candidates();
scores = main_model.verify(draft, valid_path_mask);
accepted = select_valid_prefix(scores, draft);
commit_only_accepted_path(accepted);
// A tree needs ancestor masks, not one flat chain.`,
      `// R positions, the SAME logical weight matrix:
QKV [R,8192] = X [R,2048] * W [2048,8192];
// Inner kernel: accumulate 8×8 tiles.
// R is not a head count.`,
      `measure_gpu_execution();
measure_call_until_result();
measure_fixed_candidates_verification();
measure_generation_and_verification_rounds();
// These answer different performance questions.`,
      `// General BF16 matmul counterexample:
x = repeat(131072, 2048);
w = repeat(1, 2048);
expected = 268435456;
// Casting x to fp16 first overflows.
// A preceding model-specific norm changes the input.`,
    ],
  ],
};
export const advancedQuizzes = {
  cache: {
    q: [
      "缓存后 full attention 还读历史 K/V 吗？",
      "Does cached full attention still read historical K/V?",
    ],
    a: [
      ["仍然要读", "Yes"],
      ["不用，历史都不参与了", "No, history no longer participates"],
    ],
    correct: 0,
  },
  parallel: {
    q: [
      "按中间通道拆成两半后如何合并？",
      "How do channel-split FFN outputs merge?",
    ],
    a: [
      ["拼成两倍宽度", "Concatenate to twice the width"],
      ["同位置相加", "Add matching positions"],
    ],
    correct: 1,
  },
  resident: {
    q: [
      "一次 command buffer 等于只运行一个算子吗？",
      "Does one command buffer mean one operator?",
    ],
    a: [
      ["是", "Yes"],
      ["不是，可以包含许多 dispatch", "No, it can contain many dispatches"],
    ],
    correct: 1,
  },
  verification: {
    q: [
      "整段生成变快，能说明每次固定验证都变快吗？",
      "Does faster generation prove every fixed verification got faster?",
    ],
    a: [
      [
        "不能，还要看验证轮数与计时边界",
        "No; inspect round counts and timing boundaries",
      ],
      ["能", "Yes"],
    ],
    correct: 0,
  },
};
