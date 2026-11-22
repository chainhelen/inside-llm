# 模型拆解室 · Inside an LLM

从一个 token 开始，用可操作的图看懂矩阵、多头、Attention、MoE、文本生成，再走到 GPU 与 Apple Neural Engine。

**[打开教程 / Open the tutorial](https://hacking.pub/games/inside-llm/)**

12 章、40 步，中英文可切换。拖动滑杆会重新计算教学示例，而不是只换一张图片。包含代码对照、搜索、公式速查、随堂检查、学习进度和手机布局。

An interactive, bilingual guide from tensor shapes to a complete ANE inference path. Twelve chapters and forty steps, with live numerical examples, teaching code, search, a reference sheet, quick checks, and local progress.

## 本地运行 / Run locally

需要 Node.js 20+，没有运行时依赖，也无需安装前端框架。

```sh
npm run dev
# http://127.0.0.1:5174
npm test
npm run check
npm run build
# Publish the contents of dist/ to any static directory.
```

可选浏览器检查：先 `npm ci`，保持 `npm run dev` 运行，再执行 `npm run test:browser`。macOS 默认使用已安装的 Chrome；其他系统可先运行 `npx playwright install chromium`。可用 `SITE_URL` 指定已部署站点。

所有资源使用相对地址，课程路由放在 URL hash 中，所以可以部署在 `/games/inside-llm/` 等子目录。构建产物不需要服务端进程，不使用外部字体、CDN、模型 API 或分析脚本。界面偏好仅存于 localStorage。

All assets use relative paths and lessons use hash routes, so a subdirectory deployment works without SPA rewrite rules. The build is static and makes no model/API calls. No external fonts, CDN dependencies, or analytics are used.

## 内容边界 / Scope

- **图中的小矩阵是教学例子。** 大模型尺寸对应 `qwen3.6-35b-a3b-oq4e-mtp`，不能套用到所有 LLM。
- 图中一律采用 `input [T,H] × W [H,O]`。存储权重的 `[O,H]` 布局另行说明。
- 浏览器运行小型 JavaScript 计算，不运行完整模型或使用访问者的 ANE。
- 代码页是对应 Rust 实现的精简教学伪代码，并非可直接替换的源文件。
- 当前完整 ANE 路径的张量算术经私有 AppleNeuralEngine 框架执行；CPU 仍负责分词、权重准备、索引与选择等主机工作。生成循环未启用 KV / recurrent-state 缓存。
- 实机记录：M5 Pro，输入“你好，世界！”。全词表 logits 与 CPU 的相对 L2 差约 2.85%；第一步 Top 8 相同，但两步输出不同。此记录不等于精度上界或性能保证。

Small JavaScript examples illustrate the operations; the site does not execute the full checkpoint. Shapes belong to the checkpoint named above. Code panels are teaching equivalents, not drop-in Rust source. Hardware results are one measured case, not an accuracy bound or performance guarantee.

## 目录 / Source map

| 文件                            | 用途 / Purpose                                                  |
| ------------------------------- | --------------------------------------------------------------- |
| `src/content.js`                | 40 步双语内容 / Bilingual lesson content                        |
| `src/scenes.js`                 | SVG 交互图与控件 / Interactive diagrams and controls            |
| `src/math.js`                   | 小矩阵、门控、路由与状态计算 / Numerical teaching examples      |
| `src/code.js`                   | 代码对照与检查题 / Teaching code and quick checks               |
| `src/app.js`                    | 导航、搜索、语言和进度 / Navigation, search, language, progress |
| `scripts/curriculum-facts.json` | 文案事实稿 / Editorial fact sheet                               |
| `tests/`                        | 数学边界、课程完整性、控件检查 / Math and curriculum checks     |

## 参考与制作 / References and editorial process

阅读顺序来自学习者在 Rust LLM 推理实践中提出的问题。先编写事实稿，按要求使用 `gemini --approval-mode=yolo` 协助改写中英正文，再逐步核对形状、代码对应与实测限制。最终文本包含人工技术修订；不是未经审核的模型输出。

The curriculum follows actual learner questions from building a Rust inference implementation. Gemini CLI assisted in rewriting a factual outline into bilingual prose. The final text was reviewed and corrected for mathematical conventions, implementation boundaries, and measurement limitations.

- [Pi Visualizer](https://pi-visualizer-lemon.vercel.app/#/learn/why-pi/1): inspired the curriculum / visualization / explanation layout. Original content and diagrams, independently implemented; no source or assets copied.
- [Kapitsa](https://github.com/nace-ai/kapitsa): a reference for private ANE execution and device-oriented inference.
- [MLX supported devices](https://mlx-framework.org/): CPU and GPU array execution.
- [Core ML compute units](https://developer.apple.com/documentation/coreml/mlcomputeunits): allowed device combinations.
- [Metal threadgroups](https://developer.apple.com/documentation/metal/creating-threads-and-threadgroups): grid, threadgroup, and SIMD groups.
- [Apple MIL operation reference](https://apple.github.io/coremltools/source/coremltools.converters.mil.mil.ops.defs.html): operation definitions.
- [Attention Is All You Need](https://arxiv.org/abs/1706.03762): original Transformer attention.
- [RoFormer](https://arxiv.org/abs/2104.09864): rotary position embeddings.

## License

MIT — © 2026 chainhelen. Referenced projects retain their own licenses. This repository contains no model weights or copied third-party implementation files.
