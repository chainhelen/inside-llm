import test from "node:test";
import assert from "node:assert/strict";
import {
  cacheWork,
  pdSchedule,
  splitDown,
  packedWeightBytes,
  vocabularySplit,
  near17Fp16,
} from "../src/advanced-math.js";
import { matmul } from "../src/math.js";
test("cached work counts new rows, not free access to history", () => {
  assert.deepEqual(cacheWork(4, 3), { uncached: 22, cached: 7 });
  assert.deepEqual(cacheWork(4, 0), { uncached: 4, cached: 4 });
});
test("PD overlaps requests but never violates same-request dependencies", () => {
  for (let p = 1; p <= 5; p++) {
    const a = pdSchedule(p, 3, true),
      b = pdSchedule(p, 3, false);
    for (const r of [a.a, a.b]) assert.ok(r.decode[0] >= r.prefill[1]);
    assert.ok(a.b.prefill[0] >= a.a.prefill[1]);
    assert.ok(a.b.decode[0] >= a.a.decode[1]);
    assert.ok(a.total <= b.total);
    assert.equal(b.total, 2 * (p + 3));
  }
});
test("channel splits sum to unsplit down for every boundary", () => {
  const h = [1, 2, 3, 4],
    w = [
      [1, 0],
      [0, 1],
      [1, 1],
      [-1, 2],
    ],
    expected = matmul([h], w)[0];
  for (let cut = 1; cut < 4; cut++)
    assert.deepEqual(splitDown(h, w, cut).output, expected);
});
test("packed payload and vocabulary slices use the right units and endpoints", () => {
  assert.equal(packedWeightBytes(2048, 8192, 6), 12 * 2 ** 20);
  for (const n of [8192, 32768]) {
    const s = vocabularySplit(n);
    assert.equal(s.ane + s.gpu, 248320);
    assert.equal(s.lastAne + 1, s.firstGpu);
  }
});
test("near-tie fp16 example collapses distinct GPU scores", () => {
  assert.equal(near17Fp16(16.952305), 16.953125);
  assert.equal(near17Fp16(16.952019), 16.953125);
});
