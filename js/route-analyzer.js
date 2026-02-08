/**
 * route.js - 整合 labelFrom/labelTo 功能版
 */
class NetworkAnalyzer {
    constructor(containerId, config) {
        this.containerId = containerId;
        this.nodesRaw = config.nodes;
        this.edgesRaw = config.edges;
        this.colorConfig = config.colors;

        this.nodes = null;
        this.edges = null;
        this.network = null;
    }

    init() {
        const container = document.getElementById(this.containerId);

        this.nodes = new vis.DataSet(this.nodesRaw.map(n => ({
            ...n,
            shape: n.type === 'router' ? 'dot' : 'box',
            font: { color: '#3c4043', size: 10, face: 'Google Sans' },
            color: {
                background: '#ffffff',
                border: this.colorConfig[n.group] || '#dadce0'
            },
            borderWidth: 2,
            size: 10
        })));

        this.edges = new vis.DataSet(this.edgesRaw.map(e => ({
            ...e,
            font: { size: 5, color: '#70757a', face: 'Roboto Mono' },
            color: { color: '#dadce0' },
            arrows: 'to',
            width: 1,
            smooth: { type: 'curvedCW', roundness: 0.1 }
        })));

        const options = {
            physics: { enabled: true, solver: 'forceAtlas2Based' },
            interaction: { hover: true }
        };

        this.network = new vis.Network(container, {
            nodes: this.nodes,
            edges: this.edges
        }, options);

        // --- 核心整合：監聽繪製事件 ---
        this.network.on("afterDrawing", (ctx) => {
            this.renderCustomLabels(ctx);
        });

        window.addEventListener('resize', () => this.network.fit());
    }

    renderCustomLabels(ctx) {
        const allEdges = this.network.body.edges;
        // 1. 一次性取得所有原始資料，避免在迴圈中重覆呼叫 get(id)
        const rawEdgesData = this.edges.get();

        rawEdgesData.forEach(rawData => {
            const id = rawData.id;
            const edge = allEdges[id];

            // 檢查 edge 是否存在於畫面上 (vis.js 可能因過濾或延遲未渲染)
            if (!edge) return;

            const { labelFrom, labelTo } = rawData;
            const isHover = edge.hover;

            // 2. 只有在需要繪製標籤時才計算昂貴的屬性
            if (labelFrom || labelTo || isHover) {
                const viaNode = edge.edgeType.getViaNode();

                if (labelFrom || labelTo) {
                    const { font, selected } = edge.options; // 解構常用屬性

                    ctx.save();
                    // 3. 預先設定好共用狀態
                    ctx.font = `${edge.selected ? 'bold' : ''} ${font.size}px ${font.face}`;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';

                    if (labelFrom) this._drawSingleLabel(ctx, edge, labelFrom, 0.2, viaNode);
                    if (labelTo) this._drawSingleLabel(ctx, edge, labelTo, 0.8, viaNode);

                    ctx.restore();
                }

                // 處理 Hover 置頂
                if (isHover) {
                    edge.drawLabel(ctx, viaNode);
                }
            }
        });
    }

    _drawSingleLabel(ctx, edge, text, percentage, viaNode) {
        // 取得基礎百分比位置
        let pt = edge.edgeType.getPoint(percentage, viaNode);

        // 穩健性檢查：若點位無效則跳過
        if (!pt || isNaN(pt.x)) return;

        const from = edge.from;
        const to = edge.to;

        // 計算向量與角度
        const dx = to.x - from.x;
        const dy = to.y - from.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // 如果線條太短，自動調整百分比，避免標籤重疊節點
        if (distance < 50) {
            if (percentage < 0.5) percentage = 0.3;
            else percentage = 0.7;
            pt = edge.edgeType.getPoint(percentage, viaNode);
        }

        let angle = Math.atan2(dy, dx);
        // 確保文字方向始終易於閱讀 (不倒立)
        if (angle < -Math.PI / 2 || angle > Math.PI / 2) angle += Math.PI;

        ctx.save();
        ctx.translate(pt.x, pt.y);
        ctx.rotate(angle);

        // 繪製半透明膠囊背景
        const paddingH = 4;
        const paddingV = 2;
        const metrics = ctx.measureText(text);
        const w = metrics.width;
        const h = 12; // 調整為適合閱讀的高度

        ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
        ctx.shadowColor = 'rgba(0,0,0,0.1)';
        ctx.shadowBlur = 4;

        this._drawRoundedRect(ctx, -w / 2 - paddingH, -h / 2, w + paddingH * 2, h, 3);
        ctx.fill();

        // 移除陰影再畫文字，保持清晰
        ctx.shadowBlur = 0;
        ctx.fillStyle = edge.selected ? '#1a73e8' : '#5f6368';
        ctx.fillText(text, 0, 1); // 微調 y 軸偏移使其垂直居中
        ctx.restore();
    }

    _drawRoundedRect(ctx, x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.arcTo(x, y, x + w, y, r);
        ctx.closePath();
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
        const cardHtml = `
        <div class="card bg-base-200 shadow-sm border-l-4 border-primary overflow-hidden">
            <div class="card-body p-3 gap-1">
                <div class="flex justify-between items-center">
                    <span class="mono text-[10px] font-bold opacity-50">${curr}</span>
                    <span class="badge ${info.badge} badge-xs font-bold p-2">${info.title}</span>
                </div>
                <div class="flex items-center gap-2 mt-1">
                    <span class="material-symbols-outlined text-sm opacity-50">arrow_forward</span>
                    <span class="text-sm font-bold tracking-tight">${next}</span>
                </div>
            </div>
        </div>`;
        log.insertAdjacentHTML('beforeend', cardHtml);
    }
}