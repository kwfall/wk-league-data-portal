@echo off
chcp 65001 >nul
cd /d "%~dp0"
title WK리그 Data 사이트 올리기
echo 내 컴퓨터에서 고친 내용을 GitHub 에 올립니다. 1~2분 뒤 사이트에 반영됩니다.
echo.
git add -A
git commit -m "사이트 수정 %date% %time%"
git push
echo.
echo 끝났습니다. 진행 상황은 GitHub 저장소의 Actions 탭에서 볼 수 있습니다.
pause
