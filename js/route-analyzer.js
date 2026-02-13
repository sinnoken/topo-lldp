/**
 * NetworkAnalyzer - 整合 DataView 與 Custom Labels 版
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
        this.nodesView = null;
    }

    init() {
        const container = document.getElementById(this.containerId);

        // 1. 初始化原始數據池 (DataSet)
        this.nodes = new vis.DataSet(this.nodesRaw);
        this.edges = new vis.DataSet(this.edgesRaw);

        // 2. 建立數據視圖 (DataView) —— 處理邏輯映射
        this.nodesView = new vis.DataView(this.nodes, {
            map: (item) => {
                return {
                    ...item,
                    // 如果 type 是 router，自動指派到 router 群組
                    group: item.type === 'router' ? 'router' : item.group
                };
            }
        });

        // 3. 設定繪圖選項 (抽離樣式邏輯)
        const options = {
            groups: this.generateGroupsConfig(),
            nodes: {
                shape: 'dot',
                borderWidth: 1,
                size: 20,
                font: { color: '#3c4043', size: 10 },
                color: { background: '#ffffff', border: '#dadce0' }
            },
            edges: {
                arrows: 'to',
                width: 1,
                hoverWidth: 1,
                color: { color: '#dddddd', highlight: '#00ff00', hover: '#ff8800', inherit: false },
                font: { size: 4, color: '#7a7a7a' },
                smooth: { type: 'curvedCW', roundness: 0.05 }
            },
            physics: {
                enabled: true,
                solver: 'forceAtlas2Based',
                forceAtlas2Based: {
                    gravitationalConstant: -50,
                    centralGravity: 0.01,
                    springLength: 100,
                    springConstant: 0.08
                }
            },
            interaction: {
                hover: true,
                tooltipDelay: 200,
            }
        };

        // 4. 啟動 Network
        this.network = new vis.Network(container, {
            nodes: this.nodesView,
            edges: this.edges
        }, options);

        // 5. 核心：掛載自定義標籤渲染與事件
        this.network.on("afterDrawing", (ctx) => {
            this.renderCustomLabels(ctx);
        });
        this.network.on("click", (params) => {
            if (params.nodes.length > 0) {
                const nodeId = params.nodes[0];
                // 從類別內部的原始數據找，而不是從 HTML 的全域變數找
                const nodeData = this.nodesRaw.find(n => n.id === nodeId);
                this.renderRouteTable(nodeData); // 呼叫類別內部的方法
            } else {
                this.renderRouteTable(null); // 沒點到東西時清空
            }
        });

        window.addEventListener('resize', this.handleResize.bind(this));
    }

    // 輔助：處理視窗縮放
    handleResize() {
        if (this.network) {
            this.network.fit();
        }
    }

    // 輔助：生成群組配置
    generateGroupsConfig() {
        const groups = {};
        Object.keys(this.colorConfig).forEach(key => {
            groups[key] = {
                color: { border: this.colorConfig[key] },
                shape: key === 'router' ? 'dot' : 'box'
            };
        });
        return groups;
    }

    // --- 自定義標籤渲染核心 ---
    renderCustomLabels(ctx) {
        const allEdges = this.network.body.edges;
        const rawEdgesData = this.edges.get(); // 取得包含 labelFrom/To 的原始資料

        rawEdgesData.forEach(rawData => {
            const edge = allEdges[rawData.id];
            if (!edge) return;

            const { labelFrom, labelTo } = rawData;
            const isHover = edge.hover;

            if (labelFrom || labelTo || isHover) {
                const viaNode = edge.edgeType.getViaNode();

                if (labelFrom || labelTo) {
                    const { font } = edge.options;
                    ctx.save();
                    ctx.font = `${edge.selected ? 'bold' : ''} ${font.size}px ${font.face}`;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';

                    if (labelFrom) this._drawSingleLabel(ctx, edge, labelFrom, 0.2, viaNode);
                    if (labelTo) this._drawSingleLabel(ctx, edge, labelTo, 0.8, viaNode);

                    ctx.restore();
                }

                // 處理 Hover 時的原生 Label 置頂
                if (isHover) {
                    edge.drawLabel(ctx, viaNode);
                }
            }
        });
    }

    _drawSingleLabel(ctx, edge, text, percentage, viaNode) {
        let pt = edge.edgeType.getPoint(percentage, viaNode);
        if (!pt || isNaN(pt.x)) return;

        const dx = edge.to.x - edge.from.x;
        const dy = edge.to.y - edge.from.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < 50) {
            pt = edge.edgeType.getPoint(percentage < 0.5 ? 0.3 : 0.7, viaNode);
        }

        let angle = Math.atan2(dy, dx);
        if (angle < -Math.PI / 2 || angle > Math.PI / 2) angle += Math.PI;

        ctx.save();
        ctx.translate(pt.x, pt.y);
        ctx.rotate(angle);

        const metrics = ctx.measureText(text);
        const w = metrics.width, h = 12, pH = 4;

        ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
        ctx.shadowColor = 'rgba(0,0,0,0.1)';
        ctx.shadowBlur = 3;
        this._drawRoundedRect(ctx, -w / 2 - pH, -h / 2, w + pH * 2, h, 3);
        ctx.fill();

        ctx.shadowBlur = 0;
        ctx.fillStyle = edge.selected ? '#1a73e8' : '#5f6368';
        ctx.fillText(text, 0, 1);
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

    // --- 路由分析邏輯 ---
    ipToLong(ip) {
        return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
    }

    isIpMatch(targetIP, networkIP, maskLen) {
        if (maskLen === 0) return true;
        const mask = (0xFFFFFFFF << (32 - maskLen)) >>> 0;
        return (this.ipToLong(targetIP) & mask) === (this.ipToLong(networkIP) & mask);
    }

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
                const nextNode = this.nodesRaw.find(n => n.ip === nextHopIP || (n.interfaces?.some(i => i.ip === nextHopIP)));
                if (nextNode) {
                    this.renderLogCard(current.id, nextNode.id, logInfo);
                    // [新增] 如果目前處理的是 Router，自動更新顯示它的表
                    if (current.type === 'router') {
                        this.renderRouteTable(current);
                    }
                    const edge = this.edgesRaw.find(e =>
                        (e.from === current.id && e.to === nextNode.id) ||
                        (e.to === current.id && e.from === nextNode.id)
                    );
                    if (edge) pathEdges.push(edge.id);
                    pathNodes.push(nextNode.id);
                    current = nextNode;
                } else break;
            } else break;
        }

        if (current && current.ip === dstIP) {
            log.insertAdjacentHTML('afterbegin', `<div class="p-3 bg-blue-600 text-white rounded text-xs font-bold mb-2 text-center">Trace Successful</div>`);
        }
        this.applyHighlight(pathNodes, pathEdges);
    }

    applyHighlight(pNodes, pEdges) {
        pEdges.forEach(eid => this.edges.update({ id: eid, color: { color: '#0400ff' }, width: 3 }));
        pNodes.forEach(nid => this.nodes.update({
            id: nid,
            borderWidth: 2,
            shadow: { enabled: true, color: 'rgba(0, 110, 255, 0.5)' }
        }));
        setTimeout(() => this.network.fit({ nodes: pNodes, animation: { duration: 500 } }), 100);
    }

    renderLogCard(curr, next, info) {
        const log = document.getElementById('log-container');
        const cardHtml = `
        <div class="card bg-base-200 shadow-sm border-l-4 border-primary overflow-hidden mb-2">
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

    // route-analyzer.js

    renderRouteTable(router) {
        const container = document.getElementById('route-table-container');
        if (!container) return;

        // 如果點擊的是 host 而不是 router，可以顯示不同的 UI 或清空
        if (!router || router.type !== 'router') {
            container.innerHTML = `
            <div class="flex flex-col items-center justify-center h-full opacity-20 text-center">
                <span class="material-symbols-outlined text-4xl">router</span>
                <p class="text-[10px] font-bold uppercase mt-2">Select a router to view routes</p>
            </div>`;
            return;
        }

        let html = `
        <div class="mb-3 flex items-center justify-between">
            <span class="badge badge-primary font-mono text-[10px] py-3">${router.label.replace('\n', ' ')}</span>
            <span class="text-[9px] opacity-50 font-bold">INTERFACES: ${router.interfaces?.length || 0}</span>
        </div>
        <div class="overflow-hidden rounded-lg border border-base-300">
            <table class="table table-zebra table-xs w-full">
                <thead>
                    <tr class="bg-base-200">
                        <th class="text-[10px]">Destination</th>
                        <th class="text-[10px]">Next Hop</th>
                    </tr>
                </thead>
                <tbody>
                    ${router.routingTable.map(route => `
                        <tr class="hover">
                            <td class="font-mono text-[10px]">${route.network}/${route.mask}</td>
                            <td class="font-mono text-[10px] text-secondary font-bold">${route.nextHop}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
        container.innerHTML = html;
    }

}