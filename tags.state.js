let pyStatus = null;
let out = null;
let input = null;
let runBtn = null;
let clearBtn = null;
let collapseBtn = null;
let repl = null;
let explorerToggleBtn = null;
let dockRTBtn = null;
let dockRBBtn = null;
let dockBLBtn = null;
let dockBRBtn = null;
let dockLTBtn = null;
let dockLBBtn = null;
let dockTLBtn = null;
let dockTRBtn = null;
let dockLeftBtn = null;
let dockRightBtn = null;
let dockTopBtn = null;
let dockBottomBtn = null;
let dockFloatBtn = null;
let explorerWindow = null;
let explorerHeader = null;
let explorerBody = null;
let explorerDockRTBtn = null;
let explorerDockRBBtn = null;
let explorerDockBLBtn = null;
let explorerDockBRBtn = null;
let explorerDockLTBtn = null;
let explorerDockLBBtn = null;
let explorerDockTLBtn = null;
let explorerDockTRBtn = null;
let explorerDockLeftBtn = null;
let explorerDockRightBtn = null;
let explorerDockTopBtn = null;
let explorerDockBottomBtn = null;
let explorerDockFloatBtn = null;
let explorerMinBtn = null;
let explorerMaxBtn = null;
let explorerCloseBtn = null;
let dockSplitRight = null;
let dockSplitLeft = null;
let dockSplitBottom = null;
let dockSplitTop = null;

const dockState = { repl: null, explorer: null };
const dockGroups = {
    right: { width: null, split: 0.5 },
    left: { width: null, split: 0.5 },
    bottom: { height: null, split: 0.5 },
    top: { height: null, split: 0.5 }
};

let elPath = null;
let elList = null;
let elEditor = null;
let elEditorName = null;
let elEditorHint = null;
let elDirty = null;

let navPersist = null;
let navTmp = null;

let btnUp = null;
let btnReload = null;
let btnNewFile = null;
let btnNewFolder = null;
let btnSaveFile = null;
let btnDelete = null;
let btnDownload = null;
let btnUpload = null;
let uploadInput = null;
let btnExpand = null;
let ReplTitleStatus = null;
