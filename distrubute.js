const fs = require("fs");
const path = require("path");

const root = process.cwd();
const srcDir = path.join(root, "src");
const srcHtml = path.join(srcDir, "index.html");
const cssFiles = [
  "pyducation.theme.css",
  "pyducation.base.css",
  "pyducation.window.css",
  "pyducation.explorer.css"
].map((f) => path.join(srcDir, f));
const distDir = path.join(root, "dist");
const outHtml = path.join(distDir, "index.html");

const jsFiles = [
  "pyducation.state.js",
  "pyducation.data.js",
  "pyducation.tables.js",
  "pyducation.windowing.js",
  "pyducation.repl.js",
  "pyducation.theme.js",
  "pyducation.main.js"
].map((f) => path.join(srcDir, f));

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

async function main() {
  if (!fs.existsSync(srcHtml)) {
    throw new Error("src/index.html not found.");
  }
  cssFiles.forEach((f) => {
    if (!fs.existsSync(f)) {
      throw new Error(`Missing CSS file: ${path.basename(f)}`);
    }
  });
  jsFiles.forEach((f) => {
    if (!fs.existsSync(f)) {
      throw new Error(`Missing JS file: ${path.basename(f)}`);
    }
  });

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
    throw new Error("Could not find bundled script block in index.html.");
  }
  out = out.replace(scriptsBlock, `<script>${jsMin}</script>`);

  fs.mkdirSync(distDir, { recursive: true });
  fs.writeFileSync(outHtml, out);

  console.log("Wrote " + outHtml);
}

main().catch((err) => {
  console.error(err.message || String(err));
  process.exit(1);
});
