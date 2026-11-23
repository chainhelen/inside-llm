import test from "node:test";
import assert from "node:assert/strict";
import { curriculum } from "../src/content.js";
import { draw, controls } from "../src/scenes.js";
import { code, quizzes } from "../src/code.js";
test("all bilingual steps have a diagram and matching code", () => {
  assert.equal(curriculum.length, 16);
  assert.equal(
    curriculum.reduce((s, c) => s + c.steps.length, 0),
    56,
  );
  for (const c of curriculum) {
    assert.equal(code[c.id][1].length, c.steps.length);
    assert.ok(quizzes[c.id]);
    c.steps.forEach((s, i) => {
      for (const lang of ["zh", "en"]) {
        for (const field of ["title", "text", "takeaway"])
          assert.ok(s[field][lang].length > 0);
        const settings = controls(c.id, i);
        for (const bound of ["min", "value", "max"]) {
          const result = draw(
            c.id,
            i,
            settings.map((x) => x[bound]),
            lang,
          );
          assert.ok(result.svg.includes("<svg"));
          assert.ok(
            !/NaN|undefined|Infinity/.test(result.svg + result.formula),
            `${c.id}/${i}/${lang}/${bound}`,
          );
        }
      }
    });
  }
});
test("every visible slider changes the diagram or formula", () => {
  for (const c of curriculum)
    c.steps.forEach((_, i) => {
      const configs = controls(c.id, i);
      configs.forEach((co, index) => {
        const values = configs.map((x) => x.value);
        values[index] = co.min;
        const a = JSON.stringify(draw(c.id, i, values));
        values[index] = co.max;
        const b = JSON.stringify(draw(c.id, i, values));
        assert.notEqual(a, b, `${c.id}/${i}/control ${index}`);
      });
    });
});
