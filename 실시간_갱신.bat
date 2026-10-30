@echo off
chcp 65001 >nul
cd /d "%~dp0"
title WK리그 Data 실시간 갱신
echo 이 창을 켜 두는 동안 연맹 기록을 경기 일정에 맞춰 자동으로 다시 수집합니다.
echo 사이트(index.html)는 열어 두면 1분 안에 새 기록으로 바뀝니다. 멈추려면 이 창을 닫으세요.
echo.
node tools/live.mjs 2026
pause
