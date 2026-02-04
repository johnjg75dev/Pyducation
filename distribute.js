const fs = require("fs");
const path = require("path");
const https = require("https");
const readline = require("readline");

const root = process.cwd();
const srcDir = path.join(root, "src");
const distDir = path.join(root, "dist");

const srcHtml = path.join(srcDir, "index.html");
const distHtml = path.join(distDir, "index.html");

const cssFiles = [
  "pyducation.theme.css",
  "pyducation.base.css",
  "pyducation.window.css",
  "pyducation.explorer.css"
].map((f) => path.join(srcDir, f));

const jsFiles = [
  "pyducation.state.js",
  "pyducation.data.js",
  "pyducation.tables.js",
  "pyducation.windowing.js",
  "pyducation.repl.js",
  "pyducation.theme.js",
  "pyducation.main.js"
].map((f) => path.join(srcDir, f));

const pyodideVersion = "0.29.3";
const pyodideCdnBase = `https://cdn.jsdelivr.net/pyodide/v${pyodideVersion}/full/`;
const pyodideAssets = ["pyodide.js", "pyodide.asm.wasm", "python_stdlib.zip"];

function minifyCss(code) {
  return code
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\s+/g, " ")
    .replace(/\s*([{}:;,])\s*/g, "$1")
    .replace(/;}/g, "}")
    .trim();
}

async function minifyJs(code) {
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
    console.warn("esbuild not available - skipping JS minification to preserve template literals.");
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

function validateSourceFiles() {
  if (!fileExists(srcHtml)) {
    throw new Error("src/index.html not found.");
  }
  cssFiles.forEach((f) => {
    if (!fileExists(f)) {
      throw new Error(`Missing CSS file: ${path.basename(f)}`);
    }
  });
  jsFiles.forEach((f) => {
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

async function downloadPyodideAssets(targetDir, { skipExisting = true } = {}) {
  ensureDir(targetDir);
  for (const asset of pyodideAssets) {
    const dest = path.join(targetDir, asset);
    if (skipExisting && fileExists(dest)) {
      console.log(`[pyodide] exists: ${path.relative(root, dest)}`);
      continue;
    }
    const url = `${pyodideCdnBase}${asset}`;
    console.log(`[pyodide] downloading: ${url}`);
    await downloadFile(url, dest);
    console.log(`[pyodide] saved: ${path.relative(root, dest)}`);
  }
}

function copyIfExists(src, dest) {
  if (!fileExists(src)) return false;
  ensureDir(path.dirname(dest));
  fs.copyFileSync(src, dest);
  return true;
}

async function copyRuntimeAssets({ offline = false } = {}) {
  ensureDir(distDir);
  let copiedAny = false;

  for (const asset of pyodideAssets) {
    const srcPath = path.join(srcDir, asset);
    const destPath = path.join(distDir, asset);
    const copied = copyIfExists(srcPath, destPath);
    if (copied) {
      console.log(`[copy] ${asset} -> dist/`);
      copiedAny = true;
      continue;
    }
    if (offline) {
      const url = `${pyodideCdnBase}${asset}`;
      console.log(`[pyodide] missing in src, downloading: ${url}`);
      await downloadFile(url, destPath);
      copiedAny = true;
    } else if (asset === "pyodide.js") {
      console.warn("[warn] pyodide.js not found in src/; dist will not be runnable offline.");
    }
  }

  if (offline) {
    const missing = pyodideAssets.filter((asset) => !fileExists(path.join(distDir, asset)));
    if (missing.length) {
      throw new Error(`Offline build missing Pyodide assets in dist/: ${missing.join(", ")}`);
    }
  }

  if (!copiedAny) {
    console.warn("[warn] no runtime assets were copied to dist/.");
  }
}

async function buildDist({ offline = false } = {}) {
  validateSourceFiles();
  const html = fs.readFileSync(srcHtml, "utf8");
  const cssRaw = cssFiles.map((f) => fs.readFileSync(f, "utf8")).join("\n");
  const cssMin = minifyCss(cssRaw);

  const jsRaw = jsFiles.map((f) => fs.readFileSync(f, "utf8")).join("\n");
  let jsMin = await minifyJs(jsRaw);
  jsMin = jsMin.replace(/<\/script>/gi, "<\\/script>");

  let out = html;
  const cssLinksRegex = /<link\s+rel=["']stylesheet["']\s+href=["'](?:\.\/)?pyducation\.(theme|base|window|explorer)\.css["']\s*\/?>\s*/gi;
  out = out.replace(cssLinksRegex, "");
  out = out.replace(/<\/head>/i, `<style>${cssMin}</style>\n</head>`);

  const scriptsBlock = /<script\s+src=["'](?:\.\/)?pyducation\.state\.js["']><\/script>[\s\S]*?<script\s+src=["'](?:\.\/)?pyducation\.main\.js["']><\/script>/i;
  if (!scriptsBlock.test(out)) {
    throw new Error("Could not find bundled script block in src/index.html.");
  }
  out = out.replace(scriptsBlock, `<script>${jsMin}</script>`);

  ensureDir(distDir);
  fs.writeFileSync(distHtml, out);
  console.log(`[build] wrote ${path.relative(root, distHtml)}`);

  await copyRuntimeAssets({ offline });
  console.log(`[build] ${offline ? "offline" : "standard"} build complete`);
}

function cleanDist() {
  if (fileExists(distDir)) {
    fs.rmSync(distDir, { recursive: true, force: true });
    console.log("[clean] dist/ removed");
  } else {
    console.log("[clean] dist/ does not exist");
  }
}

function status() {
  const rows = [];
  const check = (label, p) => {
    rows.push(`${label}: ${fileExists(p) ? "yes" : "no"} (${path.relative(root, p)})`);
  };
  check("src/index.html", srcHtml);
  pyodideAssets.forEach((asset) => check(`src/${asset}`, path.join(srcDir, asset)));
  check("dist/index.html", distHtml);
  pyodideAssets.forEach((asset) => check(`dist/${asset}`, path.join(distDir, asset)));
  console.log(rows.join("\n"));
}

async function menu() {
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
    console.log("6. Exit");

    const choice = (await ask("Select an option: ")).trim().toLowerCase();
    try {
      if (choice === "1" || choice === "build") {
        await buildDist({ offline: false });
      } else if (choice === "2" || choice === "offline") {
        await buildDist({ offline: true });
      } else if (choice === "3" || choice === "download") {
        await downloadPyodideAssets(distDir);
      } else if (choice === "4" || choice === "clean") {
        cleanDist();
      } else if (choice === "5" || choice === "status") {
        status();
      } else if (choice === "6" || choice === "exit" || choice === "quit" || choice === "q") {
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
  const options = { cmd: "menu", to: null };
  if (args.length === 0) return options;
  options.cmd = args[0].toLowerCase();
  const toIndex = args.indexOf("--to");
  if (toIndex >= 0 && args[toIndex + 1]) {
    options.to = args[toIndex + 1];
  }
  return options;
}

async function main() {
  const { cmd, to } = parseArgs(process.argv);
  if (cmd === "menu") {
    await menu();
    return;
  }
  if (cmd === "build") {
    await buildDist({ offline: false });
    return;
  }
  if (cmd === "offline") {
    await buildDist({ offline: true });
    return;
  }
  if (cmd === "download-pyodide") {
    const target = to === "src" ? srcDir : distDir;
    await downloadPyodideAssets(target);
    return;
  }
  if (cmd === "clean") {
    cleanDist();
    return;
  }
  if (cmd === "status") {
    status();
    return;
  }

  console.log("Usage:");
  console.log("  node distribute.js            # menu");
  console.log("  node distribute.js build      # build dist");
  console.log("  node distribute.js offline    # build dist + download missing pyodide assets");
  console.log("  node distribute.js download-pyodide [--to src|dist]");
  console.log("  node distribute.js clean");
  console.log("  node distribute.js status");
  process.exitCode = 1;
}

main().catch((err) => {
  console.error(err.message || String(err));
  process.exit(1);
});
