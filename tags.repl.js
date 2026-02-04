// -------------------------------------------------------------
// Floating REPL + File Explorer (Pyodide)
// -------------------------------------------------------------
function initRepl(){
    if(!repl) return;

    const openExplorer = () => {
        if (!explorerWindow) return;
        explorerWindow.classList.remove("hidden");
        explorerWindow.classList.remove("minimized");
        if (typeof applyDockLayout === "function") applyDockLayout();
        if (typeof positionExpandButton === "function") positionExpandButton();
    };

    const closeExplorer = () => {
        if (!explorerWindow) return;
        explorerWindow.classList.add("hidden");
        if (typeof applyDockLayout === "function") applyDockLayout();
    };

    if (explorerToggleBtn) {
        explorerToggleBtn.addEventListener("click", () => {
            if (!explorerWindow) return;
            if (explorerWindow.classList.contains("hidden")) {
                openExplorer();
            } else {
                closeExplorer();
            }
        });
        explorerToggleBtn.textContent = "Files";
    }

    if (collapseBtn) {
        collapseBtn.textContent = repl.classList.contains("collapsed") ? "+" : "-";
        collapseBtn.addEventListener("click", () => {
            repl.classList.toggle("collapsed");
            collapseBtn.textContent = repl.classList.contains("collapsed") ? "+" : "-";
        });
    }

    function appendOut(txt){
        if(!out) return;
        const s = (txt ?? "").toString();
        out.textContent = (out.textContent === "Output will appear here..." ? "" : out.textContent) + s;
        if(!s.endsWith("\n")) out.textContent += "\n";
        out.scrollTop = out.scrollHeight;
    }

    let pyodide = null;

    // -------------------------------------------------------------
    // Filesystem: /tmp (RAM) + /persist (IndexedDB)
    // -------------------------------------------------------------
    async function setupFilesystems(pyodideInstance){
        const FS = pyodideInstance.FS;

        try { FS.mkdir("/tmp"); } catch(e) {}
        try { FS.mkdir("/persist"); } catch(e) {}

        const persistInfo = FS.analyzePath("/persist");
        const isMounted = persistInfo?.object?.mount && persistInfo.object.mount.type === "IDBFS";

        if(!isMounted){
            FS.mount(FS.filesystems.IDBFS, {}, "/persist");
            try { FS.mkdir("/persist/Documents"); } catch(_) {}
        }

        await new Promise((resolve, reject) => {
            FS.syncfs(true, (err) => err ? reject(err) : resolve());
        });

        pyodideInstance._persistFlush = async () => {
            await new Promise((resolve, reject) => {
                FS.syncfs(false, (err) => err ? reject(err) : resolve());
            });
            return true;
        };

        pyodideInstance._persistReload = async () => {
            await new Promise((resolve, reject) => {
                FS.syncfs(true, (err) => err ? reject(err) : resolve());
            });
            return true;
        };

        pyodideInstance._persistWipe = async () => {
            function rmrf(path){
                const st = FS.stat(path);
                const isDir = FS.isDir(st.mode);
                if(!isDir){
                    FS.unlink(path);
                    return;
                }
                const entries = FS.readdir(path).filter(n => n !== "." && n !== "..");
                for(const name of entries){
                    rmrf(path + "/" + name);
                }
            }
            rmrf("/persist");
            await pyodideInstance._persistFlush();
            return true;
        };

        await pyodideInstance.runPythonAsync(`
import os, pathlib

PERSIST_DIR = "/persist"
TMP_DIR = "/tmp"

def ls(path="."):
    return sorted(os.listdir(path))

def write_text(path, text):
    p = pathlib.Path(path)
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(text, encoding="utf-8")

def read_text(path):
    return pathlib.Path(path).read_text(encoding="utf-8")

def mkdirp(path):
    pathlib.Path(path).mkdir(parents=True, exist_ok=True)

async def persist_sync():
    import js
    return await js.pyodide._persistFlush()

async def persist_reload():
    import js
    return await js.pyodide._persistReload()

async def persist_wipe():
    import js
    return await js.pyodide._persistWipe()

print("Filesystem ready:")
print("  /tmp     (RAM, clears on refresh)")
print("  /persist (IndexedDB, persistent)")
print("Tip: after writing to /persist, run: await persist_sync()")
`);
    }

    // -------------------------------------------------------------
    // Win11-ish Explorer logic (Pyodide FS)
    // -------------------------------------------------------------
    const explorer = {
        root: "/persist",
        cwd: "/persist",
        selected: null,
        dirty: false,
    };

    function setNavActive(which){
        if(which === "persist"){
            navPersist?.classList.add("active");
            navTmp?.classList.remove("active");
        }else{
            navTmp?.classList.add("active");
            navPersist?.classList.remove("active");
        }
    }

    function joinPath(a,b){
        if(a.endsWith("/")) a = a.slice(0,-1);
        if(b.startsWith("/")) b = b.slice(1);
        return a + "/" + b;
    }

    function dirname(p){
        if(p === "/" ) return "/";
        const i = p.lastIndexOf("/");
        if(i <= 0) return "/";
        return p.slice(0, i);
    }

    function basename(p){
        const i = p.lastIndexOf("/");
        return i >= 0 ? p.slice(i+1) : p;
    }

    function markDirty(v){
        explorer.dirty = v;
        if (!elDirty) return;
        elDirty.textContent = v ? "\u25CF unsaved" : "";
        elDirty.style.color = v ? "rgba(251,191,36,.95)" : "";
    }

    async function ensureReady(){
        if(!pyodide){
            appendOut("Pyodide not ready yet...");
            return false;
        }
        return true;
    }

    function fs(){
        return pyodide.FS;
    }

    function isDir(path){
        try{
            const st = fs().stat(path);
            return fs().isDir(st.mode);
        }catch(_){
            return false;
        }
    }

    function isFile(path){
        try{
            const st = fs().stat(path);
            return fs().isFile(st.mode);
        }catch(_){
            return false;
        }
    }

    function listDir(path){
        const FS = fs();
        let names = [];
        try{
            names = FS.readdir(path).filter(n => n !== "." && n !== "..");
        }catch(_){
            return [];
        }
        const rows = names.map(name => {
            const full = joinPath(path, name);
            let kind = "file";
            try{
                const st = FS.stat(full);
                if(FS.isDir(st.mode)) kind = "dir";
            }catch(_){ }
            return { name, full, kind };
        });

        rows.sort((a,b) => {
            if(a.kind !== b.kind) return a.kind === "dir" ? -1 : 1;
            return a.name.localeCompare(b.name);
        });
        return rows;
    }

    async function refreshList(){
        if(!(await ensureReady())) return;
        if (elPath) elPath.textContent = explorer.cwd;
        const rows = listDir(explorer.cwd);

        if (!elList) return;
        elList.innerHTML = rows.map(r => {
            const icon = r.kind === "dir" ? "\uD83D\uDCC1" : "\uD83D\uDCC4";
            const active = (explorer.selected === r.full) ? "active" : "";
            return `
      <div class="fileRow ${active}" data-full="${r.full}" data-kind="${r.kind}">
        <div class="fileName">
          <span>${icon}</span>
          <span title="${r.name}">${r.name}</span>
        </div>
        <div class="fileMeta">${r.kind}</div>
      </div>
    `;
        }).join("");

        [...elList.querySelectorAll(".fileRow")].forEach(row => {
            row.addEventListener("click", async () => {
                const full = row.getAttribute("data-full");
                const kind = row.getAttribute("data-kind");

                if(kind === "dir"){
                    if(explorer.dirty){
                        const ok = confirm("You have unsaved changes. Continue without saving?");
                        if(!ok) return;
                    }
                    explorer.cwd = full;
                    explorer.selected = null;
                    if (elEditor) elEditor.value = "";
                    if (elEditorName) elEditorName.textContent = "No file selected";
                    if (elEditorHint) elEditorHint.textContent = "Folder opened";
                    markDirty(false);
                    await refreshList();
                    return;
                }

                if(explorer.dirty){
                    const ok = confirm("You have unsaved changes. Continue without saving?");
                    if(!ok) return;
                }

                explorer.selected = full;
                markDirty(false);
                try{
                    const bytes = fs().readFile(full);
                    if (elEditor) elEditor.value = new TextDecoder("utf-8").decode(bytes);
                    if (elEditorName) elEditorName.textContent = basename(full);
                    if (elEditorHint) elEditorHint.textContent = full;
                }catch(e){
                    appendOut("[explorer] failed to read file:\n" + e);
                }
                await refreshList();
            });
        });
    }

    if (elEditor) {
        elEditor.addEventListener("input", () => {
            if(explorer.selected) markDirty(true);
        });
    }

    navPersist?.addEventListener("click", async () => {
        if(explorer.dirty){
            const ok = confirm("Unsaved changes. Switch anyway?");
            if(!ok) return;
        }
        explorer.root = "/persist";
        explorer.cwd = "/persist";
        explorer.selected = null;
        if (elEditor) elEditor.value = "";
        if (elEditorName) elEditorName.textContent = "No file selected";
        if (elEditorHint) elEditorHint.textContent = "Click a file to edit";
        markDirty(false);
        setNavActive("persist");
        await refreshList();
    });

    navTmp?.addEventListener("click", async () => {
        if(explorer.dirty){
            const ok = confirm("Unsaved changes. Switch anyway?");
            if(!ok) return;
        }
        explorer.root = "/tmp";
        explorer.cwd = "/tmp";
        explorer.selected = null;
        if (elEditor) elEditor.value = "";
        if (elEditorName) elEditorName.textContent = "No file selected";
        if (elEditorHint) elEditorHint.textContent = "Click a file to edit";
        markDirty(false);
        setNavActive("tmp");
        await refreshList();
    });

    btnUp?.addEventListener("click", async () => {
        if(!(await ensureReady())) return;
        if(explorer.cwd === explorer.root) return;
        if(explorer.dirty){
            const ok = confirm("Unsaved changes. Go up anyway?");
            if(!ok) return;
        }
        const parent = dirname(explorer.cwd);
        explorer.cwd = parent.startsWith(explorer.root) ? parent : explorer.root;
        explorer.selected = null;
        if (elEditor) elEditor.value = "";
        if (elEditorName) elEditorName.textContent = "No file selected";
        if (elEditorHint) elEditorHint.textContent = "Folder opened";
        markDirty(false);
        await refreshList();
    });

    btnNewFile?.addEventListener("click", async () => {
        if(!(await ensureReady())) return;
        const name = prompt("New file name (relative to current folder):", "new.txt");
        if(!name) return;

        const full = joinPath(explorer.cwd, name);
        if(isDir(full)){
            alert("A folder with that name exists.");
            return;
        }

        try{
            if(!isFile(full)){
                fs().writeFile(full, new Uint8Array());
            }
            explorer.selected = full;
            if (elEditor) elEditor.value = "";
            if (elEditorName) elEditorName.textContent = basename(full);
            if (elEditorHint) elEditorHint.textContent = full;
            markDirty(true);
            await refreshList();
        }catch(e){
            appendOut("[explorer] create file failed:\n" + e);
        }
    });

    btnNewFolder?.addEventListener("click", async () => {
        if(!(await ensureReady())) return;
        const name = prompt("New folder name (relative to current folder):", "folder");
        if(!name) return;
        const full = joinPath(explorer.cwd, name);
        try{
            fs().mkdir(full);
            await refreshList();
        }catch(e){
            appendOut("[explorer] create folder failed:\n" + e);
        }
    });

    btnSaveFile?.addEventListener("click", async () => {
        if(!(await ensureReady())) return;
        if(!explorer.selected){
            alert("Select a file first.");
            return;
        }
        try{
            const data = new TextEncoder().encode(elEditor?.value || "");
            fs().writeFile(explorer.selected, data);
            markDirty(false);

            if(explorer.selected.startsWith("/persist")){
                try { await pyodide._persistFlush(); } catch(_) {}
            }

            appendOut(`[explorer] saved: ${explorer.selected} \u2705`);
            await refreshList();
        }catch(e){
            appendOut("[explorer] save failed:\n" + e);
        }
    });

    btnDelete?.addEventListener("click", async () => {
        if(!(await ensureReady())) return;
        const target = explorer.selected;
        if(!target){
            alert("Select a file first.");
            return;
        }
        const ok = confirm(`Delete ${target}?`);
        if(!ok) return;
        try{
            fs().unlink(target);
            explorer.selected = null;
            if (elEditor) elEditor.value = "";
            if (elEditorName) elEditorName.textContent = "No file selected";
            if (elEditorHint) elEditorHint.textContent = "Deleted";
            markDirty(false);

            if(target.startsWith("/persist")){
                try { await pyodide._persistFlush(); } catch(_) {}
            }

            await refreshList();
            appendOut("[explorer] deleted \u2705");
        }catch(e){
            appendOut("[explorer] delete failed:\n" + e);
        }
    });

    btnDownload?.addEventListener("click", async () => {
        if(!(await ensureReady())) return;
        const target = explorer.selected;
        if(!target){
            alert("Select a file first.");
            return;
        }
        try{
            const bytes = fs().readFile(target);
            const blob = new Blob([bytes], { type: "application/octet-stream" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = basename(target) || "download.bin";
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
        }catch(e){
            appendOut("[explorer] download failed:\n" + e);
        }
    });

    btnUpload?.addEventListener("click", async () => {
        if(!(await ensureReady())) return;
        if (uploadInput) uploadInput.value = "";
        uploadInput?.click();
    });

    uploadInput?.addEventListener("change", async () => {
        if(!(await ensureReady())) return;
        const f = uploadInput.files?.[0];
        if(!f) return;

        try{
            const buf = new Uint8Array(await f.arrayBuffer());
            const dest = joinPath(explorer.cwd, f.name);
            fs().writeFile(dest, buf);

            if(dest.startsWith("/persist")){
                try { await pyodide._persistFlush(); } catch(_) {}
            }

            appendOut(`[explorer] uploaded \u2192 ${dest} \u2705`);
            await refreshList();
        }catch(e){
            appendOut("[explorer] upload failed:\n" + e);
        }
    });

    async function bootPyodide(){
        try{
            if (pyStatus) pyStatus.textContent = "loading...";
            pyodide = await loadPyodide({ indexURL: "./" });

            await setupFilesystems(pyodide);

            pyodide.setStdout({ batched: (s) => appendOut(s) });
            pyodide.setStderr({ batched: (s) => appendOut(s) });

            if (pyStatus) pyStatus.textContent = "ready \u2705";
            if (ReplTitleStatus) ReplTitleStatus.style.color = "green";

            await pyodide.runPythonAsync(`
import sys, traceback

def _repl_exec(code: str):
    try:
        try:
            val = eval(code, globals(), globals())
            if val is not None:
                print(val)
        except SyntaxError:
            exec(code, globals(), globals())
    except Exception:
        traceback.print_exc()
`);

            if (out) out.textContent = "";
            appendOut("Pyodide ready. Try: import sys; sys.version");
            await refreshList();
        }catch(err){
            if (pyStatus) pyStatus.textContent = "failed \u274C";
            if (ReplTitleStatus) ReplTitleStatus.style.color = "red";
            appendOut("Failed to load Pyodide.\n" + err);
        }
    }

    bootPyodide();

    async function runCode(){
        if(!pyodide){
            appendOut("Pyodide not ready yet...");
            return;
        }
        const code = input?.value || "";
        appendOut(">>> " + (code.split("\n").join("\n... ")));
        try{
            await pyodide.runPythonAsync(`_repl_exec(${JSON.stringify(code)})`);
            try { await pyodide._persistFlush(); } catch(_) {}
        }catch(err){
            appendOut(String(err));
        }
    }

    runBtn?.addEventListener("click", runCode);
    clearBtn?.addEventListener("click", () => { if (out) out.textContent = ""; });

    const saveBtn = document.getElementById("replSave");
    const resetBtn = document.getElementById("replReset");

    saveBtn?.addEventListener("click", async () => {
        if(!pyodide){ appendOut("Pyodide not ready yet..."); return; }
        try{
            await pyodide._persistFlush();
            appendOut("[persist] flushed to IndexedDB \u2705");
        }catch(e){
            appendOut("[persist] flush failed \u274C\n" + e);
        }
    });

    btnReload?.addEventListener("click", async () => {
        if(!pyodide){ appendOut("Pyodide not ready yet..."); return; }
        try{
            await pyodide._persistReload();
            appendOut("[persist] reloaded from IndexedDB \u2705");
            await refreshList();
        }catch(e){
            appendOut("[persist] reload failed \u274C\n" + e);
        }
    });

    resetBtn?.addEventListener("click", async () => {
        if(!pyodide){ appendOut("Pyodide not ready yet..."); return; }
        const ok = confirm("Delete ALL files in /persist (this cannot be undone)?");
        if(!ok) return;
        try{
            await pyodide._persistWipe();
            appendOut("[persist] wiped \u2705");
        }catch(e){
            appendOut("[persist] wipe failed \u274C\n" + e);
        }
    });

    input?.addEventListener("keydown", (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === "Enter"){
            e.preventDefault();
            runCode();
        }

        if (e.key === "Tab") {
            e.preventDefault();
            const start = input.selectionStart;
            const end = input.selectionEnd;

            if (e.shiftKey) {
                const value = input.value;
                if (value.substring(start - 1, start) === "\t") {
                    input.value = value.substring(0, start - 1) + value.substring(end);
                    input.selectionStart = input.selectionEnd = start - 1;
                }
            } else {
                input.value = input.value.substring(0, start) + "\t" + input.value.substring(end);
                input.selectionStart = input.selectionEnd = start + 1;
            }
        }
    });

    if (btnExpand) {
        if (typeof updateExpandButtonText === "function") updateExpandButtonText();
        if (typeof positionExpandButton === "function") positionExpandButton();
        btnExpand.addEventListener("click", () => {
            if (explorerWindow) explorerWindow.classList.toggle("explorerMini");
            if (typeof updateExpandButtonText === "function") updateExpandButtonText();
            if (typeof positionExpandButton === "function") positionExpandButton();
        });
    }

    if (input) {
        input.addEventListener("input", function() {
            this.style.height = "auto";
            this.style.height = this.scrollHeight + "px";
        });
    }
}

