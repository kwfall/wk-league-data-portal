#!/usr/bin/env bash
# 3개 언어 × 주요 페이지를 캡처하고 체크리스트 실패만 모아서 보여 준다
# 사용법: bash tools/check-all.sh
cd "$(dirname "$0")/.." || exit 1
fails=0
for lang in ko en ja; do
  for page in "home home" "team team/수원FC위민" "table table" "matches matches" "match-126 match/126" "teams teams" "players players" "predict predict" "history history" "about about" "qor qor" "go go" "cards cards" "compare compare" "compare-t compare/t%3A수원FC위민" "best best" "cup cup" "nsf nsf" "news news" "analysis analysis" "abroad abroad" "abroad-1 abroad/Choo%20Hyo-joo" "abroad-2 abroad/Cho%20So-hyun" "player player/수원FC위민|지소연|10"; do
    out=$(UI_LANG=$lang node tools/shot.mjs $page | grep -E "실패|오류:")
    if [ -n "$out" ]; then echo "[$lang] $page"; echo "$out"; fails=1; fi
  done
done
[ "$fails" = 0 ] && echo "모든 화면 통과" || echo "실패한 화면 있음"
