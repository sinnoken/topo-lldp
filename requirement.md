# 專案需求文件 (Requirement Specification)

**專案名稱**：Network Toolbox (網管工具箱)
**專案類型**：純前端網頁應用程式 (Client-side Web Application)

## 1. 專案概述

本專案旨在提供網路管理員一套輕量、視覺化的前端工具集合，無需依賴後端伺服器即可在瀏覽器中進行網路拓樸解析、VLAN 稽核、路由表分析及 ARP 對應。專案涵蓋四個主要核心模組：ARP Map Mapper、VLAN Auditor、LLDP Topology Viewer 與 Route Analyzer。

---

## 2. 功能性需求 (Functional Requirements)

### 2.1 ARP Map Mapper (ARP 對應解析器)

* **資料處理**：系統需能接收並處理使用者的 ARP 輸入資料，建立 MAC 與 IP 的對應表。
* **快取管理**：提供自動儲存狀態至瀏覽器 LocalStorage 的功能，並支援過期清理機制與手動清除功能。

### 2.2 VLAN Auditor (VLAN 稽核工具)

* **資料解析**：需能解析巢狀的 ARP JSON 資料結構，並統一 MAC 位址的格式（轉大寫並去除分隔符號）以進行比對。
* **OUI 識別**：非同步背景載入 OUI（Organizationally Unique Identifier）資料庫，將 MAC 位址解析為設備製造商，並透過規則精簡大廠名稱（例如將 Hewlett Packard Enterprise 縮寫為 HPE）。
* **檔案匯出**：允許使用者將稽核結果匯出為 CSV 格式及 Excel (XLSX) 檔案格式。

### 2.3 LLDP Topology Viewer (LLDP 拓樸視覺化)

* **網路圖繪製**：使用 `vis-network` 函式庫渲染網路拓樸節點與連線。
* **設備分類識別**：根據設備名稱特徵（正則表達式），將節點自動分類為 Firewall、Switch、Server、Windows 等群組並給予不同顏色與圖示。
* **連線分類與樣式**：針對不同類型的網路埠口（如 OOB、L4、LACP (Aggregate)、VLAN、10G/40G Highspeed），給予不同的連線顏色與粗細，並具備懸停 (Hover) 高亮效果。
* **互動與搜尋**：
* 支援節點 (Node) 與 VLAN ID 搜尋功能，並自動選取與縮放至目標。
* 支援節點座標位置記憶功能（存於 LocalStorage，有效期限 8 小時）。



### 2.4 Route Analyzer (路由分析工具)

* **路由節點呈現**：將路由器自動歸類於特定群組，並以視覺化拓樸呈現其連線狀態。
* **路由表分析**：當使用者點擊特定路由器時，系統需展示該設備的介面數量，以及詳細的路由表（包含目的網路 Destination 與下一跳 Next Hop）。

---

## 3. 非功能性需求 (Non-Functional Requirements)

* **UI/UX 設計**：
* 採用 Tailwind CSS 進行現代化、響應式排版。
* 使用 Google Sans 字型與 Material Symbols / FontAwesome 圖示庫。
* 提供主題切換彈性（預設使用 `data-theme="light"`）。


* **效能要求**：對於龐大的 OUI 資料庫載入，必須使用不阻塞畫面 (Non-blocking) 的非同步方式處理。
* **資料安全性與隱私**：所有網路架構（Config/Topology）資料皆透過 JavaScript 在本地端（Client-side）處理，不進行後端伺服器傳輸，確保企業敏感架構資訊不外洩。

---

## 4. 技術堆疊與開源依賴 (Technology Stack)

* **核心語言**：HTML5, CSS3, JavaScript (ES6+)。
* **樣式框架**：Tailwind CSS (透過 `output.css` 引入)。
* **拓樸視覺化套件**：Vis-Network (版本 10.0.2)。
* **表格處理套件**：SheetJS / xlsx (版本 0.18.5)。