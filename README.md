# Inside an LLM

English | [简体中文](README.zh-CN.md)

**[Open the interactive tutorial](https://hacking.pub/games/inside-llm/)**

Follow a token through matrices, attention, expert routing, text generation, and finally GPU and Apple Neural Engine execution.

Twelve chapters and forty steps, with live numerical examples, teaching code, search, a formula reference, quick checks, and saved progress. Moving a slider recalculates the example. The site opens in English; readers can switch to Chinese, and their choice is remembered.

## Run locally

Requires Node.js 20+. The site has no runtime dependencies.

```sh
npm run dev
# http://127.0.0.1:5174
npm test
npm run check
npm run build
# Publish the contents of dist/ to a static directory.
```

For browser checks, run `npm ci`, keep the development server running, and run `npm run test:browser`. On macOS the test uses installed Chrome; on other systems, first run `npx playwright install chromium`. Set `SITE_URL` to test a deployed site.

All assets use relative paths and lessons use hash routes, so subdirectories such as `/games/inside-llm/` work without SPA rewrite rules. No external fonts, CDN dependencies, model API calls, or analytics are used. Preferences and progress stay in localStorage.

## What the examples represent

- Small matrices are teaching examples computed in JavaScript. The browser does not run the full model or access your ANE.
- Model dimensions refer to `qwen3.6-35b-a3b-oq4e-mtp`, not every LLM.
- Diagrams consistently use `input [T,H] × W [H,O]`. The stored `[O,H]` weight layout is explained separately.
- Code panels are simplified equivalents of the Rust implementation, not drop-in source files.
- The full ANE implementation submits model tensor arithmetic through the private AppleNeuralEngine framework. The CPU still handles tokenization, weight preparation, indexing, selection, and control flow. Generation does not yet use KV or recurrent-state caching.
- One M5 Pro measurement found a 2.85% relative L2 difference between ANE and CPU logits. The first top eight IDs matched, but two-token generation diverged. This is a measured example, not an accuracy bound or performance guarantee. See the [validation record](docs/VALIDATION.md).

## Source map

| File                            | Purpose                                    |
| ------------------------------- | ------------------------------------------ |
| `src/content.js`                | Bilingual lesson content                   |
| `src/scenes.js`                 | SVG diagrams and interactive controls      |
| `src/math.js`                   | Numerical teaching examples                |
| `src/code.js`                   | Teaching code and quick checks             |
| `src/app.js`                    | Navigation, search, language, and progress |
| `scripts/curriculum-facts.json` | Original editorial fact sheet              |
| `tests/`                        | Math, curriculum, and control checks       |

## References and editorial process

The curriculum follows actual learner questions from building a Rust inference implementation. Gemini CLI assisted in rewriting a factual outline into bilingual prose. The final text was reviewed for mathematical conventions, implementation boundaries, and measurement limitations.

- [Pi Visualizer](https://pi-visualizer-lemon.vercel.app/#/learn/why-pi/1): inspired the curriculum, visualization, and explanation layout. This is an independent implementation with original content and diagrams; no source or assets were copied.
- [Kapitsa](https://github.com/nace-ai/kapitsa): private ANE execution and device-oriented inference.
- [MLX](https://mlx-framework.org/): CPU and GPU array execution.
- [Core ML compute units](https://developer.apple.com/documentation/coreml/mlcomputeunits): allowed device combinations.
- [Metal threadgroups](https://developer.apple.com/documentation/metal/creating-threads-and-threadgroups): grid, threadgroup, and SIMD groups.
- [Apple MIL reference](https://apple.github.io/coremltools/source/coremltools.converters.mil.mil.ops.defs.html): operation definitions.
- [Attention Is All You Need](https://arxiv.org/abs/1706.03762): original Transformer attention.
- [RoFormer](https://arxiv.org/abs/2104.09864): rotary position embeddings.

## License

MIT — © 2026 chainhelen. Referenced projects retain their own licenses. This repository contains no model weights or copied third-party implementation files.
