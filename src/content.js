import { advancedLessons } from "./advanced-content.js";
// Bilingual copy drafted with Gemini CLI and technically reviewed.
export const curriculum = [
  {
    id: "tokens",
    title: {
      zh: "一个 token 有多大？",
      en: "What is inside a token?",
    },
    steps: [
      {
        title: {
          zh: "从文字到 ID",
          en: "Text to IDs",
        },
        text: {
          zh: "模型处理文本的第一步，是先通过分词把输入文字切分成一串整数 token ID。按照这个模型的实际分词结果，“你好，世界！”会被分成 [109266, 3709, 96748, 6115] 这 4 个 token，它的数量并不按汉字个数计算。你可以在交互界面中选中其中一个 token，接着查看它在后面每一步里的数值。",
          en: 'The first step of processing text is splitting the input string into integer token IDs. Using the actual tokenizer for this model, "你好，世界！" becomes four tokens: [109266, 3709, 96748, 6115], so token count does not match the number of Chinese characters. You can select one token in the interactive view and follow its values through the next steps.',
        },
        takeaway: {
          zh: "分词会把文本映射成整数 token ID，token 数量不等于字数。",
          en: "Tokenization maps text to integer token IDs, and token count does not equal character count.",
        },
      },
      {
        title: {
          zh: "ID 换成一行数",
          en: "An ID becomes a row",
        },
        text: {
          zh: "拿到 token ID 之后，embedding 层做的操作就是按行查表，词表一共有 248320 行，每一行存放 2048 个数。token ID 只用来指定行号，决定取出词表里的哪一行向量，并不会拿这个整数 ID 去做矩阵乘法。这里的 2048 指的是特征维度，与模型的层数无关，不表示模型有 2048 层。",
          en: "Once you have a token ID, the embedding step is a row lookup in a vocabulary table with 248320 rows and 2048 numbers per row. The token ID only selects which row to read; the model does not multiply matrices by the integer ID itself. Here 2048 is the feature dimension of one token, not 2048 layers.",
        },
        takeaway: {
          zh: "embedding 按 token ID 从 248320×2048 的词表里查出一行 2048 维特征，不拿 ID 做乘法。",
          en: "Embedding uses the token ID to look up one 2048-number row from a 248320-row table rather than multiplying by the ID.",
        },
      },
      {
        title: {
          zh: "一行，还是很多行？",
          en: "One row or many?",
        },
        text: {
          zh: "把 T 个 token 查出的向量依次排在一起，就组成输入矩阵 X[T, 2048]，每行对应一个 token，每列对应一个特征位置。常见推理里，prefill 一次处理多行，带缓存的 decode 通常每次只新进一行。前面的早期教学生成器未开启缓存，每步都会重新计算整段历史。第 13 章开始看新增的缓存实现。",
          en: "Stacking the rows for T tokens forms the input matrix X[T, 2048], where each row is one token and each column is one feature position. In typical inference, prefill processes many rows at once and cached decode usually processes one new row per step. The early teaching generator recomputes the full history without a cache. Chapter 13 introduces the newer cached implementation.",
        },
        takeaway: {
          zh: "X[T, 2048] 按行排列 T 个 token；无缓存实现每次生成都会重算全部历史行。",
          en: "X[T, 2048] arranges T tokens as rows, and without a cache each decode step recomputes every row in the history.",
        },
      },
    ],
  },
  {
    id: "matrix",
    title: {
      zh: "矩阵到底怎么乘？",
      en: "How matrices multiply",
    },
    steps: [
      {
        title: {
          zh: "两边的 2048 对上",
          en: "Match the inner dimensions",
        },
        text: {
          zh: "本教程始终采用行向量约定，矩阵乘法要求左边列数与右边行数一致，例如 input[1, 2048] × W[2048, 512] 得到 gate[1, 512]。教学小矩阵 x[1, 2] × W[2, 3] 得到 y[1, 3] 也完全一样。输出里的 3 表示三个投影输出位置，不代表三个 token，这些位置的实际含义都由模型训练学出。",
          en: "This guide always uses the row-vector convention, where the left matrix's columns match the right matrix's rows: input[1, 2048] × W[2048, 512] produces gate[1, 512]. The small teaching example x[1, 2] × W[2, 3] → y[1, 3] follows the same rule. The output size 3 means three projected output positions for that single row, not three tokens, and their meanings are learned during training.",
        },
        takeaway: {
          zh: "行向量乘法对齐中间维度，输出列数是投影后的特征位置数，不等于 token 数。",
          en: "Row-vector multiplication matches the inner dimensions, and the output width is the number of projected positions, not tokens.",
        },
      },
      {
        title: {
          zh: "代码为什么按行算？",
          en: "Why does code read rows?",
        },
        text: {
          zh: "权重在内存里通常按 [输出, 输入] 形状存储，代码实现时会依次读取其中一行权重，和 input 做点积算出一个输出数。数学结果上，这和图中按逻辑形状 [输入, 输出] 写出的 input × W 完全等价，图里不会暗中调换方向。另外，像 project(input) 这样的函数传参顺序只跟代码接口有关，不代表矩阵乘法的左右顺序。",
          en: "Weights are usually stored with shape [output, input], so the code reads one weight row at a time and takes its dot product with input to produce one output number. Mathematically this gives the same result as input × W where the diagram draws W in logical shape [input, output] without silently flipping orientation. Argument order in a call like project(input) is just an API choice and does not dictate matrix multiplication order.",
        },
        takeaway: {
          zh: "按 [输出, 输入] 逐行点积与逻辑上的 input × W[输入, 输出] 等价，函数传参顺序不等于乘法顺序。",
          en: "Row-by-row dot products on stored [output, input] weights match logical input × W[input, output], and API parameter order is not multiplication order.",
        },
      },
      {
        title: {
          zh: "6 bit 存的是压缩码",
          en: "Six bits store a code",
        },
        text: {
          zh: "这里的 affine 量化用 w ≈ code × scale + bias 近似还原权重。bits = 6 表示每个权重只存 0 到 63 共 64 种整数码，group_size = 64 表示每 64 个权重共用一组 scale 和 bias，两个 64 的含义不同。权重以压缩格式常驻内存并在计算时按需解码；如果把全部权重直接常驻为 f32，就会失去这部分权重带宽收益。",
          en: "Affine quantization approximates each weight with w ≈ code × scale + bias. Here bits = 6 gives 64 integer codes from 0 to 63, while group_size = 64 means every 64 weights share one scale and bias; both numbers are 64, but they mean different things. Keeping weights compressed in memory and decoding them on demand saves weight bandwidth that you would lose if all weights stayed resident in f32.",
        },
        takeaway: {
          zh: "bits=6 的 64 种码值与 group_size=64 的分组大小含义不同，压缩常驻并按需解码可节省权重带宽。",
          en: "The 64 code values from bits=6 and the group_size of 64 are different concepts; staying compressed and decoding on use preserves weight-bandwidth savings.",
        },
      },
    ],
  },
  {
    id: "norm",
    title: {
      zh: "四个公式，各管一件事",
      en: "Four formulas, four jobs",
    },
    steps: [
      {
        title: {
          zh: "RMSNorm 分两步看",
          en: "Read RMSNorm in two steps",
        },
        text: {
          zh: "RMSNorm 先对整条向量算出一个标量 r = sqrt(mean(x²) + epsilon)，其中 epsilon 用来防止分母过小，它属于固定常数，不属于模型权重。接着向量里的每个数都除以这个相同的 r，再逐位置乘上训练得到的 gamma[i]。注意 gamma 来自 norm.weight，和量化解码时用的反量化 scale 是两回事。",
          en: "RMSNorm first computes one scalar r = sqrt(mean(x²) + epsilon) over the vector, where epsilon is a fixed constant to keep the denominator from getting too small, not a learned weight. Every element is divided by that same r and then multiplied position by position by the learned gamma[i]. That gamma comes from norm.weight and is separate from a dequantization scale.",
        },
        takeaway: {
          zh: "RMSNorm 先全向量同除标量 r，再逐位置乘 norm.weight 的 gamma，和反量化 scale 无关。",
          en: "RMSNorm divides all elements by one scalar r and then scales each position by norm.weight's gamma, which is unrelated to dequantization scale.",
        },
      },
      {
        title: {
          zh: "sigmoid 与 SiLU",
          en: "Sigmoid and SiLU",
        },
        text: {
          zh: "sigmoid(g) = 1 / (1 + exp(-g)) 会把单个数值映射到 0 到 1 之间，输入 g = 0 时输出正好等于 0.5。SiLU(g) = g × sigmoid(g) 也是逐元素运算，对向量里每个位置分别计算，负数经过它之后不一定被清零。这里完全没有矩阵乘法，也不会让整行特征共用同一个 sigmoid 结果。",
          en: "sigmoid(g) = 1 / (1 + exp(-g)) maps one number into the range 0 to 1, giving 0.5 when g = 0. SiLU(g) = g × sigmoid(g) is also applied elementwise to each position independently, and negative values are not necessarily zeroed out. Neither operation involves matrix multiplication, and an entire row does not share one sigmoid value.",
        },
        takeaway: {
          zh: "sigmoid 和 SiLU 都是逐元素计算，不涉及矩阵乘法，也不会整行共用一个系数。",
          en: "Both sigmoid and SiLU are strictly elementwise operations with no matrix multiplication and no single row-wide sigmoid value.",
        },
      },
      {
        title: {
          zh: "softmax 才是分配比例",
          en: "Softmax distributes a total",
        },
        text: {
          zh: "softmax 需要把整组数放在一起按 exp(x_i) / sum(exp(x_j)) 计算，结果全部非负且总和为 1，用来表示分配比例。RMSNorm 除以 RMS 的这一步保留正负号，后面的 gamma 若为负仍可能翻转符号；它不要求各项之和为 1。attention 用 Q/K 分数经 softmax 后的比例去混合 V，MoE 也用它产出各专家的路由概率。",
          en: "Softmax evaluates an entire group together as exp(x_i) / sum(exp(x_j)), producing non-negative values that sum to 1 to represent proportions. Dividing by RMS preserves signs; a negative learned gamma can still flip them. RMSNorm does not require a sum of 1. Attention uses softmax proportions over Q/K scores to mix V, and MoE uses softmax to compute routing probabilities.",
        },
        takeaway: {
          zh: "softmax 输出总和为 1 的非负比例；RMSNorm 调整特征尺度，不把结果限制为概率。",
          en: "Softmax returns non-negative proportions summing to 1. RMSNorm adjusts feature scale without constraining outputs to probabilities.",
        },
      },
    ],
  },
  {
    id: "heads",
    title: {
      zh: "多头为什么变成三维？",
      en: "Where the third axis comes from",
    },
    steps: [
      {
        title: {
          zh: "先投影，再拆头",
          en: "Project first, split second",
        },
        text: {
          zh: "这里的 X 是层输入经过 RMSNorm 后的特征。在本模型的 full attention 计算里，并不会直接把 2048 维的输入向量切成 16 个头，必须先完成矩阵投影再拆分维度。程序用输入 X[T,2048] 乘上权重 W_q[2048,8192]，算出形状为 [T,8192] 的中间张量 qg。接着按 16 个头切开，每头占 512 个位置，前 256 个位置作为 Q、后 256 个位置作为 gate，两者最终形状都是 [T,16,256]。",
          en: "Here X is the layer input after RMSNorm. In this model's full attention, the 2048-dim input vector is not sliced directly into 16 heads; matrix projection happens first and splitting comes second. Multiplying X[T,2048] by W_q[2048,8192] produces an intermediate tensor qg[T,8192]. Splitting it into 16 heads of 512 positions puts the first 256 positions into Q and the last 256 into gate, so both have final shape [T,16,256].",
        },
        takeaway: {
          zh: "full attention 先投影出 qg[T,8192]，再拆成 16 头，得到同为 [T,16,256] 的 Q 和 gate。",
          en: "Full attention projects X into qg[T,8192] first, then splits it into 16 heads to form Q and gate of shape [T,16,256].",
        },
      },
      {
        title: {
          zh: "转一下，看见三个轴",
          en: "Turn the tensor, see three axes",
        },
        text: {
          zh: "教学小模型中的 Q[T,2,4] 包含三个轴，每张表有 T 行 token，前后两张表对应 2 个 head，每行有 4 列特征。实际内存里它完全可以只存成一段连续的扁平 Vec，三个维度本质上是访问数据时的索引方式。放到真实模型里，同时选定一个 token 和一个 head 会拿到一条 [1,256] 向量，固定一个 head 查看全部 token 则得到 [T,256]。",
          en: "In the small teaching model, Q[T,2,4] has T token rows on each sheet, two sheets for the two heads, and four feature columns per row. In memory this can still be stored as one flat contiguous Vec, because the three dimensions define an indexing layout for reading values. In the full model, picking one token and one head returns a [1,256] vector, while fixing one head across all tokens gives a [T,256] matrix.",
        },
        takeaway: {
          zh: "三维张量在内存里可以是扁平数组，三个轴决定了按 token 和 head 切片的方式。",
          en: "A 3D tensor can live in flat memory; its three axes define how you slice by token and head.",
        },
      },
      {
        title: {
          zh: "Q 的头比 K/V 多",
          en: "More Q heads than KV heads",
        },
        text: {
          zh: "真实模型的 full attention 中，Q 一共有 16 个头，而 K 和 V 各自只有 2 个头，每个头都是 256 维，因此权重 W_k 和 W_v 的逻辑形状均为 [2048,512]。计算时 Q 的 0 到 7 号头共用 KV 的 0 号头，8 到 15 号头共用 KV 的 1 号头，这种设计叫做分组查询 GQA。另外要注意，linear attention 使用完全不同的另一套维度，其中 Q 和 K 为 16×128、V 为 32×128，二者不能混用。",
          en: "In actual full attention, Q has 16 heads while K and V each have 2 heads of 256 dims, so W_k and W_v have logical shape [2048,512]. Q heads 0..7 share KV head 0 and Q heads 8..15 share KV head 1, which is grouped-query attention (GQA). Do not mix these shapes with linear attention, which uses a separate layout: 16×128 for Q and K, and 32×128 for V.",
        },
        takeaway: {
          zh: "full attention 采用 GQA，16 个 Q 头分组共享 2 个 KV 头；linear attention 的头数和维数不同，不可混用。",
          en: "Full attention uses GQA with 16 Q heads sharing 2 KV heads, which is distinct from linear attention's head dimensions.",
        },
      },
    ],
  },
  {
    id: "attention",
    title: {
      zh: "从打分到读出信息",
      en: "From scores to information",
    },
    steps: [
      {
        title: {
          zh: "每头归一化，然后旋转",
          en: "Normalize each head, then rotate",
        },
        text: {
          zh: "在 full attention 里，每个头的 Q 和 K 都要先经过带可学习参数 gamma 的 RMSNorm，随后再执行 RoPE 位置旋转。每个 256 维的头只旋转最前面 64 个位置，按下标 i 与 i+32 配成 32 对，旋转角度为 pos/theta^(2i/64)，其中 theta 等于 10000000。旋转只会改变每一对数值的方向，不会改变这一对的长度，而且 V 向量不做这里的 RoPE。",
          en: "In full attention, each Q and K head first undergoes RMSNorm with learned gamma and then RoPE position rotation. Within each 256-dim head, only the first 64 positions rotate, paired as i and i+32 into 32 pairs with angle pos/theta^(2i/64) where theta equals 10000000. Rotation changes each pair's direction without changing its length, and V does not get RoPE here.",
        },
        takeaway: {
          zh: "Q 和 K 每头先做 RMSNorm 再对前 64 维做 RoPE 旋转，V 不做这一步 RoPE。",
          en: "Each Q and K head undergoes RMSNorm followed by RoPE on its first 64 positions, while V skips RoPE.",
        },
      },
      {
        title: {
          zh: "只能看见当前和过去",
          en: "Only the present and the past",
        },
        text: {
          zh: "接下来每个 Q 头都会计算自己的 Q[T,256] 乘以对应 K 的转置 Kᵀ[256,T]，再除以缩放因子 sqrt(256)，得到形状为 [T,T] 的注意力分数矩阵。这个打分带有严格的因果限制，当前 token 只能看到满足下标 j <= 当前位置的历史与自身。所有靠后的未来位置都会被遮住，经过 softmax 之后它们对应的权重会变成 0。",
          en: "Each Q head multiplies its Q[T,256] by the transpose Kᵀ[256,T] and divides by sqrt(256) to form a [T,T] score matrix. Causal masking enforces j <= the current token position, so each token can only attend to the past and itself. All future positions are masked out and receive weight 0 after softmax.",
        },
        takeaway: {
          zh: "每个 Q 头算出 [T,T] 缩放点积分数，因果掩码保证未来位置在 softmax 后权重为 0。",
          en: "Each Q head computes scaled [T,T] scores where causal masking forces all future positions to weight 0 after softmax.",
        },
      },
      {
        title: {
          zh: "按比例取 V",
          en: "Read V in proportion",
        },
        text: {
          zh: "拿到分数矩阵后，程序会针对当前 token 这一整行里的所有可见分数执行 softmax，把打分换算成总和等于 1 的概率分布。接着拿这个 [T,T] 概率矩阵去乘对应头的 V[T,256]，算出形状同样为 [T,256] 的新矩阵。这样输出向量的每一个位置，正好等于各历史 token 在对应 V 位置上的加权和。",
          en: "Next, softmax runs across each token's row of visible scores to convert them into probabilities summing to 1. Multiplying this [T,T] probability matrix by the head's V[T,256] produces a [T,256] result. Each output position is the weighted sum of the matching V positions across past and current tokens.",
        },
        takeaway: {
          zh: "按行 softmax 得到 [T,T] 概率后再乘 V[T,256]，逐位置加权汇总可见历史的 V。",
          en: "Row-wise softmax produces [T,T] probabilities that multiply V[T,256] to take a weighted sum of visible V positions.",
        },
      },
      {
        title: {
          zh: "拼接，门控，投影",
          en: "Join, gate, project",
        },
        text: {
          zh: "所有 16 个头的输出会按特征维拼接成形状为 [T,4096] 的大矩阵，再逐元素乘上前面从 qg 拆出来的 sigmoid(gates)，原版 Transformer 架构里并没有这步额外的输出 gate。门控完成后，再乘以输出投影矩阵 W_o[4096,2048]，算出形状为 [T,2048] 的 attention_output。直到这一步全部结束，才把它与最初的输入 x 相加，构成残差 h = x + attention_output。",
          en: "The 16 head outputs concatenate along the feature axis into [T,4096] and multiply elementwise by sigmoid(gates) split earlier from qg, an extra output gate absent from the original Transformer. Multiplying by W_o[4096,2048] produces attention_output[T,2048]. Only after this projection is the residual added to the original input: h = x + attention_output.",
        },
        takeaway: {
          zh: "16 头拼接为 [T,4096] 后先逐元素乘 sigmoid(gates)，再经 W_o 投影回 2048 维并与原始 x 做残差相加。",
          en: "Concatenated [T,4096] head outputs are elementwise gated by sigmoid(gates), projected through W_o back to 2048, and added to x.",
        },
      },
    ],
  },
  {
    id: "linear",
    title: {
      zh: "把历史写进一个状态",
      en: "Write history into a state",
    },
    steps: [
      {
        title: {
          zh: "先混合附近四个 token",
          en: "Mix the nearest four tokens",
        },
        text: {
          zh: "在 linear attention 分支中，2048 维的 Q、2048 维的 K 和 4096 维的 V 合并成 8192 个通道，先一起送进卷积核大小为 4 的 causal depthwise Conv1d。每个通道独立混合当前以及前面三个 token 的数值，序列开头缺失历史的位置补 0，然后再对每个元素执行 SiLU。处理完毕后，再把结果拆分成 Q 和 K 各 16 头每头 128 维，V 则拆成 32 头每头 128 维。",
          en: "In linear attention, Q (2048), K (2048), and V (4096) combine into 8192 channels and pass through a causal depthwise Conv1d with kernel size 4. Each channel independently mixes the current token with the previous three tokens, zero-padding missing history at the start, followed by elementwise SiLU. Afterward, Q and K split into 16 heads of 128 dims, while V splits into 32 heads of 128 dims.",
        },
        takeaway: {
          zh: "8192 个 Q/K/V 通道先经 kernel=4 因果深度卷积和 SiLU，再拆成 Q/K 16×128 与 V 32×128。",
          en: "All 8192 Q/K/V channels pass through a kernel-4 causal depthwise Conv1d and SiLU before splitting into 16×128 for Q/K and 32×128 for V.",
        },
      },
      {
        title: {
          zh: "每个头有自己的 S",
          en: "Each head has its own S",
        },
        text: {
          zh: "linear attention 会为每一个 V 头 h 单独维护一张形状为 [128,128] 的状态矩阵 S_h，为了便于观察，教学界面里只展示 2×2 大小的状态。计算当前 token 时程序只会更新该头自己的 S_h，轮到下一个 token 时再接着使用同一个头的这份 S_h。切换到其他 head 查看时，不同头之间不会共享状态，也不会重置别的头里保存的内容。",
          en: "Linear attention maintains a separate state matrix S_h[128,128] for each V head h; the teaching view shows a 2×2 state to keep it readable. Each token updates only that head's S_h, and the next token continues with the same head's updated S_h. Switching to another head neither shares state nor resets any other head.",
        },
        takeaway: {
          zh: "每个 V 头独立持有自己的状态矩阵 S_h[128,128]，跨 token 延续、跨 head 互不干扰。",
          en: "Each V head maintains its own S_h[128,128] state across tokens without sharing or resetting other heads.",
        },
      },
      {
        title: {
          zh: "衰减，再写入差额",
          en: "Decay, then write a correction",
        },
        text: {
          zh: "进入下面的更新前，Q/K 先按头做 L2 归一化，Q 再乘 1/√128。按照逻辑行向量与 S[key,value] 的维度约定，参数 a 经过变换控制衰减系数 alpha，参数 b 经过 sigmoid 得到写入系数 beta。更新状态时依次计算 S_decay=alpha*S_old、prediction=k*S_decay、delta=beta*(v-prediction)，再把差额写回得到 S_new=S_decay+outer(k,delta)。最后通过 readout=q*S_new 读出当前结果，切记 readout 只是本步输出，不要把它当成新的状态矩阵 S。",
          en: "Before this update, Q/K are L2-normalized per head and Q is scaled by 1/√128. Under the logical row-vector and S[key,value] convention, parameter a is transformed to control decay alpha, while b passes through sigmoid to give write rate beta. Updating the state computes S_decay = alpha * S_old, prediction = k * S_decay, delta = beta * (v - prediction), and S_new = S_decay + outer(k, delta). Finally, readout = q * S_new reads the output vector; do not treat readout as the new state matrix S.",
        },
        takeaway: {
          zh: "a 控衰减 alpha、b 控写入 beta，状态先衰减再按差额 outer(k,delta) 更新，readout 与状态 S 分开。",
          en: "Decay alpha from a and write rate beta from b update S by outer(k,delta), and the readout q*S_new is separate from the state S.",
        },
      },
      {
        title: {
          zh: "读出和保留走两条路",
          en: "Readout and state take different paths",
        },
        text: {
          zh: "每个头读出的 readout 都是 128 维，32 个头合并起来一共 4096 维；每个头都会先做 RMSNorm 并与 SiLU(z) 逐元素相乘，再通过 out_proj 从 4096 维投影回 2048 维，最后加上残差向后传递。与此同时，刚刚更新完毕的状态矩阵 S 会留在当前头里，供下一个 token 继续读取。要注意负责衰减的 a、负责写入的 b 和负责输出的 z 位于三个不同环节，它们不是同一个 gate。",
          en: "Each of the 32 heads produces a 128-dim readout, totaling 4096 dims when concatenated; each head undergoes RMSNorm and elementwise multiplication by SiLU(z), then projects from 4096 back to 2048 via out_proj before adding the residual. Meanwhile, the updated state matrix S stays in that head for the next token. The decay gate a, write gate b, and output gate z act at three different stages.",
        },
        takeaway: {
          zh: "readout 经每头 norm、SiLU(z) 门控与 out_proj 输出，状态 S 留给下一 token；a、b、z 三个 gate 各自独立。",
          en: "Readout passes through per-head norm, SiLU(z) gating, and out_proj while S carries forward; gates a, b, and z are at distinct stages.",
        },
      },
    ],
  },
  {
    id: "router",
    title: {
      zh: "选专家，不是运行专家",
      en: "Choose experts before running them",
    },
    steps: [
      {
        title: {
          zh: "attention 之后再归一化",
          en: "Normalize after attention",
        },
        text: {
          zh: "attention 模块算完输出后，会先与原始输入 x 做残差相加，得到这一步的中间向量 h = x + attention_output。接着向量 h 会送入 post_attention_layernorm 再执行一次归一化处理，产出形状为 [1,2048] 的 moe_input。看到这个名字时不要产生误解，moe_input 仅仅是准备喂给后面 MoE FFN 的输入特征，并不代表 MoE 部分已经计算完成。",
          en: "After attention computes its output, residual addition forms h = x + attention_output. The vector h then passes through post_attention_layernorm to produce moe_input[1,2048]. Do not let the name mislead you: moe_input is only the input fed into the upcoming MoE FFN, not a finished MoE output.",
        },
        takeaway: {
          zh: "残差结果 h 经 post_attention_layernorm 得到 moe_input[1,2048]，它只是后续 MoE FFN 的输入。",
          en: "post_attention_layernorm transforms the residual vector h into moe_input[1,2048], which is only the input to the MoE FFN.",
        },
      },
      {
        title: {
          zh: "256 次小打分",
          en: "256 small scores",
        },
        text: {
          zh: "路由阶段用的是逻辑形状为 [2048,256] 的 router 权重矩阵，将输入 [1,2048] 与它相乘，直接得到 256 个专家对应的 logits 分数。在这个步骤里，每个专家只用一条 2048 维的路由权重做一次点积打分。模型此时完全没有去执行 256 个专家各自拥有的三张 FFN 大矩阵。",
          en: "The router multiplies input[1,2048] by a router weight matrix of logical shape [2048,256] to produce 256 logits, one per expert. Each expert contributes only a single 2048-dim routing vector to this dot product. None of the 256 experts run their three large FFN matrices during routing.",
        },
        takeaway: {
          zh: "router 只做一次 [1,2048]×[2048,256] 投影打分，不会提前运行 256 个专家的三张 FFN 矩阵。",
          en: "The router only computes a single [1,2048]×[2048,256] projection to score experts without running any expert's three FFN matrices.",
        },
      },
      {
        title: {
          zh: "留下 Top 8",
          en: "Keep the top eight",
        },
        text: {
          zh: "算出 256 个分数之后，本模型只会挑选排名前 8 的专家，并把这 8 个被选中的概率重新归一化成总和等于 1 的 8 个标量权重。在数据结构 routing.routes 里，每个 token 都单独存有一份对应的 expert_ids 和 weights。程序实现时先用 chunks_exact(2048) 按 token 切分出单行输入，再用 zip 把这一行向量与它的路由结果逐一配对。",
          en: "After scoring all 256 experts, this model keeps only the top 8 and renormalizes their selected probabilities into 8 scalar weights summing to 1. In routing.routes, each token stores its own expert_ids and weights. In code, chunks_exact(2048) slices the input by token row, and zip pairs each token row with its route entry.",
        },
        takeaway: {
          zh: "模型选出 Top 8 专家并将选中概率重归一化为 8 个和为 1 的标量权重，按 token 与输入行配对。",
          en: "The model keeps the top 8 experts with renormalized scalar weights summing to 1 and pairs each route with its token row.",
        },
      },
    ],
  },
  {
    id: "experts",
    title: {
      zh: "三个矩阵怎样变成 FFN",
      en: "Three matrices make an FFN",
    },
    steps: [
      {
        title: {
          zh: "gate 和 up 各算一次",
          en: "Two projections: gate and up",
        },
        text: {
          zh: "对于每一个被路由选中的专家，程序都会把同一条输入向量 input[1,2048] 送进两次彼此独立的线性投影。第一路用 input[1,2048] 乘以 W_gate[2048,512] 算出 gate[1,512]，第二路用同一个输入乘以 W_up[2048,512] 算出 up[1,512]。这两条输出向量里的 512 维，来自于当前模型配置所指定的单个专家中间宽度。",
          en: "For each selected expert, the same input[1,2048] passes through two independent linear projections. One computes input[1,2048] × W_gate[2048,512] to produce gate[1,512], and the other computes the same input × W_up[2048,512] to produce up[1,512]. The width 512 comes from the expert intermediate size configured for this model.",
        },
        takeaway: {
          zh: "每个选中专家对同一个 input[1,2048] 分别乘 W_gate 和 W_up，各自产出 512 维向量。",
          en: "Each selected expert projects the same input[1,2048] through W_gate and W_up to produce two 512-dim vectors.",
        },
      },
      {
        title: {
          zh: "相同位置相乘",
          en: "Multiply matching positions",
        },
        text: {
          zh: "接下来把两条 512 维向量按相同下标逐位置组合，计算 hidden[i] = SiLU(gate[i]) * up[i]，512 个位置各自独立运算，不会跨位置混合。随后将得到的 hidden[1,512] 乘以 W_down[512,2048]，投影回原来的宽度得到 output[1,2048]。查看源码时要区分清楚，round_mul 只做两个 f32 标量之间的乘法，project 才负责执行矩阵向量投影。",
          en: "Next, matching indices combine elementwise as hidden[i] = SiLU(gate[i]) * up[i] across all 512 positions independently without mixing across indices. Multiplying hidden[1,512] by W_down[512,2048] projects back to output[1,2048]. In the source code, round_mul only multiplies two f32 scalars, whereas project computes the matrix-vector projection.",
        },
        takeaway: {
          zh: "先逐位置算 SiLU(gate[i])*up[i]，再经 W_down 投回 2048 维；round_mul 是标量乘法，project 才是矩阵投影。",
          en: "Elementwise SiLU(gate[i])*up[i] is followed by W_down projection back to 2048; round_mul is scalar multiplication while project is matrix projection.",
        },
      },
      {
        title: {
          zh: "8 份输出合成一份",
          en: "Merge eight outputs",
        },
        text: {
          zh: "被选中的 8 个专家各自都会输出一条包含 2048 个数的向量，合并时按公式 combined[i] = sum_j(router_weight[j] * expert_output[j][i]) 逐位置加权累加。代码实现里采用先遍历专家、再遍历 2048 个位置的写法，最终数值与先按位置收集 8 个数再求和完全一致。注意这里的 route.weight 只是单个标量系数，和专家的权重矩阵不是一回事。",
          en: "Each of the 8 selected experts produces a 2048-number vector, merged elementwise as combined[i] = sum_j(router_weight[j] * expert_output[j][i]). The code loops over experts first and then over all 2048 positions, producing the exact same result as gathering 8 numbers per position and summing them. Here route.weight is a single scalar factor, not an expert weight matrix.",
        },
        takeaway: {
          zh: "8 份 2048 维专家输出各自乘上标量 route.weight 后逐位置相加，遍历顺序不改变最终结果。",
          en: "Each of the 8 expert outputs is scaled by its scalar route.weight and summed elementwise; loop order does not change the result.",
        },
      },
      {
        title: {
          zh: "共享专家多一个总开关",
          en: "A shared expert has one extra gate",
        },
        text: {
          zh: "除了路由挑出的专家，每层还配有一个共享专家，它同样拥有独立的 gate、up、down 三张大矩阵，并且额外多出第四张权重 W_shared_gate[2048,1]。计算时拿原始 moe_input 乘以这张矩阵算出一个 logit，经 sigmoid 变成标量系数 s，再让整条共享 raw_output 的每个位置都乘上这个 s。最后把路由结果与共享结果相加得到 MoE = routed + shared，整层最终输出为 layer_output = h + MoE。",
          en: "Alongside the routed experts, each layer has a shared expert with its own gate, up, and down matrices plus a fourth matrix W_shared_gate[2048,1]. Multiplying the original moe_input by W_shared_gate gives one logit, sigmoid turns it into one scalar s, and every position of the shared raw_output is multiplied by s. Finally, MoE = routed + shared, and the layer outputs layer_output = h + MoE.",
        },
        takeaway: {
          zh: "共享专家用 W_shared_gate[2048,1] 算出标量 s 缩放整条输出，再与 routed 相加并回到残差 h。",
          en: "The shared expert computes one scalar s via W_shared_gate[2048,1] to scale its entire output, then adds it to routed and the residual h.",
        },
      },
    ],
  },
  {
    id: "generation",
    title: {
      zh: "一个 token 变成一句话",
      en: "From one token to generated text",
    },
    steps: [
      {
        title: {
          zh: "把一层接四十次",
          en: "Connect forty layers",
        },
        text: {
          zh: "单个网络层按输入 norm、attention、残差、norm、MoE FFN、残差的顺序串联，输出形状依然保持 [T,2048]，方便直接接进下一层。这个模型一共有 40 层，其中 30 层采用 linear attention，10 层采用 full attention。实现时要特别注意，两处残差都必须加在归一化之前的分支上，不能混加到 norm 之后的向量上。",
          en: "Each layer runs input norm, attention, residual addition, norm, MoE FFN, and a second residual addition, keeping the output shape at [T,2048] for the next layer. This model has 40 layers in total: 30 use linear attention and 10 use full attention. Both residual additions must add to the pre-norm branch, never to the post-norm vector.",
        },
        takeaway: {
          zh: "40 层混合 30 个 linear attention 和 10 个 full attention，每层保持 [T,2048]，两处残差都不能加在 norm 后。",
          en: "The 40 layers mix 30 linear and 10 full attention blocks while keeping shape [T,2048], and neither residual adds to a post-norm vector.",
        },
      },
      {
        title: {
          zh: "给词表里的每项打分",
          en: "Score every vocabulary entry",
        },
        text: {
          zh: "跑完第 40 层之后，模型先执行一次 final RMSNorm，然后只从最后一个 token 的位置上取出形状为 [1,2048] 的特征向量。把它乘上逻辑形状为 [2048,248320] 的 lm_head 投影矩阵，就会得到覆盖整张词表的分数向量 logits[1,248320]。采用 greedy 策略时直接挑出分数最高的词表 ID，因为单纯比较数值大小不需要先对 logits 做 softmax。",
          en: "After the 40th layer, a final RMSNorm runs and only the last token's [1,2048] feature vector is taken. Multiplying it by lm_head of logical shape [2048,248320] produces logits[1,248320] across the entire vocabulary. Greedy decoding picks the vocabulary ID with the highest logit directly, because comparing values does not require softmax.",
        },
        takeaway: {
          zh: "取最后 token 经 final RMSNorm 后的 [1,2048] 乘 lm_head 得全词表 logits，greedy 取最大值无需 softmax。",
          en: "The last token's normalized [1,2048] vector multiplies lm_head to score the full vocabulary, and greedy argmax needs no softmax.",
        },
      },
      {
        title: {
          zh: "追加，再运行一次",
          en: "Append and run again",
        },
        text: {
          zh: "每次选出新的 token ID 后，程序会把它追加到输入序列末尾再重新跑一遍，循环直到生成 EOS 或达到 max-new-tokens 上限。这里展示的早期教学版没有实现 KV 或 state 缓存，所以每一步都要完整重算不断加长的历史。示例里首个生成的 ID 198 对应换行符，在终端里看起来像没有输出；此外这种原始续写也不包含 chat template 或 tool 调用协议。",
          en: "Each newly chosen token ID is appended to the input sequence and the model runs again until hitting EOS or max-new-tokens. This early teaching implementation has no KV or state cache, so every step recomputes the full growing history. In the example, the first generated ID 198 is a newline, which can look like no output in a terminal, and raw continuation includes no chat template or tool-calling protocol.",
        },
        takeaway: {
          zh: "生成循环不断追加新 ID 重算历史直至停止条件，原始续写不含对话模板或工具协议，首个换行 ID 容易被忽略。",
          en: "The loop appends each new ID and recomputes until a stop condition; raw continuation has no chat or tool protocol, and a leading newline ID can look empty.",
        },
      },
    ],
  },
  {
    id: "gpu",
    title: {
      zh: "第一次把计算交给 GPU",
      en: "Your first GPU dispatch",
    },
    steps: [
      {
        title: {
          zh: "一个位置，一个线程",
          en: "One position, one thread",
        },
        text: {
          zh: "在 Metal 的 add_vectors 核函数里，每个并行线程按自身编号只负责计算数组里的一个位置，也就是执行 out[id] = left[id] + right[id]。发起计算之前，CPU 端要先编译 .metal 着色器库、查找到对应的函数并创建好 compute pipeline。实际调用 add 时，程序再把输入数据上传到缓冲区、逐一绑定 buffer 并提交 dispatch 让设备运行。",
          en: "In the Metal kernel add_vectors, each parallel thread computes one array element using its index: out[id] = left[id] + right[id]. Before running, the CPU compiles the .metal library, looks up the function, and creates a compute pipeline. Calling add then uploads the data, binds the buffers, and dispatches the kernel to run on the GPU.",
        },
        takeaway: {
          zh: "GPU 核函数把每个数组位置分给独立线程，CPU 负责编译管线、绑定 buffer 和发起 dispatch。",
          en: "The GPU kernel assigns one array element per thread, while the CPU compiles the pipeline, binds buffers, and issues the dispatch.",
        },
      },
      {
        title: {
          zh: "为什么传两个 MTLSize？",
          en: "Why two MTLSize values?",
        },
        text: {
          zh: "调用 dispatchThreads 时需要传入两个 MTLSize 参数：第一个指定整体的总 grid 尺寸，第二个指定单个 threadgroup 包含的线程尺寸。底层硬件按 SIMD 组调度执行，一个 threadgroup 内部可以包含多个 SIMD 组。通过 threadExecutionWidth 查到的是该 pipeline 的 SIMD 宽度，并不等于总线程数；图中的数字仅作示意，不保证固定为某款硬件的实际值。",
          en: "Calling dispatchThreads passes two MTLSize values: the first sets the total grid size, and the second sets the size of each threadgroup. Hardware executes in SIMD groups, and one threadgroup can contain multiple SIMD groups. threadExecutionWidth queries the pipeline's SIMD width rather than the total thread count, and numbers in the diagram are illustrative rather than fixed hardware constants.",
        },
        takeaway: {
          zh: "两个 MTLSize 分别定义总 grid 与每 threadgroup 大小，threadExecutionWidth 返回的是 SIMD 宽度。",
          en: "The two MTLSize parameters set the total grid and threadgroup sizes, while threadExecutionWidth reports the pipeline's SIMD width.",
        },
      },
      {
        title: {
          zh: "lm_head 换到设备上",
          en: "Move the vocabulary projection",
        },
        text: {
          zh: "把词表投影 lm_head 的矩阵运算搬到 GPU 后，host 端 CPU 依然要负责读取词表、挑选最大 ID 和控制生成循环。Metal 路径可以明确把这段计算交给 GPU，但最终耗时还受数据搬运、管线编译和 dispatch 次数影响。即使硬件采用统一内存，也同样存在内存带宽占用和拷贝开销。",
          en: "After moving the lm_head matrix multiplication onto the GPU, the host CPU still reads the vocabulary, selects the winning ID, and drives the generation loop. The Metal path explicitly executes that kernel on the GPU, yet end-to-end speed still depends on data movement, compilation, and dispatch count. Unified memory still involves memory bandwidth and copy overhead.",
        },
        takeaway: {
          zh: "Metal 明确把 lm_head 交给 GPU 计算，但 CPU 仍做控制流程，统一内存也仍有带宽与拷贝开销。",
          en: "Metal explicitly runs lm_head on the GPU while the CPU handles control flow, and unified memory still has bandwidth and copy costs.",
        },
      },
    ],
  },
  {
    id: "ane",
    title: {
      zh: "从 Rust 到 ANE",
      en: "From Rust to the Neural Engine",
    },
    steps: [
      {
        title: {
          zh: "公开调度和直接调用",
          en: "Public scheduling versus direct calls",
        },
        text: {
          zh: "公开框架里，Core ML 的 cpuAndNeuralEngine 允许同时使用 CPU 和 ANE，并不保证只跑在 ANE 上；MLX 主要面向 CPU 和 GPU，也不对应这套调度开关。本项目后续改用私有 AppleNeuralEngine.framework 直接向 ANE 提交执行请求。一旦提交或运行失败就会直接报错，不会悄悄回退到 CPU。",
          en: "In public frameworks, Core ML's cpuAndNeuralEngine permits both CPU and ANE without guaranteeing ANE-only execution, while MLX mainly targets CPU and GPU and does not use that scheduling switch. This project later uses the private AppleNeuralEngine.framework to submit requests directly to the ANE. If execution fails, it raises an error instead of falling back to the CPU.",
        },
        takeaway: {
          zh: "Core ML 不保证纯 ANE、MLX 偏重 CPU/GPU，本项目经私有框架直连 ANE，失败直接报错不回退 CPU。",
          en: "Core ML does not guarantee ANE-only execution and MLX targets CPU/GPU, so this project calls the private ANE framework directly and fails fast without CPU fallback.",
        },
      },
      {
        title: {
          zh: "三个文件，各有工作",
          en: "Three files, three jobs",
        },
        text: {
          zh: "这条链路的分工拆在三个文件里：ane_ops.rs 负责生成描述计算过程的 MIL 运算图，ane_runtime.rs 通过常驻的持久 worker 提交执行任务。native/ane_runtime.m 用来桥接私有框架，处理程序编译与复用、通过 IOSurface 传递张量数据，并调用 evaluateWithModel(request) 启动运行。所有张量计算逻辑由 MIL 描述，.m 文件只负责发起调用，不会在里面手写全部公式。",
          en: "Three files divide the work: ane_ops.rs builds the MIL computation graph, and ane_runtime.rs submits requests through a persistent worker. native/ane_runtime.m bridges the private framework to compile and reuse programs, transfer tensors over IOSurface, and execute them via evaluateWithModel(request). MIL defines the tensor operations while the .m file only handles invocation rather than implementing every tensor formula.",
        },
        takeaway: {
          zh: "ane_ops.rs 生成 MIL 算图，ane_runtime.rs 持久提交，native/ane_runtime.m 桥接框架并用 IOSurface 执行。",
          en: "ane_ops.rs emits MIL graphs, ane_runtime.rs submits via a persistent worker, and native/ane_runtime.m handles framework bridging and IOSurface execution.",
        },
      },
      {
        title: {
          zh: "权重是输入，程序复用",
          en: "Weights change; programs are reused",
        },
        text: {
          zh: "这个实现把矩阵权重当作运行时输入传入，所以只要矩阵形状相同，编译好的同一个 ANE 程序就可以复用到不同专家上。这个运行时将 IOSurface 中每行 fp16 数据按 64 字节对齐，因此会在行末做 padding。这里的对齐只影响行末填充，不会把逻辑矩阵形状改成 8×8，也不意味着所有矩阵都必须是 8×8。",
          en: "Because matrix weights are passed as runtime inputs, one compiled ANE program can be reused across different experts that share the same shape. This runtime aligns each fp16 IOSurface row to 64 bytes by adding padding in memory. This alignment only affects row padding; it does not turn the logical matrix shape into 8×8 or require every matrix to be 8×8.",
        },
        takeaway: {
          zh: "权重作为运行时输入可复用同形状 ANE 程序；IOSurface 的 64 字节行对齐靠 padding 实现，不改变逻辑形状。",
          en: "Passing weights as runtime inputs lets experts reuse same-shape ANE programs, and 64-byte IOSurface row padding does not alter logical matrix shapes.",
        },
      },
      {
        title: {
          zh: "完整链路的设备边界",
          en: "The boundary of the full ANE path",
        },
        text: {
          zh: "目前完整 40 层模型里的矩阵投影、norm、conv、RoPE 旋转、两种 attention、FFN、gate、加权求和与残差以及 lm_head，都已经提交到 ANE 上运行。CPU 端依然保留分词、读取文件并反量化和准备数据格式、embedding 查表、sin/cos 常量生成、索引搬运、topK/argmax 以及生成循环控制。因此跑通完整 ANE 链路并不等于整个程序完全不使用 CPU。",
          en: "In the full 40-layer path, projections, norms, convolutions, RoPE rotations, both attention types, FFNs, gates, weighted sums, residuals, and lm_head all run on the ANE. The CPU still handles tokenization, file loading, dequantization and format prep, embedding lookups, sin/cos constants, index moves, topK/argmax, and generation control. Running the full model on ANE does not mean the program uses zero CPU.",
        },
        takeaway: {
          zh: "40 层核心张量计算与 lm_head 均提交 ANE，CPU 仍负责分词、反量化准备、查表、选词和控制流程。",
          en: "Core tensor ops across all 40 layers and lm_head run on the ANE, while the CPU still handles tokenization, data prep, lookups, selection, and control flow.",
        },
      },
    ],
  },
  {
    id: "precision",
    title: {
      zh: "跑通之后，还要查什么？",
      en: "What to check after it runs",
    },
    steps: [
      {
        title: {
          zh: "同一个公式，不同舍入",
          en: "Same formula, different rounding",
        },
        text: {
          zh: "由于 fp16 能够表示的数值比 fp32 少很多，即便是等价的表达式，按不同顺序计算也会产生不同的舍入误差。比如 SiLU(g) = g*sigmoid(g) 和 (g/2)*(1+tanh(g/2)) 在数学上完全相等，放到具体设备上执行时的误差表现却可能不一样。这次实验里 tanh 写法的效果更好，但这并不代表它在每一种硬件上都更准确或更快。",
          en: "Because fp16 represents far fewer numbers than fp32, equivalent expressions can produce different rounding errors on hardware. Mathematically, SiLU(g) = g * sigmoid(g) equals (g/2) * (1 + tanh(g/2)), yet their numerical errors can differ on a device. The tanh form performed better in this run, which does not mean it is more accurate or faster on every piece of hardware.",
        },
        takeaway: {
          zh: "fp16 精度有限，数学等价的写法在设备上误差可能不同，单次设备的结论不能外推到全部硬件。",
          en: "Under fp16 rounding, mathematically identical formulas can differ in error, and one device's result does not generalize to all hardware.",
        },
      },
      {
        title: {
          zh: "归一化真的踩过坑",
          en: "A real normalization failure",
        },
        text: {
          zh: "为了避免数值溢出，归一化改用稳定缩放：先算 s=max(maxabs(x),sqrt(eps))，再求 small=x/s 与 ratio=sqrt(eps)/s，最后得到 output=small/sqrt(mean(small²)+ratio²)。本次把整段逻辑放进单张 ANE 图时出现中间量异常，拆成两次 ANE 请求先落地 small 和 ratio 后便通过测试。具体的内部编译原因尚未证实，期间 CPU 只负责转发数据，没有代算 norm。",
          en: "To avoid overflow, normalization uses stable scaling: s = max(maxabs(x), sqrt(eps)), small = x / s, ratio = sqrt(eps) / s, and output = small / sqrt(mean(small²) + ratio²). In this run, putting the whole formula in one ANE graph produced abnormal intermediates, whereas splitting it into two ANE requests to materialize small and ratio passed. The internal compiler cause is unconfirmed, and the CPU only forwards buffers without computing the norm.",
        },
        takeaway: {
          zh: "用稳定缩放拆成两次 ANE 请求落地 small 和 ratio 绕过了单图异常，CPU 只转发数据，不代算 norm。",
          en: "Splitting the stably scaled norm into two ANE requests to materialize small and ratio resolved the single-graph anomaly while the CPU only forwarded data.",
        },
      },
      {
        title: {
          zh: "输出文本不是精度证明",
          en: "Text output is not a precision test",
        },
        text: {
          zh: "在 M5 Pro 上用 qwen3.6-35b-a3b-oq4e-mtp 输入“你好，世界！”实测，完整词表 logits 相对 L2 误差为 2.85%，首步 top8 相同，但两步后 CPU 输出 \\n2、ANE 输出 \\n在。这两步共发起 36280 次 ANE 请求，当前只是教学实现，不能当成速度优化结论。这是早期纯 ANE 版本的记录；新增的缓存、并行与 GPU 常驻实现从第 13 章继续，仍需独立验证精度。",
          en: 'On M5 Pro with qwen3.6-35b-a3b-oq4e-mtp and input "你好，世界！", full-vocabulary logits show a 2.85% relative L2 difference and identical first-step top 8, yet two-step output diverges: \\n2 on CPU versus \\n在 on ANE. Those two steps issue 36280 ANE requests, reflecting a teaching implementation rather than a speed benchmark. This is the early pure-ANE snapshot. Chapters 13–16 cover newer caching, parallelism, and resident GPU work, each requiring its own accuracy checks.',
        },
        takeaway: {
          zh: "文本偶尔一致或分叉都不能替代 logits 误差检验，新增优化也要针对自己的路径验证数值。",
          en: "Generated text alone cannot prove numerical accuracy; each newer optimized path needs its own numerical checks.",
        },
      },
    ],
  },
];

curriculum.push(...advancedLessons);
