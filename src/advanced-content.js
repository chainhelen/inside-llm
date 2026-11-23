// Bilingual draft assisted by Gemini CLI; facts reviewed against the comparison tutorial.
export const advancedLessons = [
  {
    id: "cache",
    title: {
      zh: "缓存到底省了什么？",
      en: "What does a cache actually save?",
    },
    steps: [
      {
        title: {
          zh: "旧 token 不必重算",
          en: "Stop recomputing old tokens",
        },
        text: {
          zh: "前文展示的是无缓存基线，新的对比实现则为每个请求维护缓存。预填充先处理 T 个提示词 token 并给出首个输出，随后每次解码借助已有状态只算一个新 token。缓存省去了历史投影和状态的重复计算，但全注意力仍需读取历史 K/V。在 T=4、解码 N 次的示意中，无缓存累计处理 4 到 4+N 行，有缓存仅 4+N 行；这只说明计算量变化，不是速度预测。",
          en: "Earlier chapters walked through an uncached baseline, whereas the new comparison implementation keeps a per-request cache. Prefill processes all T prompt tokens and produces the first generated token; each following decode step runs one new token against the saved state. Caching avoids recomputing historical projections and states, though full attention still reads past K and V entries. In the toy example with T=4 and N decode calls, uncached runs sum 4 through 4+N token rows while cached runs process 4+N—an illustrative count, not a speed prediction.",
        },
        takeaway: {
          zh: "缓存避免重算历史投影和状态，但全注意力仍要读取历史 K/V。",
          en: "Caching skips recomputing past projections and states, while full attention still reads stored K/V.",
        },
      },
      {
        title: {
          zh: "交接的不是只有 K/V",
          en: "Hand over more than K/V",
        },
        text: {
          zh: "模型包含 10 层全注意力和 30 层线性注意力，因此请求状态远不止 K/V。全注意力层按层和头保存 K/V，其体积会随序列变长而增长；线性注意力层则保存每个头的递推状态 S、卷积历史以及当前 token 位置。其中 32 个 V 头各有一个 S，每个 S 的形状固定为 [128, 128]，核宽为 4 的卷积则需保留前 3 个 token 向量。每个独立请求都维护彼此隔离的逻辑状态。",
          en: "Because the model mixes 10 full-attention layers with 30 linear-attention layers, handing off a request means transferring more than K/V. Full-attention layers store per-layer, per-head K/V tensors that grow with sequence length. Linear-attention layers instead keep each head's recurrent state S, convolution history, and token position: each of the 32 V heads has its own S of fixed shape [128, 128], while a kernel-4 convolution retains the 3 preceding token vectors. Each independent request keeps its own separate logical state.",
        },
        takeaway: {
          zh: "交接状态包含随长度增长的 K/V，以及固定形状的 S、卷积历史和位置。",
          en: "Request state spans growing K/V caches alongside fixed-shape S matrices, convolution history, and token position.",
        },
      },
      {
        title: {
          zh: "两个请求才能排成流水线",
          en: "Pipeline across requests",
        },
        text: {
          zh: "在预填充与解码分离下，ANE 先为请求 A 做预填充，再由 GPU 解码 A。单个请求内，预填充必须先于解码完成；但引入请求 B 后，ANE 预填充 B 就能与 GPU 解码 A 重叠执行。在可调预填充 P、固定解码 D=3 的示意时间线中，两请求串行耗时 2(P+D)，流水线完成时刻为 max(2P, P+D)+D。这些时长仅作排程示意，不是硬件实测基准。",
          en: "In a prefill-decode split, the ANE runs prefill for request A and then hands off to the GPU to decode A. Within a single request, prefill must finish before decode begins, so parallelism appears once request B arrives and ANE prefill for B overlaps GPU decode for A. On an illustrative timeline with adjustable prefill P and fixed decode D=3, two serial requests take 2(P+D), whereas pipelined execution finishes at max(2P, P+D)+D. These figures illustrate scheduling, not a hardware benchmark.",
        },
        takeaway: {
          zh: "单个请求必须先预填充再解码，只有跨请求才能让 ANE 和 GPU 重叠工作。",
          en: "Prefill must precede decode within one request, so ANE and GPU overlap only across multiple requests.",
        },
      },
      {
        title: {
          zh: "换设备不会恢复精度",
          en: "Changing devices does not recover precision",
        },
        text: {
          zh: "M5 Pro 历史双请求探测以固定续写 ID 198 测试 ANE 预填充接 GPU 解码，并非自由生成。PD 串行与流水线全部 993280 个 logits 逐位相等，但对比 CPU，预填充与解码后 L2 误差为 2.84701% 与 1.12203%，前两 ID 由 198、17 变为 198、95772。fp16 转 f32 只保留已舍入值，不能恢复精度；此旧探测独立于较新 GPU 常驻模式。",
          en: "In the historical M5 Pro two-request probe, ANE prefill handed cache state to GPU decode using a fixed continuation ID 198 rather than free generation. Serial and pipelined PD runs produced bitwise-identical values across all 993280 logits, yet relative to CPU the L2 difference was 2.84701% after ANE prefill and 1.12203% after decode, shifting top IDs from 198, 17 to 198, 95772. Casting fp16 to f32 preserves already-rounded values rather than lost precision; this older probe is separate from the newer resident GPU mode.",
        },
        takeaway: {
          zh: "将 fp16 状态交给 f32 设备只能延续已有舍入结果，无法恢复已损失的精度。",
          en: "Handing fp16 state to an f32 device keeps the rounded values and cannot restore lost precision.",
        },
      },
    ],
  },
  {
    id: "parallel",
    title: {
      zh: "并行之前，先分清分工",
      en: "What exactly runs in parallel?",
    },
    steps: [
      {
        title: {
          zh: "拆的是专家中间通道",
          en: "Split intermediate channels",
        },
        text: {
          zh: "拆单个 FFN 中间通道时，输入为 [1,2048]，gate/up 逻辑权重 W[2048,512] 按输出列拆为 256+256，down 权重 W[512,2048] 按对应输入行拆分。两分支各得 [1,2048] 部分和，最终逐元素相加，既非拼接也非求平均。拆法数学等价，有限精度下结果可能略有差异；示意里用 hidden[1,4] 和 down[4,2] 按滑块边界切分。",
          en: "To split one FFN along its intermediate channels, the [1, 2048] input meets logical gate and up weights W[2048, 512] sliced by output columns into 256+256, paired with matching input-row slices of down weight W[512, 2048]. Each branch produces a partial [1, 2048] vector that must be summed elementwise, not concatenated or averaged. The split is mathematically equivalent, though finite-precision arithmetic may differ slightly. In the toy illustration, a [1, 4] hidden vector and [4, 2] down matrix split at the slider boundary.",
        },
        takeaway: {
          zh: "按中间通道切分 FFN 后，两路 [1,2048] 部分输出需逐元素相加而非拼接或求平均。",
          en: "Splitting an FFN across intermediate channels requires summing the two partial [1, 2048] outputs elementwise.",
        },
      },
      {
        title: {
          zh: "路由专家与共享专家并行",
          en: "Run routed and shared branches together",
        },
        text: {
          zh: "另一种更晚出现的模式不再拆分单个专家的通道，而是按分支分工：GPU 负责被选中的 top-8 路由专家 FFN 及其加权混合，ANE 则独立跑完含标量门控在内的整个共享专家。两条分支读取同一份 moe_input，等两者都完成后再汇合，随后加回原始残差 h。忽略调度与同步开销时，串行耗时为 P+Q，并行则取决于较慢的一支，即 max(P, Q)。",
          en: "A different later mode takes another route from per-expert channel splitting by dividing work across branches. The GPU computes the weighted mix of the top-8 routed expert FFNs, while the ANE runs the entire shared expert including its scalar gate. Both branches read the same moe_input, wait to merge until both finish, and then add back the original residual h. Ignoring synchronization and launch overheads, serial execution takes P+Q whereas parallel execution takes max(P, Q).",
        },
        takeaway: {
          zh: "路由分支与共享分支并行读取同一输入，待两边完成后汇合并加回残差 h。",
          en: "Routed and shared branches read the same moe_input in parallel, merging only after both finish before adding residual h.",
        },
      },
      {
        title: {
          zh: "8 个专家共用一段调度",
          en: "Batch the eight selected experts",
        },
        text: {
          zh: "单 token 的 8 专家排成 gate/up/hidden 各 [8,512]、down [8,2048] 后加权归约为 [1,2048]；第 3 行即路由槽 2（偏移 1024..1535），槽位不同于专家 ID。hidden 在 GPU 直送 down，无 CPU 回读。早期批处理仍拷贝选中权重，常驻版才去重拷贝；移除 40×8×3=960 次独立 matvec 后，独立打包调用 1393→433 加 40 批调用，不等于总 GPU 派发数。",
          en: "For one token's eight selected experts, gate, up, and hidden each take shape [8, 512], down outputs [8, 2048], and a weighted reduction yields [1, 2048]. Row 3 in ordinary 1-based numbering is route slot 2 at offsets 1024..1535, and a route slot is distinct from an expert ID. The hidden GPU buffer feeds down directly without CPU readback; the earlier packed batch still copied selected weights before the later resident path removed repeated copies. Batching eliminates 40×8×3=960 independent matvec calls, dropping independent packed matvec calls from 1393 to 433 plus 40 batched calls, which is not total GPU dispatches.",
        },
        takeaway: {
          zh: "批处理将 8 个路由专家合并调度并免去 CPU 回读，但该统计仅指打包 matvec 而非总 GPU 派发数。",
          en: "Batching groups all eight routed experts without CPU readback, reducing independent packed matvec calls rather than counting total GPU dispatches.",
        },
      },
      {
        title: {
          zh: "瓶颈会换到另一条分支",
          en: "The bottleneck can move",
        },
        text: {
          zh: "批处理课程的 M3 单次 Hi 缓存解码记录中，40 层 GPU 路由分支从 558ms 降到 225ms，而批处理后 ANE 共享分支为 356ms，瓶颈随之移向共享分支。在同一部分插桩三轮中位数口径下，新版纯 GPU 解码为 916ms，GPU+ANE 为 1022ms，可见设备越多未必越快。因计时边界重叠，前后分项需分别查看，不可相加等同整段解码耗时。",
          en: "In the batching lesson's M3 single-Hi cached decode record, total GPU routed time across 40 layers fell from 558ms to 225ms, leaving the 356ms ANE shared branch as the new critical path. Under the same partially instrumented 3-round median protocol, the newer pure-GPU decode measured 916ms compared with 1022ms for GPU+ANE, showing that adding another device is not automatically faster. Because timing boundaries overlap, before-and-after component measurements should be read separately rather than summed into whole-decode latency.",
        },
        takeaway: {
          zh: "优化一条分支后瓶颈可能转移到另一条，多设备协作并不自动快于纯 GPU。",
          en: "Speeding up one branch can shift the bottleneck to another, so using more devices is not automatically faster.",
        },
      },
    ],
  },
  {
    id: "resident",
    title: {
      zh: "让数据留在 GPU 上",
      en: "Keep data on the GPU",
    },
    steps: [
      {
        title: {
          zh: "先省掉反复展开的权重",
          en: "Avoid repeatedly expanding weights",
        },
        text: {
          zh: "第 0 层真实 QKV 逻辑权重为 [2048,8192]，不含量化参数时 6-bit 编码占 12 MiB，f32 权重占 64 MiB。打包 Metal 内核在点积时直接读取压缩码与 scale/bias，减少了展开与搬运；保留缓冲区也减少了拷贝。不过权重体积并非实测流量，真实 DRAM 流量需用硬件计数器观测。",
          en: "For the real layer-0 QKV logical weight [2048, 8192], 6-bit codes occupy 12 MiB versus 64 MiB for f32 weights, excluding quantization parameters. The packed Metal kernel reads those compressed codes alongside scale and bias directly during the dot product. That avoids repeated weight expansion and transfer, and retaining buffers further trims copies. Still, weight footprint is not measured memory traffic; confirming actual DRAM traffic requires hardware counters.",
        },
        takeaway: {
          zh: "点积时直接解码压缩权重并复用缓冲区可减少展开与拷贝，但体积大小不等于实测 DRAM 流量。",
          en: "Decoding packed weights during the dot product and retaining buffers cuts expansion and copies, though footprint is not measured DRAM traffic.",
        },
      },
      {
        title: {
          zh: "一条命令缓冲接完四十层",
          en: "Encode forty layers before waiting",
        },
        text: {
          zh: "最新常驻后端用 Syrix Rust 循环和前向调 Kapitsa Metal 算子、编码器与加载器，非另造内核。权重、状态与中间量常驻 GPU，gate/up 写 expert_hidden 供 down 直读；每步将嵌入、40 层、lm_head、argmax 编进单条命令缓冲（仍多派发），等待后于热路径读 token ID。历史 3 轮 HTTP 76 入 8 出，Syrix 对 Kapitsa 为 M3 140.36/140.73、M4 85.35/87.98 tok/s 且同输出，非任意输入证明。",
          en: "The latest resident backend pairs Syrix's Rust loop and forward pass with Kapitsa's Metal operators, encoder, and weight loader rather than inventing new kernels. Weights, state, and intermediates stay on GPU: gate/up writes expert_hidden and down reads that buffer. Each decode step encodes embedding, 40 layers, lm_head, and argmax into one command buffer—still multiple shader dispatches—waits as needed, and reads the token ID on the hot path. A historical 3-round HTTP test (76 input, 8 output) gave matching outputs at 140.36 vs. 140.73 tok/s on M3 and 85.35 vs. 87.98 on M4 (Syrix vs. Kapitsa), not proof for arbitrary inputs.",
        },
        takeaway: {
          zh: "将整步解码编入单条命令缓冲并让中间量留在 GPU，可免去中途等待，仅在热路径读回 token ID。",
          en: "Encoding an entire decode step into one GPU command buffer keeps intermediates resident and reads back only the token ID on the hot path.",
        },
      },
      {
        title: {
          zh: "词表可以按候选 ID 分开",
          en: "Split the vocabulary by candidate ID",
        },
        text: {
          zh: "终归一化输出 [1,2048] 后，词表按 ID 拆分：ANE 算 0..8191（[2048,8192]）、GPU 算余下 [2048,240128]，亦可选 32768/215552。GPU 写 fp16 到 IOSurface 发就绪事件，ANE 与 GPU 并行，收完成事件后合并。历史 17-token 中文 3 轮中位数解码：M3 纯 GPU 7.37ms，8192/32768 切分 8.07/9.00ms；M4 11.33、11.60、17.35ms。此处 ANE 越多越慢，非普适硬件结论。",
          en: "After the final norm outputs a [1, 2048] vector, the vocabulary can be split by candidate ID: ANE evaluates logical W[2048, 8192] for IDs 0..8191 while GPU handles [2048, 240128] for the rest, with an alternative 32768/215552 split. The GPU writes an fp16 IOSurface input and signals a ready event, letting ANE run alongside GPU before a done event triggers merge. In historical 3-round median 17-token Chinese decodes, pure GPU took 7.37ms on M3 versus 8.07ms (8192) and 9.00ms (32768), and 11.33ms on M4 versus 11.60ms and 17.35ms. A larger ANE share was slower here, though this is not a universal hardware claim.",
        },
        takeaway: {
          zh: "词表按 ID 拆给 ANE 与 GPU 并行计算在历史实测中反而更慢，且该结果仅限于所测场景。",
          en: "Splitting vocabulary IDs across ANE and GPU ran slower in these historical measurements, without implying a universal rule.",
        },
      },
      {
        title: {
          zh: "最高两分太接近怎么办？",
          en: "What if the top scores are nearly tied?",
        },
        text: {
          zh: "M5 示例里，候选 17 与 15 的 GPU 分为 16.952305 与 16.952019，在 ANE fp16 下同为 16.953125，并列 argmax 选出较小 ID 15 而非 17。新混合词表模式在满足接近条件时触发显式 GPU 重算 ANE 区间：全局次高与 ANE 最高均距最高分在 max(1,abs(best))*4/1024 内。这是启发式修补，非通用精度保证，不同于无回退的旧纯 ANE 路径。",
          en: "In an M5 example, candidates 17 and 15 scored 16.952305 and 16.952019 on GPU, but both rounded to 16.953125 in ANE fp16, so tie-breaking argmax picked smaller ID 15 instead of GPU's 17. The new hybrid vocabulary backend adds an explicit GPU recheck of the ANE interval whenever both the global runner-up and ANE best fall within max(1, abs(best))*4/1024 of the best score. This heuristic safeguard differs from the old pure-ANE path with no fallback, and it is not a general precision guarantee.",
        },
        takeaway: {
          zh: "新混合词表后端在最高分接近时由 GPU 显式复核 ANE 区间，但这只是启发式补救而非通用精度保证。",
          en: "The hybrid vocabulary backend triggers an explicit GPU recheck when top scores are close, offering a heuristic fix rather than a general precision guarantee.",
        },
      },
    ],
  },
  {
    id: "verification",
    title: {
      zh: "一次验证多个候选",
      en: "Verify several candidate tokens at once",
    },
    steps: [
      {
        title: {
          zh: "草稿先猜，主模型验",
          en: "Draft first, verify with the main model",
        },
        text: {
          zh: "草稿模型先提出候选链或候选树，主模型验证有效路径，只提交被接受的 token 与纠偏项。树分支不是普通顺序未来 token，注意力掩码限制其仅见祖先，缓存也只提交采纳路径。投机验证取 R=8 时，常见结构是 1 个已知位置加最多 7 个草稿位置。示意用 5 候选链和 0..4 接受前缀滑块演示其余被拒，不模拟精确的 DFlash 采样器。",
          en: "A draft model proposes a candidate chain or tree, and the main model verifies valid paths so only accepted tokens plus one correction commit. Tree branches are not ordinary sequential future tokens: masks restrict each node to its ancestors, and the cache commits only the accepted path. In speculative verification with R=8 rows, the batch often combines 1 known position with up to 7 draft positions. The toy 5-candidate chain lets a slider pick an accepted prefix of 0..4 to show the rejected tail, and does not simulate an exact DFlash sampler.",
        },
        takeaway: {
          zh: "主模型并行验证草稿候选链或树，仅把接受路径和纠偏 token 写入缓存。",
          en: "The main model verifies draft chains or trees in parallel and commits only the accepted path plus its correction.",
        },
      },
      {
        title: {
          zh: "八行输入复用同一块权重",
          en: "Eight rows reuse the same weight tile",
        },
        text: {
          zh: "验证阶段的 QKV 逻辑运算是 X[R,2048]×W[2048,8192]→[R,8192]。8×8 GPU 矩阵指令每步用 8 个输入特征算出 8 个位置×8 个输出特征的部分和，沿 2048 维重复累加；这既不是新增 8 个头，也不表示整个 QKV 仅 8×8。32 行软件分块配 8 行输入会浪费容量，新版 MLX 已有小行内核。此复用图不代表 DRAM 计数或 8 倍加速。",
          en: "During verification, logical QKV computes X[R, 2048] × W[2048, 8192] → [R, 8192]. GPU 8×8 matrix instructions accumulate partial sums for 8 positions by 8 output features across 8 input features at a time, repeating across all 2048 dimensions; this does not create 8 new heads or reduce QKV to a single 8×8 block. Packing 8 real rows into a 32-row software tile can waste capacity, and newer MLX already includes small-row kernels. This reuse illustration is neither a DRAM counter nor a universal 8× speedup claim.",
        },
        takeaway: {
          zh: "八行输入可复用权重分块，但分块粒度需匹配小行数，且权重复用并不等同于 8 倍加速。",
          en: "Eight rows can reuse weight tiles efficiently with small-row kernels, though reuse does not guarantee an 8× speedup.",
        },
      },
      {
        title: {
          zh: "单次更快，不等于整段更快",
          en: "Measure kernels, calls, and generation separately",
        },
        text: {
          zh: "11 月 24 日 M4 固定 8 行 5-bit QKV 对比 Apple qmv_mma 快照 b835fb3（调用测试每 16 次投影一起等待），Apple 与移植版 GPU 耗时 75.20/71.49us，Python 调用 133.0/146.7us，完整 8 行验证 76.26/76.77ms。4054 输入 65 输出同 ID 吞吐 48.57/54.82 tok/s，但验证轮数 22 对 17，12.9% 提升含轮数差异，不证单次验证更快。旧 9.7% 来自 mlx-vlm 0.7.12/MLX 0.32.4 勿混基线，且快照不代表现版 MLX 缺内核。",
          en: "On Nov 24 on M4, a fixed 8-row 5-bit QKV check against Apple's qmv_mma snapshot b835fb3 (16 batched calls) clocked 75.20 vs. 71.49us on GPU, but 133.0 vs. 146.7us per Python call and 76.26 vs. 76.77ms for a full fixed 8-row verify (Apple vs. port). On a 4054-prompt, 65-output run with identical IDs, throughput was 48.57 vs. 54.82 tok/s across 22 vs. 17 verification rounds, so the 12.9% gain includes fewer rounds and does not demonstrate faster fixed verifies. Do not mix this with the older 9.7% mlx-vlm 0.7.12/MLX 0.32.4 baseline, or treat this snapshot as current MLX lacking the kernel.",
        },
        takeaway: {
          zh: "内核耗时、Python 调用、固定验证与整段吞吐需分开度量，且不能混淆历史基线与轮次变化。",
          en: "Kernel time, Python call overhead, fixed verification, and end-to-end throughput must be measured separately without mixing baselines or round counts.",
        },
      },
      {
        title: {
          zh: "模型里的优化不一定通用",
          en: "A model-specific shortcut may not be general",
        },
        text: {
          zh: "2048 维 BF16 常量输入 131072 与全 1 权重做点积，结果 268435456 在 BF16 精确，但直转 FP16 越过 65504 成 +Inf，被测移植内核出 NaN。Kapitsa QKV 实际先归一化，gamma=1 时该常量行约化为 1；本检查点最大 gamma=1.796875，2048 维归一化上界 sqrt(2048)*gamma≈81.32。滑块用 2^n（8..18）切换直算与归一化，但模型内上界不适合改通用 BF16 matmul API，也不保证任意输入皆受保护。",
          en: "Take 2048 BF16 inputs equal to 131072 and unit weights: the dot product 268435456 is exact in BF16, whereas casting directly to FP16 overflows 65504 to +Inf and the tested ported kernel returns NaN. Kapitsa's actual QKV path normalizes first, reducing that constant row to about 1 when gamma is 1; for this checkpoint's max norm gamma of 1.796875, a normalized 2048-element vector is bounded by sqrt(2048)*gamma≈81.32. A slider over 2^n (8..18) toggles direct versus normalized paths, yet a model-path bound does not justify altering a general BF16 matmul API or claiming all arbitrary inputs are protected.",
        },
        takeaway: {
          zh: "模型特定归一化路径带来的数值上界，不能直接当成修改通用 BF16 矩阵乘语义的理由。",
          en: "A numerical bound along one normalized model path does not justify changing a general BF16 matmul API.",
        },
      },
    ],
  },
];
