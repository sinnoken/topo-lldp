# LLDP Topology Viewer 使用手冊

本工具基於 **Vis.js** 開發，旨在將複雜的網路設備連接數據（LLDP/OSPF）轉換為直觀、互動式的 3D/平面拓撲圖。

## 1. 核心程式邏輯檢視

系統透過 `topo-lldp.js` 執行以下三個核心階段：

### 🔍 數據解析與轉換 (`convertLldpToJson`)

* **多格式支援**：內建解析邏輯可處理 **Juniper OSPF**、**Fortinet/Cisco OSPF** 以及標準 **LLDP** 文本。
* **自動設備識別**：透過 `CONFIG.GROUP_RULES` (Regex) 自動判定設備類型。例如：
* `FGT/FG`: 識別為 **Firewall** (綠色盾牌圖示)。
* 特定命名規則: 識別為 **Switch** (橘色交換器圖示)。
* `DESKTOP/PC`: 識別為 **Windows** 終端。


* **智慧埠口樣式**：根據 `CONFIG.PORT_STYLES` 自動為連線配色。例如：`ae` 開頭為聚合鏈路 (藍色粗線)，`10G/40G` 為高速鏈路 (紅色線)。

### 🎨 佈局渲染模式 (`toggleLayoutMode`)

* **靜態 (Static)**：讀取 `localStorage` 中的座標，維持手動排列的整潔。
* **階層 (Hierarchy)**：依據網路流向 (UD) 自動排列上下游關係。
* **物理引擎 (ForceAtlas2)**：模擬物理斥力，自動撐開節點，解決大型網路中節點重疊的問題。

### 💾 互動功能

* **雙擊擴散選取**：雙擊節點可依「選取深度」自動選取鄰近設備並**自動複製 JSON 程式碼**至剪貼簿，便於局部拓撲遷移。
* **持久化存儲**：座標與數據快取於瀏覽器，預設有效期為 **8 小時**。

---

## 2. 數據格式說明 (Sample JSON)

為了讓工具正確渲染，你可以手動輸入 JSON 格式。以下是標準的 `sample.json` 結構說明：

### 範例代碼

```json
{
    "nodes": [
        {
            "id": "CORE-SW-01",
            "label": "CORE-SW-01",
            "group": "switch"
        },
        {
            "id": "FGT-EXT-01",
            "label": "FGT-EXT-01",
            "group": "firewall"
        }
    ],
    "edges": [
        {
            "from": "CORE-SW-01",
            "to": "FGT-EXT-01",
            "labelFrom": "ge-0/0/1",
            "labelTo": "port1",
            "width": 3,
            "color": { "color": "#EF4444" }
        }
    ]
}

```

### 欄位解析

* **Nodes (節點)**:
* `id`: 唯一識別碼（搜尋與連線比對用）。
* `group`: 對應程式內的樣式組（switch, firewall, server, windows, endpoint）。


* **Edges (連線)**:
* `from / to`: 定義連線的兩端節點 ID。
* `labelFrom / labelTo`: (程式優化項) 標註兩端設備的物理埠口名稱。
* `width`: 線條粗細（建議：高速鏈路 3-4，一般連線 1.5）。
* `color`: 可自定義連線顏色。



---

## 3. 進階操作小技巧

1. **快速匯入**：直接將 `show lldp neighbors` 的文字貼入原始數據區，程式會自動產生上述 JSON。
2. **搜尋聚焦**：使用頂部搜尋框輸入設備名稱，畫面會自動縮放 (Zoom-in) 並高亮該節點。
3. **座標儲存**：拖動節點後，座標會自動保存，重新整理頁面後佈局不會消失。
4. **圖片導出**：點擊 **Export PNG** 可下載高清拓撲圖，程式會自動計算最佳畫布尺寸。