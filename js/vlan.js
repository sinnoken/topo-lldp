/**
 * VLAN Auditor 核心處理邏輯 (解決長名稱與欄位精準化版本)
 */
class VlanAuditor {

    constructor() {
        this.globalOuiData = null;
        this.globalArpMap = {}; // 新增：存儲 MAC -> IP 的對照表
        this.networkData = { nodes: [], edges: [] };
    }
    /**
         * 新增：解析您提供的巢狀 ARP JSON 格式
         */
    parseArpData(arpJsonString) {
        this.globalArpMap = {}; // 重置
        if (!arpJsonString.trim()) return;

        try {
            const data = JSON.parse(arpJsonString);
            const arpMap = data.arpMap || {};

            // 遍歷所有設備 (如 AAAA)
            Object.values(arpMap).forEach(device => {
                if (device.entries && Array.isArray(device.entries)) {
                    device.entries.forEach(entry => {
                        if (entry.mac && entry.ip) {
                            // 統一轉為大寫並去掉分隔符，方便比對
                            const cleanMac = entry.mac.replace(/[:.-]/g, "").toUpperCase();
                            this.globalArpMap[cleanMac] = entry.ip;
                        }
                    });
                }
            });
            console.log("✅ ARP Data Loaded:", Object.keys(this.globalArpMap).length, "entries");
        } catch (e) {
            console.error("❌ ARP JSON 格式錯誤:", e);
        }
    }
    /**
       * 名稱精簡器：專門處理帶有換行符號（地址）與法律冗餘字眼的名稱
       */
    shortenVendorName(fullName) {
        if (!fullName) return "Unknown";

        // 1. 處理換行：只取第一行 (因為地址資訊通常在 \n 之後)
        let name = fullName.split(/[\r\n]/)[0].trim();

        // 2. 移除括號內容 (如有些名稱後方會帶 (Formerly xxx))
        name = name.replace(/\(.*\)/g, "").trim();

        // 3. 常見大廠縮寫映射
        const aliasMap = {
            "Hon Hai Precision": "Foxconn",
            "Hewlett Packard Enterprise": "HPE",
            "Hewlett-Packard": "HP",
            "International Business Machines": "IBM",
            "XEROX CORPORATION": "Xerox"
        };

        for (const [full, short] of Object.entries(aliasMap)) {
            if (name.toUpperCase().includes(full.toUpperCase())) return short;
        }

        // 4. 移除法律實體縮寫與冗餘後綴
        return name
            .replace(/,?\s+(Inc\.|Corp\.|Ltd\.|LLC|GmbH|Co\.|Corporation|Limited|Technologies|Systems|Network(s)?|Information|International|Group|Software|Solutions|Technology)\.?/gi, "")
            .trim();
    }

    /**
     * 初始化 OUI 資料庫：增加資料清洗邏輯
     */
    /**
      * 初始化 OUI 資料庫：加入方案 B (超時控制) 與錯誤處理優化
      */
    async initOuiDatabase() {
        const CACHE_KEY = 'vlan_auditor_oui_cache';
        const EXPIRY = 1 * 24 * 60 * 60 * 1000; // 24小時 (可根據需求調整)

        // 1. 先嘗試從本地快取讀取
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
            try {
                const { timestamp, data } = JSON.parse(cached);
                if (Date.now() - timestamp < EXPIRY) {
                    this.globalOuiData = data;
                    console.log("✅ OUI Loaded from Cache");
                    return;
                }
            } catch (e) {
                localStorage.removeItem(CACHE_KEY);
            }
        }

        // 2. 方案 B：設定 Fetch 超時控制 (AbortController)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 設定 5 秒超時

        try {
            console.log("🌐 Fetching OUI from CDN...");
            const res = await fetch('/js/silverwind.oui-data.json', {
                signal: controller.signal // 綁定超時訊號
            });
            console.log("Response Status:", res.status); // 確認是不是 200
            console.log("Content-Type:", res.headers.get("content-type")); // 確認是不是 json
            clearTimeout(timeoutId); // 成功連線後清除計時器

            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);

            const raw = await res.json();

            // 3. 資料清洗：精簡名稱以節省空間
            const cleaned = {};
            for (const [mac, fullName] of Object.entries(raw)) {
                cleaned[mac.toUpperCase()] = this.shortenVendorName(fullName);
            }

            this.globalOuiData = cleaned;

            // 4. 安全存入 LocalStorage (預防空間溢出)
            try {
                localStorage.setItem(CACHE_KEY, JSON.stringify({
                    timestamp: Date.now(),
                    data: cleaned
                }));
                console.log("✅ OUI Database cleaned and cached");
            } catch (storageError) {
                console.warn("⚠️ LocalStorage 空間不足，本次僅於記憶體中運行");
            }

        } catch (e) {
            clearTimeout(timeoutId);
            if (e.name === 'AbortError') {
                console.error("❌ OUI 載入超時 (CDN 回應過久)");
            } else {
                console.warn("⚠️ OUI 載入失敗 (無網路或 CORS 限制)");
            }

            // 最終備案：使用基礎清單
            this.globalOuiData = {
                "005056": "VMware",
                "0010DB": "Juniper",
                "00000C": "Cisco",
                "000142": "Cisco",
                "000C29": "VMware",
                "F8C288": "HPE"
            };
        }
    }

    getVendor(mac) {
        if (!mac || !this.globalOuiData) return "Unknown";
        const prefix = mac.replace(/[:.-]/g, "").toUpperCase().substring(0, 6);
        return this.globalOuiData[prefix] || "Unknown";
    }



    /**
     * 核心處理函式：將 Config, VLAN Status, MAC Table 解析為 JSON
     */
    processData(configText, vlanText, switchText, topoText) {
        const nodes = [];
        const sections = configText.split(/_{5,}/);

        // --- 1. 第一階段：解析基礎配置 (Node, Interface, VLAN, AE) ---
        sections.forEach(section => {
            const nodeMatch = section.match(/^\s*(?<nodeName>[\w-]+)\s*\((?<ip>[\d\.]+)\):/m);
            if (!nodeMatch) return;

            const nodeObj = {
                id: nodeMatch.groups.nodeName,
                ip: nodeMatch.groups.ip,
                interfaceMap: {},
                vlanMap: {},
                aeMap: {}
            };

            // 1.1 解析介面 Description
            const ifaceDescRegex = /set\s+interfaces\s+(?<iface>[\w\-\/]+)(?:\.\d+)?\s+description\s+"?(?<desc>[^"\n]+)"?/g;
            let ifDescMatch;
            while ((ifDescMatch = ifaceDescRegex.exec(section)) !== null) {
                const ifName = ifDescMatch.groups.iface;
                if (!nodeObj.interfaceMap[ifName]) {
                    nodeObj.interfaceMap[ifName] = {
                        type: ifName.startsWith('ae') ? "aggregate" : "physical",
                        status: "down",
                        description: ifDescMatch.groups.desc,
                        members: ifName.startsWith('ae') ? [] : undefined
                    };
                } else {
                    nodeObj.interfaceMap[ifName].description = ifDescMatch.groups.desc;
                }
            }

            // 1.2 解析 AE 綁定 (802.3ad)
            const aeRegex = /set\s+interfaces\s+(?<phys>[\w\-\/]+)\s+ether-options\s+802\.3ad\s+(?<ae>ae\d+)/g;
            let aeMatch;
            while ((aeMatch = aeRegex.exec(section)) !== null) {
                const phys = aeMatch.groups.phys.split('.')[0];
                const ae = aeMatch.groups.ae;
                if (!nodeObj.interfaceMap[phys]) nodeObj.interfaceMap[phys] = { type: "physical", status: "down", description: "" };
                nodeObj.interfaceMap[phys].parent = ae;
                if (!nodeObj.interfaceMap[ae]) nodeObj.interfaceMap[ae] = { type: "aggregate", status: "down", description: "", members: [] };
                if (!nodeObj.interfaceMap[ae].members.includes(phys)) nodeObj.interfaceMap[ae].members.push(phys);
                nodeObj.aeMap[phys] = ae;
            }

            // 1.3 解析 VLAN 定義與描述 (補上原本遺漏的 VLAN 描述解析)
            const vlanRegex = /set\s+vlans\s+(?<name>\S+)\s+vlan-id\s+(?<id>\d+)/g;
            let vMatch;
            while ((vMatch = vlanRegex.exec(section)) !== null) {
                nodeObj.vlanMap[vMatch.groups.name] = {
                    id: parseInt(vMatch.groups.id),
                    name: vMatch.groups.name,
                    description: "",
                    interfaceNames: new Set(),
                    macs: new Set()
                };
            }
            const vlanDescRegex = /set\s+vlans\s+(?<name>\S+)\s+description\s+"?(?<desc>[^"\n]+)"?/g;
            let vdMatch;
            while ((vdMatch = vlanDescRegex.exec(section)) !== null) {
                if (nodeObj.vlanMap[vdMatch.groups.name]) {
                    nodeObj.vlanMap[vdMatch.groups.name].description = vdMatch.groups.desc;
                }
            }
            nodes.push(nodeObj);
        });

        // --- 2. 第二階段：更新介面狀態 (show vlan) ---
        const vsSections = vlanText.split(/_{5,}/);
        vsSections.forEach(section => {
            const hostMatch = section.match(/([A-Z0-9_]+)\s\(/);
            if (!hostMatch) return;
            const targetNode = nodes.find(n => n.id === hostMatch[1]);
            if (!targetNode) return;

            const vlanBlockRegex = /VLAN Name:\s+(?<vlanName>\S+)[^]*?(?=VLAN Name:|$|Number of)/g;
            let blockMatch;
            while ((blockMatch = vlanBlockRegex.exec(section)) !== null) {
                const targetVlan = targetNode.vlanMap[blockMatch.groups.vlanName];
                if (!targetVlan) continue;

                const ifaceRegex = /^\s+(?<iface>[\w\/\-\.]+)(?<status>\*?)\s*,/gm;
                let iMatch;
                while ((iMatch = ifaceRegex.exec(blockMatch[0])) !== null) {
                    const rawIface = iMatch.groups.iface.split('.')[0];
                    const isActive = iMatch.groups.status === '*';
                    if (!targetNode.interfaceMap[rawIface]) {
                        targetNode.interfaceMap[rawIface] = { type: rawIface.startsWith('ae') ? "aggregate" : "physical", status: "down", members: [] };
                    }
                    if (isActive) {
                        targetNode.interfaceMap[rawIface].status = "up";
                        const parentAe = targetNode.interfaceMap[rawIface].parent;
                        if (parentAe && targetNode.interfaceMap[parentAe]) targetNode.interfaceMap[parentAe].status = "up";
                    }
                    targetVlan.interfaceNames.add(rawIface);
                }
            }
        });

        // --- 3. 第三階段：更新 MAC Table (補上邏輯介面與物理介面同步邏輯) ---
        const swSections = switchText.split(/_{5,}/);
        swSections.forEach(section => {
            const hostMatch = section.match(/([A-Z0-9_]+)\s\(/);
            if (!hostMatch) return;
            const targetNode = nodes.find(n => n.id === hostMatch[1]);
            if (!targetNode) return;

            const rowRegex = /^\s+(?<vlan>[\w-]+)\s+(?<mac>[a-f0-9:]{17})\s+[A-Z]+\s+[\d-]+\s+(?<iface>[\w\/\-\.]+)/gm;
            let m;
            while ((m = rowRegex.exec(section)) !== null) {
                const standardVlanName = Object.keys(targetNode.vlanMap).find(k => k.toLowerCase() === m.groups.vlan.toLowerCase());
                if (standardVlanName) {
                    const vObj = targetNode.vlanMap[standardVlanName];
                    vObj.macs.add(m.groups.mac);

                    const rawIface = m.groups.iface.split('.')[0];
                    const logicName = targetNode.aeMap[rawIface] || rawIface;
                    vObj.interfaceNames.add(logicName);

                    if (!targetNode.interfaceMap[logicName]) {
                        targetNode.interfaceMap[logicName] = {
                            type: logicName.startsWith("ae") ? "aggregate" : "physical",
                            status: "up",
                            description: "Dynamic",
                            members: logicName.startsWith("ae") ? [] : undefined,
                            macs: new Set()
                        };
                    } else {
                        targetNode.interfaceMap[logicName].status = "up";
                        if (!targetNode.interfaceMap[logicName].macs) targetNode.interfaceMap[logicName].macs = new Set();
                    }
                    targetNode.interfaceMap[logicName].macs.add(m.groups.mac);
                }
            }
        });

        // --- 4. 第四階段：Topology 拓樸關聯與自動補全 (優化整合版) ---
        const processedNodes = nodes.map(n => ({
            id: n.id, ip: n.ip,
            // 為了後續 lookup，這裡保留原始的 vlanMap 引用（非必要，但能簡化染色邏輯）
            _rawVlanMap: n.vlanMap,
            _rawAeMap: n.aeMap,
            vlans: Object.values(n.vlanMap).map(v => ({
                id: v.id, name: v.name, description: v.description,
                mac_count: v.macs.size, mac_list: Array.from(v.macs), interfaces: Array.from(v.interfaceNames)
            })),
            interfaces_detail: Object.entries(n.interfaceMap).map(([name, info]) => ({
                name, ...info, mac_count: info.macs ? info.macs.size : 0, mac_list: info.macs ? Array.from(info.macs) : []
            }))
        }));

        let finalNodes = [];
        let finalEdges = [];
        try {
            const topo = JSON.parse(topoText || '{"nodes":[], "edges":[]}');
            // 使用 Map 進行快速節點索引
            const nodeLookup = new Map(processedNodes.map(n => [n.id, n]));
            const mappedPorts = new Set();

            (topo.edges || []).forEach(e => {
                if (e.from && e.labelFrom) mappedPorts.add(`${e.from}|${e.labelFrom.split('.')[0]}`);
                if (e.to && e.labelTo) mappedPorts.add(`${e.to}|${e.labelTo.split('.')[0]}`);
            });

            // 節點整合：合併拓樸定義與 SNMP 解析資料
            finalNodes = topo.nodes && topo.nodes.length > 0
                ? topo.nodes.map(tn => ({ ...tn, ...(nodeLookup.get(tn.id) || {}) }))
                : [...processedNodes];

            let allEdges = [...(topo.edges || [])];

            // 自動補全邏輯：處理 SNMP 有資料但拓樸未定義的連線
            processedNodes.forEach(n => {
                n.interfaces_detail.forEach(iface => {
                    if (iface.status === 'up' && !iface.parent && iface.type === 'physical' && !mappedPorts.has(`${n.id}|${iface.name}`)) {
                        const virtualPeerId = `Peer_of_${n.id}_${iface.name}`;
                        const isEdge = iface.mac_count === 1;
                        const vendor = isEdge ? this.getVendor(iface.mac_list[0]) : "";

                        finalNodes.push({
                            id: virtualPeerId,
                            label: `${iface.description || "Unknown"}\n(${isEdge ? vendor : 'MACs: ' + iface.mac_count})`,
                            group: iface.mac_count === 0 ? "NoTraffic" : (isEdge ? "EdgeNode" : "Unknown"),
                            shape: isEdge ? "dot" : "diamond"
                        });
                        allEdges.push({ from: n.id, to: virtualPeerId, labelFrom: iface.name, dashes: true, isMissing: true });
                    }
                });
            });

            // --- 核心改進點：雙向 VLAN 染色與標記 ---
            finalEdges = allEdges.map(edge => {
                const vlanIdSet = new Set(); // 用於合併兩端端點的 VLAN ID

                /**
                 * 內部檢查工具：利用 nodeLookup 快速查找 VLAN
                 */
                const check = (nodeId, label) => {
                    const node = nodeLookup.get(nodeId);
                    if (!node || !label) return;

                    // 1. 端口標準化：處理子介面並透過 aeMap 轉為邏輯端口 (如 AE1)
                    const pureIface = label.split('.')[0];
                    const targetIface = node._rawAeMap?.[pureIface] || pureIface;

                    // 2. 利用原始資料結構中的 interfaceNames (Set) 進行 O(1) 快速比對
                    Object.values(node._rawVlanMap).forEach(v => {
                        if (v.interfaceNames.has(targetIface)) {
                            vlanIdSet.add(v.id);
                        }
                    });
                };

                // 執行雙向檢查 (符合 A->B, B->A 都要標示的需求)
                check(edge.from, edge.labelFrom);
                check(edge.to, edge.labelTo);

                const ids = Array.from(vlanIdSet).sort((a, b) => a - b);

                return {
                    ...edge,
                    vlan_ids: ids,
                    label: `vlan: ${ids.join(',')}${edge.label ? ' ' + edge.label : ''}`
                };
            });

        } catch (e) {
            console.error("Topo Process Error", e);
            finalNodes = processedNodes;
        }

        this.networkData = { nodes: finalNodes, edges: finalEdges };
        return this.networkData;
    }

    getFlattenedData() {
        const rows = [];
        if (!this.networkData.nodes) return rows;

        this.networkData.nodes.forEach(node => {
            if (!node.vlans || !Array.isArray(node.vlans)) return;

            node.vlans.forEach(vlan => {
                if (!vlan.interfaces) return;

                vlan.interfaces.forEach(ifName => {
                    const ifInfo = (node.interfaces_detail || []).find(i => i.name === ifName) || {};
                    const portMacs = ifInfo.mac_list || [];
                    const members = (ifInfo.members && ifInfo.members.length > 0) ? ifInfo.members : [ifName];

                    // 這裡整合 ARP IP
                    const macDetailsArray = portMacs.map(m => {
                        const cleanM = m.replace(/[:.-]/g, "").toUpperCase();
                        const ip = this.globalArpMap[cleanM] || "Unknown IP";
                        const vendor = this.getVendor(m);
                        return `${m} [${ip}] (${vendor})`;
                    });

                    const macDetailsStr = macDetailsArray.join("\n");

                    members.forEach(m => {
                        rows.push({
                            "Device": node.id || "Unknown",
                            "Management_IP": node.ip || "-",
                            "VLAN_ID": vlan.id,
                            "VLAN_Name": vlan.name || "",
                            "Interface": ifName,
                            "Status": ifInfo.status || "down",
                            "Member_Port": m,
                            "Description": ifInfo.description || "",
                            "Port_MAC_Count": portMacs.length,
                            "MAC_with_IP_Vendor": macDetailsStr // 欄位升級
                        });
                    });
                });
            });
        });
        return rows;
    }

    generateCSV() {
        const data = this.getFlattenedData();
        if (data.length === 0) return "";
        const headers = Object.keys(data[0]);
        const csvRows = ["\ufeff" + headers.join(","), ...data.map(row => headers.map(h => {
            const cell = String(row[h] || "");
            return /[, "\n]/.test(cell) ? `"${cell.replace(/"/g, '""')}"` : cell;
        }).join(","))];
        return csvRows.join("\n");
    }

    exportToExcel() {
        const data = this.getFlattenedData();
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        ws['!cols'] = [{ wch: 10 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 10 }, { wch: 25 }, { wch: 15 }, { wch: 50 }];
        XLSX.utils.book_append_sheet(wb, ws, "Audit");
        XLSX.writeFile(wb, `Audit_${Date.now()}.xlsx`);
    }
}