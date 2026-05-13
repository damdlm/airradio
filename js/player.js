// ════════════════════════════════════════════
// AIR — Rádio Inteligente
// player.js — Player, fila e simulação
// ════════════════════════════════════════════

// ── Fila ─────────────────────────────────────

function buildQueue() {
  let tracks = [...CATALOG];
  if (S.mode === 'fav') {
    tracks.sort((a, b) => {
      const pa = (S.prefs[a.genre] || 0) + (S.liked.includes(a.id) ? 25 : 0);
      const pb = (S.prefs[b.genre] || 0) + (S.liked.includes(b.id) ? 25 : 0);
      return pb - pa;
    });
  } else if (S.mode === 'disco') {
    tracks = tracks.filter(t => !S.liked.includes(t.id)).sort(() => Math.random() - .5);
  } else if (S.mode === 'mood') {
    tracks.sort(() => Math.random() - .5);
  } else if (S.mode === 'local') {
    const loc = tracks.filter(t => ['MPB', 'Sertanejo'].includes(t.genre));
    tracks = loc.length >= 3 ? loc : tracks;
  }
  if (S.shuffle) tracks.sort(() => Math.random() - .5);
  S.queue = tracks;
}

function renderQueue() {
  document.getElementById('qlist').innerHTML = S.queue.map((t, i) => `
    <div class="qitem ${i === S.idx ? 'cur' : ''}" onclick="playIdx(${i})">
      <div class="qnum">${i === S.idx ? '▶' : i + 1}</div>
      <div class="qth">
        <img src="https://img.youtube.com/vi/${t.id}/mqdefault.jpg"
          loading="lazy"
          onerror="this.style.display='none'">
      </div>
      <div class="qinf">
        <div class="qtitle">${escHtml(t.title)}</div>
        <div class="qart">${escHtml(t.artist)} · ${t.genre} · ${t.year}</div>
      </div>
      <button class="qlike ${S.liked.includes(t.id) ? 'on' : ''}"
        onclick="event.stopPropagation(); likeTrack('${t.id}')"
        aria-label="${S.liked.includes(t.id) ? 'Remover curtida' : 'Curtir'}">
        ${S.liked.includes(t.id) ? '❤️' : '🤍'}
      </button>
    </div>`).join('');
}

// ── Player ────────────────────────────────────

function playIdx(i) {
  S.idx = i;
  loadTrack(true);
}

function loadTrack(auto = false) {
  const t = S.queue[S.idx];
  if (!t) return;
  S.cur = t;
  updateNP(t);
  renderQueue();
  bumpPref(t.genre);

  const iframe = document.getElementById('yt-iframe');
  const ap = auto ? 1 : 0;
  iframe.src = `https://www.youtube.com/embed/${t.id}?autoplay=${ap}&rel=0&modestbranding=1&iv_load_policy=3&playsinline=1&enablejsapi=1`;

  if (auto) {
    document.getElementById('yt-wrap').classList.add('on');
    S.ytPanelOpen = true;
    S.playing = true;
    updPlayBtn();
    setEQ(true);
    animViz(true);
    startSim(t.dur || 240);
    setStatus(`▶ ${t.title} — ${t.artist} · Vídeo carregando abaixo`, 'ok');
    announceTrack(t);
  } else {
    S.playing = false;
    updPlayBtn();
    setEQ(false);
    animViz(false);
  }
}

function togglePlay() {
  if (!S.cur) { loadTrack(true); return; }
  if (S.playing) {
    pauseIframe();
    pauseSim();
    S.playing = false;
    updPlayBtn();
    setEQ(false);
    animViz(false);
    setStatus(`⏸ Pausado: ${S.cur.title}`, 'info');
  } else {
    const pos = Math.floor(S.simPos);
    document.getElementById('yt-iframe').src =
      `https://www.youtube.com/embed/${S.cur.id}?autoplay=1&start=${pos}&rel=0&modestbranding=1&iv_load_policy=3&playsinline=1&enablejsapi=1`;
    document.getElementById('yt-wrap').classList.add('on');
    resumeSim();
    S.playing = true;
    updPlayBtn();
    setEQ(true);
    animViz(true);
    setStatus(`▶ ${S.cur.title} — ${S.cur.artist}`, 'ok');
  }
}
// alias para onclick HTML
window.togPlay = togglePlay;

function pauseIframe() {
  document.getElementById('yt-iframe').src = 'about:blank';
}

async function next() {
  if (S.transitionInProgress) return;
  if (S.repeat && S.cur) { loadTrack(true); return; }

  const prevTrack = S.cur;
  const newIdx = S.shuffle
    ? Math.floor(Math.random() * S.queue.length)
    : (S.idx + 1) % S.queue.length;
  const nextTrack = S.queue[newIdx];

  if (prevTrack && nextTrack && S.user) {
    S.transitionInProgress = true;
    showTyping();
    try {
      const comment = await generateTransitionComment(prevTrack, nextTrack);
      hideTyping();
      if (comment) addBubble(comment, null, false, '🎙️ DJ (Transição)');
    } catch (err) {
      console.warn('Transição IA:', err);
      hideTyping();
      addBubble(`🎶 Próxima: ${nextTrack.title}! 🎶`, null, false, '📻 Rádio');
    } finally {
      S.transitionInProgress = false;
      S.idx = newIdx;
      loadTrack(true);
    }
  } else {
    S.idx = newIdx;
    loadTrack(true);
  }
}

async function prev() {
  if (S.transitionInProgress) return;

  const newIdx = (S.idx - 1 + S.queue.length) % S.queue.length;
  const prevTrack = S.cur;
  const nextTrack = S.queue[newIdx];

  if (prevTrack && nextTrack && S.user) {
    S.transitionInProgress = true;
    showTyping();
    try {
      const comment = await generateTransitionComment(prevTrack, nextTrack);
      hideTyping();
      if (comment) addBubble(comment, null, false, '🎙️ DJ (Volta)');
    } catch (err) {
      console.warn('Transição IA:', err);
      hideTyping();
      addBubble(`🎶 Voltando para ${nextTrack.title}! 🎶`, null, false, '📻 Rádio');
    } finally {
      S.transitionInProgress = false;
      S.idx = newIdx;
      loadTrack(true);
    }
  } else {
    S.idx = newIdx;
    loadTrack(true);
  }
}

function seekClick(e) {
  const r   = e.currentTarget.getBoundingClientRect();
  const p   = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
  const pos = Math.floor(p * S.simDur);
  S.simPos  = pos;
  document.getElementById('prog-fill').style.width = (p * 100) + '%';
  document.getElementById('tcur').textContent = fmtT(pos);
  if (S.playing && S.cur) {
    document.getElementById('yt-iframe').src =
      `https://www.youtube.com/embed/${S.cur.id}?autoplay=1&start=${pos}&rel=0&modestbranding=1&iv_load_policy=3&playsinline=1&enablejsapi=1`;
    S.simStart  = Date.now();
    S.simOffset = pos;
  }
}

function togShuffle() {
  S.shuffle = !S.shuffle;
  document.getElementById('cbsh').classList.toggle('on', S.shuffle);
  buildQueue();
  renderQueue();
  toast(S.shuffle ? '🔀 Modo aleatório ativado' : '🔀 Modo aleatório desativado');
}

function togRepeat() {
  S.repeat = !S.repeat;
  document.getElementById('cbrp').classList.toggle('on', S.repeat);
  toast(S.repeat ? '🔁 Repetição ativada' : '🔁 Repetição desativada');
}

function setVol(v) {
  S.vol = parseInt(v);
  // Tenta enviar via postMessage para o iframe
  try {
    const iframe = document.getElementById('yt-iframe');
    if (iframe.contentWindow) {
      iframe.contentWindow.postMessage(
        JSON.stringify({ event: 'command', func: 'setVolume', args: [S.vol] }), '*'
      );
    }
  } catch (e) { /* silencioso */ }
}

function openYT() {
  if (S.cur) window.open(`https://www.youtube.com/watch?v=${S.cur.id}`, '_blank');
  else toast('Nenhuma música tocando');
}

function toggleYTPanel() {
  const w = document.getElementById('yt-wrap');
  S.ytPanelOpen = !S.ytPanelOpen;
  w.classList.toggle('on', S.ytPanelOpen);
}

// ── Utilitários do player ─────────────────────

function fmtT(s) {
  const m  = Math.floor(s / 60);
  const sc = Math.floor(s % 60);
  return `${m}:${sc < 10 ? '0' : ''}${sc}`;
}

function updPlayBtn() {
  document.getElementById('cplay').textContent = S.playing ? '⏸' : '▶';
  document.getElementById('cplay').setAttribute('aria-label', S.playing ? 'Pausar' : 'Reproduzir');
}

function setEQ(on) {
  document.querySelectorAll('.eqb').forEach(b => b.classList.toggle('play', on));
}

// ── Simulação de progresso ────────────────────

function startSim(dur) {
  stopSim();
  S.simDur    = dur;
  S.simPos    = 0;
  S.simStart  = Date.now();
  S.simOffset = 0;
  document.getElementById('ttot').textContent = fmtT(dur);
  _runSim();
}

function _runSim() {
  S.simTimer = setInterval(() => {
    S.simPos = S.simOffset + (Date.now() - S.simStart) / 1000;
    if (S.simPos >= S.simDur) {
      stopSim();
      next();
      return;
    }
    document.getElementById('prog-fill').style.width = (S.simPos / S.simDur * 100) + '%';
    document.getElementById('tcur').textContent = fmtT(S.simPos);
  }, 500);
}

function pauseSim() {
  clearInterval(S.simTimer);
  S.simTimer = null;
}

function resumeSim() {
  S.simOffset = S.simPos;
  S.simStart  = Date.now();
  _runSim();
}

function stopSim() {
  clearInterval(S.simTimer);
  S.simTimer = null;
  S.simPos   = 0;
  document.getElementById('prog-fill').style.width = '0%';
  document.getElementById('tcur').textContent = '0:00';
}

// ── Now Playing UI ────────────────────────────

function updateNP(t) {
  if (!t) return;
  document.getElementById('np-title').textContent  = t.title;
  document.getElementById('np-artist').textContent = `${t.artist} · ${t.year}`;
  document.getElementById('np-tag').textContent    = t.genre;
  document.getElementById('np-thumb').innerHTML = `
    <img src="https://img.youtube.com/vi/${t.id}/mqdefault.jpg"
      alt="Capa: ${escHtml(t.title)}"
      style="width:100%;height:100%;object-fit:cover"
      onerror="this.parentNode.innerHTML='<div class=np-ico>🎵</div>'">
    <div class="eq">
      <div class="eqb"></div><div class="eqb"></div>
      <div class="eqb"></div><div class="eqb"></div>
    </div>`;
  const lb = document.getElementById('lbtn');
  const liked = S.liked.includes(t.id);
  lb.textContent = liked ? '❤️ Curtida' : '🤍 Curtir';
  lb.className   = 'abtn' + (liked ? ' liked' : '');
}

function toggleLike() {
  if (!S.cur) return;
  likeTrack(S.cur.id);
  updateNP(S.cur);
}

function likeTrack(id) {
  if (S.liked.includes(id)) {
    S.liked = S.liked.filter(x => x !== id);
  } else {
    S.liked.push(id);
    const t = S.queue.find(x => x.id === id);
    if (t) S.prefs[t.genre] = Math.min(100, (S.prefs[t.genre] || 30) + 10);
  }
  persistUser();
  renderQueue();
  renderPrefs();
}

// ── Preferências e Modos ─────────────────────

function bumpPref(g) {
  S.prefs[g] = Math.min(100, (S.prefs[g] || 30) + 1.5);
  renderPrefs();
  persistUser();
}

function renderPrefs() {
  const s    = Object.entries(S.prefs).sort((a, b) => b[1] - a[1]).slice(0, 7);
  const html = s.map(([g, v]) => `
    <div class="prow">
      <div class="plbl">${escHtml(g)}</div>
      <div class="ptrack"><div class="pfill" style="width:${Math.round(v)}%"></div></div>
      <div class="ppct">${Math.round(v)}%</div>
    </div>`).join('');

  document.getElementById('pbars').innerHTML      = html;
  document.getElementById('full-pbars').innerHTML = html;

  const liked = S.queue.filter(t => S.liked.includes(t.id));
  document.getElementById('liked-list').innerHTML = liked.length
    ? liked.map(t => `
        <div class="qitem" onclick="playIdx(${S.queue.indexOf(t)})">
          <div class="qth">
            <img src="https://img.youtube.com/vi/${t.id}/mqdefault.jpg"
              loading="lazy"
              onerror="this.style.display='none'">
          </div>
          <div class="qinf">
            <div class="qtitle">${escHtml(t.title)}</div>
            <div class="qart">${escHtml(t.artist)}</div>
          </div>
          <span style="font-size:16px">❤️</span>
        </div>`).join('')
    : '<div class="empty">Nenhuma música curtida ainda</div>';

  const ug = S.user?.genres || [];
  document.getElementById('pgsel').innerHTML = ALL_GENRES.map(g => `
    <div class="gpill ${ug.includes(g) ? 'on' : ''}" data-g="${g}"
      onclick="this.classList.toggle('on')">${escHtml(g)}</div>`).join('');
}

function savePref() {
  const sel = [...document.querySelectorAll('#pgsel .gpill.on')].map(e => e.dataset.g);
  if (sel.length === 0) { toast('⚠️ Escolha ao menos 1 gênero'); return; }
  S.user.genres = sel;
  const u = getUsers();
  if (u[S.user.email]) {
    u[S.user.email].genres = sel;
    saveUsers(u);
  }
  buildQueue();
  renderQueue();
  toast('✅ Preferências salvas! Fila atualizada.');
}

function setMode(m, el) {
  S.mode = m;
  document.querySelectorAll('.mpill').forEach(x => x.classList.remove('on'));
  el.classList.add('on');
  buildQueue();
  renderQueue();
  const labels = { fav: '❤️ Modo Favoritos', disco: '🔭 Modo Descoberta', mood: '🌙 Modo Humor', local: '📍 Sons do Brasil' };
  toast(labels[m] || '');
}