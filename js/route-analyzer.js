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
                arrows: { to: { enabled: true, scaleFactor: 0.2 } },
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
        // 重大優化：避免在每幀渲染時呼叫 .get()，改用全量遍歷
        // 如果效能仍有壓力，建議改用 this.edges.get({ filter: ... }) 預篩選有 label 的資料
        const rawEdgesData = this.edges.get();

        // 1. 【提升狀態】將通用的設定移到迴圈外
        ctx.save(); // 全局只存這一次
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        rawEdgesData.forEach(rawData => {
            const edge = allEdges[rawData.id];
            if (!edge) return;

            const { labelFrom, labelTo } = rawData;
            const isHover = edge.hover;

            if (labelFrom || labelTo || isHover) {
                const viaNode = edge.edgeType.getViaNode();

                if (labelFrom || labelTo) {
                    const { font } = edge.options;

                    // 2. 【直接賦值】不使用 save/restore，直接覆蓋屬性
                    // 這裡只更新變動的部分：字體樣式
                    ctx.font = `${edge.selected ? 'bold' : ''} ${font.size}px ${font.face}`;

                    if (labelFrom) this._drawSingleLabel(ctx, edge, labelFrom, 0.2, viaNode);
                    if (labelTo) this._drawSingleLabel(ctx, edge, labelTo, 0.8, viaNode);
                }

                if (isHover) {
                    // 原生 drawLabel 內部通常會自帶 save/restore，這是為了安全
                    // 但因為我們在最外層有 restore，所以這裡呼叫它是安全的
                    edge.drawLabel(ctx, viaNode);
                }
            }
        });

        ctx.restore(); // 全局只還原這一次
    }

    _drawSingleLabel(ctx, edge, text, percentage, viaNode) {
        // 1. 取得節點實體
        const fromNode = this.network.body.nodes[edge.from.id];
        const toNode = this.network.body.nodes[edge.to.id];
        if (!fromNode || !toNode) return;

        // 獲取近似半徑 (優化：如果 shape 固定的話可以改為常數)
        const getRadius = (node) => {
            if (node.options.shape === 'box') return (node.shape.width / 2) || 30;
            return node.options.size || 20;
        };

        const rFrom = getRadius(fromNode);
        const rTo = getRadius(toNode);

        // 2. 計算連線向量與距離
        const dx = edge.to.x - edge.from.x;
        const dy = edge.to.y - edge.from.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance === 0) return;

        // 3. 計算安全邊際
        const margin = 12;
        const arrowPadding = edge.options.arrows.to.enabled ? (edge.options.arrows.to.scaleFactor * 20) : 0;
        const minP = (rFrom + margin) / distance;
        const maxP = 1 - (rTo + margin + arrowPadding) / distance;

        let safeP = (percentage < 0.5) ? Math.max(percentage, minP) : Math.min(percentage, maxP);

        // 4. 取得修正後的座標
        let pt = edge.edgeType.getPoint(safeP, viaNode);
        if (!pt || isNaN(pt.x)) return;

        // --- 安全的尺寸計算 ---
        const fontSize = edge.options.font.size || 10;
        const face = edge.options.font.face || 'sans-serif';

        // 確保 edge 內部有一個存放我們自定義資料的地方
        // 如果 edge 不給塞，可以考慮改塞在 edge.options 內 (較不建議但保險)
        if (!edge._myCache) {
            edge._myCache = {};
        }

        // 只有在文字、字體大小或字體改變時才重算
        if (edge._myCache.lastText !== text || edge._myCache.lastFontSize !== fontSize) {
            ctx.save();
            ctx.font = `${fontSize}px ${face}`; // 重點：必須先設定字體再量測
            const metrics = ctx.measureText(text);

            const paddingX = fontSize * 0.4;
            const paddingY = fontSize * 0.2;

            edge._myCache.rectW = metrics.width + paddingX * 2;
            edge._myCache.rectH = fontSize + paddingY * 2;
            edge._myCache.lastText = text;
            edge._myCache.lastFontSize = fontSize;
            ctx.restore();
        }

        const { rectW, rectH } = edge._myCache;

        // --- 5. 繪製邏輯 ---
        let angle = Math.atan2(dy, dx);
        if (angle < -Math.PI / 2 || angle > Math.PI / 2) angle += Math.PI;

        ctx.save();
        ctx.translate(pt.x, pt.y);
        ctx.rotate(angle);

        // 設定字體 (繪製時也要設定一次)
        ctx.font = `${fontSize}px ${face}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // 繪製背景
        ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
        this._drawRoundedRect(ctx, -rectW / 2, -rectH / 2, rectW, rectH, 3);
        ctx.fill();

        ctx.strokeStyle = "rgba(127, 127, 127, 0.5)";
        ctx.lineWidth = 0.5;
        ctx.stroke();

        // 繪製文字 (置中繪製，所以座標是 0, 0)
        ctx.fillStyle = edge.selected ? '#1a73e8' : '#5f6368';
        ctx.fillText(text, 0, 0);

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

        const startNode = this.nodesRaw.find(n => n.ip === srcIP);
        if (!startNode) {
            log.innerHTML = `<div class="p-3 bg-red-50 text-red-600 rounded text-xs">Source IP not found.</div>`;
            return;
        }

        // 使用 Set 存儲所有路徑中的節點與邊，以便一次性高亮
        let allPathNodes = new Set([startNode.id]);
        let allPathEdges = new Set();

        // 佇列：{ currentNode, ttl, visitedNodes }
        let queue = [{
            node: startNode,
            ttl: 32,
            visited: new Set([startNode.id])
        }];

        let reachedDest = false;

        while (queue.length > 0) {
            let { node, ttl, visited } = queue.shift();

            if (node.ip === dstIP || ttl <= 0) {
                if (node.ip === dstIP) reachedDest = true;
                continue;
            }

            let nextHops = []; // 存儲多個下一跳 IP
            let logInfo = { title: "Routing", badge: "bg-gray-100" };

            // 1. 判斷節點類型與尋找下一跳
            if (node.type === 'host') {
                if (node.gateway) nextHops.push(node.gateway);
                logInfo = { title: "Gateway", badge: "bg-indigo-100 text-indigo-700" };
            } else {
                // 直接連線判斷
                const conn = node.interfaces?.find(iface => this.isIpMatch(dstIP, iface.ip, iface.mask));
                if (conn) {
                    nextHops.push(dstIP);
                    logInfo = { title: "Connected", badge: "bg-blue-100 text-blue-700" };
                } else {
                    // ECMP 邏輯：尋找所有具備相同最長遮罩的路由
                    let maxMask = -1;
                    let bestRoutes = [];

                    node.routingTable?.forEach(r => {
                        if (this.isIpMatch(dstIP, r.network, r.mask)) {
                            if (r.mask > maxMask) {
                                maxMask = r.mask;
                                bestRoutes = [r];
                            } else if (r.mask === maxMask) {
                                bestRoutes.push(r);
                            }
                        }
                    });

                    if (bestRoutes.length > 0) {
                        nextHops = bestRoutes.map(r => r.nextHop);
                        logInfo = {
                            title: bestRoutes.length > 1 ? `ECMP x${bestRoutes.length}` : `LPM: /${maxMask}`,
                            badge: bestRoutes.length > 1 ? "bg-purple-100 text-purple-700" : "bg-emerald-100 text-emerald-700"
                        };
                    }
                }
            }

            // 2. 處理所有下一跳
            nextHops.forEach(ip => {
                const nextNode = this.nodesRaw.find(n => n.ip === ip || (n.interfaces?.some(i => i.ip === ip)));

                if (nextNode && !visited.has(nextNode.id)) {
                    // 記錄視覺資訊
                    allPathNodes.add(nextNode.id);
                    const edge = this.edgesRaw.find(e =>
                        (e.from === node.id && e.to === nextNode.id) ||
                        (e.to === node.id && e.from === nextNode.id)
                    );
                    if (edge) allPathEdges.add(edge.id);

                    this.renderLogCard(node.id, nextNode.id, logInfo);

                    // 繼續往下追蹤
                    let newVisited = new Set(visited);
                    newVisited.add(nextNode.id);
                    queue.push({ node: nextNode, ttl: ttl - 1, visited: newVisited });
                }
            });
        }

        if (reachedDest) {
            log.insertAdjacentHTML('afterbegin', `<div class="p-3 bg-blue-600 text-white rounded text-xs font-bold mb-2 text-center">Trace Successful (ECMP Aware)</div>`);
        }

        this.applyHighlight(Array.from(allPathNodes), Array.from(allPathEdges));
    }

    applyHighlight(pNodes, pEdges) {
        pEdges.forEach(eid => {
            this.edges.update({
                id: eid,
                color: { color: '#4f46e5' }, // 使用 Indigo 色
                width: 4,
                arrows: { to: { enabled: true, scaleFactor: 0.3 } },
                dashes: false // 確保不是虛線
            });
        });

        pNodes.forEach(nid => {
            this.nodes.update({
                id: nid,
                borderWidth: 3,
                color: { border: '#4f46e5' },
                shadow: {
                    enabled: true,
                    color: 'rgba(79, 70, 229, 0.6)',
                    size: 15
                }
            });
        });

        // 視角縮放包含所有路徑
        setTimeout(() => {
            this.network.fit({
                nodes: pNodes,
                animation: { duration: 800, easingFunction: 'easeInOutQuad' }
            });
        }, 100);
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
            <span class="badge badge-primary font-mono text-[10px] py-3">${router.id.replace('\n', ' ')}</span>
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