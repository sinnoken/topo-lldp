/**
 * route.js - 段落 1: 基礎架構與初始化
 */
class NetworkAnalyzer {
    constructor(containerId, config) {
        this.containerId = containerId;
        this.nodesRaw = config.nodes;
        this.edgesRaw = config.edges;
        this.colorConfig = config.colors;

        // Vis.js 專用的實體儲存空間
        this.nodes = null;
        this.edges = null;
        this.network = null;
    }

    // 初始化圖形介面
    init() {
        const container = document.getElementById(this.containerId);

        // 1. 轉換原始資料為 Vis DataSet
        this.nodes = new vis.DataSet(this.nodesRaw.map(n => ({
            ...n,
            shape: n.type === 'router' ? 'dot' : 'box',
            font: { color: '#3c4043', size: 12, face: 'Google Sans' },
            color: {
                background: '#ffffff',
                border: this.colorConfig[n.group] || '#dadce0'
            },
            borderWidth: 1.5,
            size: 20
        })));

        this.edges = new vis.DataSet(this.edgesRaw.map(e => ({
            ...e,
            font: { size: 10, color: '#70757a', face: 'Roboto Mono' },
            color: { color: '#dadce0' },
            arrows: 'to',
            width: 1.5,
            smooth: { type: 'curvedCW', roundness: 0.1 }
        })));

        // 2. 設定繪圖選項並啟動
        const options = {
            physics: { enabled: true, solver: 'forceAtlas2Based' },
            edges: { arrows: 'to' }
        };

        this.network = new vis.Network(container, {
            nodes: this.nodes,
            edges: this.edges
        }, options);

        window.addEventListener('resize', () => this.network.fit());
    }

    /**
     * route.js - 段落 2: 路由計算核心
     */

    // IP 轉長整數，便於遮罩運算
    ipToLong(ip) {
        return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
    }

    // 判斷 IP 是否屬於特定網段 (LPM 基礎)
    isIpMatch(targetIP, networkIP, maskLen) {
        if (maskLen === 0) return true; // Default Route 0.0.0.0/0
        const mask = (0xFFFFFFFF << (32 - maskLen)) >>> 0;
        return (this.ipToLong(targetIP) & mask) === (this.ipToLong(networkIP) & mask);
    }

    // 視覺重置：將所有節點與線條恢復原狀
    resetVisualization() {
        this.edges.update(this.edgesRaw.map(e => ({
            id: e.id,
            color: { color: '#dadce0' },
            width: 1.5
        })));

        this.nodes.update(this.nodesRaw.map(n => ({
            id: n.id,
            borderWidth: 1.5,
            shadow: { enabled: false }
        })));
    }
    /**
     * route.js - 段落 3: 路徑分析與視覺強化
     */
    tracePath() {
        const srcIP = document.getElementById('srcIP').value;
        const dstIP = document.getElementById('dstIP').value;
        const log = document.getElementById('log-container');
        log.innerHTML = "";

        this.resetVisualization();

        let current = this.nodesRaw.find(n => n.ip === srcIP);
        if (!current) {
            log.innerHTML = `<div class="p-3 bg-red-50 text-red-600 rounded text-xs">Source IP not found.</div>`;
            return;
        }

        let pathNodes = [current.id], pathEdges = [], visited = new Set();
        let ttl = 32;

        while (current && ttl > 0) {
            if (visited.has(current.id) || current.ip === dstIP) break;
            visited.add(current.id);
            ttl--;

            let nextHopIP = null;
            let logInfo = { title: "Routing", badge: "bg-gray-100" };

            // 路由邏輯判斷 (Host 閘道或 Router 查表)
            if (current.type === 'host') {
                nextHopIP = current.gateway;
                logInfo = { title: "Gateway", badge: "bg-indigo-100 text-indigo-700" };
            } else {
                const conn = current.interfaces?.find(iface => this.isIpMatch(dstIP, iface.ip, iface.mask));
                if (conn) {
                    nextHopIP = dstIP;
                    logInfo = { title: "Connected", badge: "bg-blue-100 text-blue-700" };
                } else {
                    let best = null;
                    current.routingTable?.forEach(r => {
                        if (this.isIpMatch(dstIP, r.network, r.mask)) {
                            if (!best || r.mask > best.mask) best = r;
                        }
                    });
                    if (best) {
                        nextHopIP = best.nextHop;
                        logInfo = { title: `LPM: ${best.network}/${best.mask}`, badge: "bg-emerald-100 text-emerald-700" };
                    }
                }
            }

            if (nextHopIP) {
                // 尋找下一個設備節點
                const nextNode = this.nodesRaw.find(n => n.ip === nextHopIP || (n.interfaces?.some(i => i.ip === nextHopIP)));
                if (nextNode) {
                    this.renderLogCard(current.id, nextNode.id, logInfo);

                    // 關鍵修正：精準匹配 Edge ID
                    const edge = this.edgesRaw.find(e =>
                        (e.from === current.id && e.to === nextNode.id) ||
                        (e.to === current.id && e.from === nextNode.id)
                    );

                    if (edge) pathEdges.push(edge.id);
                    pathNodes.push(nextNode.id);
                    current = nextNode;
                } else { break; }
            } else { break; }
        }

        // 最後檢查是否抵達終點並上色
        if (current && current.ip === dstIP) {
            log.insertAdjacentHTML('afterbegin', `<div class="p-3 bg-blue-600 text-white rounded text-xs font-bold mb-2 text-center">Trace Successful</div>`);
        }

        this.applyHighlight(pathNodes, pathEdges);
    }

    // 執行視覺強化：修正後的 update 語法
    applyHighlight(pNodes, pEdges) {
        pEdges.forEach(eid => {
            this.edges.update({ id: eid, color: { color: '#1a73e8' }, width: 4 });
        });
        pNodes.forEach(nid => {
            this.nodes.update({
                id: nid,
                borderWidth: 3,
                shadow: { enabled: true, color: 'rgba(26,115,232,0.5)' }
            });
        });
        setTimeout(() => this.network.fit({ nodes: pNodes, animation: { duration: 500 } }), 100);
    }

    renderLogCard(curr, next, info) {
        const log = document.getElementById('log-container');
        log.innerHTML += `
            <div class="md-card p-3 border-l-4 border-l-blue-500 mb-2">
                <div class="flex justify-between items-center mb-1">
                    <span class="text-[10px] font-bold text-gray-400 jetbrains">${curr}</span>
                    <span class="status-badge ${info.badge}">${info.title}</span>
                </div>
                <div class="text-sm font-medium">Next Hop → ${next}</div>
            </div>`;
    }
}