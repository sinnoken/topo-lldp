# 專案需求文件 (Requirement Specification) - PRD 完整版

**專案名稱**：Network Toolbox (網管工具箱)
**專案類型**：純前端網頁應用程式 (Client-side Web Application)
**文件版本**：v2.0 (包含 QA 驗收與 PM 擴充項目)

## 1. 專案概述與使用情境

本專案旨在提供網路管理員一套輕量、視覺化的前端工具集合，無需依賴後端伺服器即可在瀏覽器中進行網路拓樸解析、VLAN 稽核、路由表分析及 ARP 對應。

* **目標使用者 (User Personas)**：企業內部 NOC (網路維運中心) 工程師、資安稽核人員。
* **核心使用情境 (Use Cases)**：使用者在**無對外網路 (Air-gapped) 或受限的機房環境**中，將網路設備 (如 Switch, Router) 輸出的設定檔或 Log 匯入本工具，以快速視覺化網路拓樸、尋找網路迴圈或進行 MAC/IP 稽核。

---

## 2. 功能性需求與驗收標準 (Functional Requirements & AC)

### 2.1 ARP Map Mapper (ARP 對應解析器)

* **資料處理**：系統需能接收並處理使用者的 ARP 輸入資料，建立 MAC 與 IP 的對應表。
* **快取管理**：提供自動儲存狀態至瀏覽器 LocalStorage 的功能，並支援過期清理機制與手動清除功能。
* **⚠️ 邊界條件與例外處理**：
* 若輸入的資料中「缺少 MAC 位址」，系統應忽略該筆資料並在 Console 或 UI 提示警告。
* 若同一個 IP 對應到多個不同的 MAC (疑似 ARP 欺騙或 VRRP 切換)，應保留最新一筆或標示為異常。


* **✅ 驗收標準 (Acceptance Criteria)**：
* 重新整理網頁後，LocalStorage 內的 ARP 快取能正確還原至畫面上。
* 點擊「清除」按鈕後，必須同步清空 LocalStorage 的對應 Key 值。



### 2.2 VLAN Auditor (VLAN 稽核工具)

* **資料解析**：需能解析巢狀的 ARP JSON 資料結構，並統一 MAC 位址的格式（轉大寫並去除分隔符號）以進行比對。
* **OUI 識別**：非同步背景載入 OUI 資料庫，將 MAC 位址解析為設備製造商，並透過規則精簡大廠名稱（例如將 `Hewlett Packard Enterprise` 縮寫為 `HPE`）。
* **檔案匯出**：允許使用者將稽核結果匯出為 CSV 格式及 Excel (XLSX) 檔案格式。
* **⚠️ 邊界條件與例外處理**：
* 若使用者貼上的 JSON 格式損壞 (`JSON.parse` 失敗)，系統需跳出友善的 Alert 提示「資料格式錯誤，請檢查設定檔」，且不可造成畫面白畫面崩潰。


* **✅ 驗收標準 (Acceptance Criteria)**：
* 匯出的 `.xlsx` 檔案必須能在 Excel 2016 以上版本正常開啟，且欄位寬度需自動排版。
* 匯出的 `.csv` 必須加上 UTF-8 BOM，確保使用 Excel 開啟時中文字與 MAC 位址不亂碼。



### 2.3 LLDP Topology Viewer (LLDP 拓樸視覺化)

* **網路圖繪製**：使用 `vis-network` 函式庫渲染網路拓樸節點與連線。
* **設備分類識別**：根據設備名稱特徵（正則表達式），將節點自動分類為 Firewall、Switch、Server、Windows 等群組並給予不同顏色與圖示。
* **連線分類與樣式**：針對不同類型的網路埠口（如 OOB、L4、LACP、10G/40G Highspeed），給予不同的連線顏色與粗細，並具備懸停 (Hover) 高亮效果。
* **互動與搜尋**：
* 支援節點 (Node) 與 VLAN ID 搜尋功能，並自動選取與縮放至目標。
* 支援節點座標位置記憶功能（存於 LocalStorage，有效期限 8 小時）。


* **⚠️ 邊界條件與例外處理 (效能降級機制)**：
* 當拓樸節點數量超過 500 個或連線超過 1000 條時，系統應自動關閉 `vis-network` 的物理碰撞動畫 (Physics Animation)，防止瀏覽器 CPU 過載卡死。


* **✅ 驗收標準 (Acceptance Criteria)**：
* 設備名稱若包含 `FW` 或 `Firewall` 必須正確套用綠色盾牌圖示與邊框。
* 輸入存在的 VLAN ID 搜尋時，屬於該 VLAN 的連線 (Edges) 必須高亮顯示。



### 2.4 Route Analyzer (路由分析工具)

* **路由節點呈現**：將路由器自動歸類於特定群組，並以視覺化拓樸呈現其連線狀態。
* **路由表分析**：當使用者點擊特定路由器時，系統需展示該設備的介面數量，以及詳細的路由表（包含目的網路 Destination 與下一跳 Next Hop）。
* **✅ 驗收標準 (Acceptance Criteria)**：
* 點擊路由器節點時，側邊或下方資訊欄必須即時更新對應的路由表資料，且不能有延遲。



---

## 3. 資料結構範例 (Data Schema Definition)

為確保開發與測試順利，系統輸入/輸出資料應遵循以下結構：

**3.1 ARP JSON 匯入格式範例**

```json
{
  "arpMap": {
    "Core-Switch-01": {
      "entries": [
        { "ip": "192.168.1.1", "mac": "00:11:22:33:44:55" },
        { "ip": "10.0.0.254", "mac": "AA-BB-CC-DD-EE-FF" }
      ]
    }
  }
}

```

---

## 4. 非功能性需求與相容性 (NFR & Compatibility)

* **UI/UX 設計**：
* 採用 Tailwind CSS 進行現代化排版。
* 佈局主要針對 Desktop / Tablet 設計 (因網管拓樸圖不適合在手機狹小螢幕上操作)。
* 提供主題切換彈性（預設使用 `data-theme="light"`）。


* **資料安全性與隱私 (Zero Backend)**：
* 所有網路架構資料皆透過 JavaScript 在本地端處理，絕對禁止將解析資料傳送至任何外部 API，確保企業敏感資訊不外洩。


* **瀏覽器相容性 (Browser Compatibility)**：
* 完整支援：Chrome 90+, Edge 90+, Firefox 88+。
* 不支援：Internet Explorer (IE 11)。



---

## 5. 部署與技術堆疊 (Deployment & Tech Stack)

* **核心語言**：HTML5, CSS3, JavaScript (ES6+)。
* **樣式框架**：Tailwind CSS (透過 `output.css` 引入)。
* **依賴套件版本鎖定**：
* Vis-Network: `v10.0.2`
* SheetJS / xlsx: `v0.18.5`


* **部署與維護策略 (Deployment Strategy)**：
* **靜態託管**：編譯後的檔案可直接放置於任何 Static Web Server (如 Nginx, Apache) 或打包為 Zip 供本機點擊 `index.html` 直接離線執行。
* **OUI 資料庫更新**：開發人員需每半年手動下載最新 IEEE OUI 資料庫，轉換為輕量化的 `oui.json` 替換專案內的舊檔，以維持廠牌識別準確度。
