# GitHub 上傳與啟動

此包為2026-10-29的原始碼快照，基於提交 `f44653e`，並以打包當下後台已發布內容更新 `content/site.json`（修訂2，88個生活片段、14個議題）。

## 上傳

解壓縮後，將 `vote-card/` 裡的全部內容（含 `.gitignore`）上傳至你的 GitHub 儲存庫。壓縮包本身不會自動展開成 GitHub 專案；請上傳解壓後的檔案。使用 Git 或 GitHub Desktop 也可直接將這個解壓目錄建立為本機儲存庫，再發布。

本包不含 `.git/` 歷史、`.data/`、SQLite備份、登入資料、私人信件、環境變數或暫存檔。後台未發布草稿不在初始化素材中。

## 本機執行

需要 Python 3.10以上。無第三方 Python 套件，無前端建置步驟。在解壓的 `vote-card/` 執行：

```sh
python3 -m server.app --port 4174
```

開啟 http://127.0.0.1:4174/ ，後台為 http://127.0.0.1:4174/admin/ 。新環境首次進後台須自行設定管理密碼；原本電腦的密碼不會隨包移轉。

測試另需Node.js（本包以Node.js 25驗證）：

```sh
node --test demo/*.test.mjs
python3 -m unittest discover -s tests -v
```

## 部署範圍

此服務目前只綁定本機，並檢查本機Host與Origin；上傳GitHub是保存及分享原始碼，不會使後台與分享API自動上線。完整功能需要Python服務及可持久保存的SQLite資料，不適合直接當成純靜態GitHub Pages部署。對外部署還需要設定網域、HTTPS、公開網址與備份方式。

## 素材與授權

請見 `SOURCES.md`。本次不代選MIT等開源授權，不將第三方政策資料或AI協作插畫一併宣告為可任意再授權；公開儲存庫前可依你的決定補上程式碼授權。
