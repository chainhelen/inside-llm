import { matmul } from "./math.js";
export function cacheWork(prompt, decodeCalls) {
  return {
    uncached:
      (decodeCalls + 1) * prompt + (decodeCalls * (decodeCalls + 1)) / 2,
    cached: prompt + decodeCalls,
  };
}
export function pdSchedule(prefill, decode, pipeline = true) {
  const a = { prefill: [0, prefill], decode: [prefill, prefill + decode] };
  const bStart = pipeline ? prefill : prefill + decode;
  const bDecode = Math.max(bStart + prefill, a.decode[1]);
  const b = {
    prefill: [bStart, bStart + prefill],
    decode: [bDecode, bDecode + decode],
  };
  return { a, b, total: b.decode[1] };
}
export function splitDown(hidden, weights, cut) {
  if (cut < 1 || cut >= hidden.length)
    throw new Error("Split must leave two nonempty partitions");
  const left = matmul([hidden.slice(0, cut)], weights.slice(0, cut))[0];
  const right = matmul([hidden.slice(cut)], weights.slice(cut))[0];
  return { left, right, output: left.map((x, i) => x + right[i]) };
}
export const packedWeightBytes = (inputs, outputs, bits) =>
  (inputs * outputs * bits) / 8;
export const vocabularySplit = (ane) => ({
  ane,
  gpu: 248320 - ane,
  lastAne: ane - 1,
  firstGpu: ane,
});
// Exact for these near-17 positive examples; illustrative fp16 grid spacing.
export const near17Fp16 = (x) => Math.round(x / (1 / 64)) * (1 / 64);
