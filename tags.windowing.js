let lastRightCount = 0;
let lastLeftCount = 0;
let lastBottomCount = 0;
let lastTopCount = 0;
let replFloatState = null;
let explorerFloatState = null;

function clamp(v, lo, hi){
    return Math.max(lo, Math.min(hi, v));
}

function captureFloatState(){
    if(!repl) return;
    const rect = repl.getBoundingClientRect();
    replFloatState = {
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height
    };
}

function applyFloatState(){
    if(!repl) return;
    if(replFloatState){
        repl.style.left = replFloatState.left + "px";
        repl.style.top = replFloatState.top + "px";
        repl.style.width = replFloatState.width + "px";
        repl.style.height = replFloatState.height + "px";
        repl.style.right = "auto";
        repl.style.bottom = "auto";
    }else{
        repl.style.left = "auto";
        repl.style.top = "auto";
        repl.style.right = "18px";
        repl.style.bottom = "18px";
        repl.style.width = "720px";
        repl.style.height = "min(66vh, 560px)";
    }
}

function captureExplorerFloatState(){
    if(!explorerWindow) return;
    const rect = explorerWindow.getBoundingClientRect();
    explorerFloatState = {
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height
    };
}

function applyExplorerFloatState(){
    if(!explorerWindow) return;
    if(explorerFloatState){
        explorerWindow.style.left = explorerFloatState.left + "px";
        explorerWindow.style.top = explorerFloatState.top + "px";
        explorerWindow.style.width = explorerFloatState.width + "px";
        explorerWindow.style.height = explorerFloatState.height + "px";
        explorerWindow.style.right = "auto";
        explorerWindow.style.bottom = "auto";
    }else{
        explorerWindow.style.left = "18px";
        explorerWindow.style.bottom = "18px";
        explorerWindow.style.right = "auto";
        explorerWindow.style.top = "auto";
        explorerWindow.style.width = "560px";
        explorerWindow.style.height = "min(70vh, 600px)";
    }
}

function updateExpandButtonText(){
    if (explorerWindow && explorerWindow.classList.contains("explorerMini")) {
        btnExpand.textContent = ">>";
        btnExpand.title = "Expand to full view";
    } else {
        btnExpand.textContent = "<<";
        btnExpand.title = "Minimize to compact view";
    }
    positionExpandButton();
}

function positionExpandButton(){
    if (!btnExpand) return;
    const explorerBodyEl = document.getElementById("replExplorerBody");
    if (!explorerBodyEl) return;

    const bodyRect = explorerBodyEl.getBoundingClientRect();
    if (!bodyRect.height) return;

    const offsetY = bodyRect.height / 2;
    btnExpand.style.top = `${offsetY}px`;
}

function captureFloatStateFor(key){
    if(key === "repl") captureFloatState();
    if(key === "explorer") captureExplorerFloatState();
}

function applyFloatStateFor(key){
    if(key === "repl") applyFloatState();
    if(key === "explorer") applyExplorerFloatState();
}

function positionDockRight(key, top, height, width){
    const el = key === "repl" ? repl : explorerWindow;
    if(!el) return;
    el.style.right = "0";
    el.style.left = "auto";
    el.style.top = top + "px";
    el.style.bottom = "auto";
    el.style.width = width + "px";
    el.style.height = height + "px";
}

function positionDockLeft(key, top, height, width){
    const el = key === "repl" ? repl : explorerWindow;
    if(!el) return;
    el.style.left = "0";
    el.style.right = "auto";
    el.style.top = top + "px";
    el.style.bottom = "auto";
    el.style.width = width + "px";
    el.style.height = height + "px";
}

function positionDockBottom(key, left, width, height){
    const el = key === "repl" ? repl : explorerWindow;
    if(!el) return;
    el.style.left = left + "px";
    el.style.right = "auto";
    el.style.bottom = "0";
    el.style.top = "auto";
    el.style.width = width + "px";
    el.style.height = height + "px";
}

function positionDockTop(key, left, width, height){
    const el = key === "repl" ? repl : explorerWindow;
    if(!el) return;
    el.style.left = left + "px";
    el.style.right = "auto";
    el.style.top = "0";
    el.style.bottom = "auto";
    el.style.width = width + "px";
    el.style.height = height + "px";
}

function getDockAlt(pos){
    switch(pos){
        case "rt": return "rb";
        case "rb": return "rt";
        case "lt": return "lb";
        case "lb": return "lt";
        case "tl": return "tr";
        case "tr": return "tl";
        case "bl": return "br";
        case "br": return "bl";
        default: return null;
    }
}

function applyDockLayout(){
    const explorerVisible = explorerWindow && !explorerWindow.classList.contains("hidden");
    const keys = ["repl","explorer"];
    const rightKeys = keys.filter(k => dockState[k] && dockState[k].startsWith("r") && (k !== "explorer" || explorerVisible));
    const leftKeys = keys.filter(k => dockState[k] && dockState[k].startsWith("l") && (k !== "explorer" || explorerVisible));
    const bottomKeys = keys.filter(k => dockState[k] && dockState[k].startsWith("b") && (k !== "explorer" || explorerVisible));
    const topKeys = keys.filter(k => dockState[k] && dockState[k].startsWith("t") && (k !== "explorer" || explorerVisible));

    keys.forEach(k => {
        const el = k === "repl" ? repl : explorerWindow;
        if(!el) return;
        const pos = dockState[k];
        if(!pos){
            el.classList.remove("docked","dock-right","dock-left","dock-bottom","dock-top");
            applyFloatStateFor(k);
            return;
        }
        el.classList.add("docked");
        el.classList.toggle("dock-right", pos.startsWith("r"));
        el.classList.toggle("dock-left", pos.startsWith("l"));
        el.classList.toggle("dock-bottom", pos.startsWith("b"));
        el.classList.toggle("dock-top", pos.startsWith("t"));
        el.classList.remove("maximized");
    });

    if(rightKeys.length === 1 && lastRightCount === 0){
        dockGroups.right.width = Math.round(window.innerWidth / 2);
        dockGroups.right.split = 0.5;
    }
    if(leftKeys.length === 1 && lastLeftCount === 0){
        dockGroups.left.width = Math.round(window.innerWidth / 2);
        dockGroups.left.split = 0.5;
    }
    if(bottomKeys.length === 1 && lastBottomCount === 0){
        dockGroups.bottom.height = Math.round(window.innerHeight / 2);
        dockGroups.bottom.split = 0.5;
    }
    if(topKeys.length === 1 && lastTopCount === 0){
        dockGroups.top.height = Math.round(window.innerHeight / 2);
        dockGroups.top.split = 0.5;
    }

    if(rightKeys.length === 2 && lastRightCount !== 2){
        dockGroups.right.split = 0.5;
    }
    if(leftKeys.length === 2 && lastLeftCount !== 2){
        dockGroups.left.split = 0.5;
    }
    if(bottomKeys.length === 2 && lastBottomCount !== 2){
        dockGroups.bottom.split = 0.5;
    }
    if(topKeys.length === 2 && lastTopCount !== 2){
        dockGroups.top.split = 0.5;
    }

    if(rightKeys.length){
        const fullKey = rightKeys.find(k => dockState[k] === "r");
        if(!dockGroups.right.width){
            dockGroups.right.width = Math.round(window.innerWidth / 2);
        }
        const minW = 360;
        const maxW = window.innerWidth - 16;
        const rightWidth = clamp(dockGroups.right.width || minW, minW, maxW);
        dockGroups.right.width = rightWidth;

        const totalH = window.innerHeight;
        const minH = 220;
        const minRatio = minH / totalH;

        if(fullKey){
            positionDockRight(fullKey, 0, totalH, rightWidth);
            if(dockSplitRight) dockSplitRight.style.display = "none";
        }else if(rightKeys.length === 2){
            dockGroups.right.split = clamp(dockGroups.right.split, minRatio, 1 - minRatio);
            const topH = Math.round(totalH * dockGroups.right.split);
            const bottomH = totalH - topH;
            const topKey = dockState.repl === "rt" ? "repl" : dockState.explorer === "rt" ? "explorer" : rightKeys[0];
            const bottomKey = topKey === "repl" ? "explorer" : "repl";
            positionDockRight(topKey, 0, topH, rightWidth);
            positionDockRight(bottomKey, topH, bottomH, rightWidth);
            if(dockSplitRight){
                dockSplitRight.style.display = "block";
                dockSplitRight.style.right = "0";
                dockSplitRight.style.left = "auto";
                dockSplitRight.style.top = (topH - 3) + "px";
                dockSplitRight.style.width = rightWidth + "px";
            }
        }else{
            const key = rightKeys[0];
            const pos = dockState[key];
            let split = dockGroups.right.split ?? 0.5;
            if(pos === "rt"){
                split = clamp(split, minRatio, 1);
            }else if(pos === "rb"){
                split = clamp(split, 0, 1 - minRatio);
            }else{
                split = clamp(split, minRatio, 1 - minRatio);
            }
            dockGroups.right.split = split;
            const topH = Math.round(totalH * split);
            const bottomH = totalH - topH;
            if(pos === "rb"){
                positionDockRight(key, topH, bottomH, rightWidth);
            }else{
                positionDockRight(key, 0, topH, rightWidth);
            }
            if(dockSplitRight){
                dockSplitRight.style.display = "block";
                dockSplitRight.style.right = "0";
                dockSplitRight.style.left = "auto";
                dockSplitRight.style.top = (topH - 3) + "px";
                dockSplitRight.style.width = rightWidth + "px";
            }
        }
    }else{
        if(dockSplitRight) dockSplitRight.style.display = "none";
    }

    if(leftKeys.length){
        const fullKey = leftKeys.find(k => dockState[k] === "l");
        if(!dockGroups.left.width){
            dockGroups.left.width = Math.round(window.innerWidth / 2);
        }
        const minW = 360;
        const maxW = window.innerWidth - 16;
        const leftWidth = clamp(dockGroups.left.width || minW, minW, maxW);
        dockGroups.left.width = leftWidth;

        const totalH = window.innerHeight;
        const minH = 220;
        const minRatio = minH / totalH;

        if(fullKey){
            positionDockLeft(fullKey, 0, totalH, leftWidth);
            if(dockSplitLeft) dockSplitLeft.style.display = "none";
        }else if(leftKeys.length === 2){
            dockGroups.left.split = clamp(dockGroups.left.split, minRatio, 1 - minRatio);
            const topH = Math.round(totalH * dockGroups.left.split);
            const bottomH = totalH - topH;
            const topKey = dockState.repl === "lt" ? "repl" : dockState.explorer === "lt" ? "explorer" : leftKeys[0];
            const bottomKey = topKey === "repl" ? "explorer" : "repl";
            positionDockLeft(topKey, 0, topH, leftWidth);
            positionDockLeft(bottomKey, topH, bottomH, leftWidth);
            if(dockSplitLeft){
                dockSplitLeft.style.display = "block";
                dockSplitLeft.style.left = "0";
                dockSplitLeft.style.right = "auto";
                dockSplitLeft.style.top = (topH - 3) + "px";
                dockSplitLeft.style.width = leftWidth + "px";
            }
        }else{
            const key = leftKeys[0];
            const pos = dockState[key];
            let split = dockGroups.left.split ?? 0.5;
            if(pos === "lt"){
                split = clamp(split, minRatio, 1);
            }else if(pos === "lb"){
                split = clamp(split, 0, 1 - minRatio);
            }else{
                split = clamp(split, minRatio, 1 - minRatio);
            }
            dockGroups.left.split = split;
            const topH = Math.round(totalH * split);
            const bottomH = totalH - topH;
            if(pos === "lb"){
                positionDockLeft(key, topH, bottomH, leftWidth);
            }else{
                positionDockLeft(key, 0, topH, leftWidth);
            }
            if(dockSplitLeft){
                dockSplitLeft.style.display = "block";
                dockSplitLeft.style.left = "0";
                dockSplitLeft.style.right = "auto";
                dockSplitLeft.style.top = (topH - 3) + "px";
                dockSplitLeft.style.width = leftWidth + "px";
            }
        }
    }else{
        if(dockSplitLeft) dockSplitLeft.style.display = "none";
    }

    if(bottomKeys.length){
        const fullKey = bottomKeys.find(k => dockState[k] === "b");
        if(!dockGroups.bottom.height){
            dockGroups.bottom.height = Math.round(window.innerHeight / 2);
        }
        const minH = 260;
        const maxH = window.innerHeight - 16;
        const bottomHeight = clamp(dockGroups.bottom.height || minH, minH, maxH);
        dockGroups.bottom.height = bottomHeight;

        const totalW = window.innerWidth;
        const minW = 320;
        const minRatio = minW / totalW;

        if(fullKey){
            positionDockBottom(fullKey, 0, totalW, bottomHeight);
            if(dockSplitBottom) dockSplitBottom.style.display = "none";
        }else if(bottomKeys.length === 2){
            dockGroups.bottom.split = clamp(dockGroups.bottom.split, minRatio, 1 - minRatio);
            const leftW = Math.round(totalW * dockGroups.bottom.split);
            const rightW = totalW - leftW;
            const leftKey = dockState.repl === "bl" ? "repl" : dockState.explorer === "bl" ? "explorer" : bottomKeys[0];
            const rightKey = leftKey === "repl" ? "explorer" : "repl";
            positionDockBottom(leftKey, 0, leftW, bottomHeight);
            positionDockBottom(rightKey, leftW, rightW, bottomHeight);
            if(dockSplitBottom){
                dockSplitBottom.style.display = "block";
                dockSplitBottom.style.bottom = "0";
                dockSplitBottom.style.left = (leftW - 3) + "px";
                dockSplitBottom.style.height = bottomHeight + "px";
            }
        }else{
            const key = bottomKeys[0];
            const pos = dockState[key];
            let split = dockGroups.bottom.split ?? 0.5;
            if(pos === "bl"){
                split = clamp(split, minRatio, 1);
            }else if(pos === "br"){
                split = clamp(split, 0, 1 - minRatio);
            }else{
                split = clamp(split, minRatio, 1 - minRatio);
            }
            dockGroups.bottom.split = split;
            const leftW = Math.round(totalW * split);
            const rightW = totalW - leftW;
            if(pos === "br"){
                positionDockBottom(key, leftW, rightW, bottomHeight);
            }else{
                positionDockBottom(key, 0, leftW, bottomHeight);
            }
            if(dockSplitBottom){
                dockSplitBottom.style.display = "block";
                dockSplitBottom.style.bottom = "0";
                dockSplitBottom.style.left = (leftW - 3) + "px";
                dockSplitBottom.style.height = bottomHeight + "px";
            }
        }
    }else{
        if(dockSplitBottom) dockSplitBottom.style.display = "none";
    }

    if(topKeys.length){
        const fullKey = topKeys.find(k => dockState[k] === "t");
        if(!dockGroups.top.height){
            dockGroups.top.height = Math.round(window.innerHeight / 2);
        }
        const minH = 260;
        const maxH = window.innerHeight - 16;
        const topHeight = clamp(dockGroups.top.height || minH, minH, maxH);
        dockGroups.top.height = topHeight;

        const totalW = window.innerWidth;
        const minW = 320;
        const minRatio = minW / totalW;

        if(fullKey){
            positionDockTop(fullKey, 0, totalW, topHeight);
            if(dockSplitTop) dockSplitTop.style.display = "none";
        }else if(topKeys.length === 2){
            dockGroups.top.split = clamp(dockGroups.top.split, minRatio, 1 - minRatio);
            const leftW = Math.round(totalW * dockGroups.top.split);
            const rightW = totalW - leftW;
            const leftKey = dockState.repl === "tl" ? "repl" : dockState.explorer === "tl" ? "explorer" : topKeys[0];
            const rightKey = leftKey === "repl" ? "explorer" : "repl";
            positionDockTop(leftKey, 0, leftW, topHeight);
            positionDockTop(rightKey, leftW, rightW, topHeight);
            if(dockSplitTop){
                dockSplitTop.style.display = "block";
                dockSplitTop.style.top = "0";
                dockSplitTop.style.bottom = "auto";
                dockSplitTop.style.left = (leftW - 3) + "px";
                dockSplitTop.style.height = topHeight + "px";
            }
        }else{
            const key = topKeys[0];
            const pos = dockState[key];
            let split = dockGroups.top.split ?? 0.5;
            if(pos === "tl"){
                split = clamp(split, minRatio, 1);
            }else if(pos === "tr"){
                split = clamp(split, 0, 1 - minRatio);
            }else{
                split = clamp(split, minRatio, 1 - minRatio);
            }
            dockGroups.top.split = split;
            const leftW = Math.round(totalW * split);
            const rightW = totalW - leftW;
            if(pos === "tr"){
                positionDockTop(key, leftW, rightW, topHeight);
            }else{
                positionDockTop(key, 0, leftW, topHeight);
            }
            if(dockSplitTop){
                dockSplitTop.style.display = "block";
                dockSplitTop.style.top = "0";
                dockSplitTop.style.bottom = "auto";
                dockSplitTop.style.left = (leftW - 3) + "px";
                dockSplitTop.style.height = topHeight + "px";
            }
        }
    }else{
        if(dockSplitTop) dockSplitTop.style.display = "none";
    }

    lastRightCount = rightKeys.length;
    lastLeftCount = leftKeys.length;
    lastBottomCount = bottomKeys.length;
    lastTopCount = topKeys.length;
    positionExpandButton();
}

function setDockPosition(key, pos){
    const otherKey = key === "repl" ? "explorer" : "repl";
    if(!dockState[key]){
        captureFloatStateFor(key);
    }
    if(dockState[otherKey]){
        const otherPos = dockState[otherKey];
        if(otherPos === pos){
            dockState[otherKey] = getDockAlt(pos);
        }else if(otherPos && otherPos[0] === pos[0]){
            if(pos.length === 1 || otherPos.length === 1){
                dockState[otherKey] = null;
            }
        }
    }
    dockState[key] = pos;
    applyDockLayout();
}

function clearDockPosition(key){
    dockState[key] = null;
    applyDockLayout();
}

function initWindowing(){
    if(!repl) return;

    const headerEl = document.getElementById("replHeader");
    let dragging = false;
    let startX=0, startY=0, startLeft=0, startTop=0;
    let resizing = false;
    let resizeDir = "";
    let resizeStartX = 0;
    let resizeStartY = 0;
    let resizeStartW = 0;
    let resizeStartH = 0;
    let resizeStartLeft = 0;
    let resizeStartTop = 0;

    headerEl.addEventListener("pointerdown", (e) => {
        if (e.target && e.target.closest && e.target.closest("button")) return;
        if (repl.classList.contains("dock-right") || repl.classList.contains("dock-left") || repl.classList.contains("dock-bottom") || repl.classList.contains("dock-top")) return;
        dragging = true;
        headerEl.setPointerCapture(e.pointerId);
        const rect = repl.getBoundingClientRect();
        startX = e.clientX;
        startY = e.clientY;
        startLeft = rect.left;
        startTop = rect.top;

        repl.style.right = "auto";
        repl.style.bottom = "auto";
        repl.style.left = rect.left + "px";
        repl.style.top = rect.top + "px";
    });

    headerEl.addEventListener("pointermove", (e) => {
        if(!dragging) return;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;

        const w = repl.getBoundingClientRect().width;
        const h = repl.getBoundingClientRect().height;

        const newLeft = clamp(startLeft + dx, 8, window.innerWidth - w - 8);
        const newTop  = clamp(startTop  + dy, 8, window.innerHeight - h - 8);

        repl.style.left = newLeft + "px";
        repl.style.top  = newTop + "px";
    });

    headerEl.addEventListener("pointerup", () => { dragging = false; });
    headerEl.addEventListener("pointercancel", () => { dragging = false; });

    if (dockRTBtn) {
        dockRTBtn.addEventListener("click", () => setDockPosition("repl","rt"));
    }
    if (dockRBBtn) {
        dockRBBtn.addEventListener("click", () => setDockPosition("repl","rb"));
    }
    if (dockLeftBtn) {
        dockLeftBtn.addEventListener("click", () => setDockPosition("repl","l"));
    }
    if (dockRightBtn) {
        dockRightBtn.addEventListener("click", () => setDockPosition("repl","r"));
    }
    if (dockTopBtn) {
        dockTopBtn.addEventListener("click", () => setDockPosition("repl","t"));
    }
    if (dockBottomBtn) {
        dockBottomBtn.addEventListener("click", () => setDockPosition("repl","b"));
    }
    if (dockLTBtn) {
        dockLTBtn.addEventListener("click", () => setDockPosition("repl","lt"));
    }
    if (dockLBBtn) {
        dockLBBtn.addEventListener("click", () => setDockPosition("repl","lb"));
    }
    if (dockTLBtn) {
        dockTLBtn.addEventListener("click", () => setDockPosition("repl","tl"));
    }
    if (dockTRBtn) {
        dockTRBtn.addEventListener("click", () => setDockPosition("repl","tr"));
    }
    if (dockBLBtn) {
        dockBLBtn.addEventListener("click", () => setDockPosition("repl","bl"));
    }
    if (dockBRBtn) {
        dockBRBtn.addEventListener("click", () => setDockPosition("repl","br"));
    }
    if (dockFloatBtn) {
        dockFloatBtn.addEventListener("click", () => clearDockPosition("repl"));
    }

    const resizers = repl.querySelectorAll(".repl-resizer");
    resizers.forEach((handle) => {
        handle.addEventListener("pointerdown", (e) => {
            if (e.button !== 0) return;
            e.preventDefault();
            e.stopPropagation();
            resizing = true;
            resizeDir = handle.dataset.dir || "";
            handle.setPointerCapture(e.pointerId);

            const rect = repl.getBoundingClientRect();
            resizeStartX = e.clientX;
            resizeStartY = e.clientY;
            resizeStartW = rect.width;
            resizeStartH = rect.height;
            resizeStartLeft = rect.left;
            resizeStartTop = rect.top;

            if (!repl.classList.contains("dock-right") && !repl.classList.contains("dock-bottom")) {
                repl.style.right = "auto";
                repl.style.bottom = "auto";
                repl.style.left = rect.left + "px";
                repl.style.top = rect.top + "px";
            }
        });
    });

    document.addEventListener("pointermove", (e) => {
        if (!resizing) return;
        const dx = e.clientX - resizeStartX;
        const dy = e.clientY - resizeStartY;

        const minW = 360;
        const minH = 240;
        const maxW = window.innerWidth - 16;
        const maxH = window.innerHeight - 16;

        const rightSplit = dockState.repl && dockState.explorer && dockState.repl.startsWith("r") && dockState.explorer.startsWith("r");
        const leftSplit = dockState.repl && dockState.explorer && dockState.repl.startsWith("l") && dockState.explorer.startsWith("l");
        const bottomSplit = dockState.repl && dockState.explorer && dockState.repl.startsWith("b") && dockState.explorer.startsWith("b");
        const topSplit = dockState.repl && dockState.explorer && dockState.repl.startsWith("t") && dockState.explorer.startsWith("t");

        if (repl.classList.contains("dock-right")) {
            if (rightSplit) return;
            if (resizeDir !== "w") return;
            const newW = clamp(resizeStartW - dx, minW, maxW);
            dockGroups.right.width = newW;
            applyDockLayout();
            return;
        }
        if (repl.classList.contains("dock-left")) {
            if (leftSplit) return;
            if (resizeDir !== "e") return;
            const newW = clamp(resizeStartW + dx, minW, maxW);
            dockGroups.left.width = newW;
            applyDockLayout();
            return;
        }
        if (repl.classList.contains("dock-bottom")) {
            if (bottomSplit) return;
            if (resizeDir !== "n") return;
            const newH = clamp(resizeStartH - dy, minH, maxH);
            dockGroups.bottom.height = newH;
            applyDockLayout();
            return;
        }
        if (repl.classList.contains("dock-top")) {
            if (topSplit) return;
            if (resizeDir !== "s") return;
            const newH = clamp(resizeStartH + dy, minH, maxH);
            dockGroups.top.height = newH;
            applyDockLayout();
            return;
        }

        let newW = resizeStartW;
        let newH = resizeStartH;
        let newLeft = resizeStartLeft;
        let newTop = resizeStartTop;

        if (resizeDir.includes("e")) newW = clamp(resizeStartW + dx, minW, maxW);
        if (resizeDir.includes("s")) newH = clamp(resizeStartH + dy, minH, maxH);
        if (resizeDir.includes("w")) {
            newW = clamp(resizeStartW - dx, minW, maxW);
            newLeft = resizeStartLeft + dx;
        }
        if (resizeDir.includes("n")) {
            newH = clamp(resizeStartH - dy, minH, maxH);
            newTop = resizeStartTop + dy;
        }

        newLeft = clamp(newLeft, 0, window.innerWidth - newW);
        newTop = clamp(newTop, 0, window.innerHeight - newH);

        repl.style.width = newW + "px";
        repl.style.height = newH + "px";
        repl.style.left = newLeft + "px";
        repl.style.top = newTop + "px";
        positionExpandButton();
    });

    document.addEventListener("pointerup", () => { resizing = false; });

    // Splitter drag for docked pairs
    let splitDragging = null;
    if (dockSplitRight) {
        dockSplitRight.addEventListener("pointerdown", (e) => {
            e.preventDefault();
            splitDragging = "right";
            dockSplitRight.setPointerCapture(e.pointerId);
        });
    }
    if (dockSplitLeft) {
        dockSplitLeft.addEventListener("pointerdown", (e) => {
            e.preventDefault();
            splitDragging = "left";
            dockSplitLeft.setPointerCapture(e.pointerId);
        });
    }
    if (dockSplitBottom) {
        dockSplitBottom.addEventListener("pointerdown", (e) => {
            e.preventDefault();
            splitDragging = "bottom";
            dockSplitBottom.setPointerCapture(e.pointerId);
        });
    }
    if (dockSplitTop) {
        dockSplitTop.addEventListener("pointerdown", (e) => {
            e.preventDefault();
            splitDragging = "top";
            dockSplitTop.setPointerCapture(e.pointerId);
        });
    }

    document.addEventListener("pointermove", (e) => {
        if (!splitDragging) return;
        const explorerVisible = explorerWindow && !explorerWindow.classList.contains("hidden");
        const rightKeys = ["repl","explorer"].filter(k => dockState[k] && dockState[k].startsWith("r") && (k !== "explorer" || explorerVisible));
        const leftKeys = ["repl","explorer"].filter(k => dockState[k] && dockState[k].startsWith("l") && (k !== "explorer" || explorerVisible));
        const bottomKeys = ["repl","explorer"].filter(k => dockState[k] && dockState[k].startsWith("b") && (k !== "explorer" || explorerVisible));
        const topKeys = ["repl","explorer"].filter(k => dockState[k] && dockState[k].startsWith("t") && (k !== "explorer" || explorerVisible));
        const hasRightSplit = rightKeys.length === 2;
        const hasRightSingle = rightKeys.length === 1;
        const hasLeftSplit = leftKeys.length === 2;
        const hasLeftSingle = leftKeys.length === 1;
        const hasBottomSplit = bottomKeys.length === 2;
        const hasBottomSingle = bottomKeys.length === 1;
        const hasTopSplit = topKeys.length === 2;
        const hasTopSingle = topKeys.length === 1;

        if (splitDragging === "right") {
            if (hasRightSplit || hasRightSingle) {
                const totalH = window.innerHeight;
                const minH = 220;
                const minRatio = minH / totalH;
                let nextSplit = clamp(e.clientY / totalH, 0, 1);

                if (hasRightSplit) {
                    nextSplit = clamp(nextSplit, minRatio, 1 - minRatio);
                } else if (hasRightSingle) {
                    const key = rightKeys[0];
                    const pos = dockState[key];
                    if (pos === "rt") {
                        nextSplit = clamp(nextSplit, minRatio, 1);
                    } else if (pos === "rb") {
                        nextSplit = clamp(nextSplit, 0, 1 - minRatio);
                    } else {
                        nextSplit = clamp(nextSplit, minRatio, 1 - minRatio);
                    }
                }

                dockGroups.right.split = nextSplit;
                applyDockLayout();
                return;
            }
        }
        if (splitDragging === "left") {
            if (hasLeftSplit || hasLeftSingle) {
                const totalH = window.innerHeight;
                const minH = 220;
                const minRatio = minH / totalH;
                let nextSplit = clamp(e.clientY / totalH, 0, 1);

                if (hasLeftSplit) {
                    nextSplit = clamp(nextSplit, minRatio, 1 - minRatio);
                } else if (hasLeftSingle) {
                    const key = leftKeys[0];
                    const pos = dockState[key];
                    if (pos === "lt") {
                        nextSplit = clamp(nextSplit, minRatio, 1);
                    } else if (pos === "lb") {
                        nextSplit = clamp(nextSplit, 0, 1 - minRatio);
                    } else {
                        nextSplit = clamp(nextSplit, minRatio, 1 - minRatio);
                    }
                }

                dockGroups.left.split = nextSplit;
                applyDockLayout();
                return;
            }
        }
        if (splitDragging === "bottom") {
            if (hasBottomSplit || hasBottomSingle) {
                const totalW = window.innerWidth;
                const minW = 320;
                const minRatio = minW / totalW;
                let nextSplit = clamp(e.clientX / totalW, 0, 1);

                if (hasBottomSplit) {
                    nextSplit = clamp(nextSplit, minRatio, 1 - minRatio);
                } else if (hasBottomSingle) {
                    const key = bottomKeys[0];
                    const pos = dockState[key];
                    if (pos === "bl") {
                        nextSplit = clamp(nextSplit, minRatio, 1);
                    } else if (pos === "br") {
                        nextSplit = clamp(nextSplit, 0, 1 - minRatio);
                    } else {
                        nextSplit = clamp(nextSplit, minRatio, 1 - minRatio);
                    }
                }

                dockGroups.bottom.split = nextSplit;
                applyDockLayout();
                return;
            }
        }
        if (splitDragging === "top") {
            if (hasTopSplit || hasTopSingle) {
                const totalW = window.innerWidth;
                const minW = 320;
                const minRatio = minW / totalW;
                let nextSplit = clamp(e.clientX / totalW, 0, 1);

                if (hasTopSplit) {
                    nextSplit = clamp(nextSplit, minRatio, 1 - minRatio);
                } else if (hasTopSingle) {
                    const key = topKeys[0];
                    const pos = dockState[key];
                    if (pos === "tl") {
                        nextSplit = clamp(nextSplit, minRatio, 1);
                    } else if (pos === "tr") {
                        nextSplit = clamp(nextSplit, 0, 1 - minRatio);
                    } else {
                        nextSplit = clamp(nextSplit, minRatio, 1 - minRatio);
                    }
                }

                dockGroups.top.split = nextSplit;
                applyDockLayout();
                return;
            }
        }
    });

    document.addEventListener("pointerup", () => { splitDragging = null; });

    // Explorer window handlers
    if (explorerWindow && explorerHeader) {
        let expDragging = false;
        let expResizing = false;
        let expResizeDir = "";
        let expStartX = 0;
        let expStartY = 0;
        let expStartW = 0;
        let expStartH = 0;
        let expStartLeft = 0;
        let expStartTop = 0;

        function toggleExplorerMinimize(){
            if(!explorerWindow) return;
            explorerWindow.classList.toggle("minimized");
            positionExpandButton();
        }

        function toggleExplorerMaximize(){
            if(!explorerWindow) return;
            if(explorerWindow.classList.contains("maximized")){
                explorerWindow.classList.remove("maximized");
                applyExplorerFloatState();
            }else{
                captureExplorerFloatState();
                dockState.explorer = null;
                explorerWindow.classList.remove("dock-right","dock-bottom","docked");
                explorerWindow.classList.add("maximized");
                explorerWindow.style.left = "0";
                explorerWindow.style.top = "0";
                explorerWindow.style.right = "0";
                explorerWindow.style.bottom = "0";
                explorerWindow.style.width = "100%";
                explorerWindow.style.height = "100vh";
            }
            positionExpandButton();
        }

        explorerHeader.addEventListener("pointerdown", (e) => {
            if (e.target && e.target.closest && e.target.closest("button")) return;
            if (explorerWindow.classList.contains("dock-right") || explorerWindow.classList.contains("dock-left") || explorerWindow.classList.contains("dock-bottom") || explorerWindow.classList.contains("dock-top")) return;
            if (explorerWindow.classList.contains("maximized")) return;
            expDragging = true;
            explorerHeader.setPointerCapture(e.pointerId);
            const rect = explorerWindow.getBoundingClientRect();
            expStartX = e.clientX;
            expStartY = e.clientY;
            expStartLeft = rect.left;
            expStartTop = rect.top;

            explorerWindow.style.right = "auto";
            explorerWindow.style.bottom = "auto";
            explorerWindow.style.left = rect.left + "px";
            explorerWindow.style.top = rect.top + "px";
        });

        explorerHeader.addEventListener("pointermove", (e) => {
            if(!expDragging) return;
            const dx = e.clientX - expStartX;
            const dy = e.clientY - expStartY;

            const w = explorerWindow.getBoundingClientRect().width;
            const h = explorerWindow.getBoundingClientRect().height;

            const newLeft = clamp(expStartLeft + dx, 8, window.innerWidth - w - 8);
            const newTop  = clamp(expStartTop  + dy, 8, window.innerHeight - h - 8);

            explorerWindow.style.left = newLeft + "px";
            explorerWindow.style.top  = newTop + "px";
        });

        explorerHeader.addEventListener("pointerup", () => { expDragging = false; });
        explorerHeader.addEventListener("pointercancel", () => { expDragging = false; });

        if (explorerDockRTBtn) {
            explorerDockRTBtn.addEventListener("click", () => setDockPosition("explorer","rt"));
        }
        if (explorerDockRBBtn) {
            explorerDockRBBtn.addEventListener("click", () => setDockPosition("explorer","rb"));
        }
        if (explorerDockLeftBtn) {
            explorerDockLeftBtn.addEventListener("click", () => setDockPosition("explorer","l"));
        }
        if (explorerDockRightBtn) {
            explorerDockRightBtn.addEventListener("click", () => setDockPosition("explorer","r"));
        }
        if (explorerDockTopBtn) {
            explorerDockTopBtn.addEventListener("click", () => setDockPosition("explorer","t"));
        }
        if (explorerDockBottomBtn) {
            explorerDockBottomBtn.addEventListener("click", () => setDockPosition("explorer","b"));
        }
        if (explorerDockLTBtn) {
            explorerDockLTBtn.addEventListener("click", () => setDockPosition("explorer","lt"));
        }
        if (explorerDockLBBtn) {
            explorerDockLBBtn.addEventListener("click", () => setDockPosition("explorer","lb"));
        }
        if (explorerDockTLBtn) {
            explorerDockTLBtn.addEventListener("click", () => setDockPosition("explorer","tl"));
        }
        if (explorerDockTRBtn) {
            explorerDockTRBtn.addEventListener("click", () => setDockPosition("explorer","tr"));
        }
        if (explorerDockBLBtn) {
            explorerDockBLBtn.addEventListener("click", () => setDockPosition("explorer","bl"));
        }
        if (explorerDockBRBtn) {
            explorerDockBRBtn.addEventListener("click", () => setDockPosition("explorer","br"));
        }
        if (explorerDockFloatBtn) {
            explorerDockFloatBtn.addEventListener("click", () => clearDockPosition("explorer"));
        }
        if (explorerMinBtn) {
            explorerMinBtn.addEventListener("click", () => toggleExplorerMinimize());
        }
        if (explorerMaxBtn) {
            explorerMaxBtn.addEventListener("click", () => toggleExplorerMaximize());
        }
        if (explorerCloseBtn) {
            explorerCloseBtn.addEventListener("click", () => {
                dockState.explorer = null;
                explorerWindow.classList.add("hidden");
                applyDockLayout();
            });
        }

        const explorerResizers = explorerWindow.querySelectorAll(".repl-resizer");
        explorerResizers.forEach((handle) => {
            handle.addEventListener("pointerdown", (e) => {
                if (e.button !== 0) return;
                if (explorerWindow.classList.contains("maximized")) return;
                e.preventDefault();
                e.stopPropagation();
                expResizing = true;
                expResizeDir = handle.dataset.dir || "";
                handle.setPointerCapture(e.pointerId);

                const rect = explorerWindow.getBoundingClientRect();
                expStartX = e.clientX;
                expStartY = e.clientY;
                expStartW = rect.width;
                expStartH = rect.height;
                expStartLeft = rect.left;
                expStartTop = rect.top;

                if (!explorerWindow.classList.contains("dock-right") && !explorerWindow.classList.contains("dock-bottom")) {
                    explorerWindow.style.right = "auto";
                    explorerWindow.style.bottom = "auto";
                    explorerWindow.style.left = rect.left + "px";
                    explorerWindow.style.top = rect.top + "px";
                }
            });
        });

        document.addEventListener("pointermove", (e) => {
            if (!expResizing) return;
            const dx = e.clientX - expStartX;
            const dy = e.clientY - expStartY;

            const minW = 360;
            const minH = 260;
            const maxW = window.innerWidth - 16;
            const maxH = window.innerHeight - 16;

            const rightSplit = dockState.repl && dockState.explorer && dockState.repl.startsWith("r") && dockState.explorer.startsWith("r");
            const leftSplit = dockState.repl && dockState.explorer && dockState.repl.startsWith("l") && dockState.explorer.startsWith("l");
            const bottomSplit = dockState.repl && dockState.explorer && dockState.repl.startsWith("b") && dockState.explorer.startsWith("b");
            const topSplit = dockState.repl && dockState.explorer && dockState.repl.startsWith("t") && dockState.explorer.startsWith("t");

            if (explorerWindow.classList.contains("dock-right")) {
                if (rightSplit) return;
                if (expResizeDir !== "w") return;
                const newW = clamp(expStartW - dx, minW, maxW);
                dockGroups.right.width = newW;
                applyDockLayout();
                return;
            }
            if (explorerWindow.classList.contains("dock-left")) {
                if (leftSplit) return;
                if (expResizeDir !== "e") return;
                const newW = clamp(expStartW + dx, minW, maxW);
                dockGroups.left.width = newW;
                applyDockLayout();
                return;
            }
            if (explorerWindow.classList.contains("dock-bottom")) {
                if (bottomSplit) return;
                if (expResizeDir !== "n") return;
                const newH = clamp(expStartH - dy, minH, maxH);
                dockGroups.bottom.height = newH;
                applyDockLayout();
                return;
            }
            if (explorerWindow.classList.contains("dock-top")) {
                if (topSplit) return;
                if (expResizeDir !== "s") return;
                const newH = clamp(expStartH + dy, minH, maxH);
                dockGroups.top.height = newH;
                applyDockLayout();
                return;
            }

            let newW = expStartW;
            let newH = expStartH;
            let newLeft = expStartLeft;
            let newTop = expStartTop;

            if (expResizeDir.includes("e")) newW = clamp(expStartW + dx, minW, maxW);
            if (expResizeDir.includes("s")) newH = clamp(expStartH + dy, minH, maxH);
            if (expResizeDir.includes("w")) {
                newW = clamp(expStartW - dx, minW, maxW);
                newLeft = expStartLeft + dx;
            }
            if (expResizeDir.includes("n")) {
                newH = clamp(expStartH - dy, minH, maxH);
                newTop = expStartTop + dy;
            }

            newLeft = clamp(newLeft, 0, window.innerWidth - newW);
            newTop = clamp(newTop, 0, window.innerHeight - newH);

            explorerWindow.style.width = newW + "px";
            explorerWindow.style.height = newH + "px";
            explorerWindow.style.left = newLeft + "px";
            explorerWindow.style.top = newTop + "px";
            positionExpandButton();
        });

        document.addEventListener("pointerup", () => { expResizing = false; });
    }

    window.addEventListener("resize", () => {
        applyDockLayout();
    });

    applyDockLayout();
}
