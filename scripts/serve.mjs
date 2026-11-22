import http from "node:http";
import fs from "node:fs";
import path from "node:path";
const root = path.resolve(process.argv.includes("--dist") ? "dist" : "."),
  port = Number(process.env.PORT || 5174);
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".svg": "image/svg+xml",
};
http
  .createServer((req, res) => {
    let pathname;
    try {
      pathname = decodeURIComponent(
        new URL(req.url, "http://localhost").pathname,
      );
    } catch {
      res.writeHead(400);
      res.end();
      return;
    }
    const file = path.resolve(
      root,
      "." + (pathname.endsWith("/") ? pathname + "index.html" : pathname),
    );
    if (
      !file.startsWith(root + path.sep) ||
      pathname.split("/").some((p) => p.startsWith("."))
    ) {
      res.writeHead(403);
      res.end();
      return;
    }
    fs.readFile(file, (err, data) => {
      if (err) {
        res.writeHead(404);
        res.end("Not found");
        return;
      }
      res.writeHead(200, {
        "Content-Type": types[path.extname(file)] || "application/octet-stream",
        "Cache-Control": "no-store",
      });
      res.end(data);
    });
  })
  .listen(port, "127.0.0.1", () => console.log(`http://127.0.0.1:${port}`));
