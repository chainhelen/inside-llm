import test from "node:test";
import assert from "node:assert/strict";
import {
  matmul,
  rmsnorm,
  softmax,
  sigmoid,
  silu,
  quantize,
  ropePair,
  deltaStep,
  attentionRow,
  topRoutes,
  mixExperts,
  shaderGroups,
} from "../src/math.js";
const near = (a, b, eps = 1e-10) =>
  assert.ok(Math.abs(a - b) < eps, `${a} ≉ ${b}`);
test("logical row-vector matrix dimensions and values", () => {
  assert.deepEqual(
    matmul(
      [[1, 2]],
      [
        [1, -1, 2],
        [3, 0, 1],
      ],
    ),
    [[7, -1, 4]],
  );
  assert.throws(() => matmul([[1, 2]], [[1, 2]]));
});
test("norm, sigmoid and softmax have different invariants", () => {
  const x = [-1, 0, 1, 2],
    n = rmsnorm(x, [1, 2, 1, 0.5]);
  assert.ok(n.output[0] < 0);
  near(n.output[3], 1 / n.r);
  near(
    softmax(x).reduce((a, b) => a + b, 0),
    1,
  );
  near(sigmoid(0), 0.5);
  assert.ok(silu(-1) < 0);
  assert.ok(softmax([1000, 1001]).every(Number.isFinite));
});
test("affine code is bounded and its error stays within half a quantization interval", () => {
  for (let bits = 2; bits <= 8; bits++) {
    const q = quantize(0.37, bits);
    assert.ok(q.code >= 0 && q.code < 2 ** bits);
    assert.ok(Math.abs(q.decoded - 0.37) <= q.scale / 2);
  }
});
test("RoPE pair preserves norm", () => {
  const [x, y] = ropePair(2, 3, 19);
  near(x * x + y * y, 13);
});
test("causal attention masks all future values", () => {
  const r = attentionRow(
    [0, 0, 100],
    [
      [1, 2],
      [3, 4],
      [999, 999],
    ],
    1,
  );
  assert.deepEqual(r.probs, [0.5, 0.5, 0]);
  assert.deepEqual(r.output, [2, 3]);
});
test("delta state persists across tokens and does not mutate a different head", () => {
  const S = [
      [0, 0],
      [0, 0],
    ],
    a = deltaStep(S, [1, 0], [2, 3], [1, 0], 1, 1);
  assert.deepEqual(a.next, [
    [2, 3],
    [0, 0],
  ]);
  assert.deepEqual(a.readout, [2, 3]);
  assert.deepEqual(S, [
    [0, 0],
    [0, 0],
  ]);
  const b = deltaStep(a.next, [0, 1], [4, 5], [1, 0], 0.5, 1);
  assert.deepEqual(b.next, [
    [1, 1.5],
    [4, 5],
  ]);
});
test("router weights are scalars that mix matching output positions", () => {
  const r = topRoutes([0, 1, 3, 2], 2);
  assert.deepEqual(
    r.map((x) => x.id),
    [2, 3],
  );
  near(
    r.reduce((s, x) => s + x.weight, 0),
    1,
  );
  assert.deepEqual(
    mixExperts(
      [
        [1, 2],
        [3, 4],
      ],
      [0.25, 0.75],
    ),
    [2.5, 3.5],
  );
});
test("threadgroups cover every logical thread once, including a tail", () => {
  const g = shaderGroups(19, 8, 4);
  assert.deepEqual(
    g.map((x) => x.length),
    [8, 8, 3],
  );
  assert.deepEqual(
    g.flat().map((x) => x.id),
    Array.from({ length: 19 }, (_, i) => i),
  );
});
