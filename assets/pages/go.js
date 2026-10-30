// 경기장 가는 길: 내 위치를 넣으면 예정 경기 경기장까지의 거리·경로를 지도에 보여 준다
// 지도는 Leaflet + OpenStreetMap(파일로 열면 Esri) 타일, 위치 검색은 Nominatim, 자동차 경로는 OSRM 공개 서버를 쓴다.
(function () {
  const WK = window.WK, U = WK.ui, S = WK.state, t = WK.t;
  const V = window.WK_VENUES || {};
  const LEAFLET = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/';
  const routes = {}; // 같은 구간을 다시 계산하지 않도록 기억

  try { S.goMe = JSON.parse(localStorage.getItem('wk-me') || 'null'); } catch (e) { S.goMe = null; }
  Object.assign(S, { goMatch: '', goMsg: '', goBusy: false });

  const km = (a, b) => { // 두 지점 사이 직선 거리(km)
    const R = 6371, r = Math.PI / 180, dLat = (b.lat - a.lat) * r, dLng = (b.lng - a.lng) * r;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  };
  const hm = (sec) => { const m = Math.round(sec / 60), h = Math.floor(m / 60); return h ? t('{h}시간 {m}분', { h, m: m % 60 }) : t('{m}분', { m }); };
  const has = (v) => V[v] && V[v].lat != null;
  const loadLeaflet = () => (WK._leaflet ||= new Promise((ok, fail) => {
    const css = document.createElement('link'); css.rel = 'stylesheet'; css.href = LEAFLET + 'leaflet.min.css'; document.head.appendChild(css);
    const js = document.createElement('script'); js.src = LEAFLET + 'leaflet.min.js'; js.onload = ok; js.onerror = fail; document.head.appendChild(js);
  }));

  async function setMe(lat, lng, label) {
    S.goMe = { lat, lng, label };
    try { localStorage.setItem('wk-me', JSON.stringify(S.goMe)); } catch (e) { /* 저장이 막힌 환경 */ }
  }
  async function search(q) {
    S.goBusy = true; S.goMsg = ''; WK.rerender();
    try {
      const r = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&countrycodes=kr&limit=1&accept-language=${WK.lang}&q=${encodeURIComponent(q)}`);
      const j = await r.json();
      if (j.length) await setMe(+j[0].lat, +j[0].lon, j[0].display_name.split(',').slice(0, 3).join(', '));
      else S.goMsg = t('입력한 위치를 찾지 못했습니다. 동 이름이나 역 이름처럼 더 넓은 이름으로 다시 찾아 보세요.');
    } catch (e) { S.goMsg = t('위치 검색 서버에 연결하지 못했습니다. 인터넷 연결을 확인해 주세요.'); }
    S.goBusy = false; WK.rerender();
  }
  function locate() {
    if (!navigator.geolocation) { S.goMsg = t('이 브라우저에서는 현재 위치를 쓸 수 없습니다.'); return WK.rerender(); }
    S.goBusy = true; S.goMsg = ''; WK.rerender();
    navigator.geolocation.getCurrentPosition(async (p) => { await setMe(p.coords.latitude, p.coords.longitude, t('현재 위치')); S.goBusy = false; WK.rerender(); },
      () => { S.goBusy = false; S.goMsg = t('현재 위치를 가져오지 못했습니다. 위치 권한을 허용하거나 위치를 직접 입력해 주세요.'); WK.rerender(); }, { timeout: 10000 });
  }
  function clearMe() { S.goMe = null; try { localStorage.removeItem('wk-me'); } catch (e) { /* 저장이 막힌 환경 */ } WK.rerender(); }

  WK.pages.go = function (B) {
    const me = S.goMe;
    const up = B.upcoming.filter((m) => !S.mTeam || m.home === S.mTeam || m.away === S.mTeam);
    if (!up.some((m) => String(m.id) === String(S.goMatch))) S.goMatch = up[0] ? String(up[0].id) : '';
    const sel = up.find((m) => String(m.id) === String(S.goMatch)), v = sel && V[sel.venue];
    const dist = (m) => (me && has(m.venue) ? km(me, V[m.venue]) : null);
    const ext = (m) => { // 외부 지도 앱 길찾기 링크
      const name = encodeURIComponent(m.venue), p = V[m.venue];
      const kakao = has(m.venue) ? `https://map.kakao.com/link/to/${name},${p.lat},${p.lng}` : `https://map.kakao.com/link/search/${name}`;
      const naver = `https://map.naver.com/p/search/${name}`;
      const google = has(m.venue) ? `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}${me ? `&origin=${me.lat},${me.lng}` : ''}&travelmode=transit` : `https://www.google.com/maps/search/?api=1&query=${name}`;
      return `<a class="btn" href="${kakao}" target="_blank" rel="noopener">${t('카카오맵')}</a><a class="btn" href="${naver}" target="_blank" rel="noopener">${t('네이버 지도')}</a><a class="btn" href="${google}" target="_blank" rel="noopener">${t('구글 지도 (대중교통)')}</a>`;
    };

    WK.afterRender = () => mount(B, up, sel);
    const row = (m) => { const d = dist(m), on = String(m.id) === String(S.goMatch); return `<button type="button" class="gm${on ? ' on' : ''}" data-set="goMatch:${m.id}" aria-pressed="${on}">
      <span class="gd">${U.day(m)} ${m.datetime.slice(11, 16)} · ${m.round}</span>
      <span class="gt">${U.logo(m.home, 18)}${U.tname(m.home)} <i>vs</i> ${U.logo(m.away, 18)}${U.tname(m.away)}</span>
      <span class="gv">${U.venue(m.venue || '')}${d != null ? ` · <b>${t('직선 {km}km', { km: d.toFixed(0) })}</b>` : has(m.venue) ? '' : ` · ${t('위치 미확인')}`}${has(m.venue) && V[m.venue].approx ? ` · ${t('대략 위치')}` : ''}</span></button>`; };

    return `<h1>${t('경기장 가는 길')}</h1><p class="lead">${t('내 위치를 넣으면 예정된 경기의 경기장까지 거리와 자동차 경로를 지도에 보여 줍니다.')}</p>
      <div class="go">
        <div class="go-side">
          <section class="card" style="margin-top:0"><h2>${t('내 위치')}</h2>
            <form id="goForm" class="bar" style="margin-top:10px"><input type="search" id="goQ" placeholder="${t('예: 서울역, 수원시 영통동')}" aria-label="${t('내 위치')}" style="flex:1;min-width:0"><button class="btn" type="submit" ${S.goBusy ? 'disabled' : ''}>${t('찾기')}</button></form>
            <div class="bar" style="margin-top:8px"><button class="btn" type="button" id="goGeo" ${S.goBusy ? 'disabled' : ''}>${t('현재 위치 쓰기')}</button>${me ? `<button class="btn" type="button" id="goClear">${t('지우기')}</button>` : ''}</div>
            <p class="desc" style="margin-top:10px">${S.goBusy ? t('찾는 중입니다…') : me ? `<b style="color:var(--ink)">${U.esc(me.label)}</b>` : t('아직 위치를 넣지 않았습니다.')}</p>
            ${S.goMsg ? `<p class="notice" style="margin-top:8px">${S.goMsg}</p>` : ''}
          </section>
          <section class="card"><div class="head" style="margin-bottom:8px"><h2>${t('갈 경기 고르기')}</h2><select data-bind="mTeam" aria-label="${t('팀 선택')}"><option value="">${t('전체 팀')}</option>${B.teams.map((tm) => `<option value="${U.esc(tm)}" ${tm === S.mTeam ? 'selected' : ''}>${U.tname(tm)}</option>`).join('')}</select></div>
            ${up.length ? `<div class="gml">${up.map(row).join('')}</div>` : `<p class="foot" style="margin:0">${B.upcoming.length ? t('이 팀의 남은 경기가 없습니다.') : t('{y}시즌에는 예정된 경기가 없습니다.', { y: B.year })}</p>`}
          </section>
        </div>
        <div class="go-main">
          <section class="card" style="margin-top:0">
            ${sel ? `<div class="head"><div><h2>${U.venue(sel.venue)}</h2><p class="desc">${U.round(sel)} · ${U.date(sel.datetime)} ${sel.datetime.slice(11, 16)} · ${U.tname(sel.home)} vs ${U.tname(sel.away)}${v && v.addr ? ` · ${U.esc(v.addr)}` : ''}</p></div>${U.src(t('OpenStreetMap, Esri, OSRM'))}</div>
              <div class="tiles" id="goTiles">${U.tile(t('직선 거리'), me && has(sel.venue) ? `${km(me, v).toFixed(0)}km` : '–', me ? '' : t('내 위치를 넣으면 계산합니다'))}${U.tile(t('자동차 경로'), '<span id="goKm">–</span>', `<span id="goKmN">${me && has(sel.venue) ? t('계산 중…') : ''}</span>`)}${U.tile(t('예상 운전 시간'), '<span id="goMin">–</span>', t('교통 상황은 반영하지 않음'))}${U.tile(t('늦어도 출발할 시각'), '<span id="goDep">–</span>', t('경기 1시간 전 도착 기준'))}</div>
              ${v && v.approx ? `<p class="notice">${t('이 경기장의 좌표는 주소를 바탕으로 지도에서 고른 대략적인 위치입니다. 실제 출입구와 수백 미터 차이가 날 수 있으니 지도 앱에서 한 번 더 확인해 주세요.')}</p>` : ''}
              ${has(sel.venue) ? '' : `<p class="notice">${t('이 경기장은 공개 지도 자료에서 이름으로 찾지 못해 좌표가 없습니다. 아래 지도 앱 버튼으로 경기장 이름을 검색해 주세요.')}</p>`}
              <div class="bar" style="margin:12px 0">${ext(sel)}</div>` : `<p class="foot" style="margin:0 0 12px">${t('예정된 경기가 없어 경기장 위치만 보여 줍니다.')}</p>`}
            <div id="goMap" class="gomap" role="img" aria-label="${t('경기장 지도')}"></div>
            <p class="foot">${t('입력한 위치는 이 기기에만 저장됩니다. 위치 검색과 경로 계산을 위해 좌표가 OpenStreetMap(Nominatim)과 OSRM 서버로 전송됩니다. 운전 시간은 교통 상황을 반영하지 않은 값이고, 대중교통 경로는 지도 앱 버튼으로 확인해 주세요.')}</p>
          </section>
        </div>
      </div>`;
  };

  // 화면이 그려진 뒤: 입력 연결, 지도와 경로 그리기
  async function mount(B, up, sel) {
    const form = document.getElementById('goForm');
    if (!form) return;
    form.onsubmit = (e) => { e.preventDefault(); const q = document.getElementById('goQ').value.trim(); if (q) search(q); };
    document.getElementById('goGeo').onclick = locate;
    const clr = document.getElementById('goClear'); if (clr) clr.onclick = clearMe;
    const el = document.getElementById('goMap');
    try { await loadLeaflet(); } catch (e) { el.innerHTML = `<p class="empty">${t('지도를 불러오지 못했습니다. 인터넷 연결을 확인해 주세요.')}</p>`; return; }
    if (!document.body.contains(el)) return; // 그 사이 다른 페이지로 넘어간 경우
    const L = window.L, me = S.goMe;
    const map = L.map(el, { scrollWheelZoom: false }).setView([36.3, 127.8], 7);
    // 지도 타일: 웹 주소(http/https)로 열렸을 때는 OpenStreetMap 공식 타일을 쓰고,
    // 파일을 직접 연 경우(file://)에는 공식 서버가 출처 없는 요청을 '접근 차단(403)'으로 막으므로 Esri 지도를 쓴다.
    const web = location.protocol.startsWith('http');
    if (web) L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18, attribution: '&copy; OpenStreetMap contributors' }).addTo(map);
    else L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', { maxZoom: 18, attribution: 'Tiles &copy; Esri' }).addTo(map);
    // 경기장 표식: 그 경기장을 홈으로 쓰는 팀의 로고
    const homes = {};
    for (const m of B.all) if (has(m.venue)) (homes[m.venue] ||= {})[m.home] = ((homes[m.venue] || {})[m.home] || 0) + 1;
    const pts = [];
    for (const [name, h] of Object.entries(homes)) {
      const team = Object.entries(h).sort((a, b) => b[1] - a[1])[0][0], p = V[name], on = sel && sel.venue === name;
      const next = up.find((m) => m.venue === name);
      L.marker([p.lat, p.lng], { icon: L.divIcon({ className: '', html: `<span class="pin${on ? ' on' : ''}">${U.logo(team, 22)}</span>`, iconSize: [36, 36], iconAnchor: [18, 18] }), zIndexOffset: on ? 500 : 0 })
        .addTo(map).bindPopup(`<b>${U.venue(name)}</b><br>${U.tname(team)}${next ? `<br>${U.day(next)} ${next.datetime.slice(11, 16)} · ${U.tname(next.home)} vs ${U.tname(next.away)}` : ''}`)
        .on('click', () => { if (next && String(next.id) !== String(S.goMatch)) { S.goMatch = String(next.id); WK.rerender(); } });
      pts.push([p.lat, p.lng]);
    }
    if (me) { L.marker([me.lat, me.lng], { icon: L.divIcon({ className: '', html: '<span class="pin me"></span>', iconSize: [22, 22], iconAnchor: [11, 11] }) }).addTo(map).bindPopup(U.esc(me.label)); }
    const dest = sel && has(sel.venue) ? V[sel.venue] : null;
    if (me && dest) map.fitBounds([[me.lat, me.lng], [dest.lat, dest.lng]], { padding: [40, 40] });
    else if (dest) map.setView([dest.lat, dest.lng], 11);
    else if (pts.length) map.fitBounds(pts, { padding: [30, 30] });
    if (!me || !dest) return;
    // 자동차 경로
    const key = `${me.lat},${me.lng}>${dest.lat},${dest.lng}`, set = (id, v) => { const x = document.getElementById(id); if (x) x.innerHTML = v; };
    try {
      routes[key] ||= await (await fetch(`https://router.project-osrm.org/route/v1/driving/${me.lng},${me.lat};${dest.lng},${dest.lat}?overview=full&geometries=geojson`)).json();
      const r = routes[key].routes && routes[key].routes[0];
      if (!r) throw new Error('no route');
      if (!document.body.contains(el)) return;
      L.geoJSON(r.geometry, { style: { color: '#ff4f9a', weight: 5, opacity: 0.9 } }).addTo(map);
      set('goKm', `${(r.distance / 1000).toFixed(0)}km`); set('goKmN', ''); set('goMin', hm(r.duration));
      const dep = new Date(new Date(sel.datetime).getTime() - (r.duration + 3600) * 1000), p2 = (n) => String(n).padStart(2, '0');
      set('goDep', `${dep.getMonth() + 1}.${p2(dep.getDate())} ${p2(dep.getHours())}:${p2(dep.getMinutes())}`);
    } catch (e) { delete routes[key]; set('goKmN', t('경로를 계산하지 못했습니다')); }
  }
})();
