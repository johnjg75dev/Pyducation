// -------------------------------------------------------------
// Rendering + filtering
// -------------------------------------------------------------
function escapeHTML(s){
    return (s+"")
        .replaceAll("&","&amp;")
        .replaceAll("<","&lt;")
        .replaceAll(">","&gt;")
        .replaceAll('"',"&quot;")
        .replaceAll("'","&#039;");
}

function renderTables(){
    const t1 = document.querySelector("#t1 tbody");
    const t2 = document.querySelector("#t2 tbody");

    t1.innerHTML = DUNDERS.map(([name, kind, where, meaning]) => `
        <tr data-kind="${kind}" data-cat="dunder"
            data-hay="${escapeHTML((name+" "+where+" "+meaning).toLowerCase()).replaceAll("\n"," ")}">
          <td><span class="chip">${escapeHTML(name)}</span></td>
          <td><span class="tag dunder">__dunder__</span></td>
          <td>
            <div><b>${escapeHTML(where)}</b></div>
            <div class="tiny">Language data model</div>
          </td>
          <td>${escapeHTML(meaning)}</td>
        </tr>
      `).join("");

    t2.innerHTML = NOND.map(([name, kind, obj, meaning]) => `
        <tr data-kind="${kind}" data-cat="${(name==="__version__" || name==="model_fields" || name==="model_dump") ? "tooling" : "nond"}"
            data-hay="${escapeHTML((name+" "+obj+" "+meaning).toLowerCase()).replaceAll("\n"," ")}">
          <td><span class="chip">${escapeHTML(name)}</span></td>
          <td><span class="tag nond">non-dunder</span></td>
          <td>
            <div><b>${escapeHTML(obj)}</b></div>
            <div class="tiny">Runtime / tooling</div>
          </td>
          <td>${escapeHTML(meaning)}</td>
        </tr>
      `).join("");

    document.getElementById("total").textContent =
        (document.querySelectorAll("#t1 tbody tr").length + document.querySelectorAll("#t2 tbody tr").length).toString();

    applyFilters();
}

function applyFilters(){
    const q = (document.getElementById("q").value || "").trim().toLowerCase();
    const cat = document.getElementById("cat").value;   // all / dunder / nond / tooling
    const kind = document.getElementById("kind").value; // all / dunder / nond

    const rows = document.querySelectorAll("#t1 tbody tr, #t2 tbody tr");
    let shown = 0;

    rows.forEach(tr => {
        const hay = tr.getAttribute("data-hay") || "";
        const rCat = tr.getAttribute("data-cat") || "all";
        const rKind = tr.getAttribute("data-kind") || "all";

        const okQ = !q || hay.includes(q);
        const okCat = (cat === "all") || (rCat === cat);
        const okKind = (kind === "all") || (rKind === kind);

        const ok = okQ && okCat && okKind;
        tr.style.display = ok ? "" : "none";
        if (ok) shown++;
    });

    document.getElementById("shown").textContent = shown.toString();

    const parts = [];
    if(q) parts.push(`search="${q}"`);
    if(cat !== "all") parts.push(`category="${cat}"`);
    if(kind !== "all") parts.push(`type="${kind}"`);
    document.getElementById("filterLabel").textContent = parts.length ? parts.join(" \u00b7 ") : "none";
}

function initTables(){
    document.addEventListener("keydown", (e) => {
        if (e.key === "/" && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") {
            e.preventDefault();
            document.getElementById("q").focus();
        }
    });

    document.getElementById("q").addEventListener("input", applyFilters);
    document.getElementById("cat").addEventListener("change", applyFilters);
    document.getElementById("kind").addEventListener("change", applyFilters);

    renderTables();
}

