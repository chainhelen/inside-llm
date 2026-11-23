const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("fs");
fs.mkdirSync("test-results", { recursive: true });
const base = process.env.SITE_URL || "http://127.0.0.1:5174/";
(async () => {
  const browser = await chromium.launch({
    ...(process.env.CHROME_PATH
      ? { executablePath: process.env.CHROME_PATH }
      : process.platform === "darwin"
        ? { channel: "chrome" }
        : {}),
    headless: true,
    args: ["--disable-gpu"],
  });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const ids = [
      "tokens",
      "matrix",
      "norm",
      "heads",
      "attention",
      "linear",
      "router",
      "experts",
      "generation",
      "gpu",
      "ane",
      "precision",
    ],
    counts = [3, 3, 3, 3, 4, 4, 3, 4, 3, 3, 4, 3];
  let checked = 0;
  await page.goto(base, { waitUntil: "networkidle" });
  assert.equal(await page.locator("html").getAttribute("lang"), "en");
  await page.getByRole("button", { name: "切换到中文" }).click();
  await page.reload();
  assert.equal(await page.locator("html").getAttribute("lang"), "zh-CN");
  for (const lang of ["zh", "en"]) {
    if (lang === "en")
      await page.getByRole("button", { name: "Switch to English" }).click();
    for (let i = 0; i < ids.length; i++)
      for (let st = 1; st <= counts[i]; st++) {
        await page.evaluate(
          (hash) => (location.hash = hash),
          `/learn/${ids[i]}/${st}`,
        );
        await page.waitForFunction(
          ([id, st]) =>
            location.hash.endsWith(`${id}/${st}`) &&
            document
              .querySelector(".stepper-head")
              .textContent.includes(`STEP ${st} /`),
          [ids[i], st],
        );
        await page.locator("#diagram svg").waitFor();
        assert.ok((await page.locator("#formula").innerText()).length > 3);
        const inputs = await page.locator("#controls input").count();
        for (let k = 0; k < inputs; k++) {
          const slider = page.locator("#controls input").nth(k);
          await slider.evaluate((el) => {
            el.value = el.max;
            el.dispatchEvent(new Event("input", { bubbles: true }));
          });
        }
        assert.ok(
          !/NaN|undefined|Infinity/.test(
            await page.locator("#diagram").innerText(),
          ),
        );
        await page.locator("#code-tab").click();
        assert.ok((await page.locator("pre").innerText()).length > 20);
        await page.locator("#explain-tab").click();
        checked++;
      }
  }
  await page.locator("#search").click();
  await page.locator("#query").fill("nonsense-no-match");
  assert.equal(await page.locator("[data-hit]").count(), 0);
  await page.locator("#query").fill("RMSNorm");
  assert.ok((await page.locator("[data-hit]").count()) > 0);
  await page.locator("[data-hit]").first().click();
  assert.equal(await page.locator("#modal").evaluate((el) => el.open), false);
  await page.locator("#cheatsheet").click();
  assert.equal(await page.locator("#modal table").count(), 3);
  await page.keyboard.press("Escape");
  await page.evaluate(() => (location.hash = "/learn/matrix/1"));
  await page.waitForTimeout(100);
  const initial = await page.locator("#formula").innerText();
  await page.locator("#param-0").fill("3");
  await page.locator("#param-0").dispatchEvent("input");
  assert.notEqual(await page.locator("#formula").innerText(), initial);
  await page.locator("#reset").click();
  assert.equal(await page.locator("#param-0").inputValue(), "1");
  await page.locator("#play").click();
  await page.waitForTimeout(950);
  assert.notEqual(await page.locator("#param-0").inputValue(), "1");
  await page.locator("#play").click();
  await page.getByRole("button", { name: "切换到中文" }).click();
  await page.evaluate(() => (location.hash = "/learn/tokens/1"));
  await page.waitForTimeout(300);
  await page.screenshot({ path: "test-results/desktop.png" });
  await page.evaluate(() => (location.hash = "/learn/experts/4"));
  await page.waitForTimeout(150);
  await page.locator('[data-answer="0"]').click();
  assert.ok((await page.locator("#quiz-result").innerText()).startsWith("对"));
  await page.locator("#next").click();
  assert.ok(
    await page.evaluate(() =>
      JSON.parse(localStorage.getItem("inside-llm-completed")).includes(
        "experts",
      ),
    ),
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => (location.hash = "/learn/heads/2"));
  await page.waitForTimeout(500);
  await page.screenshot({ path: "test-results/mobile.png", fullPage: true });
  assert.equal(await page.evaluate(() => document.body.scrollWidth), 390);
  await page.locator("#menu").click();
  assert.equal(await page.locator(".sidebar").isVisible(), true);
  await page.locator('[data-chapter="11"]').click();
  assert.equal(await page.locator(".sidebar").isVisible(), false);
  await page.reload();
  assert.ok(page.url().includes("precision/1"));
  await page.getByRole("button", { name: "Switch to English" }).click();
  await page.waitForTimeout(200);
  await page.screenshot({ path: "test-results/mobile-en.png", fullPage: true });
  assert.equal(await page.evaluate(() => document.body.scrollWidth), 390);
  assert.deepEqual(errors, []);
  console.log(
    JSON.stringify(
      {
        checkedSteps: checked,
        errors,
        search: true,
        reference: true,
        slider: true,
        playReset: true,
        quiz: true,
        progress: true,
        mobile: true,
      },
      null,
      2,
    ),
  );
  await browser.close();
})();
