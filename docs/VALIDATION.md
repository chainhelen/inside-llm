# Validation record

Release: 2026-11-23.

## Browser and content

- 12 chapters, 40 steps, Chinese and English content.
- Every visible slider changes its diagram or formula at its bounds.
- Every step has an explanation, takeaway, and matching teaching code.
- Live examples test row-vector multiplication, quantization error bounds, RMS normalization, stable softmax, rotary norm preservation, causal masking, independent recurrent states, router selection, expert mixing, and threadgroup tails.
- Desktop and 390px mobile layouts checked in Chromium, including search, reference dialog, slider/reset/play, code panels, quick-check feedback, saved progress, and mobile navigation.
- No external fonts or runtime packages; static assets and hash routes work below a URL prefix.

## Source-model measurements

The final lesson records one M5 Pro run of `qwen3.6-35b-a3b-oq4e-mtp`, prompted with `你好，世界！`:

| Measurement                                             | Result        |
| ------------------------------------------------------- | ------------- |
| Full 40-layer logits relative L2 difference, ANE vs CPU | 0.028470      |
| Maximum absolute logit difference                       | 0.553084      |
| First-forward Top 8 IDs and order                       | Identical     |
| Two generated token IDs, CPU                            | `[198,17]`    |
| Two generated token IDs, ANE                            | `[198,95772]` |
| ANE requests for the two generation steps               | 36280         |

This is a factual snapshot of the teaching implementation, not a browser benchmark, universal error bound, quality evaluation, or speed guarantee. The visual examples use JavaScript numbers and do not simulate ANE's internal precision or compiler.
