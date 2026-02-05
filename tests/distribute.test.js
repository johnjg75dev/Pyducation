const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");

const {
  createProjectContext,
  buildDist,
  minifyCss,
  parseArgs,
  startStaticServer,
  verifyDist
} = require("../distribute.js");

function writeFile(p, contents) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, contents, "utf8");
}

function makeFixtureProject() {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "pyducation-"));
  const ctx = createProjectContext({ rootDir });
  fs.mkdirSync(ctx.srcDir, { recursive: true });
  fs.mkdirSync(ctx.distDir, { recursive: true });

  writeFile(
    ctx.srcHtml,
    [
      "<!doctype html>",
      "<html>",
      "<head>",
      '  <link rel="stylesheet" href="pyducation.theme.css"/>',
      '  <link rel="stylesheet" href="pyducation.base.css"/>',
      '  <link rel="stylesheet" href="pyducation.window.css"/>',
      '  <link rel="stylesheet" href="pyducation.explorer.css"/>',
      '  <script src="./pyodide.js"></script>',
      "</head>",
      "<body>",
      '  <script src="pyducation.state.js"></script>',
      '  <script src="pyducation.data.js"></script>',
      '  <script src="pyducation.tables.js"></script>',
      '  <script src="pyducation.windowing.js"></script>',
      '  <script src="pyducation.repl.js"></script>',
      '  <script src="pyducation.theme.js"></script>',
      '  <script src="pyducation.main.js"></script>',
      "</body>",
      "</html>"
    ].join("\n")
  );

  for (const cssPath of ctx.cssFiles) {
    writeFile(cssPath, "/* comment */\nbody { color: red; }\n");
  }
  for (const jsPath of ctx.jsFiles) {
    writeFile(jsPath, `console.log(${JSON.stringify(path.basename(jsPath))});\n`);
  }
  writeFile(path.join(ctx.srcDir, "pyodide.js"), "console.log('pyodide');\n");

  return { rootDir, ctx };
}

test("minifyCss strips comments and whitespace", () => {
  const out = minifyCss("/* x */\nbody {\n  color: red;\n}\n");
  assert.equal(out, "body{color:red}");
});

test("parseArgs reads flags and command", () => {
  const parsed = parseArgs([
    "node",
    "distribute.js",
    "serve",
    "--from",
    "src",
    "--port",
    "1234",
    "--open"
  ]);
  assert.equal(parsed.cmd, "serve");
  assert.deepEqual(parsed.flags, { from: "src", port: "1234", open: true });
});

test("buildDist inlines assets and verifyDist passes", async () => {
  const { rootDir, ctx } = makeFixtureProject();
  try {
    await buildDist(ctx, { offline: false, minify: "off" });
    const result = verifyDist(ctx, { offline: false });
    assert.equal(result.ok, true, result.issues.join("\n"));

    const outHtml = fs.readFileSync(ctx.distHtml, "utf8");
    assert.ok(!/<link[^>]*pyducation\.base\.css/i.test(outHtml));
    assert.ok(!/<script[^>]*src=["'](?:\.\/)?pyducation\.state\.js/i.test(outHtml));
    assert.ok(outHtml.includes("<style>"));
    assert.ok(outHtml.includes("<script>"));
  } finally {
    fs.rmSync(rootDir, { recursive: true, force: true });
  }
});

test("startStaticServer serves index.html and blocks traversal", async () => {
  const { rootDir, ctx } = makeFixtureProject();
  try {
    const { server, baseUrl } = await startStaticServer(ctx.srcDir, {
      host: "127.0.0.1",
      port: 0,
      open: false,
      logRequests: false
    });

    try {
      const res = await fetch(baseUrl);
      assert.equal(res.status, 200);
      assert.match(res.headers.get("content-type") || "", /text\/html/i);
      const body = await res.text();
      assert.match(body, /pyodide\.js/);

      const trav = await fetch(`${baseUrl}..%2f..%2fWindows%2fSystem32%2fdrivers%2fetc%2fhosts`);
      assert.equal(trav.status, 403);
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  } finally {
    fs.rmSync(rootDir, { recursive: true, force: true });
  }
});
