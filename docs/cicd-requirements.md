# CI/CD Pipeline 需求文件 (Pipeline Specification)

**專案名稱**：Network Toolbox (網管工具箱)
**CI/CD 平台**：GitHub Actions (或 GitLab CI / Jenkins)
**部署目標**：GitHub Pages (或 AWS S3 / Vercel)

## 1. 專案技術棧與環境 (Environment)
* **語言/框架**：純前端 Vanilla JS, HTML, CSS (Tailwind)。
* **包管理器**：無 (或 npm/yarn，如果未來有加入 Node.js 構建步驟)。
* **執行 Runner**：`ubuntu-latest`。
* **Node.js 版本**：不適用 (純靜態檔案)。

## 2. 觸發條件 (Triggers)
請根據以下條件觸發 Pipeline：
* **Push**：當代碼推送到 `main` 分支時，觸發「自動部署 (Deploy)」流程。
* **Pull Request**：當對 `main` 發起 PR 時，僅觸發「代碼檢查 (Lint) 與 測試 (Test)」，**不可執行部署**。
* **手動觸發 (workflow_dispatch)**：允許管理者在 GitHub 介面上點擊按鈕手動觸發完整流程。

## 3. 階段定義 (Pipeline Stages / Jobs)

### Stage 1: 檢查與測試 (Lint & Test)
* **任務**：確保程式碼品質。
* **具體指令**：
  * (目前無自動化測試，可保留此 Stage 作為未來擴充或執行簡單的 HTML/JS 語法檢查)。

### Stage 2: 構建 (Build)
* **任務**：準備要部署的靜態檔案。
* **處理邏輯**：
  * 將根目錄下的 `.html`, `.svg` 以及 `js/`, `css/` 資料夾打包。
  * 排除 `.md` 文件、`.git` 以及不必要的測試圖檔。

### Stage 3: 部署 (Deploy)
* **依賴條件**：必須等待 Stage 1 與 Stage 2 成功後才可執行 (`needs: build`)。
* **任務**：將打包好的檔案推送到 GitHub Pages ( `gh-pages` 分支)。
* **權限要求**：賦予 `GITHUB_TOKEN` 讀寫儲存庫的權限 (`permissions: contents: write`)。

## 4. 環境變數與機密 (Secrets & Variables)
*本專案目前無依賴後端 API，因此無需特別設定 API_KEY。若未來有需要，請從 `${{ secrets.XXX }}` 讀取。*

## 5. 規範與限制 (Constraints & Rules)
1. **快取策略 (Caching)**：若未來加入 `node_modules`，必須實作 Cache 機制以加速構建。
2. **產出物 (Artifacts)**：每個 Job 結束後，必須將建構的 HTML/JS 打包成 Artifact，供後續階段下載檢查。
3. **通知機制**：如果 Pipeline 失敗，請**不要**加入 Slack/Email 通知步驟 (保持流程單純)。
