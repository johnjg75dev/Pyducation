// -------------------------------------------------------------
// Main bootstrap
// -------------------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
    pyStatus = document.getElementById("pyStatus");
    out = document.getElementById("replOut");
    input = document.getElementById("replIn");
    runBtn = document.getElementById("replRun");
    clearBtn = document.getElementById("replClear");
    collapseBtn = document.getElementById("replCollapse");
    repl = document.getElementById("repl");
    explorerToggleBtn = document.getElementById("replExplorerToggle");
    dockRTBtn = document.getElementById("dockRT");
    dockRBBtn = document.getElementById("dockRB");
    dockBLBtn = document.getElementById("dockBL");
    dockBRBtn = document.getElementById("dockBR");
    dockLTBtn = document.getElementById("dockLT");
    dockLBBtn = document.getElementById("dockLB");
    dockTLBtn = document.getElementById("dockTL");
    dockTRBtn = document.getElementById("dockTR");
    dockLeftBtn = document.getElementById("dockLeft");
    dockRightBtn = document.getElementById("dockRight");
    dockTopBtn = document.getElementById("dockTop");
    dockBottomBtn = document.getElementById("dockBottom");
    dockFloatBtn = document.getElementById("dockFloat");
    explorerWindow = document.getElementById("explorerWindow");
    explorerHeader = document.getElementById("explorerHeader");
    explorerBody = document.getElementById("explorerBody");
    explorerDockRTBtn = document.getElementById("explorerDockRT");
    explorerDockRBBtn = document.getElementById("explorerDockRB");
    explorerDockBLBtn = document.getElementById("explorerDockBL");
    explorerDockBRBtn = document.getElementById("explorerDockBR");
    explorerDockLTBtn = document.getElementById("explorerDockLT");
    explorerDockLBBtn = document.getElementById("explorerDockLB");
    explorerDockTLBtn = document.getElementById("explorerDockTL");
    explorerDockTRBtn = document.getElementById("explorerDockTR");
    explorerDockLeftBtn = document.getElementById("explorerDockLeft");
    explorerDockRightBtn = document.getElementById("explorerDockRight");
    explorerDockTopBtn = document.getElementById("explorerDockTop");
    explorerDockBottomBtn = document.getElementById("explorerDockBottom");
    explorerDockFloatBtn = document.getElementById("explorerDockFloat");
    explorerMinBtn = document.getElementById("explorerMinimize");
    explorerMaxBtn = document.getElementById("explorerMaximize");
    explorerCloseBtn = document.getElementById("explorerClose");
    dockSplitRight = document.getElementById("dockSplitRight");
    dockSplitLeft = document.getElementById("dockSplitLeft");
    dockSplitBottom = document.getElementById("dockSplitBottom");
    dockSplitTop = document.getElementById("dockSplitTop");

    elPath = document.getElementById("winPath");
    elList = document.getElementById("fileList");
    elEditor = document.getElementById("fileEditor");
    elEditorName = document.getElementById("editorName");
    elEditorHint = document.getElementById("editorPathHint");
    elDirty = document.getElementById("dirtyHint");

    navPersist = document.getElementById("navPersist");
    navTmp = document.getElementById("navTmp");

    btnUp = document.getElementById("btnUp");
    btnReload = document.getElementById("btnReload");
    btnNewFile = document.getElementById("btnNewFile");
    btnNewFolder = document.getElementById("btnNewFolder");
    btnSaveFile = document.getElementById("btnSaveFile");
    btnDelete = document.getElementById("btnDelete");
    btnDownload = document.getElementById("btnDownload");
    btnUpload = document.getElementById("btnUpload");
    uploadInput = document.getElementById("uploadInput");
    btnExpand = document.getElementById("btnExpand");
    ReplTitleStatus = document.getElementById("replTitleStatus");

    initTables();
    initRepl();
    initWindowing();
    initTheme();
});

