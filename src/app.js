import { curriculum } from "./content.js";
import { draw, controls, escape as e } from "./scenes.js";
import { code, quizzes } from "./code.js";
const $ = (s) => document.querySelector(s),
  all = (s) => [...document.querySelectorAll(s)];
const safeGet = (k, f) => {
    try {
      return JSON.parse(localStorage.getItem(k)) ?? f;
    } catch {
      return f;
    }
  },
  save = (k, v) => {
    try {
      localStorage.setItem(k, JSON.stringify(v));
    } catch {}
  };
let lang = safeGet("inside-llm-language", "zh");
if (!["zh", "en"].includes(lang)) lang = "zh";
let completed = safeGet("inside-llm-completed", []);
if (!Array.isArray(completed)) completed = [];
completed = completed.filter((x) => curriculum.some((c) => c.id === x));
let ci = 0,
  si = 0,
  tab = "explain",
  values = [],
  timer = null,
  menu = false;
const t = (zh, en) => (lang === "zh" ? zh : en);
const pick = (o) => o[lang];
const TOTAL = curriculum.reduce((n, c) => n + c.steps.length, 0);
function route() {
  const parts = location.hash.replace(/^#\/?/, "").split("/");
  const at = parts[0] === "learn" ? parts[1] : "tokens";
  ci = Math.max(
    0,
    curriculum.findIndex((c) => c.id === at),
  );
  const step = Number(parts[2] || 1);
  si = Number.isInteger(step)
    ? Math.max(0, Math.min(curriculum[ci].steps.length - 1, step - 1))
    : 0;
  values = controls(curriculum[ci].id, si).map((c) => c.value);
  save("inside-llm-last", `${curriculum[ci].id}/${si + 1}`);
  render();
}
function go(ch, st) {
  stop();
  menu = false;
  $(".sidebar")?.classList.remove("open");
  $("#menu")?.setAttribute("aria-expanded", "false");
  const hash = `#/learn/${curriculum[ch].id}/${st + 1}`;
  if (location.hash === hash) route();
  else location.hash = hash;
  window.scrollTo(0, 0);
}
function stop() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
  const b = $("#play");
  if (b) b.textContent = t("播放", "Play");
}
function next() {
  const c = curriculum[ci];
  if (si < c.steps.length - 1) go(ci, si + 1);
  else {
    if (!completed.includes(c.id)) {
      completed.push(c.id);
      save("inside-llm-completed", completed);
    }
    if (ci < curriculum.length - 1) go(ci + 1, 0);
    else {
      render();
      openComplete();
    }
  }
}
function prev() {
  if (si > 0) go(ci, si - 1);
  else if (ci > 0) go(ci - 1, curriculum[ci - 1].steps.length - 1);
}
function render() {
  document.documentElement.lang = lang === "zh" ? "zh-CN" : "en";
  const c = curriculum[ci],
    step = c.steps[si];
  document.title = `${pick(step.title)} · ${t("模型拆解室", "Inside an LLM")}`;
  $("#app").innerHTML =
    `<header class="topbar"><button class="mobile-menu" id="menu" aria-label="${t("打开课程目录", "Open curriculum")}" aria-expanded="${menu}">☰</button><a class="brand" href="#/learn/tokens/1"><img src="./favicon.svg" alt=""><span><strong>${t("模型拆解室", "Inside an LLM")}</strong><small>${t("INSIDE AN LLM", "模型拆解室")}</small></span></a><span class="eyebrow top-course">${t("从 TOKEN 到 ANE", "FROM TOKEN TO ANE")}</span><nav class="toplinks" aria-label="${t("工具", "Tools")}"><button id="search" class="search">${t("搜索课程", "Search lessons")} <span class="key">/</span></button><button id="cheatsheet">${t("速查", "Reference")}</button><button id="language" aria-label="${t("Switch to English", "切换到中文")}">${t("EN", "中文")}</button><button id="theme" aria-label="${t("切换明暗主题", "Toggle light or dark theme")}">◐</button><a class="repo" href="https://github.com/chainhelen/inside-llm" target="_blank" rel="noopener">GitHub</a><button id="about" class="about">${t("关于", "About")}</button></nav></header>
<div class="layout"><aside class="sidebar ${menu ? "open" : ""}" aria-label="${t("课程目录", "Curriculum")}"><div class="side-title"><strong>${t("课程目录", "Curriculum")}</strong><span class="eyebrow">12 ${t("章", "chapters")} · ${TOTAL} ${t("步", "steps")}</span></div><nav class="chapter-list">${curriculum.map((ch, i) => `${[0, 3, 6, 9].includes(i) ? `<div class="part">${[t("01 / 看懂数字", "01 / READ THE NUMBERS"), t("02 / 看见注意力", "02 / SEE ATTENTION"), t("03 / 拼成语言模型", "03 / BUILD THE MODEL"), t("04 / 交给硬件计算", "04 / SEND IT TO HARDWARE")][Math.floor(i / 3)]}</div>` : ""}<button class="chapter ${i === ci ? "current" : ""}" data-chapter="${i}" ${i === ci ? 'aria-current="page"' : ""}><span class="num">${String(i + 1).padStart(2, "0")}</span><span class="label">${e(pick(ch.title))}</span><span class="tick">${completed.includes(ch.id) ? "✓" : ""}</span></button>`).join("")}</nav><div class="mobile-tools"><button id="side-search">${t("搜索", "Search")}</button><button id="side-reference">${t("速查", "Reference")}</button><button id="side-about">${t("关于", "About")}</button></div><div class="progress"><span>${t("已完成", "Completed")} ${completed.length} / 12</span><div class="progress-line"><i style="width:${(completed.length / 12) * 100}%"></i></div><div class="model-note">${t("基于一次真实的 Rust 推理实现", "Based on a real Rust inference implementation")}<br>Qwen · 2048 hidden · 40 layers</div></div></aside>
<main class="lesson" id="lesson"><div class="breadcrumb"><span>${String(ci + 1).padStart(2, "0")} / ${String(12).padStart(2, "0")}</span><span>·</span><span>${t("边看边动手", "LEARN BY MOVING THINGS")}</span></div><div class="lesson-heading"><h1>${e(pick(c.title))}</h1><span class="tag">${si + 1} / ${c.steps.length}</span></div><section class="stage" aria-label="${t("交互实验", "Interactive experiment")}"><div class="stage-toolbar"><span class="status"><i class="dot"></i>${e(pick(step.title))}</span><span><button id="reset">${t("重置", "Reset")}</button> <button id="play">${timer ? t("暂停", "Pause") : t("播放", "Play")}</button></span></div><div class="svg-wrap" id="diagram"></div><div class="mobile-hint">${t("图可左右滑动查看", "Scroll the diagram horizontally")}</div><div id="controls">${controls(
      c.id,
      si,
    )
      .map(
        (co, i) =>
          `<div class="lab-controls"><label for="param-${i}">${e(pick(co.label))}</label><input id="param-${i}" type="range" min="${co.min}" max="${co.max}" step="${co.step}" value="${values[i]}"><output for="param-${i}">${values[i]}</output></div>`,
      )
      .join(
        "",
      )}</div><div class="formula" id="formula" aria-live="polite"></div><div class="legend"><span><i style="background:#d9e7f5"></i>${t("输入 / 数据", "Input / data")}</span><span><i style="background:#e9dff4"></i>${t("权重 / 运算", "Weight / operation")}</span><span><i style="background:#f8dfbd"></i>${t("比例 / 门控", "Ratio / gate")}</span><span><i style="background:#dcebdc"></i>${t("结果 / 当前", "Result / current")}</span></div></section><section class="stepper" aria-label="${t("本章步骤", "Chapter steps")}"><div class="stepper-head"><span>${t("本章步骤", "IN THIS CHAPTER")}</span><span>STEP ${si + 1} / ${c.steps.length}</span></div><div class="steps">${c.steps.map((st, i) => `<button class="${i === si ? "active" : ""}" data-step="${i}" ${i === si ? 'aria-current="step"' : ""}><span class="circle">${i + 1}</span><span class="step-text">${e(pick(st.title))}</span></button>`).join("")}</div></section></main>
<aside class="reader" aria-label="${t("当前步骤解释", "Current step explanation")}"><div class="reader-top"><button class="${tab === "explain" ? "active" : ""}" id="explain-tab">${t("讲清楚", "Explanation")}</button><button class="${tab === "code" ? "active" : ""}" id="code-tab">${t("对应代码", "Code")}</button></div><div class="reader-body" id="reader-body">${reader(c, step)}</div><footer class="reader-footer"><div class="reader-nav"><button id="previous" ${ci === 0 && si === 0 ? "disabled" : ""}>${t("上一步", "Previous")}</button><button id="next" class="primary">${si === c.steps.length - 1 ? t(ci === 11 ? "完成教程" : "完成本章", ci === 11 ? "Finish course" : "Finish chapter") : t("下一步", "Next step")}</button></div><div class="shortcuts">← → ${t("切步", "steps")} · Space ${t("播放", "play")} · R ${t("重置", "reset")}</div></footer></aside></div><dialog id="modal" class="modal"></dialog>`;
  bind();
  updateDiagram();
}
function reader(c, step) {
  let content = `<div class="eyebrow">STEP ${si + 1} / ${c.steps.length}</div><div class="step-meter">${c.steps.map((_, i) => `<span class="${i <= si ? "on" : ""}"></span>`).join("")}</div><h2>${e(pick(step.title))}</h2>`;
  if (tab === "explain")
    content += `<p>${e(pick(step.text))}</p><div class="takeaway"><strong>${t("记住这一点", "KEEP THIS IN MIND")}</strong><p>${e(pick(step.takeaway))}</p></div>`;
  else
    content += `<div class="source-label">${e(code[c.id][0])}</div><p class="code-note">${t("下面是与实现对应的教学伪代码，省略错误处理和设备分派；用于对照计算，不是可直接替换的源码。", "Teaching equivalents of the implementation, with error handling and device dispatch omitted. These explain the computation; they are not replacement source code.")}</p><pre><code>${e(code[c.id][1][si])}</code></pre><button id="copy-code">${t("复制片段", "Copy snippet")}</button>`;
  if (si === c.steps.length - 1) {
    const q = quizzes[c.id],
      li = lang === "zh" ? 0 : 1;
    content += `<div class="quiz"><p><strong>${t("确认一下", "Quick check")}</strong><br>${e(q.q[li])}</p>${q.a.map((a, i) => `<button data-answer="${i}">${e(a[li])}</button>`).join("")}<div class="result" id="quiz-result" aria-live="polite"></div></div>`;
  }
  return content;
}
function bind() {
  all("[data-chapter]").forEach(
    (b) => (b.onclick = () => go(+b.dataset.chapter, 0)),
  );
  all("[data-step]").forEach(
    (b) => (b.onclick = () => go(ci, +b.dataset.step)),
  );
  $("#next").onclick = next;
  $("#previous").onclick = prev;
  $("#language").onclick = () => {
    lang = lang === "zh" ? "en" : "zh";
    save("inside-llm-language", lang);
    render();
  };
  $("#theme").onclick = () => {
    const dark = document.documentElement.dataset.theme !== "dark";
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    save("inside-llm-theme", dark ? "dark" : "light");
  };
  $("#menu").onclick = () => {
    menu = !menu;
    $(".sidebar").classList.toggle("open", menu);
    $("#menu").setAttribute("aria-expanded", menu);
  };
  $("#explain-tab").onclick = () => {
    tab = "explain";
    render();
  };
  $("#code-tab").onclick = () => {
    tab = "code";
    render();
  };
  $("#reset").onclick = reset;
  $("#play").onclick = togglePlay;
  $("#search").onclick = openSearch;
  $("#cheatsheet").onclick = openReference;
  $("#about").onclick = openAbout;
  $("#side-search").onclick = openSearch;
  $("#side-reference").onclick = openReference;
  $("#side-about").onclick = openAbout;
  all("#controls input").forEach(
    (input, i) =>
      (input.oninput = () => {
        stop();
        values[i] = +input.value;
        input.nextElementSibling.textContent = input.value;
        updateDiagram();
      }),
  );
  all("[data-answer]").forEach(
    (b) =>
      (b.onclick = () => {
        const q = quizzes[curriculum[ci].id],
          ok = +b.dataset.answer === q.correct;
        b.classList.remove("wrong", "correct");
        b.classList.add(ok ? "correct" : "wrong");
        $("#quiz-result").textContent = ok
          ? t(
              "对，这一步你已经分清楚了。",
              "Correct. You have the distinction.",
            )
          : t(
              "再看一下这一步的图和形状，换个答案试试。",
              "Look at the diagram and shapes again, then try another answer.",
            );
      }),
  );
  if ($("#copy-code"))
    $("#copy-code").onclick = async () => {
      try {
        await navigator.clipboard.writeText(code[curriculum[ci].id][1][si]);
        $("#copy-code").textContent = t("已复制", "Copied");
      } catch {
        $("#copy-code").textContent = t(
          "请选中片段复制",
          "Select the snippet to copy",
        );
      }
    };
}
function updateDiagram() {
  const result = draw(curriculum[ci].id, si, values, lang);
  $("#diagram").innerHTML = result.svg;
  $("#formula").textContent = result.formula;
}
function reset() {
  stop();
  values = controls(curriculum[ci].id, si).map((c) => c.value);
  render();
}
function togglePlay() {
  if (timer) {
    stop();
    return;
  }
  const config = controls(curriculum[ci].id, si)[0];
  $("#play").textContent = t("暂停", "Pause");
  timer = setInterval(() => {
    values[0] = Math.round((values[0] + config.step) * 100) / 100;
    if (values[0] > config.max) values[0] = config.min;
    $("#param-0").value = values[0];
    $("#param-0").nextElementSibling.textContent = values[0];
    updateDiagram();
  }, 850);
}
function modal(title, body) {
  stop();
  const m = $("#modal");
  m.innerHTML = `<div class="modal-head"><h2>${e(title)}</h2><button id="close-modal" aria-label="${t("关闭", "Close")}">✕</button></div>${body}`;
  m.showModal();
  $("#close-modal").onclick = () => m.close();
  m.addEventListener("click", (ev) => {
    if (ev.target === m) {
      const r = m.getBoundingClientRect();
      if (
        ev.clientX < r.left ||
        ev.clientX > r.right ||
        ev.clientY < r.top ||
        ev.clientY > r.bottom
      )
        m.close();
    }
  });
}
function openSearch() {
  modal(
    t("查一个概念", "Find a concept"),
    `<input id="query" type="search" placeholder="${t("例如：gate、多头、矩阵、ANE", "Try: gate, heads, matrix, ANE")}" aria-label="${t("搜索课程", "Search lessons")}"><div id="search-results" class="search-results"></div>`,
  );
  const show = () => {
    const q = $("#query").value.toLowerCase().trim();
    const hits = [];
    curriculum.forEach((c, ch) =>
      c.steps.forEach((s, st) => {
        if (!q || JSON.stringify([c.title, s]).toLowerCase().includes(q))
          hits.push({ c, s, ch, st });
      }),
    );
    $("#search-results").innerHTML = hits.length
      ? hits
          .map(
            (h) =>
              `<button data-hit="${h.ch},${h.st}">${e(pick(h.s.title))}<small>${e(pick(h.c.title))} · ${h.st + 1}/${h.c.steps.length}</small></button>`,
          )
          .join("")
      : `<p class="no-results">${t("没有找到，试试更短的词。", "No matches. Try a shorter term.")}</p>`;
    all("[data-hit]").forEach(
      (b) =>
        (b.onclick = () => {
          const [ch, st] = b.dataset.hit.split(",").map(Number);
          $("#modal").close();
          go(ch, st);
        }),
    );
  };
  $("#query").oninput = show;
  show();
  $("#query").focus();
}
function openReference() {
  modal(
    t("随时回来查", "Keep this nearby"),
    `<h3>${t("先分清三种乘法", "Three kinds of multiplication")}</h3><table><tr><th>${t("符号", "Operation")}</th><th>${t("形状", "Shapes")}</th><th>${t("例子", "Example")}</th></tr><tr><td>× matrix</td><td>[1,H] × [H,O] → [1,O]</td><td>project(input)</td></tr><tr><td>⊙ elementwise</td><td>[1,M] ⊙ [1,M] → [1,M]</td><td>SiLU(gate) ⊙ up</td></tr><tr><td>× scalar</td><td>[1,H] × s → [1,H]</td><td>shared_output × sigmoid(logit)</td></tr></table><h3>${t("四个函数", "Four functions")}</h3><table><tr><th>${t("名称", "Name")}</th><th>${t("怎么算", "Formula")}</th><th>${t("作用", "Use")}</th></tr><tr><td>sigmoid</td><td>1 / (1 + e⁻ˣ)</td><td>${t("一个数变成 0~1", "One value to 0–1")}</td></tr><tr><td>SiLU</td><td>x × sigmoid(x)</td><td>${t("逐元素非线性", "Elementwise nonlinearity")}</td></tr><tr><td>softmax</td><td>eˣⁱ / Σeˣʲ</td><td>${t("整组分配比例，总和 1", "Group proportions, sum 1")}</td></tr><tr><td>RMSNorm</td><td>(x / √(mean(x²)+ε)) ⊙ γ</td><td>${t("先归一尺度，再乘学习权重", "Normalize scale, then learned weights")}</td></tr></table><h3>${t("本模型的两套 attention", "Two attention shapes in this model")}</h3><table><tr><th></th><th>Q / K</th><th>V</th></tr><tr><td>Full</td><td>Q: 16×256 · K: 2×256</td><td>2×256</td></tr><tr><td>Linear</td><td>16×128</td><td>32×128</td></tr></table><p>${t("这些是本教程所用 checkpoint 的尺寸，不是所有 LLM 的统一规定。所有乘法图统一使用 input × W 的逻辑形状。", "These dimensions belong to the checkpoint used here, not every LLM. All multiplication diagrams use logical input × W shapes.")}</p>`,
  );
}
function openAbout() {
  modal(
    t("模型拆解室 · 关于这份教程", "Inside an LLM · About"),
    `<p>${t("这份教程来自一次从零阅读 Rust 推理代码的学习过程。目录围绕真实困惑重排：先弄清数字和形状，再理解 attention / FFN，最后把计算交给 GPU 与 ANE。", "This tutorial grew out of learning to read a Rust inference implementation from scratch. It follows the questions that caused confusion: numbers and shapes first, attention and FFNs next, and GPU / ANE execution last.")}</p><p>${t("交互图中的小矩阵在浏览器计算，不运行完整 LLM，也不调用你的 ANE。大模型形状来自 qwen3.6-35b-a3b-oq4e-mtp；实机结果是 M5 Pro 上的一次记录。文案使用 Gemini 协助改写，并经技术核对。", "Small matrices are computed in the browser; this site does not run the full LLM or access your ANE. Model dimensions come from qwen3.6-35b-a3b-oq4e-mtp. Hardware measurements describe one M5 Pro run. Gemini assisted with wording; the content was technically reviewed.")}</p><p>${t("布局参考了 Pi Visualizer 的目录、分步图和解释面板。此站是独立实现，内容与交互图均重新制作。", "The curriculum, stepwise visualization, and explanation layout were inspired by Pi Visualizer. This is an independent implementation with original content and diagrams.")}</p><p><a href="https://pi-visualizer-lemon.vercel.app/#/learn/why-pi/1" target="_blank" rel="noopener">Pi Visualizer</a> · <a href="https://github.com/nace-ai/kapitsa" target="_blank" rel="noopener">Kapitsa</a> · <a href="https://apple.github.io/coremltools/source/coremltools.converters.mil.mil.ops.defs.html" target="_blank" rel="noopener">Apple MIL reference</a></p><p><a href="https://github.com/chainhelen/inside-llm" target="_blank" rel="noopener">${t("开源代码 · MIT", "Source code · MIT")}</a> · <a href="/games/">${t("更多交互实验", "More interactive experiments")}</a></p><p>${t("语言、学习进度和主题只保存在这个浏览器，没有分析脚本或账号。", "Language, progress, and theme stay in this browser. No analytics scripts or account.")}</p><button id="reset-progress">${t("清除本机学习进度", "Clear local learning progress")}</button>`,
  );
  $("#reset-progress").onclick = () => {
    completed = [];
    save("inside-llm-completed", []);
    $("#modal").close();
    render();
  };
}
function openComplete() {
  modal(
    t("从 token，走到了 ANE", "From a token to the ANE"),
    `<div class="completion"><div class="big">${completed.length} / 12</div><p>${t("你已经走到了当前实现的终点。接下来可以回看不熟悉的图，或从缓存与算子融合继续实验。", "You have reached the current implementation. Revisit the diagrams, or continue experimenting with caching and operator fusion.")}</p><button id="review" class="primary">${t("回到课程目录", "Return to curriculum")}</button></div>`,
  );
  $("#review").onclick = () => {
    $("#modal").close();
    go(0, 0);
  };
}
document.documentElement.dataset.theme = safeGet("inside-llm-theme", "light");
window.addEventListener("hashchange", () => {
  stop();
  route();
});
window.addEventListener("keydown", (ev) => {
  if (
    $("#modal")?.open ||
    ev.target.matches("input,textarea,select") ||
    ev.metaKey ||
    ev.ctrlKey ||
    ev.altKey
  )
    return;
  if (ev.key === "ArrowRight") {
    ev.preventDefault();
    next();
  } else if (ev.key === "ArrowLeft") {
    ev.preventDefault();
    prev();
  } else if (ev.key === " " && !ev.target.matches("button,a")) {
    ev.preventDefault();
    togglePlay();
  } else if (ev.key.toLowerCase() === "r") {
    reset();
  } else if (ev.key === "/") {
    ev.preventDefault();
    openSearch();
  }
});
window.addEventListener("pagehide", stop);
if (!location.hash) {
  const last = safeGet("inside-llm-last", "tokens/1");
  history.replaceState(
    null,
    "",
    `#/learn/${typeof last === "string" ? last : "tokens/1"}`,
  );
}
route();
