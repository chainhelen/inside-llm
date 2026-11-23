const { chromium } = require("playwright");
const fs = require("fs");
const assert = require("node:assert/strict");
fs.mkdirSync("test-results", { recursive: true });
(async () => {
  const browser = await chromium.launch({
    ...(process.env.CHROME_PATH
      ? { executablePath: process.env.CHROME_PATH }
      : process.platform === "darwin"
        ? { channel: "chrome" }
        : {}),
    headless: true,
  });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  await page.goto(process.env.SITE_URL || "http://127.0.0.1:5174/");
  const { curriculum } = await import("../src/content.js");
  const issues = [];
  for (const lang of ["en", "zh"]) {
    if (lang === "zh")
      await page.getByRole("button", { name: "切换到中文" }).click();
    for (const id of ["cache", "parallel", "resident", "verification"])
      for (let step = 1; step <= 4; step++) {
        await page.evaluate(
          (hash) => (location.hash = hash),
          `/learn/${id}/${step}`,
        );
        await page.waitForTimeout(70);
        const bad = await page.locator("#diagram svg").evaluate((svg) =>
          [...svg.querySelectorAll("text")]
            .map((t) => ({ text: t.textContent, b: t.getBBox() }))
            .filter(
              ({ b }) =>
                b.x < 0 ||
                b.x + b.width > 760 ||
                b.y < 0 ||
                b.y + b.height > 460,
            )
            .map(({ text, b }) => ({ text, x: b.x, w: b.width })),
        );
        if (bad.length) issues.push({ id, step, lang, bad });
        await page
          .locator("#diagram")
          .screenshot({ path: `test-results/${id}-${step}-${lang}.png` });
      }
  }
  const oldIds = curriculum.slice(0, 12).map((c) => c.id);
  await page.evaluate((ids) => {
    localStorage.setItem("inside-llm-completed", JSON.stringify(ids));
    location.hash = "/learn/precision/4";
  }, oldIds);
  await page.reload();
  await page.locator("#next").click();
  if (!page.url().endsWith("cache/1")) throw Error("old-to-new navigation");
  await page.evaluate(() => (location.hash = "/learn/verification/4"));
  await page.waitForTimeout(100);
  await page.locator("#next").click();
  assert.equal(await page.locator("#modal").evaluate((el) => el.open), true);
  assert.equal(await page.locator(".completion .big").innerText(), "13 / 16");
  await page.keyboard.press("Escape");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => (location.hash = "/learn/resident/3"));
  await page.waitForTimeout(200);
  await page.screenshot({
    path: "test-results/advanced-mobile.png",
    fullPage: true,
  });
  if ((await page.evaluate(() => document.body.scrollWidth)) > 390)
    throw Error("mobile overflow");
  assert.deepEqual(issues, []);
  console.log(
    JSON.stringify(
      { issues, migration: true, completion: true, mobile: true },
      null,
      2,
    ),
  );
  await browser.close();
})();
