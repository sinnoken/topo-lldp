/**
 * network-logic.js
 * icon
 * https://staging.svgrepo.com/collection/cyber-security-isometric-3d-vectors/
 */

// --- 0. 環境設定 ---
const ENV = {
    IS_DEBUG: true,         // true: 測試模式 (會載入測試資料), false: 正式模式
    TEST_DATA_URL: 'topo-data.js' // 你的偷吃步 JS 檔案路徑
};
// --- 1. 配置與常量 ---
const THEME = {
    // 基礎色盤
    GRAY: "#90A4AE",
    BLUE: "#2196F3",
    AMBER: "#FFB300",
    RED: "#EF5350",
    PURPLE: "#9575CD",
    TEXT: "#34495E",
    GREEN: "#22A338",
    ORANGE: "#FB8C00",
    LIGHT_RED: "#ff7777",

    // 全局元件顏色
    EDGE_DEFAULT: "#D1D5DB",
    EDGE_HIGHLIGHT: "#017BC6",
    EDGE_HOVER: "#80C5FA",
    BORDER_SWITCH: "#F48D01",
    BORDER_FIREWALL: "#1b812c",
    BORDER_SERVER: "#4527A0",

    // 互動樣式顏色 (從 CONFIG 抽離)
    INTERACTION_ORANGE: "#FF5722", // 懸停文字顏色

    // 埠口專用顏色 (從 CONFIG 抽離)
    PORT_OOB: "rgba(9, 255, 0, 0.3)",
    PORT_L4: "#ff7777",
    PORT_AGGREGATE: "#3B82F6",
    PORT_VLAN: "#F59E0B",
    PORT_HIGHSPEED: "#EF4444"
};

const CONFIG = {
    STORAGE: {
        POSITIONS: 'networkNodesPosition',
        DATA: 'networkTopologyData',
        EXPIRY: 'storageExpiry'  // 過期時間戳
    },
    STORAGE_EXPIRY_MS: 1 * 8 * 60 * 60 * 1000,  // 8小時（毫秒）
    // 連線懸停樣式分離
    EDGE_HOVER_STYLE: {
        HOVER: {
            color: THEME.INTERACTION_ORANGE,
            strokeWidth: 3,
            width: 3
        },
        NORMAL: {
            color: THEME.TEXT,
            strokeWidth: 2,
            width: 1
        }
    },
    // 連線動態樣式配置
    EDGE_INTERACTION: {
        HOVER: {
            fontColor: THEME.INTERACTION_ORANGE,
            strokeWidth: 3,
            edgeWidth: 3
        },
        NORMAL: {
            fontColor: THEME.TEXT,
            strokeWidth: 2,
            edgeWidth: 1
        }
    },
    GROUP_RULES: {
        FIREWALL: /(FGT|FTG|FG)/i,
        SWITCH: /^[A-Z]{2,5}_(?:NOC|OSS|OA)_[A-Z]\d{1,4}/i,
        WINDOWS: /^(DESKTOP|WINDOWS|PC|NB)-/i,
        MAC_ADDRESS: /^([0-9A-F]{2}[:-]){5}([0-9A-F]{2})$|^([0-9A-F]{4}\.[0-9A-F]{4}\.[0-9A-F]{4})$/i
    },
    // 埠口樣式配置表
    PORT_STYLES: [
        {
            key: 'OOB',
            test: /me|mgmt|vme/i,
            color: THEME.PORT_OOB,
            width: 1.5
        },
        {
            key: 'L4',
            test: /port/i,
            color: { inherit: 'both', opacity: 0.9 },
            width: 1.5
        },
        {
            key: 'AGGREGATE',
            test: /ae|bundle/i,
            color: THEME.PORT_AGGREGATE,
            width: 4
        },
        {
            key: 'VLAN',
            test: /vlan/i,
            color: THEME.PORT_VLAN,
            width: 1.5
        },
        {
            key: 'HIGHSPEED',
            test: /10G|40G|100G/i,
            color: THEME.PORT_HIGHSPEED,
            width: 3
        },
        {
            key: 'DEFAULT',
            test: /.*/,
            color: THEME.EDGE_DEFAULT, // 整合至全局邊界顏色
            width: 1.5
        }
    ]
};

// --- 2. 全域變數 ---
let network = null;
let nodesDataSet = new vis.DataSet();
let edgesDataSet = new vis.DataSet();
let currentLayoutMode = 2;


const shieldSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <path fill="${THEME.GREEN}" d="M256 0c4.6 0 9.2 1 13.4 2.9L457.7 82.8c22 9.3 38.4 31 38.3 57.2c-.5 99.2-41.3 280.7-213.6 363.2c-16.7 8-36.1 8-52.8 0C57.3 420.7 16.5 239.2 16 140c-.1-26.2 16.3-47.9 38.3-57.2L242.7 2.9C246.8 1 251.4 0 256 0z"/>
</svg>`;
const svgSwitch = `<svg viewBox="0 0 1024 1024" class="icon" version="1.1" xmlns="http://www.w3.org/2000/svg" fill="#000000"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"><path d="M537 820.3l-470-230v-222l470 212z" fill="#ffbe26"></path><path d="M537 820.3l420-230v-220l-420 210z" fill="#ffb300"></path><path d="M67 368.3l470 212 420-210-494.4-166.6z" fill="#FFC640"></path><path d="M532 266.7l-117.1-7.1 28.7 48 29.5-13.6 102.7 39.2 29.6-14.4-102.9-38.4zM406.8 324.6L290.2 315l28.3 50.4 29.4-13.6L450 394.5l29.6-14.4-102.2-41.9zM605.8 438.1l117.4 5.8-28-52.2-29.8 15.5-102.5-40.5-29.6 14.7 102.3 41.2zM538.8 472.9L437 429l-29.7 14.7 101.8 44.6-29.8 15.5 116.9 8.2-27.6-54.6z" fill="#FFFFFF"></path></g></svg>`;
// const svgFirewall = `<svg viewBox="0 0 1024 1024" class="icon" version="1.1" xmlns="http://www.w3.org/2000/svg" fill="#000000"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"><path d="M762.1 956.3l-660-230v-552l660 192z" fill="#ef3c39"></path><path d="M762.1 956.3l160-170v-550l-160 130z" fill="#bc2624"></path><path d="M102.1 174.3l660 192 160-130L297.7 79.7z" fill="#ff403d"></path><path d="M922.1 410.9v-25.7l-160 129.7v2.7l-244.3-74.8V309.1h-20v127.6l-262-80.2V222.2h-20v128.1l-113.7-34.8v20.9L335.8 408v112l-233.7-74.9v21l113.7 36.4v121.9L102.1 588v21l233.7 74.9v123.9l20 7V690.3l280 89.7v132.3l20 7V786.4l106.3 34.1v2.3l160-153.8v-28.6l-160 153.8v5.3l-244.3-78.3V599.3l244.3 78.3v1.4l160-141.8v-27.1l-160 141.8v4.8l-106.3-34.1V505.9l106.3 32.5v2.1l160-129.6zM497.8 714.8l-262-84V509l262 84v121.8z m138-98.6l-280-89.7V414.1l280 85.7v116.4z" fill="#FFFFFF"></path><path d="M70.1 169.3l695.6 195.6 189.6-129.2-657.6-168z" fill="#ff403d"></path><path d="M68.7 190.7v-21.4l697 195.6v24.8z" fill="#ce3836"></path><path d="M955.3 235.7v23.8L765.7 389.7v-24.8z" fill="#981d1b"></path></g></svg>`;
const svgFirewall = `<svg viewBox="0 0 1024 1024" class="icon" version="1.1" xmlns="http://www.w3.org/2000/svg" fill="#000000"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"><path d="M762.1 956.3l-660-230v-552l660 192z" fill="#0da50d"></path><path d="M762.1 956.3l160-170v-550l-160 130z" fill="#1b8a0f"></path><path d="M102.1 174.3l660 192 160-130L297.7 79.7z" fill="#009900"></path><path d="M922.1 410.9v-25.7l-160 129.7v2.7l-244.3-74.8V309.1h-20v127.6l-262-80.2V222.2h-20v128.1l-113.7-34.8v20.9L335.8 408v112l-233.7-74.9v21l113.7 36.4v121.9L102.1 588v21l233.7 74.9v123.9l20 7V690.3l280 89.7v132.3l20 7V786.4l106.3 34.1v2.3l160-153.8v-28.6l-160 153.8v5.3l-244.3-78.3V599.3l244.3 78.3v1.4l160-141.8v-27.1l-160 141.8v4.8l-106.3-34.1V505.9l106.3 32.5v2.1l160-129.6zM497.8 714.8l-262-84V509l262 84v121.8z m138-98.6l-280-89.7V414.1l280 85.7v116.4z" fill="#FFFFFF"></path><path d="M70.1 169.3l695.6 195.6 189.6-129.2-657.6-168z" fill="#009900"></path><path d="M68.7 190.7v-21.4l697 195.6v24.8z" fill="#28a428"></path><path d="M955.3 235.7v23.8L765.7 389.7v-24.8z" fill="#0f570f"></path></g></svg>`;

// --- 3. 核心工具函數 ---

function identifyDeviceCategory(id) {
    if (!id) return "unknown";
    const upperId = id.toUpperCase();
    if (CONFIG.GROUP_RULES.FIREWALL.test(upperId)) return "firewall";
    if (CONFIG.GROUP_RULES.SWITCH.test(upperId)) return "switch";
    if (CONFIG.GROUP_RULES.WINDOWS.test(upperId)) return "windows";
    if (CONFIG.GROUP_RULES.MAC_ADDRESS.test(id)) return "endpoint";
    return "unknown";
}

function saveRawDataToLocal(dataObj) {
    localStorage.setItem(CONFIG.STORAGE.DATA, JSON.stringify(dataObj));
    // 保存過期時間戳
    const expiryTime = new Date().getTime() + CONFIG.STORAGE_EXPIRY_MS;
    localStorage.setItem(CONFIG.STORAGE.EXPIRY, expiryTime.toString());
}

function getInitialData() {
    const savedData = localStorage.getItem(CONFIG.STORAGE.DATA);
    const expiryTime = localStorage.getItem(CONFIG.STORAGE.EXPIRY);

    // 檢查資料是否過期
    if (savedData && expiryTime) {
        const now = new Date().getTime();
        if (now < parseInt(expiryTime)) {
            try {
                const data = JSON.parse(savedData);
                console.log(`✓ 載入快取資料（${Math.round((parseInt(expiryTime) - now) / 1000 / 60)} 分鐘後過期）`);
                return data;
            } catch (e) {
                console.error("解析快取失敗", e);
            }
        } else {
            // 資料已過期，清除
            console.warn("⏰ 快取資料已過期，已清除");
            localStorage.removeItem(CONFIG.STORAGE.DATA);
            localStorage.removeItem(CONFIG.STORAGE.EXPIRY);
        }
    }

    return {
        "nodes": [
            { "id": "DC1_CORE_FW_01", "label": "DC1_CORE_FW_01", "group": "firewall" },
            { "id": "DC1_CORE_FW_02", "label": "DC1_CORE_FW_02", "group": "firewall" },
            { "id": "DC1_CORE_SW_01", "label": "DC1-CORE-01", "group": "switch" },
            { "id": "DC1_CORE_SW_02", "label": "DC1-CORE-02", "group": "switch" },
            { "id": "DC2_DIST_SW_01", "label": "DC2-DIST-01", "group": "switch" },
            { "id": "DC2_DIST_SW_02", "label": "DC2-DIST-02", "group": "switch" },
            { "id": "DC2_SRV_PROD_01", "label": "PROD-DB-01", "group": "unknown" },
            { "id": "DC2_SRV_PROD_02", "label": "PROD-APP-01", "group": "unknown" },
            { "id": "DC3_DIST_SW_01", "label": "DC3_DIST_SW_01", "group": "switch" },
            { "id": "DC3_DIST_SW_02", "label": "DC3_DIST_SW_02", "group": "switch" },
            { "id": "DC3_SRV_DR_01", "label": "DR-STORAGE-01", "group": "unknown" },
            { "id": "DC3_SRV_DR_02", "label": "DR-WEB-01", "group": "unknown" },
            { "id": "DC4_ACC_SW_01", "label": "DC4_ACC_SW_01", "group": "switch" },
            { "id": "DC4_ACC_SW_02", "label": "DC4_ACC_SW_02", "group": "switch" },
            { "id": "DC4_DEV_NODE_01", "label": "DC4_DEV_NODE_01", "group": "unknown" },
            { "id": "DC4_DEV_NODE_02", "label": "DC4_DEV_NODE_02", "group": "unknown" },
            { "id": "DC5_ACC_SW_01", "label": "DC5_ACC_SW_01", "group": "switch" },
            { "id": "DC5_ACC_SW_02", "label": "DC5_ACC_SW_02", "group": "switch" },
            { "id": "DC5_IOT_01", "label": "OFFICE-WIFI-01", "group": "unknown" },
            { "id": "DC5_IOT_02", "label": "OFFICE-PRINTER-01", "group": "unknown" }
        ],
        "edges": [
            { "from": "DC1_CORE_FW_01", "to": "DC1_CORE_SW_01", "labelFrom": "port1", "labelTo": "ge-0/0/1", "label": "vlan: 1,2,3,4,5,6", "vlan_ids": [1, 2, 3, 4, 5, 6] },
            { "from": "DC1_CORE_FW_01", "to": "DC1_CORE_SW_02", "labelFrom": "port2", "labelTo": "ge-0/0/1", "label": "vlan: 1,2,3,4,5,6", "vlan_ids": [1, 2, 3, 4, 5, 6] },
            { "from": "DC1_CORE_FW_02", "to": "DC1_CORE_SW_01", "labelFrom": "port1", "labelTo": "ge-0/0/2", "label": "vlan: 1,2,3,4,5,6", "vlan_ids": [1, 2, 3, 4, 5, 6] },
            { "from": "DC1_CORE_FW_02", "to": "DC1_CORE_SW_02", "labelFrom": "port2", "labelTo": "ge-0/0/2", "label": "vlan: 1,2,3,4,5,6", "vlan_ids": [1, 2, 3, 4, 5, 6] },
            { "from": "DC1_CORE_SW_01", "to": "DC2_DIST_SW_01", "labelFrom": "xe-0/1/0", "labelTo": "xe-0/1/0", "label": "vlan: 1", "vlan_ids": [1] },
            { "from": "DC1_CORE_SW_01", "to": "DC3_DIST_SW_01", "labelFrom": "xe-0/1/1", "labelTo": "xe-0/1/0", "label": "vlan: 2", "vlan_ids": [2] },
            { "from": "DC1_CORE_SW_01", "to": "DC4_ACC_SW_01", "labelFrom": "xe-0/1/2", "labelTo": "xe-0/1/0", "label": "vlan: 3", "vlan_ids": [3] },
            { "from": "DC1_CORE_SW_01", "to": "DC5_ACC_SW_01", "labelFrom": "xe-0/1/3", "labelTo": "xe-0/1/0", "label": "vlan: 4", "vlan_ids": [4] },
            { "from": "DC1_CORE_SW_02", "to": "DC2_DIST_SW_02", "labelFrom": "xe-0/1/0", "labelTo": "xe-0/1/0", "label": "vlan: 3", "vlan_ids": [3] },
            { "from": "DC1_CORE_SW_02", "to": "DC3_DIST_SW_02", "labelFrom": "xe-0/1/1", "labelTo": "xe-0/1/0", "label": "vlan: 4", "vlan_ids": [4] },
            { "from": "DC1_CORE_SW_02", "to": "DC4_ACC_SW_02", "labelFrom": "xe-0/1/2", "labelTo": "xe-0/1/0", "label": "vlan: 5", "vlan_ids": [5] },
            { "from": "DC1_CORE_SW_02", "to": "DC5_ACC_SW_02", "labelFrom": "xe-0/1/3", "labelTo": "xe-0/1/0", "label": "vlan: 6", "vlan_ids": [6] },
            { "from": "DC2_DIST_SW_01", "to": "DC2_SRV_PROD_01", "labelFrom": "ge-0/0/1", "labelTo": "eth0", "label": "vlan: 1", "vlan_ids": [1] },
            { "from": "DC3_DIST_SW_01", "to": "DC3_SRV_DR_01", "labelFrom": "ge-0/0/1", "labelTo": "eth0", "label": "vlan: 2", "vlan_ids": [2] },
            { "from": "DC4_ACC_SW_01", "to": "DC4_DEV_NODE_01", "labelFrom": "ge-0/0/1", "labelTo": "eth0", "label": "vlan: 3", "vlan_ids": [3] },
            { "from": "DC5_ACC_SW_01", "to": "DC5_IOT_01", "labelFrom": "ge-0/0/1", "labelTo": "me0", "label": "vlan: 4", "vlan_ids": [4] },
            { "from": "DC2_DIST_SW_02", "to": "DC2_SRV_PROD_02", "labelFrom": "ge-0/0/1", "labelTo": "eth0", "label": "vlan: 3", "vlan_ids": [3] },
            { "from": "DC3_DIST_SW_02", "to": "DC3_SRV_DR_02", "labelFrom": "ge-0/0/1", "labelTo": "eth0", "label": "vlan: 4", "vlan_ids": [4] },
            { "from": "DC4_ACC_SW_02", "to": "DC4_DEV_NODE_02", "labelFrom": "ge-0/0/1", "labelTo": "eth0", "label": "vlan: 5", "vlan_ids": [5] },
            { "from": "DC5_ACC_SW_02", "to": "DC5_IOT_02", "labelFrom": "ge-0/0/1", "labelTo": "me0", "label": "vlan: 6", "vlan_ids": [6] }
        ]
    };
}


function toCompactJSON(obj) {
    if (!obj.nodes || !obj.edges) return JSON.stringify(obj, null, 2);
    const nodesStr = obj.nodes.map(n => `    ${JSON.stringify(n)}`).join(",\n");
    const edgesStr = obj.edges.map(e => `    ${JSON.stringify(e)}`).join(",\n");
    return `{\n  "nodes": [\n${nodesStr}\n  ],\n  "edges": [\n${edgesStr}\n  ]\n}`;
}

// --- 4. 拓樸渲染邏輯 ---

function applyDataUpdate(nodesArray, edgesArray) {
    if (!network) return;
    const currentScale = network.getScale();
    const currentView = network.getViewPosition();
    const savedPositions = JSON.parse(localStorage.getItem(CONFIG.STORAGE.POSITIONS)) || {};

    const existingIds = new Set(nodesArray.map(n => n.id));
    const finalNodes = [...nodesArray];

    edgesArray.forEach(edge => {
        [edge.from, edge.to].forEach(id => {
            if (id && !existingIds.has(id)) {
                finalNodes.push({
                    id: id, label: id,
                    group: identifyDeviceCategory(id),
                    value: 1
                });
                existingIds.add(id);
            }
        });
    });

    const processedNodes = finalNodes.map(node => ({
        ...node,
        x: savedPositions[node.id]?.x ?? (Math.random() * 400 - 200),
        y: savedPositions[node.id]?.y ?? (Math.random() * 400 - 200)
    }));

    const processedEdges = edgesArray.map(e => ({
        ...e,
        arrows: "to",
        from: e.from,
        to: e.to,
        label: e.label || " ",
        labelFrom: e.labelFrom || "", // 確保 labelFrom 被加入
        labelTo: e.labelTo || ""      // 確保 labelTo 被加入
    })).sort((a, b) => a.from.localeCompare(b.from) || a.to.localeCompare(b.to));

    nodesDataSet.clear();
    nodesDataSet.add(processedNodes);
    edgesDataSet.clear();
    edgesDataSet.add(processedEdges);

    network.moveTo({ position: currentView, scale: currentScale, animation: false });
}

// --- 5. UI 與 佈局邏輯 (整合 ForceAtlas2) ---

function toggleLayoutMode() {
    if (!network) return;

    currentLayoutMode = (currentLayoutMode + 1) % 3;
    const btn = document.getElementById("layout-toggle-btn");

    // 預設關閉階層佈局 (除非進入模式 1)
    let options = {
        layout: { hierarchical: { enabled: false } },
        physics: { enabled: false }
    };

    if (currentLayoutMode === 0) {
        // --- 模式 0: 靜態 (手動) ---
        if (btn) btn.innerText = "佈局: 靜態";

        const savedPos = JSON.parse(localStorage.getItem(CONFIG.STORAGE.POSITIONS)) || {};
        const updates = nodesDataSet.get().map(node => ({
            id: node.id,
            x: savedPos[node.id]?.x,
            y: savedPos[node.id]?.y,
            fixed: false
        })).filter(u => u.x !== undefined);

        // 如果有存檔位置，先移動過去
        if (updates.length > 0) {
            nodesDataSet.update(updates);
        }

        // 確保關閉物理引擎，讓使用者可以自由手動拖拽
        network.setOptions(options);
    }
    else if (currentLayoutMode === 1) {
        // --- 模式 1: 自動階層 ---
        if (btn) btn.innerText = "佈局: 階層";
        options.layout.hierarchical = {
            enabled: true,
            levelSeparation: 150,
            nodeSpacing: 150,
            treeSpacing: 10,
            direction: 'UD',
            sortMethod: 'directed'
        };
        // 階層模式通常需要開啟一下物理來排版
        options.physics = { enabled: true, stabilization: true };
        network.setOptions(options);
    }
    else if (currentLayoutMode === 2) {
        // --- 模式 2: 物理引擎 (帶有迭代動畫) ---
        if (btn) btn.innerText = "佈局: 物理引擎";

        options.physics = {
            enabled: true,
        };
        network.setOptions(options);
        // 強制開始模擬 (觸發動畫)
        network.startSimulation();
    }

    // 統一執行重繪
    network.redraw();
}

function saveNodePositions(silent = false) {
    if (!network) return;

    // 取得並儲存位置
    const positions = network.getPositions();
    localStorage.setItem(CONFIG.STORAGE.POSITIONS, JSON.stringify(positions));

    // 如果不是靜默模式，才顯示提示
    if (!silent) {
        showCopyTooltip("節點位置已保存");
    }
}

function toggleFormat() {
    const textarea = document.getElementById("data-editor");
    try {
        const obj = JSON.parse(textarea.value);
        const isCompact = textarea.value.includes('{"id":');
        textarea.value = isCompact ? JSON.stringify(obj, null, 2) : toCompactJSON(obj);
    } catch (e) { alert("JSON 格式錯誤"); }
}

/**
 * 終極版 LLDP 解析函數 - 樣式分離優化版
 */
function convertLldpToJson(rawText) {
    if (!rawText.trim()) return { nodes: [], edges: [] };

    const lines = rawText.split('\n');
    let currentFrom = "";
    const edgeMap = new Map();
    const nodeIds = new Set();

    // 過濾無關緊要的關鍵字與標題列
    const filterKeywords = [
        "Local Interface", "Parent Interface", "Chassis Id", "Port info",
        "System Name", "---", "Local Intf", "Address", "Interface", "State", "ID",
        "Neighbor ID", "Pri", "Dead Time", "OSPF process", "{master"
    ];

    lines.forEach(line => {
        const trimmed = line.trim();
        if (!trimmed || filterKeywords.some(key => trimmed.includes(key))) return;

        // 1. 匹配標頭格式: TPDMZ_OSS_J41_71_252 (10.113.71.252):
        const headerMatch = trimmed.match(/^([\w-]+)\s*\([\d\.]+\):/);
        if (headerMatch) {
            currentFrom = headerMatch[1];
            nodeIds.add(currentFrom);
            return;
        }

        let local = "", remote = "", sys = "";

        // 2. 解析邏輯 A: Juniper OSPF (以 IP 開頭的行)
        // 10.113.0.1  irb.1300  Full  10.113.0.1  1  30
        const juniperOspfMatch = trimmed.match(/^(\d+\.\d+\.\d+\.\d+)\s+([\w\.]+)\s+\w+\s+(\d+\.\d+\.\d+\.\d+)/);

        // 3. 解析邏輯 B: Fortinet/Cisco OSPF (Neighbor ID 開頭)
        // 10.113.65.252  128  Full/DR  00:00:38  10.113.16.254  internal1
        const fortinetOspfMatch = trimmed.match(/^(\d+\.\d+\.\d+\.\d+)\s+\d+\s+[\w\/]+\s+[\d:]+\s+(\d+\.\d+\.\d+\.\d+)\s+([\w\.-]+)/);

        if (juniperOspfMatch && currentFrom) {
            local = juniperOspfMatch[2]; // Interface
            sys = juniperOspfMatch[3];   // Neighbor ID
            remote = "ospf";             // OSPF 往往沒有對端 Port 名稱，用協議代稱
        }
        else if (fortinetOspfMatch) {
            // 如果這類資料沒有前置標頭，可能需要預設一個來源或從內容推斷
            const source = currentFrom || "Unknown-Source";
            nodeIds.add(source);
            currentFrom = source;

            sys = fortinetOspfMatch[1];   // Neighbor ID
            local = fortinetOspfMatch[3]; // Interface
            remote = "ospf";
        }
        else {
            // 原有的 LLDP 解析邏輯 (透過空格或引號)
            const parts = trimmed.split(/\s{2,}/);
            if (parts.length >= 4) {
                local = parts[0];
                sys = parts[parts.length - 1];
                remote = parts[parts.length - 2];
            }
        }

        // --- 建立連線邏輯 ---
        if (sys && sys !== "System Name" && !sys.includes(" ")) {
            nodeIds.add(sys);

            let fromNode, toNode, fromPort, toPort;
            if (currentFrom.localeCompare(sys) <= 0) {
                [fromNode, toNode, fromPort, toPort] = [currentFrom, sys, local, remote];
            } else {
                [fromNode, toNode, fromPort, toPort] = [sys, currentFrom, remote, local];
            }

            const pk = `${fromNode}_${fromPort}_${toNode}_${toPort}`;

            // 樣式匹配
            const matchedStyle = (typeof CONFIG !== 'undefined' && CONFIG.PORT_STYLES.find(s =>
                s.test.test(fromPort) || s.test.test(toPort)
            )) || { width: 2, color: "#848484" };

            edgeMap.set(pk, {
                id: pk,
                from: fromNode,
                to: toNode,
                labelFrom: fromPort,
                labelTo: toPort,
                width: matchedStyle.width,

                // 修改重點：如果 color 是物件就直接用，是字串就包成 vis.js 要的格式
                color: typeof matchedStyle.color === 'object'
                    ? matchedStyle.color
                    : { color: matchedStyle.color },

                arrows: { to: { enabled: false }, from: { enabled: false } }
            });
        }
    });

    return {
        nodes: Array.from(nodeIds).map(id => ({
            id,
            label: id,
            group: typeof identifyDeviceCategory === 'function' ? identifyDeviceCategory(id) : 'Switch',
            value: 5,
            shape: 'dot'
        })).sort((a, b) => a.id.localeCompare(b.id)),

        edges: Array.from(edgeMap.values()).sort((a, b) =>
            a.from.localeCompare(b.from) || a.labelFrom.localeCompare(b.labelFrom)
        )
    };
}

// --- 6. 初始化 App ---
function initApp() {

    // --- 新增：自動注入圖例樣式 ---
    const style = document.createElement('style');
    style.innerHTML = `
        .network-container-wrapper { position: relative; width: 100%; height: 100%; }
        .network-legend {
            position: absolute;
            bottom: 50px;  /* 放在左下角，避開右上角的按鈕區 */
            left: 20px;
            background: rgba(255, 255, 255, 0.85);
            padding: 12px;
            border-radius: 6px;
            border: 1px solid #CFD8DC;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            z-index: 10;
            pointer-events: none; /* 不干擾地圖拖拽 */
            font-family: "Segoe UI", sans-serif;
        }
        .legend-title { font-weight: bold; font-size: 13px; margin-bottom: 8px; color: #37474F; border-bottom: 1px solid #ECEFF1; padding-bottom: 4px; }
        .legend-row { display: flex; align-items: center; margin: 4px 0; font-size: 12px; color: #546E7A; }
        .legend-row i { width: 20px; margin-right: 8px; text-align: center; font-size: 14px; }
    `;
    document.head.appendChild(style);

    // --- 新增：動態建立圖例 DOM ---
    const container = document.getElementById("mynetwork");
    const parent = container.parentElement;

    // 建立一個 Wrapper 確保定位正確
    if (parent.style.position !== 'relative') parent.style.position = 'relative';

    const legend = document.createElement('div');
    legend.className = 'network-legend';
    legend.innerHTML = `
<div class="legend-row"><i class="fa-solid fa-shield-halved" style="color: #22A338;"></i> 防火牆 </div>
<div class="legend-row"><i class="fa-solid fa-network-wired" style="color: ${THEME.AMBER};"></i> 交換器 </div>
<div class="legend-row"><i class="fa-solid fa-server" style="color: ${THEME.PURPLE};"></i> 伺服器 </div>
<div class="legend-row"><i class="fa-brands fa-windows" style="color: #0078D4;"></i> Windows </div>
<div class="legend-row"><i class="fa-solid fa-circle-question" style="color: ${THEME.GRAY};"></i> 未定義 </div>

<hr style="border: 0; border-top: 1px solid #ddd; margin: 10px 0;">

<div class="legend-row">
    <span class="edge-line" style="background-color: ${THEME.PORT_OOB}; height: 2px;"></span> 管理界面
</div>
<div class="legend-row">
    <span class="edge-line" style="background-color: ${THEME.PORT_L4}; height: 2px;"></span> 防火牆埠
</div>
<div class="legend-row">
    <span class="edge-line" style="background-color: ${THEME.PORT_AGGREGATE}; height: 4px;"></span> 聚合鏈路
</div>
<div class="legend-row">
    <span class="edge-line" style="background-color: ${THEME.PORT_HIGHSPEED}; height: 3px;"></span> 高速(10G+)
</div>
<div class="legend-row">
    <span class="edge-line" style="background-color: ${THEME.PORT_VLAN}; height: 2px;"></span> VLAN界面
</div>
<div class="legend-row">
    <span class="edge-line" style="background-color: ${THEME.EDGE_DEFAULT}; height: 2px;"></span> 未定義
</div>
    `;
    parent.appendChild(legend);

    // 建議定義一個字體變數方便維護
    const FONT_FACE = "arial";
    const options = {
        nodes: {
            font: { face: "Segoe UI", color: THEME.TEXT, size: 14 },
            borderWidth: 2,
            shadow: true
        },
        edges: {
            width: CONFIG.EDGE_INTERACTION.NORMAL.edgeWidth,
            selectionWidth: 3,
            hoverWidth: 3,
            color: {
                color: THEME.EDGE_DEFAULT,
                highlight: THEME.EDGE_HIGHLIGHT,
                hover: THEME.EDGE_HOVER,
                inherit: false
            },
            smooth: { enabled: true, type: "dynamic", roundness: 0.2 },
            // smooth: { enabled: true, type: "cubicBezier", roundness: 0.5 },
            // smooth: { enabled: true, type: "curvedCW", roundness: 0.5 },
            arrows: { to: { enabled: true, scaleFactor: 0.3 } }
        },
        layout: {
            randomSeed: 42,// 只要這個數字不變，佈局就會固定
            hierarchical: { enabled: false }
        },
        physics: {
            enabled: true,
            solver: 'forceAtlas2Based',
            forceAtlas2Based: {
                //架構師提示： 如果 2000 次迭代後畫面還是很亂，通常不是 iterations 不夠，而是 gravitationalConstant（排斥力）不夠大，或是 springLength（線長）設得太短，導致節點
                gravitationalConstant: -15, // 增加排斥力，防止設備擠在一起
                springLength: 220,          // 增加連線長度，給 Port Label 留空間
                centralGravity: 0.005,      // 降低中心引力，讓圖擴散開來
                springConstant: 0.08,
                avoidOverlap: 1             // 強制避免節點重疊 (非常重要)
            },
            adaptiveTimestep: true,
            stabilization: {
                enabled: true,
                iterations: 2000,           // 設備多時增加迭代次數
                updateInterval: 41
            }
        },
        // physics: {
        //   solver: 'barnesHut',
        //   barnesHut: {
        //     springConstant: 0.02, // 調低：讓彈簧軟一點，節點更容易均勻分佈
        //     centralGravity: 0.1,  // 降低中心引力，防止所有星星擠向畫布中心
        //     avoidOverlap: 1       // 必開：防止葉子節點重疊
        //   }
        // },
        groups: {
            switch: {
                // shape: "dot", size: 10,
                shape: 'image', image: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgSwitch),
                color: { background: THEME.AMBER, border: THEME.BORDER_SWITCH },
                font: { color: THEME.TEXT, size: 12, face: FONT_FACE, background: 'rgba(255, 255, 255, 0.9)', strokeWidth: 1, strokeColor: THEME.GRAY, }
            },
            firewall: {
                // shape: "square", size: 10,
                // shape: 'icon', icon: { face: "'Font Awesome 6 Free'", weight: "900", size: 50, code: '\uf3ed', color: '#22A338' },
                shape: 'image', image: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgFirewall),
                color: { background: THEME.GREEN, border: THEME.BORDER_FIREWALL },
                font: { color: THEME.TEXT, size: 12, face: FONT_FACE, background: 'rgba(255, 255, 255, 0.9)', strokeWidth: 1, strokeColor: THEME.GRAY, }
            },
            server: {
                shape: "database", size: 10,
                color: { background: THEME.PURPLE, border: THEME.BORDER_SERVER },
                font: { color: THEME.TEXT, size: 12, face: FONT_FACE, background: 'rgba(255, 255, 255, 0.9)', strokeWidth: 1, strokeColor: THEME.GRAY, }
            },
            windows: {
                shape: "diamond", size: 10,
                color: { background: "#0078D4", border: "#005A9E" },
                font: { color: THEME.TEXT, size: 12, face: FONT_FACE, background: 'rgba(255, 255, 255, 0.9)', strokeWidth: 1, strokeColor: THEME.GRAY, }
            },
            endpoint: {
                shape: "hexagon", size: 2,
                color: { background: THEME.GRAY, border: THEME.GRAY },
                font: { color: THEME.GRAY, italic: true }
            },
            unknown: {
                shape: "dot", size: 5,
                color: { background: "#ECEFF1", border: THEME.GRAY },
                font: { color: THEME.TEXT, italic: true }
            }
        },
        interaction: {
            multiselect: true, dragNodes: true, hover: true,
            hoverConnectedEdges: true, selectConnectedEdges: true
        }
    };

    network = new vis.Network(container, { nodes: nodesDataSet, edges: edgesDataSet }, options);

    const rawData = getInitialData();
    const dataEditor = document.getElementById("data-editor");
    if (dataEditor) {
        dataEditor.value = toCompactJSON(rawData);
        applyDataUpdate(rawData.nodes, rawData.edges);

        dataEditor.addEventListener("input", (e) => {
            try {
                // 1. 先用 Regex 濾掉註解，讓 JSON.parse 不會噴錯
                const cleanJson = e.target.value
                    .replace(/\/\/.*$/gm, '')           // 移除單行 // 註解
                    .replace(/\/\*[\s\S]*?\*\//g, '');  // 移除多行 /* */ 註解

                const data = JSON.parse(cleanJson); // 2. 解析乾淨的內容
                applyDataUpdate(data.nodes, data.edges);
                saveRawDataToLocal(data); // 3. 儲存時會存不含註解的標準 JSON
            } catch (err) {
                // 解析失敗（例如 JSON 還沒打完）時不做動作
            }
        });
    }

    const rawEditor = document.getElementById("raw-data-editor");

    if (rawEditor) {
        // 測試模式的偷吃步
        if (ENV.IS_DEBUG) {
            console.log("🧪 測試模式：嘗試載入預設資料...");

            // 動態建立 script 標籤載入測試檔
            const script = document.createElement('script');
            script.src = ENV.TEST_DATA_URL;
            script.onload = () => {
                // 檢查 test-data.js 定義的變數是否存在
                if (window.TEST_LLDP_RAW) {
                    rawEditor.value = window.TEST_LLDP_RAW;

                    // 手動觸發一次 input 事件讓邏輯自動執行渲染
                    const event = new Event('input', { bubbles: true });
                    rawEditor.dispatchEvent(event);

                    console.log("✅ 測試資料已預載並完成渲染");
                }
            };
            document.head.appendChild(script);
        }
        rawEditor.addEventListener("input", (e) => {
            const result = convertLldpToJson(e.target.value);
            if (result.nodes.length > 0) {
                dataEditor.value = toCompactJSON(result);
                applyDataUpdate(result.nodes, result.edges);
                saveRawDataToLocal(result);
            }
        });
    }

    // 附加資料編輯器 - 合併節點和邊界
    const additionalEditor = document.getElementById("additional-data-editor");
    if (additionalEditor) {
        additionalEditor.addEventListener("input", (e) => {
            try {
                const additionalData = JSON.parse(e.target.value);
                // 檢查是否包含 nodes 和 edges
                if (additionalData.nodes && additionalData.edges) {
                    // 解析現有的 data-editor 資料
                    const currentData = JSON.parse(dataEditor.value);

                    // 合併 nodes（避免重複）
                    const existingNodeIds = new Set(currentData.nodes.map(n => n.id));
                    const newNodes = additionalData.nodes.filter(n => !existingNodeIds.has(n.id));
                    const mergedNodes = [...currentData.nodes, ...newNodes];

                    // 合併 edges（避免重複）
                    const existingEdges = new Set(currentData.edges.map(e => `${e.from}-${e.to}`));
                    const newEdges = additionalData.edges.filter(e => !existingEdges.has(`${e.from}-${e.to}`));
                    const mergedEdges = [...currentData.edges, ...newEdges];

                    // 更新 data-editor
                    const mergedData = { nodes: mergedNodes, edges: mergedEdges };
                    dataEditor.value = toCompactJSON(mergedData);
                    applyDataUpdate(mergedData.nodes, mergedData.edges);
                    saveRawDataToLocal(mergedData);

                    console.log(`已附加 ${newNodes.length} 個節點和 ${newEdges.length} 條邊界`);
                }
            } catch (err) {
                // 無效的 JSON 格式，忽略
            }
        });
    }

    // 當物理模擬自動結束並穩定的時候，儲存目前的座標
    network.on("stabilized", () => {
        if (currentLayoutMode === 2) {
            saveNodePositions(true);
            console.log("物理模擬穩定，座標已存檔");
        }
    });

    network.on("dragEnd", () => saveNodePositions(true));

    const maxLayers = 1; // 你可以隨時修改這個變數，決定要找幾層

    // 在 network-logic.js 的 initApp 內尋找 network.on("doubleClick", ...)
    // 修改如下：

    // network-logic.js 內的雙擊事件區塊
    network.on("doubleClick", (p) => {
        if (p.nodes.length > 0) {
            const startNode = p.nodes[0];
            const slider = document.getElementById("layer-slider");
            const maxLayers = slider ? parseInt(slider.value) : 1;

            // 1. BFS 擴散選取
            const nodesToSelect = new Set();
            let currentQueue = [startNode];
            nodesToSelect.add(startNode);

            for (let layer = 0; layer < maxLayers; layer++) {
                const nextQueue = [];
                for (const nodeId of currentQueue) {
                    const neighbors = network.getConnectedNodes(nodeId);
                    for (const neighborId of neighbors) {
                        if (!nodesToSelect.has(neighborId)) {
                            nodesToSelect.add(neighborId);
                            nextQueue.push(neighborId);
                        }
                    }
                }
                if (nextQueue.length === 0) break;
                currentQueue = nextQueue;
            }

            const selectedNodeIds = Array.from(nodesToSelect);
            network.selectNodes(selectedNodeIds);

            // 2. 提取 Node 數據
            const exportNodes = nodesDataSet.get(selectedNodeIds);

            // 3. 修正後的 Edge 提取邏輯
            // 直接從 edgesDataSet 撈出「起點與終點都在選取清單中」的連線
            const exportEdges = edgesDataSet.get({
                filter: (edge) => nodesToSelect.has(edge.from) && nodesToSelect.has(edge.to)
            });

            // 4. 封裝並使用 toCompactJSON
            const exportData = {
                nodes: exportNodes,
                edges: exportEdges
            };

            const compactString = toCompactJSON(exportData);

            // 5. 複製到剪貼簿
            navigator.clipboard.writeText(compactString).then(() => {
                console.log("複製成功", { nodes: exportNodes.length, edges: exportEdges.length });
                if (typeof showCopyTooltip === 'function') {
                    showCopyTooltip(`已複製 ${exportNodes.length} 節點, ${exportEdges.length} 連線`);
                }
            }).catch(err => console.error('複製失敗', err));
        }
    });

    // --- 強制 Label 置頂邏輯 ---

    // 1. 攔截原始的 Label 繪製
    const originalDrawLabel = network.renderer._drawLabel;

    network.renderer._drawLabel = function (ctx, item, x, y, selected, hover) {
        // 如果這條線正在被 hover，我們在正常渲染流程中先「跳過」它的 Label
        if (item.connectedNodes && hover) {
            return;
        }
        // 否則正常繪製
        originalDrawLabel.call(this, ctx, item, x, y, selected, hover);
    };

    // 2. 在所有東西（Nodes 和 Edges）都畫完後，單獨補畫被 Hover 的 Label
    network.on("afterDrawing", function (ctx) {
        const edges = network.body.edges;
        Object.keys(edges).forEach(id => {
            const edge = edges[id];
            // 只有在 hover 狀態下才單獨補畫 Label
            if (edge.hover) {
                // 使用內部的已計算座標與屬性進行繪製
                // 這會確保 Label 畫在 Canvas 的最上層，蓋過所有節點
                edge.drawLabel(ctx);
            }
        });
    });

    network.on("hoverEdge", function (params) {
        edgesDataSet.update({
            id: params.edge,
            font: {
                color: CONFIG.EDGE_INTERACTION.HOVER.fontColor,
                strokeWidth: CONFIG.EDGE_INTERACTION.HOVER.strokeWidth
            }
        });
    });

    network.on("blurEdge", function (params) {
        edgesDataSet.update({
            id: params.edge,
            font: {
                color: CONFIG.EDGE_INTERACTION.NORMAL.fontColor,
                strokeWidth: CONFIG.EDGE_INTERACTION.NORMAL.strokeWidth
            }
        });
    });

    // 搜尋輸入框：Enter 鍵快速搜尋
    const searchInput = document.getElementById("search-node-input");
    if (searchInput) {
        searchInput.addEventListener("keypress", (e) => {
            if (e.key === "Enter") {
                searchNodeById();
            }
        });
    }
    // 檢查是否為第一次使用 (或是瀏覽器快取已被清除)
    const hasSeenIntro = localStorage.getItem('hasSeenNetworkIntro');
    if (!hasSeenIntro) {
        const modal = document.getElementById('usage-modal');
        if (modal) {
            modal.showModal();
            localStorage.setItem('hasSeenNetworkIntro', 'true');
        }
    }

    const vlanSearchInput = document.getElementById("search-vlan-input");
    if (vlanSearchInput) {
        vlanSearchInput.addEventListener("keypress", (e) => {
            if (e.key === "Enter") {
                searchVlan();
            }
        });

        // 如果你希望輸入時就即時反應（防抖版）
        vlanSearchInput.addEventListener("input", debounce(() => {
            if (vlanSearchInput.value.trim() !== "") {
                searchVlan();
            }
        }, 500));
    }
}

/**
 * 輔助函數：顯示暫時性的提示
 */
// 在函數外部定義變數，記錄上一次顯示的時間戳記
let lastTooltipTime = 0;

function showCopyTooltip(message) {
    const now = Date.now();
    if (now - lastTooltipTime < 2000) return;
    lastTooltipTime = now;

    const existingTip = document.querySelector('.custom-tooltip');
    if (existingTip) existingTip.remove();

    const tip = document.createElement('div');

    // 修改處：將 bg-amber-500/95 改為 bg-amber-500/60 實現半透明
    // 同時將 border-amber-400/50 改為 /30 讓邊框更隱晦
    tip.className = "custom-tooltip fixed bottom-10 left-1/2 -translate-x-1/2 bg-amber-500/60 backdrop-blur-md text-amber-950 px-6 py-3 rounded-xl shadow-lg z-[9999] text-sm font-bold tracking-wide transition-all duration-300 transform translate-y-4 opacity-0 border border-amber-400/30";

    tip.textContent = message;
    document.body.appendChild(tip);

    requestAnimationFrame(() => {
        tip.classList.remove("opacity-0", "translate-y-4");
        tip.classList.add("opacity-100", "translate-y-0");
    });

    setTimeout(() => {
        if (tip.parentNode) {
            tip.classList.remove("opacity-100", "translate-y-0");
            tip.classList.add("opacity-0", "translate-y-4");
            setTimeout(() => tip.remove(), 300);
        }
    }, 3000);
}

// --- 7. 導出功能 ---
function exportToPNG() {
    if (!network) return;

    // 1. 備份當前視角與設定
    const lastPosition = network.getViewPosition(); // 記住中心座標
    const lastScale = network.getScale();           // 記住縮放倍率

    const container = document.getElementById('mynetwork');
    const originalWidth = container.style.width;
    const originalHeight = container.style.height;

    // 2. 計算原生內容所需尺寸
    const nodeIds = nodesDataSet.getIds();
    const positions = network.getPositions(nodeIds);
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;

    nodeIds.forEach(id => {
        const pos = positions[id];
        minX = Math.min(minX, pos.x - 30);
        maxX = Math.max(maxX, pos.x + 30);
        minY = Math.min(minY, pos.y - 30);
        maxY = Math.max(maxY, pos.y + 30);
    });

    const nativeWidth = (maxX - minX) + 60;
    const nativeHeight = (maxY - minY) + 60;
    const oversampling = 1.5;

    // 3. 切換至「匯出模式」畫布
    network.setOptions({
        width: (nativeWidth * oversampling) + 'px',
        height: (nativeHeight * oversampling) + 'px'
    });

    network.fit({
        nodes: nodeIds,
        padding: 20,
        animation: false
    });

    network.once("afterDrawing", function () {
        const canvas = container.querySelector('canvas');
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        const tempCtx = tempCanvas.getContext('2d');

        tempCtx.fillStyle = 'white';
        tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
        tempCtx.drawImage(canvas, 0, 0);

        const link = document.createElement('a');
        link.href = tempCanvas.toDataURL('image/png', 1.0);
        link.download = `topology-native.png`;
        link.click();

        // --- 4. 關鍵：完美復原所有設定 ---

        // 恢復容器大小
        network.setOptions({
            width: originalWidth || '100%',
            height: originalHeight || '100%'
        });

        // 恢復到使用者原本的視角與縮放
        network.moveTo({
            position: lastPosition,
            scale: lastScale,
            offset: { x: 0, y: 0 },
            animation: false // 使用者不會感覺到畫面跳動
        });

        if (typeof showCopyTooltip === 'function') {
            showCopyTooltip("圖片匯出完成，已還原視角");
        }
    });

    network.redraw();
}

/**
 * 清除所有 localStorage 資料
 */
function clearLocalStorage() {
    if (confirm('⚠️ 確定要清除所有儲存的資料嗎？此操作無法復原。')) {
        localStorage.clear();
        // 重置編輯器
        const dataEditor = document.getElementById("data-editor");
        const rawEditor = document.getElementById("raw-data-editor");
        const additionalEditor = document.getElementById("additional-data-editor");
        if (dataEditor) dataEditor.value = '';
        if (rawEditor) rawEditor.value = '';
        if (additionalEditor) additionalEditor.value = '';
        // 重新初始化網絡
        location.reload();
        console.log("✓ 所有資料已清除");
    }
}

// 建立一個防抖函數，避免打字太快導致效能問題
function debounce(func, delay) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), delay);
    };
}

// 將搜尋邏輯獨立出來
const performSearch = () => {
    searchNodeById();
    document.getElementById("node-suggestions").innerHTML = "";
};

// 改善後的 updateSuggestions
const updateSuggestions = debounce((val, event) => {
    if (event?.isComposing) return;

    const inputVal = val.trim();
    const datalist = document.getElementById("node-suggestions");
    if (!datalist || !nodesDataSet) return;

    // 1. 檢查是否完全匹配（使用者可能選了建議項）
    if (nodesDataSet.get(inputVal)) {
        performSearch();
        return;
    }

    // 2. 清空並生成建議
    datalist.innerHTML = "";
    if (inputVal.length < 2) return;

    const inputUpper = inputVal.toUpperCase();
    const allIds = nodesDataSet.getIds();
    const fragment = document.createDocumentFragment();

    let count = 0;
    for (const id of allIds) {
        if (id.toString().toUpperCase().includes(inputUpper)) {
            const option = document.createElement("option");
            option.value = id;
            fragment.appendChild(option);
            count++;
        }
        if (count >= 10) break;
    }
    datalist.appendChild(fragment);
}, 205); // 250ms 的延遲通常對使用者最舒適

/**
 * 搜尋 Node 並聚焦到畫布上
 */
function searchNodeById() {
    if (!network) {
        alert("網絡尚未初始化");
        return;
    }

    const input = document.getElementById("search-node-input");
    const feedback = document.getElementById("search-feedback");
    const nodeId = input?.value?.trim();

    if (!nodeId) {
        if (feedback) {
            feedback.textContent = "⚠️ 請輸入 Node ID";
            feedback.classList.remove("opacity-0");
            setTimeout(() => feedback.classList.add("opacity-0"), 3000);
        }
        return;
    }

    // 從 DataSet 中搜尋節點
    const node = nodesDataSet.get(nodeId);

    if (!node) {
        if (feedback) {
            feedback.textContent = "❌ 找不到此 Node";
            feedback.classList.add("badge-error");
            feedback.classList.remove("opacity-0", "badge-success");
            setTimeout(() => {
                feedback.classList.add("opacity-0");
                feedback.classList.remove("badge-error");
            }, 3000);
        }
        console.warn(`Node ID "${nodeId}" not found`);
        return;
    }

    // 聚焦到該節點並高亮顯示
    network.selectNodes([nodeId]);
    network.focus(nodeId, {
        scale: 1.5,
        animation: { duration: 500, easingFunction: "easeInOutQuad" }
    });

    // 顯示成功反饋
    if (feedback) {
        feedback.textContent = `✓ 找到: ${nodeId}`;
        feedback.classList.add("badge-success");
        feedback.classList.remove("opacity-0", "badge-error");
        setTimeout(() => {
            feedback.classList.add("opacity-0");
            feedback.classList.remove("badge-success");
        }, 3000);
    }

    console.log(`✓ Found node: ${nodeId}`, node);
}
/**
 * 搜尋 VLAN 並選取對應的連線
 */
function searchVlan() {
    if (!network || !edgesDataSet) return;

    const input = document.getElementById("search-vlan-input");
    const vlanQuery = input?.value?.trim();

    if (!vlanQuery) return;

    const vlanId = parseInt(vlanQuery);

    // 找出所有包含該 vlanId 的 edge IDs
    const matchedEdgeIds = edgesDataSet.get({
        filter: (edge) => {
            return edge.vlan_ids && Array.isArray(edge.vlan_ids) && edge.vlan_ids.includes(vlanId);
        }
    }).map(edge => edge.id);

    if (matchedEdgeIds.length > 0) {
        // 選取連線
        network.selectEdges(matchedEdgeIds);

        // 可選：自動縮放以看見所有選中的連線
        network.fit({
            nodes: [], // 不強制縮放到節點
            edgeIds: matchedEdgeIds,
            animation: { duration: 500, easingFunction: "easeInOutQuad" }
        });

        if (typeof showCopyTooltip === 'function') {
            showCopyTooltip(`已選取 ${matchedEdgeIds.length} 條屬於 VLAN ${vlanId} 的連線`);
        }
    } else {
        if (typeof showCopyTooltip === 'function') {
            showCopyTooltip(`找不到 VLAN ${vlanId}`);
        }
    }
}
