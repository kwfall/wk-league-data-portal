@echo off
chcp 65001 >nul
cd /d "%~dp0"
node scrape.mjs 2026
node tools/cardlist.mjs
node scrape-roster.mjs
node scrape-abroad.mjs
node scrape-news.mjs
pause
