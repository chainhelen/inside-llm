import fs from "node:fs";
import path from "node:path";
fs.mkdirSync("dist", { recursive: true });
for (const f of ["index.html", "style.css", "favicon.svg", "src"])
  fs.cpSync(f, path.join("dist", f), { recursive: true });
console.log("Built self-contained static site in dist/");
