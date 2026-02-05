/**
 * Pyducation packaging + local tooling script.
 *
 * Why this exists:
 * - Bundles `src/index.html` into a self-contained `dist/index.html` by inlining CSS/JS.
 * - Optionally stages Pyodide runtime assets for offline usage.
 * - Provides lightweight evaluation/dev tooling (verify + local HTTP server).
 *
 * No external deps required. If `esbuild` is installed, JS will be minified.
 */

const fs = require("fs");
const path = require("path");
const https = require("https");
const http = require("http");
const readline = require("readline");
const { spawn } = require("child_process");

const PYODIDE_VERSION = "0.29.3";
const PYODIDE_CDN_BASE = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;
const PYODIDE_ASSETS = ["pyodide.js", "pyodide.asm.wasm", "python_stdlib.zip"];

const CSS_BUNDLE_ORDER = [
  "pyducation.theme.css",
  "pyducation.base.css",
  "pyducation.window.css",
  "pyducation.explorer.css"
];

const JS_BUNDLE_ORDER = [
  "pyodide.js",
  "pyducation.state.js",
  "pyducation.data.js",
  "pyducation.tables.js",
  "pyducation.windowing.js",
  "pyducation.repl.js",
  "pyducation.theme.js",
  "pyducation.main.js"
];

/**
 * @param {{rootDir?: string}} [options]
 */
function createProjectContext({ rootDir = process.cwd() } = {}) {
  const srcDir = path.join(rootDir, "src");
  const distDir = path.join(rootDir, "dist");
  const srcHtml = path.join(srcDir, "index.html");
  const distHtml = path.join(distDir, "index.html");
  const cssFiles = CSS_BUNDLE_ORDER.map((f) => path.join(srcDir, f));
  const jsFiles = JS_BUNDLE_ORDER.map((f) => path.join(srcDir, f));

  return {
    rootDir,
    srcDir,
    distDir,
    srcHtml,
    distHtml,
    cssFiles,
    jsFiles,
    pyodideVersion: PYODIDE_VERSION,
    pyodideCdnBase: PYODIDE_CDN_BASE,
    pyodideAssets: PYODIDE_ASSETS
  };
}

function minifyCss(code) {
  return code
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\s+/g, " ")
    .replace(/\s*([{}:;,])\s*/g, "$1")
    .replace(/;}/g, "}")
    .trim();
}

/**
 * @param {string} code
 * @param {{mode?: "auto" | "off"}} [options]
 */
async function minifyJs(code, { mode = "auto" } = {}) {
  if (mode === "off") return code;
  try {
    const esbuild = require("esbuild");
    const result = await esbuild.transform(code, {
      minify: true,
      loader: "js",
      format: "iife",
      target: "es2017"
    });
    return result.code;
  } catch (err) {
    console.warn("[warn] esbuild not available - skipping JS minification.");
    return code;
  }
}

function fileExists(p) {
  try {
    fs.accessSync(p);
    return true;
  } catch {
    return false;
  }
}

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function validateSourceFiles(ctx) {
  if (!fileExists(ctx.srcHtml)) {
    throw new Error("src/index.html not found.");
  }
  ctx.cssFiles.forEach((f) => {
    if (!fileExists(f)) {
      throw new Error(`Missing CSS file: ${path.basename(f)}`);
    }
  });
  ctx.jsFiles.forEach((f) => {
    if (!fileExists(f)) {
      throw new Error(`Missing JS file: ${path.basename(f)}`);
    }
  });
}

function downloadFile(url, dest, redirectsLeft = 5) {
  return new Promise((resolve, reject) => {
    ensureDir(path.dirname(dest));
    const req = https.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume();
        if (redirectsLeft <= 0) {
          reject(new Error(`Too many redirects for ${url}`));
          return;
        }
        resolve(downloadFile(res.headers.location, dest, redirectsLeft - 1));
        return;
      }
      if (res.statusCode !== 200) {
        res.resume();
        reject(new Error(`Failed to download ${url} (status ${res.statusCode})`));
        return;
      }
      const tmpPath = `${dest}.partial`;
      const fileStream = fs.createWriteStream(tmpPath);
      res.pipe(fileStream);
      fileStream.on("finish", () => {
        fileStream.close(() => {
          fs.renameSync(tmpPath, dest);
          resolve();
        });
      });
      fileStream.on("error", (err) => {
        try {
          fs.unlinkSync(tmpPath);
        } catch (_) {}
        reject(err);
      });
    });
    req.on("error", reject);
  });
}

async function downloadPyodideAssets(ctx, targetDir, { skipExisting = true } = {}) {
  ensureDir(targetDir);
  for (const asset of ctx.pyodideAssets) {
    const dest = path.join(targetDir, asset);
    if (skipExisting && fileExists(dest)) {
      console.log(`[pyodide] exists: ${path.relative(ctx.rootDir, dest)}`);
      continue;
    }
    const url = `${ctx.pyodideCdnBase}${asset}`;
    console.log(`[pyodide] downloading: ${url}`);
    await downloadFile(url, dest);
    console.log(`[pyodide] saved: ${path.relative(ctx.rootDir, dest)}`);
  }
}

function copyIfExists(src, dest) {
  if (!fileExists(src)) return false;
  ensureDir(path.dirname(dest));
  fs.copyFileSync(src, dest);
  return true;
}

async function copyRuntimeAssets(ctx, { offline = false } = {}) {
  ensureDir(ctx.distDir);
  let copiedAny = false;

  for (const asset of ctx.pyodideAssets) {
    const srcPath = path.join(ctx.srcDir, asset);
    const destPath = path.join(ctx.distDir, asset);
    const copied = copyIfExists(srcPath, destPath);
    if (copied) {
      console.log(`[copy] ${asset} -> dist/`);
      copiedAny = true;
      continue;
    }
    if (offline) {
      const url = `${ctx.pyodideCdnBase}${asset}`;
      console.log(`[pyodide] missing in src, downloading: ${url}`);
      await downloadFile(url, destPath);
      copiedAny = true;
    } else if (asset === "pyodide.js") {
      console.warn("[warn] pyodide.js not found in src/; dist will not be runnable offline.");
    }
  }

  if (offline) {
    const missing = ctx.pyodideAssets.filter((asset) => !fileExists(path.join(ctx.distDir, asset)));
    if (missing.length) {
      throw new Error(`Offline build missing Pyodide assets in dist/: ${missing.join(", ")}`);
    }
  }

  if (!copiedAny) {
    console.warn("[warn] no runtime assets were copied to dist/.");
  }
}

/**
 * Build `dist/index.html` by inlining CSS/JS from `src/`.
 * @param {ReturnType<typeof createProjectContext>} ctx
 * @param {{offline?: boolean, minify?: "auto" | "off"}} [options]
 */
async function buildDist(ctx, { offline = false, minify = "auto" } = {}) {
  validateSourceFiles(ctx);
  const html = fs.readFileSync(ctx.srcHtml, "utf8");
  const cssRaw = ctx.cssFiles.map((f) => fs.readFileSync(f, "utf8")).join("\n");
  const cssOut = minify === "off" ? cssRaw : minifyCss(cssRaw);

  const jsRaw = ctx.jsFiles.map((f) => fs.readFileSync(f, "utf8")).join("\n");
  let jsOut = await minifyJs(jsRaw, { mode: minify });
  jsOut = jsOut.replace(/<\/script>/gi, "<\\/script>");

  let out = html;
  const cssLinksRegex = /<link\s+rel=["']stylesheet["']\s+href=["'](?:\.\/)?pyducation\.(theme|base|window|explorer)\.css["']\s*\/?>\s*/gi;
  out = out.replace(cssLinksRegex, "");
  out = out.replace(/<\/head>/i, `<style>${cssOut}</style>\n</head>`);

  const scriptsBlock = /<script\s+src=["'](?:\.\/)?pyducation\.state\.js["']><\/script>[\s\S]*?<script\s+src=["'](?:\.\/)?pyducation\.main\.js["']><\/script>/i;
  if (!scriptsBlock.test(out)) {
    throw new Error("Could not find bundled script block in src/index.html.");
  }
  out = out.replace(scriptsBlock, `<script>${jsOut}</script>`);

  ensureDir(ctx.distDir);
  fs.writeFileSync(ctx.distHtml, out);
  console.log(`[build] wrote ${path.relative(ctx.rootDir, ctx.distHtml)}`);

  await copyRuntimeAssets(ctx, { offline });
  console.log(`[build] ${offline ? "offline" : "standard"} build complete`);
}

function cleanDist(ctx) {
  if (fileExists(ctx.distDir)) {
    fs.rmSync(ctx.distDir, { recursive: true, force: true });
    console.log("[clean] dist/ removed");
  } else {
    console.log("[clean] dist/ does not exist");
  }
}

function status(ctx) {
  const rows = [];
  const check = (label, p) => {
    rows.push(`${label}: ${fileExists(p) ? "yes" : "no"} (${path.relative(ctx.rootDir, p)})`);
  };
  check("src/index.html", ctx.srcHtml);
  ctx.pyodideAssets.forEach((asset) => check(`src/${asset}`, path.join(ctx.srcDir, asset)));
  check("dist/index.html", ctx.distHtml);
  ctx.pyodideAssets.forEach((asset) => check(`dist/${asset}`, path.join(ctx.distDir, asset)));
  console.log(rows.join("\n"));
}

function guessContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case ".html":
      return "text/html; charset=utf-8";
    case ".css":
      return "text/css; charset=utf-8";
    case ".js":
      return "text/javascript; charset=utf-8";
    case ".json":
      return "application/json; charset=utf-8";
    case ".svg":
      return "image/svg+xml";
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".gif":
      return "image/gif";
    case ".ico":
      return "image/x-icon";
    case ".wasm":
      return "application/wasm";
    case ".zip":
      return "application/zip";
    case ".map":
      return "application/json; charset=utf-8";
    default:
      return "application/octet-stream";
  }
}

/**
 * Start a minimal static file server for either `src/` or `dist/`.
 * @param {string} serveDir
 * @param {{host?: string, port?: number, open?: boolean, logRequests?: boolean}} [options]
 */
function startStaticServer(serveDir, { host = "127.0.0.1", port = 4173, open = false, logRequests = true } = {}) {
  const baseDir = path.resolve(serveDir);

  const server = http.createServer((req, res) => {
    try {
      if (!req.url) {
        res.writeHead(400);
        res.end("Bad Request");
        return;
      }

      if (req.method !== "GET" && req.method !== "HEAD") {
        res.writeHead(405, { Allow: "GET, HEAD" });
        res.end("Method Not Allowed");
        return;
      }

      const url = new URL(req.url, `http://${req.headers.host || host}`);
      let rawPath;
      try {
        rawPath = decodeURIComponent(url.pathname);
      } catch {
        res.writeHead(400);
        res.end("Bad Request");
        return;
      }
      const relativePath = rawPath.replace(/^\//, "");
      const requestedPath = path.resolve(baseDir, relativePath);

      if (requestedPath !== baseDir && !requestedPath.startsWith(baseDir + path.sep)) {
        res.writeHead(403);
        res.end("Forbidden");
        return;
      }

      let filePath = requestedPath;
      let stat;
      try {
        stat = fs.statSync(filePath);
      } catch {
        // Common case: request "/" or an SPA-style route.
        res.writeHead(404);
        res.end("Not Found");
        return;
      }

      if (stat.isDirectory()) {
        filePath = path.join(filePath, "index.html");
        try {
          stat = fs.statSync(filePath);
        } catch {
          res.writeHead(404);
          res.end("Not Found");
          return;
        }
      }

      const headers = {
        "Content-Type": guessContentType(filePath),
        "Content-Length": stat.size,
        "Cache-Control": "no-cache",
        "X-Content-Type-Options": "nosniff"
      };

      res.writeHead(200, headers);
      if (req.method === "HEAD") {
        res.end();
        return;
      }

      const stream = fs.createReadStream(filePath);
      stream.on("error", () => {
        if (!res.headersSent) {
          res.writeHead(500);
          res.end("Internal Server Error");
          return;
        }
        res.destroy();
      });
      stream.pipe(res);
    } finally {
      if (logRequests) {
        const status = res.statusCode || 0;
        console.log(`[serve] ${req.method} ${req.url} -> ${status}`);
      }
    }
  });

  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, () => {
      const addr = server.address();
      const actualPort = typeof addr === "object" && addr ? addr.port : port;
      const baseUrl = `http://${host}:${actualPort}/`;
      console.log(`[serve] serving ${baseDir}`);
      console.log(`[serve] ${baseUrl}`);

      if (open) {
        openInBrowser(baseUrl);
      }

      resolve({ server, baseUrl, port: actualPort, host });
    });
  });
}

function openInBrowser(url) {
  const platform = process.platform;
  if (platform === "win32") {
    spawn("cmd", ["/c", "start", "", url], { stdio: "ignore", detached: true }).unref();
    return;
  }
  if (platform === "darwin") {
    spawn("open", [url], { stdio: "ignore", detached: true }).unref();
    return;
  }
  spawn("xdg-open", [url], { stdio: "ignore", detached: true }).unref();
}

/**
 * Lightweight evaluation checks for build output.
 * @param {ReturnType<typeof createProjectContext>} ctx
 * @param {{offline?: boolean}} [options]
 */
function verifyDist(ctx, { offline = false } = {}) {
  const issues = [];

  if (!fileExists(ctx.distHtml)) {
    issues.push(`Missing dist/index.html (${path.relative(ctx.rootDir, ctx.distHtml)})`);
    return { ok: false, issues };
  }

  const html = fs.readFileSync(ctx.distHtml, "utf8");

  if (/<link\s+rel=["']stylesheet["'][^>]*pyducation\./i.test(html)) {
    issues.push("dist/index.html still references pyducation.*.css (expected inlined CSS)");
  }
  if (/<script\s+src=["'](?:\.\/)?pyducation\./i.test(html)) {
    issues.push("dist/index.html still references pyducation.*.js (expected inlined JS)");
  }
  if (!/<style>[\s\S]*<\/style>/i.test(html)) {
    issues.push("dist/index.html missing <style> bundle");
  }
  if (!/<script>(?:[\s\S]*?)<\/script>/i.test(html)) {
    issues.push("dist/index.html missing inline <script> bundle");
  }
  if (!/<script\s+src=["'](?:\.\/)?pyodide\.js["']\s*><\/script>/i.test(html)) {
    issues.push("dist/index.html missing pyodide.js loader script tag");
  }

  const requiredAssets = offline ? ctx.pyodideAssets : ["pyodide.js"];
  for (const asset of requiredAssets) {
    const p = path.join(ctx.distDir, asset);
    if (!fileExists(p)) {
      issues.push(`Missing dist/${asset}`);
    }
  }

  return { ok: issues.length === 0, issues };
}

async function menu() {
  const ctx = createProjectContext();
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const ask = (q) => new Promise((resolve) => rl.question(q, resolve));

  while (true) {
    console.log("\nPyducation Packaging Menu");
    console.log("1. Build dist (inline CSS/JS)");
    console.log("2. Build dist + offline Pyodide (download missing)");
    console.log("3. Download Pyodide assets to dist/");
    console.log("4. Clean dist/");
    console.log("5. Status");
    console.log("6. Verify dist/");
    console.log("7. Serve src/ (local HTTP)");
    console.log("8. Serve dist/ (local HTTP)");
    console.log("9. Exit");

    const choice = (await ask("Select an option: ")).trim().toLowerCase();
    try {
      if (choice === "1" || choice === "build") {
        await buildDist(ctx, { offline: false });
      } else if (choice === "2" || choice === "offline") {
        await buildDist(ctx, { offline: true });
      } else if (choice === "3" || choice === "download") {
        await downloadPyodideAssets(ctx, ctx.distDir);
      } else if (choice === "4" || choice === "clean") {
        cleanDist(ctx);
      } else if (choice === "5" || choice === "status") {
        status(ctx);
      } else if (choice === "6" || choice === "verify") {
        const result = verifyDist(ctx, { offline: false });
        if (result.ok) {
          console.log("[verify] ok");
        } else {
          console.log("[verify] issues:");
          result.issues.forEach((i) => console.log(`- ${i}`));
        }
      } else if (choice === "7" || choice === "serve-src" || choice === "src") {
        const { server } = await startStaticServer(ctx.srcDir, { open: true });
        console.log("[serve] press Ctrl+C to stop");
        await new Promise((resolve) => server.once("close", resolve));
      } else if (choice === "8" || choice === "serve-dist" || choice === "dist") {
        const { server } = await startStaticServer(ctx.distDir, { open: true });
        console.log("[serve] press Ctrl+C to stop");
        await new Promise((resolve) => server.once("close", resolve));
      } else if (choice === "9" || choice === "exit" || choice === "quit" || choice === "q") {
        rl.close();
        return;
      } else {
        console.log("Unknown option.");
      }
    } catch (err) {
      console.error(err.message || String(err));
    }
  }
}

function parseArgs(argv) {
  const args = argv.slice(2);
  const out = { cmd: "menu", flags: {} };
  if (args.length === 0) return out;

  if (args[0] && !args[0].startsWith("-")) {
    out.cmd = args[0].toLowerCase();
    args.shift();
  }

  for (let i = 0; i < args.length; i++) {
    const token = args[i];
    if (!token.startsWith("--")) continue;
    const key = token.slice(2);
    const next = args[i + 1];
    if (next && !next.startsWith("--")) {
      out.flags[key] = next;
      i++;
    } else {
      out.flags[key] = true;
    }
  }

  return out;
}

async function main() {
  const ctx = createProjectContext();
  const { cmd, flags } = parseArgs(process.argv);
  const to = typeof flags.to === "string" ? flags.to : null;
  if (cmd === "menu") {
    await menu();
    return;
  }
  if (cmd === "build") {
    await buildDist(ctx, { offline: false, minify: flags["no-minify"] ? "off" : "auto" });
    return;
  }
  if (cmd === "offline") {
    await buildDist(ctx, { offline: true, minify: flags["no-minify"] ? "off" : "auto" });
    return;
  }
  if (cmd === "download-pyodide") {
    const target = to === "src" ? ctx.srcDir : ctx.distDir;
    await downloadPyodideAssets(ctx, target);
    return;
  }
  if (cmd === "clean") {
    cleanDist(ctx);
    return;
  }
  if (cmd === "status") {
    status(ctx);
    return;
  }
  if (cmd === "verify") {
    const offline = flags.offline === true || flags.offline === "true";
    const result = verifyDist(ctx, { offline });
    if (result.ok) {
      console.log("[verify] ok");
      return;
    }
    console.log("[verify] issues:");
    result.issues.forEach((i) => console.log(`- ${i}`));
    process.exitCode = 1;
    return;
  }
  if (cmd === "serve" || cmd === "dev" || cmd === "preview") {
    const from = typeof flags.from === "string" ? flags.from : null;
    const serveChoice = cmd === "dev" ? "src" : cmd === "preview" ? "dist" : from || "dist";
    const serveDir = serveChoice === "src" ? ctx.srcDir : ctx.distDir;
    const port = flags.port ? Number(flags.port) : 4173;
    if (!Number.isFinite(port) || port < 0 || port > 65535) {
      throw new Error(`Invalid --port: ${flags.port}`);
    }
    const host = typeof flags.host === "string" ? flags.host : "127.0.0.1";
    const open = flags.open === true || flags.open === "true";

    if (!fileExists(serveDir)) {
      throw new Error(`Directory not found: ${path.relative(ctx.rootDir, serveDir)}`);
    }

    const { server } = await startStaticServer(serveDir, { host, port, open });

    const stop = () => server.close(() => process.exit(0));
    process.on("SIGINT", stop);
    process.on("SIGTERM", stop);
    console.log("[serve] press Ctrl+C to stop");
    return;
  }

  console.log("Usage:");
  console.log("  node distribute.js            # menu");
  console.log("  node distribute.js build      # build dist");
  console.log("  node distribute.js offline    # build dist + download missing pyodide assets");
  console.log("  node distribute.js download-pyodide [--to src|dist]");
  console.log("  node distribute.js clean");
  console.log("  node distribute.js status");
  console.log("  node distribute.js verify [--offline]");
  console.log("  node distribute.js serve [--from src|dist] [--host 127.0.0.1] [--port 4173] [--open]");
  console.log("  node distribute.js dev        # alias for: serve --from src");
  console.log("  node distribute.js preview    # alias for: serve --from dist");
  console.log("  node distribute.js build --no-minify");
  process.exitCode = 1;
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err.message || String(err));
    process.exit(1);
  });
}

module.exports = {
  createProjectContext,
  minifyCss,
  minifyJs,
  buildDist,
  verifyDist,
  startStaticServer,
  parseArgs
};
