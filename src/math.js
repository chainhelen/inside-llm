export const sigmoid = (x) =>
  x >= 0 ? 1 / (1 + Math.exp(-x)) : Math.exp(x) / (1 + Math.exp(x));
export const silu = (x) => x * sigmoid(x);
export function softmax(xs) {
  const max = Math.max(...xs),
    e = xs.map((x) => Math.exp(x - max)),
    sum = e.reduce((a, b) => a + b, 0);
  return e.map((x) => x / sum);
}
export function rmsnorm(xs, gamma = xs.map(() => 1), epsilon = 1e-6) {
  const r = Math.sqrt(xs.reduce((a, x) => a + x * x, 0) / xs.length + epsilon);
  return { r, output: xs.map((x, i) => (x / r) * gamma[i]) };
}
export function matmul(a, b) {
  if (
    !a.length ||
    !b.length ||
    a.some((r) => r.length !== b.length) ||
    b.some((r) => r.length !== b[0].length)
  )
    throw new Error("Matrix dimensions do not match");
  return a.map((row) =>
    b[0].map((_, j) => row.reduce((s, x, k) => s + x * b[k][j], 0)),
  );
}
export function quantize(x, bits, min = -1, max = 1) {
  const levels = 2 ** bits - 1,
    scale = (max - min) / levels,
    code = Math.max(0, Math.min(levels, Math.round((x - min) / scale)));
  return { code, scale, bias: min, decoded: code * scale + min };
}
export const ropePair = (x, y, angle) => [
  x * Math.cos(angle) - y * Math.sin(angle),
  x * Math.sin(angle) + y * Math.cos(angle),
];
// Teaching orientation: S[key position][value position]. Each head owns S.
export function deltaStep(S, k, v, q, alpha, beta) {
  const decayed = S.map((row) => row.map((x) => x * alpha));
  const prediction = matmul([k], decayed)[0];
  const delta = v.map((x, i) => beta * (x - prediction[i]));
  const next = decayed.map((row, i) => row.map((x, j) => x + k[i] * delta[j]));
  return { decayed, prediction, delta, next, readout: matmul([q], next)[0] };
}
export function attentionRow(scores, values, pos) {
  const probs = softmax(scores.slice(0, pos + 1));
  return {
    probs: [...probs, ...Array(scores.length - pos - 1).fill(0)],
    output: matmul([probs], values.slice(0, pos + 1))[0],
  };
}
export function topRoutes(logits, k) {
  const probabilities = softmax(logits);
  const ids = logits
    .map((_, i) => i)
    .sort((a, b) => logits[b] - logits[a] || a - b)
    .slice(0, k);
  const sum = ids.reduce((s, i) => s + probabilities[i], 0);
  return ids.map((id) => ({ id, weight: probabilities[id] / sum }));
}
export function expert(input, gate, up, down) {
  const g = matmul([input], gate)[0],
    u = matmul([input], up)[0],
    hidden = g.map((v, i) => silu(v) * u[i]);
  return { gate: g, up: u, hidden, output: matmul([hidden], down)[0] };
}
export function mixExperts(outputs, weights) {
  return outputs[0].map((_, i) =>
    outputs.reduce((s, o, j) => s + o[i] * weights[j], 0),
  );
}
export const kvHead = (qHead) => Math.floor(qHead / 8);
export function shaderGroups(total, groupSize, simdWidth) {
  return Array.from({ length: Math.ceil(total / groupSize) }, (_, g) =>
    Array.from(
      { length: Math.min(groupSize, total - g * groupSize) },
      (_, i) => ({ id: g * groupSize + i, simd: Math.floor(i / simdWidth) }),
    ),
  );
}
