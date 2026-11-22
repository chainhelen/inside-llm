import {
  sigmoid,
  silu,
  softmax,
  rmsnorm,
  matmul,
  quantize,
  ropePair,
  deltaStep,
  attentionRow,
  topRoutes,
  expert,
  mixExperts,
  kvHead,
  shaderGroups,
} from "./math.js";
export const escape = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const C = {
  blue: "#d9e7f5",
  purple: "#e9dff4",
  green: "#dcebdc",
  orange: "#f8dfbd",
  gray: "#eeeede",
  red: "#f3d7cf",
};
const f = (n) =>
  Math.abs(n) < 0.00005 ? "0" : Number(n.toFixed(3)).toString();
const tx = (x, y, s, size = 15, anchor = "middle", color = "") =>
  `<text x="${x}" y="${y}" text-anchor="${anchor}" font-size="${size}" ${color ? `style="fill:${color}"` : ""}>${escape(s)}</text>`;
const line = (x1, y1, x2, y2, dashed = false) =>
  `<path class="wire" d="M${x1} ${y1} L${x2} ${y2}" ${dashed ? 'stroke-dasharray="5 5"' : ""} marker-end="url(#arrow)"/>`;
const path = (d) => `<path class="wire" d="${d}" marker-end="url(#arrow)"/>`;
function box(x, y, w, h, title, sub = "", color = "blue", focus = false) {
  return `<rect x="${x + 3}" y="${y + 3}" width="${w}" height="${h}" rx="7" fill="#5f675027"/><rect class="node ${focus ? "focus" : ""}" x="${x}" y="${y}" width="${w}" height="${h}" rx="7" fill="${C[color]}"/>${tx(x + w / 2, y + (sub ? h / 2 - 3 : h / 2 + 5), title, 15)}${sub ? tx(x + w / 2, y + h / 2 + 20, sub, 13) : ""}`;
}
function matrix(
  x,
  y,
  values,
  { cell = 44, color = "blue", highlight = -1, label = "", shape = "" } = {},
) {
  let s = "";
  const rows = values.length,
    cols = values[0].length;
  if (label) s += tx(x + (cols * cell) / 2, y - 23, label, 15);
  if (shape) s += tx(x + (cols * cell) / 2, y + rows * cell + 25, shape, 13);
  values.forEach((row, r) =>
    row.forEach((v, c) => {
      s += `<rect x="${x + c * cell}" y="${y + r * cell}" width="${cell - 4}" height="${cell - 4}" rx="4" fill="${C[color]}" stroke="${highlight === r || highlight === r * 100 + c ? "#52733d" : "#a3ad97"}" stroke-width="${highlight === r ? 2.5 : 1}"/>${tx(x + c * cell + (cell - 4) / 2, y + r * cell + cell / 2 + 3, typeof v === "number" ? f(v) : v, cell < 36 ? 11 : 14)}`;
    }),
  );
  return s;
}
const range = (zh, en, min, max, value, step = 1) => ({
  label: { zh, en },
  min,
  max,
  value,
  step,
});
export function controls(id, step) {
  switch (id) {
    case "tokens":
      return [
        step < 2
          ? range("选一个 token", "Choose a token", 0, 3, 0)
          : range("token 数 T", "Token count T", 1, 4, 4),
      ];
    case "matrix":
      return [
        step === 2
          ? range("每个压缩码的 bit 数", "Bits per code", 2, 8, 6)
          : range("input[0]", "input[0]", -3, 3, 1),
      ];
    case "norm":
      return [range("第一个输入数", "First input value", -4, 4, -1, 0.25)];
    case "heads":
      return step === 0
        ? [range("投影阶段", "Projection phase", 0, 3, 0)]
        : step === 2
          ? [range("Q head", "Q head", 0, 15, 0)]
          : [
              range("观察角度", "Viewing angle", 0, 60, 30),
              range("选一个 token", "Choose a token", 0, 2, 1),
            ];
    case "attention":
      return [
        step === 0
          ? range("位置 pos", "Position pos", 0, 12, 1)
          : step === 3
            ? range("gate logit", "Gate logit", -4, 4, 1, 0.25)
            : range("当前 token 位置", "Current token position", 0, 3, 2),
      ];
    case "linear":
      return [
        range("token 时间步", "Token time step", 0, 3, 1),
        ...(step === 0 ? [] : [range("选一个 head", "Choose a head", 0, 1, 0)]),
      ];
    case "router":
      return [
        step === 0
          ? range("当前阶段", "Current phase", 0, 2, 0)
          : range("专家 2 的路由分数", "Expert 2 router logit", -2, 5, 1, 0.25),
      ];
    case "experts":
      return [
        step === 2
          ? range("专家 A 的比例", "Expert A weight", 0, 1, 0.65, 0.05)
          : step === 3
            ? range("共享 gate logit", "Shared gate logit", -4, 4, 1, 0.25)
            : range("input[0]", "input[0]", -2, 3, 1, 0.5),
      ];
    case "generation":
      return [
        step === 0
          ? range("当前层", "Current layer", 1, 40, 4)
          : step === 1
            ? range("查看排名", "Inspect rank", 1, 4, 1)
            : range("已生成 token 数", "Generated token count", 0, 3, 1),
      ];
    case "gpu":
      return [
        step === 0
          ? range("线程 id", "Thread id", 0, 7, 2)
          : step === 2
            ? range("当前阶段", "Current phase", 0, 2, 0)
            : range(
                "每个 threadgroup 的线程",
                "Threads per threadgroup",
                4,
                16,
                8,
                4,
              ),
      ];
    case "ane":
      return [
        step === 0
          ? range("0: Core ML · 1: Direct", "0: Core ML · 1: Direct", 0, 1, 1)
          : step === 3
            ? range("0: Host · 1: ANE", "0: Host · 1: ANE", 0, 1, 1)
            : step === 2
              ? range(
                  "逻辑行宽（fp16 元素）",
                  "Logical row width (fp16)",
                  1,
                  64,
                  17,
                )
              : range("当前调用阶段", "Current call phase", 0, 3, 1),
      ];
    case "precision":
      return [
        step === 0
          ? range("输入 g", "Input g", -6, 6, 1, 0.25)
          : step === 1
            ? range("输入量级 10ⁿ", "Input magnitude 10ⁿ", -5, 3, -4)
            : range("生成步", "Generation step", 1, 2, 1),
      ];
    default:
      return [];
  }
}
export function draw(id, step, values, lang = "zh") {
  const L = (a, b) => (lang === "zh" ? a : b);
  const v = values[0],
    v2 = values[1] ?? 0;
  let s = "",
    formula = "",
    note = "";
  if (id === "tokens") {
    const ids = [109266, 3709, 96748, 6115],
      tokens = ["你好", "，", "世界", "！"];
    if (step === 0) {
      s += tx(380, 55, "你好，世界！", 30);
      s += tx(
        380,
        85,
        L(
          "实际分词示例 · 点击下方滑杆选中一个 token",
          "Actual tokenizer example · select a token below",
        ),
        13,
      );
      tokens.forEach((t, i) => {
        s += box(
          65 + i * 170,
          140,
          135,
          70,
          t,
          "ID " + ids[i],
          i === v ? "green" : "blue",
          i === v,
        );
        s += line(132 + i * 170, 215, 132 + i * 170, 270);
        s += tx(132 + i * 170, 305, "token " + i, 14);
      });
      formula = `text → [${ids.join(", ")}] · T = 4`;
    } else if (step === 1) {
      s += box(50, 175, 150, 75, "ID " + ids[v], `token ${v}`, "blue", true);
      s += line(206, 211, 275, 211);
      s += matrix(
        288,
        112,
        [
          ["⋯", "⋯", "⋯", "⋯"],
          [".12", "−.8", ".34", "⋯"],
          ["⋯", "⋯", "⋯", "⋯"],
          ["⋯", "⋯", "⋯", "⋯"],
        ],
        {
          cell: 48,
          color: "purple",
          highlight: 1,
          label: "Embedding",
          shape: "[248320, 2048]",
        },
      );
      s += line(487, 185, 550, 185);
      s += box(
        560,
        148,
        155,
        75,
        L("取出这一行", "Read this row"),
        "[1, 2048]",
        "green",
      );
      s += tx(
        380,
        370,
        L(
          "图中的数值仅示意；实际一行有 2048 个特征",
          "Illustrative values; the actual row has 2048 features",
        ),
        14,
      );
      formula = `embedding[${ids[v]}] → x [1,2048]`;
    } else {
      const rows = Array.from({ length: v }, () => [".12", "−.8", ".34", "…"]);
      s += matrix(220, 100, rows, {
        cell: 60,
        label: "X",
        shape: `[${v}, 2048]`,
      });
      for (let i = 0; i < v; i++) s += tx(185, 135 + i * 60, `t${i}`, 15);
      s += tx(100, 215, L("token 轴", "token axis"), 15);
      s += tx(
        370,
        60,
        L("特征位置（这里只画 4 个）", "feature positions (only 4 shown)"),
        15,
      );
      s += tx(
        380,
        407,
        L(
          "加 token：多一行。特征宽度保持 2048。",
          "One more token adds a row. Width stays 2048.",
        ),
        16,
      );
      formula = `T=${v} · X [${v},2048]`;
    }
  }
  if (id === "matrix") {
    const x = [v, 2],
      w = [
        [1, -1, 2],
        [3, 0, 1],
      ],
      out = matmul([x], w)[0];
    if (step === 0) {
      s += matrix(65, 180, [x], { label: "input", shape: "[1, 2]", cell: 51 });
      s += tx(200, 210, "×", 27);
      s += matrix(240, 155, w, {
        label: "W",
        shape: "[2, 3]",
        cell: 51,
        color: "purple",
      });
      s += tx(425, 210, "=", 27);
      s += matrix(465, 180, [out], {
        label: "output",
        shape: "[1, 3]",
        cell: 55,
        color: "green",
      });
      s += tx(
        380,
        335,
        L(
          "一列权重，算出一个输出数",
          "One weight column gives one output value",
        ),
        17,
      );
      formula = `output[0] = ${v} × 1 + 2 × 3 = ${out[0]}`;
    } else if (step === 1) {
      s += matrix(
        70,
        135,
        [
          [1, 3],
          [-1, 0],
          [2, 1],
        ],
        {
          cell: 53,
          color: "purple",
          label: L("存储 W", "Stored W"),
          shape: "[output=3, input=2]",
        },
      );
      s += tx(230, 210, "dot", 20);
      s += matrix(280, 190, [x], { cell: 53, label: "input", shape: "[1,2]" });
      s += line(405, 213, 462, 213);
      s += matrix(490, 190, [out], {
        cell: 50,
        color: "green",
        label: L("逐个填入", "Fill in order"),
        shape: "[1,3]",
      });
      s += tx(
        380,
        375,
        L(
          "上一步：按逻辑列算。本步：读取存储行算同一个点积。",
          "Same dot products; the stored layout exposes each output as a row.",
        ),
        14,
      );
      formula = `stored[row] · input = output[row] · output=[${out.join(", ")}]`;
    } else {
      const q = quantize(0.37, v);
      s += box(
        55,
        150,
        150,
        85,
        "w = 0.37",
        L("原始权重", "Original weight"),
        "purple",
      );
      s += line(210, 193, 285, 193);
      s += box(
        290,
        150,
        150,
        85,
        `code = ${q.code}`,
        `0 … ${2 ** v - 1}`,
        "orange",
      );
      s += line(445, 193, 520, 193);
      s += box(
        525,
        150,
        180,
        85,
        `w ≈ ${f(q.decoded)}`,
        `error ${f(q.decoded - 0.37)}`,
        "green",
      );
      s += tx(
        380,
        305,
        `scale = 2 / ${2 ** v - 1} = ${f(q.scale)} · bias = −1`,
        17,
      );
      s += tx(
        380,
        355,
        L(
          "一组 64 个权重共用 scale / bias；与 code 的范围分开看",
          "64 weights share scale / bias; this is separate from the code range",
        ),
        14,
      );
      formula = `${q.code} × ${f(q.scale)} + (−1) ≈ ${f(q.decoded)} · ${v} bits`;
    }
  }
  if (id === "norm") {
    const xs = [v, 0, 1, 2];
    if (step === 0) {
      const r = rmsnorm(xs, [1, 2, 1, 0.5]);
      s += matrix(60, 105, [xs], { cell: 52, label: "x [1,4]" });
      s += box(340, 95, 180, 60, `r = ${f(r.r)}`, "√(mean(x²)+ε)", "orange");
      s += line(270, 130, 332, 130);
      s += matrix(60, 240, [xs.map((x) => x / r.r)], {
        cell: 52,
        label: "x / r",
        color: "green",
      });
      s += tx(305, 265, "⊙", 25);
      s += matrix(350, 240, [[1, 2, 1, 0.5]], {
        cell: 52,
        label: "gamma [1,4]",
        color: "purple",
      });
      s += matrix(245, 360, [r.output], {
        cell: 58,
        label: L("最终结果", "Final result"),
        color: "green",
      });
      formula = `r=${f(r.r)} · y[i]=(x[i]/r) × gamma[i]`;
    } else if (step === 1) {
      const pts = (fn) =>
        Array.from({ length: 121 }, (_, i) => {
          const x = -6 + i * 0.1;
          return `${i ? "L" : "M"}${100 + (x + 6) * 46} ${255 - fn(x) * 30}`;
        }).join(" ");
      s += line(80, 255, 680, 255);
      s += line(376, 310, 376, 60);
      s += `<path d="${pts(sigmoid)}" fill="none" stroke="#b97c3a" stroke-width="3"/><path d="${pts(silu)}" fill="none" stroke="#58854e" stroke-width="3"/>`;
      s += `<circle cx="${100 + (v + 6) * 46}" cy="${255 - silu(v) * 30}" r="6" fill="#416737"/>`;
      s += tx(590, 65, "SiLU(g)", 16);
      s += tx(600, 215, "sigmoid(g)", 16);
      s += box(80, 350, 170, 60, `g = ${f(v)}`, "", "blue");
      s += box(285, 350, 180, 60, `σ(g) = ${f(sigmoid(v))}`, "", "orange");
      s += box(500, 350, 180, 60, `SiLU = ${f(silu(v))}`, "", "green");
      formula = `${f(v)} × ${f(sigmoid(v))} = ${f(silu(v))} · ${L("每个元素单独算", "computed independently per element")}`;
    } else {
      const p = softmax(xs),
        n = rmsnorm(xs).output;
      s += matrix(40, 98, [xs], { cell: 52, label: "x" });
      s += line(260, 120, 330, 120);
      s += matrix(345, 98, [p], {
        cell: 70,
        label: "softmax(x)",
        color: "orange",
      });
      s += matrix(345, 260, [n], {
        cell: 70,
        label: "RMSNorm (gamma=1)",
        color: "green",
      });
      s += path("M265 125 L300 125 L300 285 L335 285");
      s += tx(485, 210, "sum = 1", 16);
      s += tx(
        485,
        370,
        L("可正可负，不要求总和 1", "Signs preserved; sum need not be 1"),
        15,
      );
      formula = `softmax = [${p.map(f).join(", ")}]`;
    }
  }
  if (id === "heads") {
    if (step === 0) {
      s += box(40, 70, 150, 66, "X", "[T,2048]", "blue", v === 0);
      s += tx(220, 110, "×", 25);
      s += box(255, 70, 190, 66, "W_q", "[2048,8192]", "purple", v === 1);
      s += line(451, 105, 507, 105);
      s += box(515, 70, 195, 66, "qg", "[T,8192]", "green", v === 2);
      s += path("M610 142 L610 185 L380 185 L380 217");
      for (let h = 0; h < 4; h++) {
        s += box(
          70 + h * 160,
          235,
          145,
          66,
          `head ${h}`,
          "Q 256 | gate 256",
          h % 2 ? "orange" : "blue",
          v === 3,
        );
      }
      s += tx(
        380,
        353,
        L(
          "只画前 4 头；实际连续放了 16 份，每份 512 个数",
          "First 4 shown; 16 consecutive head blocks, each 512 values",
        ),
        14,
      );
      s += tx(380, 395, "Q [T,16,256]    gates [T,16,256]", 19);
      formula = "8192 = 16 × (256 Q + 256 gate)";
    } else if (step === 1) {
      const dx = 70 + v * 3.5,
        dy = 10 + v * 0.45;
      for (let head = 1; head >= 0; head--) {
        const x = 95 + head * dx,
          y = 145 - head * dy;
        s += matrix(
          x,
          y,
          Array.from({ length: 3 }, (_, t) =>
            Array.from({ length: 4 }, (_, d) => `${t}${head}${d}`),
          ),
          {
            cell: 64,
            label: `head ${head}`,
            shape: head === 0 ? "Q [T=3, heads=2, D=4]" : "",
            color: head ? "purple" : "blue",
            highlight: v2,
          },
        );
      }
      s += tx(
        380,
        45,
        L(
          "教学形状 · 每格的三个数字是 token / head / feature",
          "Teaching shape · each cell is labeled token / head / feature",
        ),
        14,
      );
      s += tx(
        380,
        407,
        L(
          "前后是 head；每张表有 T 行，每行 D 个数",
          "Depth: head. Each sheet has T rows and D columns.",
        ),
        15,
      );
      formula = `Q[${v2}, 0, :] = [${[0, 1, 2, 3].map((d) => `${v2}0${d}`).join(", ")}]`;
    } else {
      for (let h = 0; h < 16; h++) {
        const x = 60 + (h % 8) * 80,
          y = 85 + Math.floor(h / 8) * 65;
        s += box(
          x,
          y,
          65,
          43,
          `Q${h}`,
          "",
          h === v ? "green" : "blue",
          h === v,
        );
      }
      s += box(
        150,
        290,
        180,
        70,
        "K0 / V0",
        "[T,256]",
        "purple",
        kvHead(v) === 0,
      );
      s += box(
        430,
        290,
        180,
        70,
        "K1 / V1",
        "[T,256]",
        "orange",
        kvHead(v) === 1,
      );
      s += line(
        92 + (v % 8) * 80,
        130 + Math.floor(v / 8) * 65,
        kvHead(v) === 0 ? 240 : 520,
        281,
      );
      formula = `Q head ${v} → KV head floor(${v}/8) = ${kvHead(v)}`;
    }
  }
  if (id === "attention") {
    if (step === 0) {
      const a = v * 0.35,
        xy = ropePair(1, 0, a);
      s += `<circle cx="260" cy="225" r="112" fill="none" stroke="#bac4ae" stroke-dasharray="5 5"/>`;
      s += line(100, 225, 420, 225);
      s += line(260, 365, 260, 80);
      s += `<path d="M260 225 L372 225" stroke="#7897b8" stroke-width="3"/><path d="M260 225 L${260 + xy[0] * 112} ${225 - xy[1] * 112}" stroke="#64884c" stroke-width="4" marker-end="url(#arrow)"/>`;
      s += box(
        485,
        135,
        215,
        70,
        `pos = ${v}`,
        L("展示一对数的旋转", "One pair rotating"),
        "blue",
      );
      s += box(
        485,
        255,
        215,
        70,
        `[${f(xy[0])}, ${f(xy[1])}]`,
        "length = 1",
        "green",
      );
      s += tx(
        380,
        410,
        L(
          "图用频率 0.35 演示；实际各对频率不同，只旋转前 64 维",
          "Shown frequency: 0.35; actual pairs have different frequencies, 64 dims rotate",
        ),
        13,
      );
      formula = `angle = pos × frequency · [x′,y′]=[x cosθ−y sinθ, x sinθ+y cosθ]`;
    } else if (step === 1 || step === 2) {
      const scores = [0.5, 1.2, -0.4, 0.8],
        vals = [
          [1, 2],
          [3, 0],
          [-1, 4],
          [2, 1],
        ],
        r = attentionRow(scores, vals, v);
      if (step === 1) {
        const a = Array.from({ length: 4 }, (_, i) =>
          Array.from({ length: 4 }, (_, j) => (j <= i ? f(scores[j]) : "×")),
        );
        s += matrix(70, 98, a, {
          cell: 57,
          label: L("因果分数矩阵 [T,T]", "Causal score matrix [T,T]"),
          color: "purple",
          highlight: v,
        });
        s += box(
          435,
          122,
          230,
          75,
          `token ${v}`,
          L(`只能看 0 … ${v}`, `can attend to 0 … ${v}`),
          "blue",
        );
        s += box(
          435,
          265,
          230,
          65,
          L("× 的权重为 0", "× has zero probability"),
          "",
          "orange",
        );
        formula = `scores[t,j] = Q[t] · K[j] / √D · ${L("仅允许", "allow only")} j ≤ t`;
      } else {
        r.probs.forEach((p, i) => {
          const y = 85 + i * 75;
          s += tx(55, y + 20, `t${i}`, 14);
          s += `<rect x="85" y="${y}" width="${Math.max(1, p * 280)}" height="33" rx="4" fill="${C.orange}" stroke="#a3967d"/>`;
          s += tx(380, y + 23, f(p), 15);
          s += tx(430, y + 23, "×", 20);
          s += matrix(475, y, [[...vals[i]]], { cell: 40, color: "blue" });
        });
        s += box(
          585,
          190,
          135,
          75,
          L("混合结果", "Mixed V"),
          `[${r.output.map(f).join(", ")}]`,
          "green",
        );
        formula = `output[0] = ${r.probs.map((p, i) => `${f(p)}×${vals[i][0]}`).join(" + ")} = ${f(r.output[0])}`;
      }
    } else {
      s += box(
        50,
        90,
        185,
        70,
        L("16 头拼接", "Join 16 heads"),
        "[T,4096]",
        "blue",
      );
      s += box(
        50,
        240,
        185,
        70,
        "sigmoid(gates)",
        `σ(${v}) = ${f(sigmoid(v))}`,
        "orange",
      );
      s += path("M145 235 L145 200 L300 200");
      s += line(240, 125, 300, 125);
      s += box(310, 130, 130, 70, "⊙", "[T,4096]", "green");
      s += line(445, 165, 510, 165);
      s += box(520, 130, 190, 70, "W_o", "[4096,2048]", "purple");
      s += path("M615 205 L615 285 L485 285");
      s += box(295, 250, 180, 70, "+ original x", "h [T,2048]", "green");
      formula = `gated[i] = attended[i] × ${f(sigmoid(v))} · h = x + gated × W_o`;
    }
  }
  if (id === "linear") {
    const inputs = [
        [1, 0.2],
        [0.3, 1],
        [-0.4, 0.6],
        [0.8, -0.2],
      ],
      ks = [
        [1, 0],
        [0, 1],
        [0.6, 0.8],
        [0.8, 0.6],
      ],
      alpha = 0.8,
      beta = 0.6;
    const runHead = (h) => {
      let state = [
          [0, 0],
          [0, 0],
        ],
        result;
      for (let t = 0; t <= v; t++) {
        result = deltaStep(
          state,
          ks[(t + h) % 4],
          inputs[t].map((n) => n * (h ? -0.7 : 1)),
          [0.6, 0.8],
          alpha,
          beta,
        );
        state = result.next;
      }
      return result;
    };
    const last = runHead(v2),
      S = last.next;
    if (step === 0) {
      for (let i = 0; i < 4; i++) {
        s += box(
          65 + i * 170,
          105,
          140,
          65,
          `token ${i}`,
          i <= v ? L("可见", "visible") : L("未来", "future"),
          i === v ? "green" : "blue",
          i === v,
        );
        if (i <= v) s += line(135 + i * 170, 175, 380, 280);
      }
      s += box(
        255,
        290,
        250,
        80,
        "Conv1d → SiLU",
        "8192 channels · kernel 4",
        "purple",
      );
      formula = `${L("当前", "current")} t=${v} · ${L("窗口", "window")} [t−3,t−2,t−1,t] · ${L("缺失历史补 0", "zero-pad missing history")}`;
    } else if (step === 1) {
      for (let h = 0; h < 2; h++) {
        s += box(
          110 + h * 330,
          65,
          215,
          55,
          `head ${h}`,
          "",
          h === v2 ? "green" : "gray",
          h === v2,
        );
        s += matrix(142 + h * 330, 165, runHead(h).next, {
          cell: 75,
          label: `S after token ${v}`,
          shape: "[2,2] demo",
          color: h === v2 ? "green" : "purple",
        });
      }
      s += tx(
        380,
        405,
        L(
          "切换滑杆查看不同 head 的独立计算；不共享 S",
          "Select a head to inspect its independent computation; S is not shared",
        ),
        13,
      );
      formula = `S_head${v2}(t=${v}) · ${L("实际每头", "actual per-head")} [128,128]`;
    } else if (step === 2) {
      s += box(40, 60, 180, 65, "S_old × α", `α = ${alpha}`, "orange");
      s += line(225, 90, 285, 90);
      s += box(295, 60, 180, 65, "k × S_decay", "prediction", "blue");
      s += line(480, 90, 540, 90);
      s += box(550, 60, 170, 65, "β × (v−pred)", `β = ${beta}`, "orange");
      s += path("M635 130 L635 205 L505 205");
      s += box(280, 165, 215, 70, "S_decay + k ⊗ δ", "S_new [2,2]", "green");
      s += matrix(285, 285, S, {
        cell: 74,
        label: `head ${v2} · token ${v}`,
        color: "green",
      });
      formula = `prediction=[${last.prediction.map(f)}] · delta=[${last.delta.map(f)}]`;
    } else {
      s += box(260, 65, 240, 70, "S_new", "[128,128] per head", "purple");
      s += path("M280 140 L280 190 L155 190 L155 240");
      s += path("M480 140 L480 190 L605 190 L605 240");
      s += box(
        40,
        250,
        240,
        80,
        "readout = q × S",
        `[${last.readout.map(f).join(", ")}] demo`,
        "blue",
      );
      s += box(
        485,
        250,
        240,
        80,
        L("留给下个 token", "Keep for next token"),
        "same head · S [128,128]",
        "orange",
      );
      s += line(160, 335, 160, 370);
      s += tx(210, 401, "RMSNorm ⊙ SiLU(z) → W_o", 15);
      formula = `${L("读出 32 × 128 → 4096；保留 S 不经过 z 门控", "Readout 32 × 128 → 4096; retained S does not pass through the z gate")}`;
    }
  }
  if (id === "router") {
    const scores = [0.7, -0.2, v, 2.1, 1.2, -0.6],
      routes = topRoutes(scores, 2);
    if (step === 0) {
      s += box(65, 150, 170, 75, "h = x + attn", "[1,2048]", "blue", v === 0);
      s += line(240, 185, 295, 185);
      s += box(
        305,
        150,
        170,
        75,
        "RMSNorm",
        "÷ RMS, then × γ",
        "purple",
        v === 1,
      );
      s += line(480, 185, 535, 185);
      s += box(545, 150, 170, 75, "moe_input", "[1,2048]", "green", v === 2);
      s += tx(
        380,
        335,
        L("这里还没有执行专家 FFN", "No expert FFN has run yet"),
        20,
      );
      formula = "h → post_attention_layernorm → moe_input";
    } else {
      s += `<path d="M250 48 L250 402" stroke="#9ba68e" stroke-dasharray="4 4"/>`;
      s += tx(250, 37, "0", 13);
      scores.forEach((score, i) => {
        const y = 60 + i * 57,
          selected = routes.some((r) => r.id === i);
        s += tx(65, y + 20, `E${i}`, 15);
        s += `<rect x="${250 + Math.min(0, score) * 35}" y="${y}" width="${Math.max(1, Math.abs(score) * 35)}" height="32" rx="4" fill="${selected && step === 2 ? C.green : C.purple}" stroke="#8f9a82"/>`;
        s += tx(475, y + 22, f(score), 15);
        if (step === 2)
          s += tx(
            615,
            y + 22,
            selected ? `w = ${f(routes.find((r) => r.id === i).weight)}` : "—",
            15,
          );
      });
      s += tx(
        380,
        425,
        L(
          "教学示例：6 选 2；本模型实际是 256 选 8",
          "Teaching example: 2 of 6; actual model selects 8 of 256",
        ),
        14,
      );
      formula =
        step === 1
          ? "[1,2048] × W_router [2048,256] → scores [1,256]"
          : `selected: ${routes.map((r) => `E${r.id} × ${f(r.weight)}`).join(" + ")} · sum(weights) = 1`;
    }
  }
  if (id === "experts") {
    const result = expert(
      [v, 1],
      [
        [1, -1, 0],
        [0, 0.5, 1],
      ],
      [
        [2, 0, 1],
        [1, 1, 0],
      ],
      [
        [1, 0],
        [0, 1],
        [1, 1],
      ],
    );
    if (step === 0) {
      s += box(40, 177, 140, 75, "input", "[1,2048]", "blue");
      s += path("M185 215 L225 215 L225 110 L275 110");
      s += path("M225 215 L225 310 L275 310");
      s += box(285, 75, 185, 75, "W_gate", "[2048,512]", "purple");
      s += box(285, 275, 185, 75, "W_up", "[2048,512]", "purple");
      s += line(475, 110, 535, 110);
      s += line(475, 310, 535, 310);
      s += box(545, 75, 165, 75, "gate", "[1,512]", "orange");
      s += box(545, 275, 165, 75, "up", "[1,512]", "blue");
      formula = `${L("小例子", "Toy example")}: gate=[${result.gate.map(f)}] · up=[${result.up.map(f)}]`;
    } else if (step === 1) {
      s += matrix(65, 95, [result.gate.map(silu)], {
        cell: 66,
        label: "SiLU(gate)",
        color: "orange",
      });
      s += tx(315, 125, "⊙", 28);
      s += matrix(375, 95, [result.up], {
        cell: 66,
        label: "up",
        color: "blue",
      });
      s += path("M480 170 L480 225 L380 225 L380 255");
      s += matrix(280, 270, [result.hidden], {
        cell: 66,
        label: "hidden",
        color: "green",
      });
      s += tx(
        380,
        405,
        L(
          "再乘 W_down [512,2048]，回到 2048 个数",
          "Then multiply W_down [512,2048], returning to 2048 values",
        ),
        15,
      );
      formula = `hidden[0] = SiLU(${f(result.gate[0])}) × ${f(result.up[0])} = ${f(result.hidden[0])}`;
    } else if (step === 2) {
      const A = [1, 2, -1],
        B = [3, -1, 2],
        out = mixExperts([A, B], [v, 1 - v]);
      s += matrix(80, 95, [A], {
        cell: 63,
        label: `expert A × ${f(v)}`,
        color: "blue",
      });
      s += matrix(440, 95, [B], {
        cell: 63,
        label: `expert B × ${f(1 - v)}`,
        color: "purple",
      });
      s += line(175, 175, 380, 270);
      s += line(535, 175, 380, 270);
      s += matrix(285, 290, [out], {
        cell: 63,
        label: "combined",
        color: "green",
      });
      formula = `combined[0] = 1 × ${f(v)} + 3 × ${f(1 - v)} = ${f(out[0])}`;
    } else {
      const scale = sigmoid(v);
      s += box(40, 70, 165, 75, "moe_input", "[1,2048]", "blue");
      s += line(210, 105, 315, 105);
      s += box(
        325,
        70,
        220,
        75,
        "gate / up / down",
        "raw_output [1,2048]",
        "purple",
      );
      s += path("M120 150 L120 280 L235 280");
      s += box(
        245,
        245,
        240,
        75,
        "W_shared_gate [2048,1]",
        `sigmoid(${v}) = ${f(scale)}`,
        "orange",
      );
      s += path("M550 105 L625 105 L625 245");
      s += line(490, 280, 550, 280);
      s += box(560, 245, 150, 75, "× scalar s", "[1,2048]", "green");
      s += tx(
        380,
        405,
        L(
          "这里 2048 个位置共用一个 s；与 hidden 的逐元素 gate 分开看",
          "All 2048 positions share one s; hidden uses a per-element gate",
        ),
        13,
      );
      formula = `shared.output[i] = raw_output[i] × ${f(scale)} · layer_output = h + routed + shared.output`;
    }
  }
  if (id === "generation") {
    if (step === 0) {
      for (let i = 0; i < 40; i++) {
        const x = 65 + (i % 10) * 64,
          y = 75 + Math.floor(i / 10) * 59;
        s += box(
          x,
          y,
          49,
          39,
          `${i + 1}`,
          "",
          (i + 1) % 4 === 0 ? "purple" : "blue",
          i + 1 === v,
        );
      }
      s += tx(
        380,
        355,
        L(
          "蓝：Linear Attention · 紫：Full Attention",
          "Blue: Linear Attention · Purple: Full Attention",
        ),
        15,
      );
      s += tx(380, 402, `layer ${v}: [T,2048] → [T,2048]`, 22);
      formula = "input RMSNorm → attention → +x → RMSNorm → MoE → +h";
    } else if (step === 1) {
      const ids = [198, 271, 695, 220],
        logits = [14.36, 13.59, 11.76, 11.62],
        words = ["\\n", "\\n\\n", " ␣\\n", "␣"];
      s += box(
        40,
        180,
        185,
        80,
        L("最后一个位置", "Last position"),
        "[1,2048]",
        "blue",
      );
      s += line(230, 220, 295, 220);
      s += box(305, 180, 190, 80, "W_lm_head", "[2048,248320]", "purple");
      for (let i = 0; i < 4; i++)
        s += box(
          535,
          65 + i * 80,
          175,
          63,
          `ID ${ids[i]}: ${words[i]}`,
          `logit ${logits[i]}`,
          i === 0 ? "green" : "gray",
          i === v - 1,
        );
      formula = `${L("查看排名", "Inspect rank")} ${v}: ID ${ids[v - 1]} · argmax(logits) = 198 → \"\\n\"`;
    } else {
      const tokens = [
        "109266",
        "3709",
        "96748",
        "6115",
        ...["198", "95772", "?"].slice(0, v),
      ];
      s += tx(
        380,
        65,
        L(
          "生成循环示意，不在浏览器运行完整模型",
          "Generation loop illustration; no full model runs in the browser",
        ),
        14,
      );
      s += matrix(60, 125, [tokens], {
        cell: 88,
        label: L("当前完整历史", "Current full history"),
        shape: `[T=${4 + v},2048] after embedding`,
      });
      s += box(
        255,
        280,
        250,
        75,
        L("完整重跑 40 层", "Rerun all 40 layers"),
        "final norm → lm_head",
        "purple",
      );
      s += path("M380 220 L380 270");
      s += path("M510 320 L700 320 L700 95 L380 95");
      s += tx(
        380,
        407,
        L(
          "第三个输出未测，? 仅表示下一轮还要计算",
          "Third output is unmeasured; ? marks the next computation",
        ),
        13,
      );
      formula = `${L("当前历史", "Current history")} T=${4 + v} · stop at EOS or max-new-tokens`;
    }
  }
  if (id === "gpu") {
    if (step === 0) {
      s += matrix(60, 100, [[1, 2, 3, 4, 5, 6, 7, 8]], {
        cell: 76,
        label: "left",
      });
      s += matrix(60, 215, [[10, 20, 30, 40, 50, 60, 70, 80]], {
        cell: 76,
        label: "right",
        color: "purple",
      });
      s += matrix(60, 330, [[11, 22, 33, 44, 55, 66, 77, 88]], {
        cell: 76,
        label: "out",
        color: "green",
      });
      s += `<rect x="${57 + v * 76}" y="95" width="76" height="310" rx="7" fill="none" stroke="#52733d" stroke-width="3"/>`;
      formula = `thread id=${v}: out[${v}]=left[${v}]+right[${v}]=${(v + 1) * 11}`;
    } else if (step === 1) {
      const groups = shaderGroups(32, v, 4);
      groups.forEach((group, g) => {
        const cols = Math.min(v, 8),
          x = 55 + (g % 2) * 350,
          y = 65 + Math.floor(g / 2) * 90;
        s += tx(x + 120, y - 12, `threadgroup ${g}`, 13);
        group.forEach(({ id, simd }, i) => {
          s += `<rect x="${x + (i % cols) * 32}" y="${y + Math.floor(i / cols) * 27}" width="28" height="23" rx="3" fill="${simd % 2 ? C.purple : C.blue}" stroke="#a4ad97"/>${tx(x + (i % cols) * 32 + 14, y + Math.floor(i / cols) * 27 + 16, id, 11)}`;
        });
      });
      formula = `grid=32 · threadgroup=${v} · SIMD=4 ${L("（示意宽度）", "(illustrative width)")}`;
    } else {
      s += box(
        45,
        165,
        185,
        80,
        "CPU / host",
        L("准备与选 ID", "prepare & select ID"),
        "blue",
        v === 0,
      );
      s += line(235, 205, 305, 205);
      s += box(315, 165, 190, 80, "Metal pipeline", "x × W", "purple", v === 1);
      s += line(510, 205, 575, 205);
      s += box(585, 165, 140, 80, "GPU", "logits", "green", v === 2);
      s += path("M650 250 L650 340 L140 340 L140 255");
      s += tx(
        380,
        375,
        L("数据传输与调度同样占时间", "Transfers and dispatch also cost time"),
        16,
      );
      formula =
        "new(): library → function → pipeline · add()/matvec(): buffers → encoder → dispatch";
    }
  }
  if (id === "ane") {
    if (step === 0) {
      s += box(
        55,
        70,
        245,
        70,
        "Core ML",
        "cpuAndNeuralEngine",
        "blue",
        v === 0,
      );
      s += line(160, 145, 120, 265);
      s += line(190, 145, 310, 265);
      s += box(45, 280, 145, 70, "CPU", "", "gray");
      s += box(240, 280, 145, 70, "ANE", "", "green");
      s += box(
        465,
        70,
        240,
        70,
        L("私有直接调用", "Private direct call"),
        "AppleNeuralEngine",
        "purple",
        v === 1,
      );
      s += line(585, 145, 585, 265);
      s += box(
        485,
        280,
        200,
        70,
        "ANE",
        L("失败则报错", "error on failure"),
        "green",
      );
      formula = L(
        "允许 CPU + ANE ≠ 强制 ANE；当前使用右侧路径",
        "CPU + ANE allowed ≠ ANE-only; the current path is on the right",
      );
    } else if (step === 1) {
      const titles = ["ane_ops.rs", "ane_runtime.rs", "ane_runtime.m", "ANE"],
        subs = [
          "MIL graph",
          "persistent worker",
          "IOSurface + request",
          "evaluateWithModel",
        ];
      for (let i = 0; i < 4; i++) {
        s += box(
          45 + i * 180,
          170,
          155,
          90,
          titles[i],
          subs[i],
          i === v ? "green" : i === 2 ? "orange" : "blue",
          i === v,
        );
        if (i < 3) s += line(203 + i * 180, 215, 220 + i * 180, 215);
      }
      s += tx(
        380,
        340,
        L(
          "编译程序可以缓存；每次请求绑定当前输入与输出",
          "Compiled programs are cached; each request binds current input and output",
        ),
        14,
      );
      formula = `${L("当前阶段", "Current phase")}: ${titles[v]} · ${subs[v]}`;
    } else if (step === 2) {
      const padded = Math.ceil(v / 32) * 32;
      for (let i = 0; i < padded; i++) {
        const x = 55 + (i % 32) * 20,
          y = 135 + Math.floor(i / 32) * 65;
        s += `<rect x="${x}" y="${y}" width="17" height="40" rx="3" fill="${i < v ? C.blue : C.gray}" stroke="#a0aa94"/>`;
      }
      s += tx(
        380,
        85,
        L(
          "每个小格是 1 个 fp16：2 字节",
          "Each cell is one fp16 value: 2 bytes",
        ),
        17,
      );
      s += tx(
        380,
        315,
        L(
          `有效 ${v} 个 · 填充 ${padded - v} 个`,
          `Valid ${v} · Padding ${padded - v}`,
        ),
        20,
      );
      s += tx(
        380,
        375,
        L(
          "这个运行时按 64 字节对齐每一行，不改变逻辑矩阵",
          "This runtime aligns each row to 64 bytes without changing the logical matrix",
        ),
        13,
      );
      formula = `row bytes = ${v} × 2 = ${v * 2} · aligned bytes = ${padded * 2}`;
    } else {
      s += box(
        40,
        70,
        680,
        70,
        "CPU / host",
        L(
          "分词 · 文件与权重准备 · 索引 · 选 ID · 生成循环",
          "tokenize · prepare weights · index · select IDs · generation loop",
        ),
        "blue",
        v === 0,
      );
      s += line(380, 145, 380, 210);
      s += box(
        65,
        225,
        630,
        115,
        "ANE",
        L(
          "投影 · norm · conv · RoPE · attention · FFN · 残差 · lm_head",
          "projection · norm · conv · RoPE · attention · FFN · residual · lm_head",
        ),
        "green",
        v === 1,
      );
      s += tx(
        380,
        409,
        L(
          "所有模型张量算术走 ANE；主机仍负责控制与数据准备",
          "Model tensor arithmetic runs on ANE; the host handles control and preparation",
        ),
        14,
      );
      formula = L(
        "40 层完整前向 · ANE 错误直接返回，不隐藏回退 CPU",
        "Full 40-layer forward · ANE errors propagate; no hidden CPU fallback",
      );
    }
  }
  if (id === "precision") {
    if (step === 0) {
      const a = silu(v),
        b = (v / 2) * (1 + Math.tanh(v / 2));
      s += box(65, 110, 285, 100, "g × sigmoid(g)", `= ${f(a)}`, "blue");
      s += box(
        410,
        110,
        285,
        100,
        "(g/2) × (1+tanh(g/2))",
        `= ${f(b)}`,
        "purple",
      );
      s += tx(380, 285, "=", 38);
      s += tx(
        380,
        350,
        L(
          "数学恒等；有限精度的执行步骤和舍入不同",
          "Mathematically equal; finite-precision execution and rounding can differ",
        ),
        14,
      );
      formula = `g=${v} · ${L("浏览器以 JS number 演示数学关系，并非 ANE 误差模拟", "JS numbers illustrate the identity, not ANE rounding")}`;
    } else if (step === 1) {
      const x = 10 ** v,
        scale = Math.max(x, 0.001),
        small = x / scale,
        ratio = 0.001 / scale;
      s += box(55, 150, 170, 90, `x = 10^${v}`, `s = ${scale}`, "blue");
      s += line(230, 195, 295, 195);
      s += box(
        305,
        150,
        180,
        90,
        "ANE request 1",
        `small=${f(small)}`,
        "purple",
      );
      s += line(490, 195, 550, 195);
      s += box(560, 150, 165, 90, "ANE request 2", "norm × gamma", "green");
      s += tx(400, 285, `ratio = sqrt(ε)/s = ${f(ratio)}`, 18);
      s += tx(
        380,
        355,
        L(
          "中间量实际写出，再送入第二次请求；两次都由 ANE 计算",
          "Materialize intermediates, then submit request 2; both execute on ANE",
        ),
        14,
      );
      formula = "small / sqrt(mean(small²) + ratio²) · ε = 10⁻⁶";
    } else {
      s += box(
        65,
        95,
        270,
        90,
        "CPU · f32",
        v === 1 ? '"\\n"' : '"\\n2"',
        "blue",
      );
      s += box(
        425,
        95,
        270,
        90,
        "ANE · fp16",
        v === 1 ? '"\\n"' : '"\\n在"',
        "green",
      );
      s += box(
        135,
        255,
        490,
        100,
        L("首轮完整词表 logits", "First forward, full-vocabulary logits"),
        "relative L2 = 2.85% · Top 8 IDs match",
        "orange",
      );
      s += tx(
        380,
        409,
        L(
          "一次输入的实测；不是精度上界，也不是速度结论",
          "One measured input; neither an error bound nor a speed claim",
        ),
        14,
      );
      formula = L(
        `第 ${v} 步：${v === 1 ? "最高分 ID 都是 198" : "第二步选出的 ID 已经不同"}`,
        `Step ${v}: ${v === 1 ? "both select ID 198" : "the next selected IDs differ"}`,
      );
    }
  }
  return {
    svg: `<svg viewBox="0 0 760 460" role="img" aria-labelledby="diagram-title"><title id="diagram-title">${escape(formula)}</title><defs><marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8" fill="none" stroke="#7c8573"/></marker></defs>${s}</svg>`,
    formula,
    note,
  };
}
