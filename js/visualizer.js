// ════════════════════════════════════════════
// AIR — Rádio Inteligente
// visualizer.js — Animação de barras de áudio
// Usa AudioContext real na voz do DJ,
// e simulação inteligente por gênero na música
// ════════════════════════════════════════════

const VIZ = {
  bars: [],
  frame: null,
  mode: 'idle',       // 'idle' | 'music' | 'speech'
  analyser: null,     // AudioContext analyser (voz DJ)
  dataArr: null,
  ctx: null,
  source: null,
  beatPhase: 0,
  beatBPM: 120,
  lastBeat: 0,
  smoothed: [],       // array suavizado de alturas
  NUM: 32,
};

// ── Perfis por gênero ─────────────────────────
// [BPM, energy, bassBoost, trebleBoost]
const GENRE_PROFILES = {
  'Rock':       [130, 0.85, 1.3, 1.2],
  'Pop':        [118, 0.75, 1.0, 1.1],
  'MPB':        [ 95, 0.60, 0.9, 0.8],
  'Sertanejo':  [105, 0.70, 1.1, 0.9],
  'Hip-Hop':    [95,  0.80, 1.5, 0.7],
  'Eletrônica': [128, 0.90, 1.4, 1.3],
  'Jazz':       [ 88, 0.55, 0.8, 1.0],
  'Clássico':   [ 80, 0.50, 0.7, 1.1],
  'R&B':        [100, 0.65, 1.2, 0.9],
  '_default':   [110, 0.70, 1.0, 1.0],
};

// ── Build ─────────────────────────────────────

function buildViz() {
  const el = document.getElementById('visualizer');
  if (!el) return;
  el.innerHTML = '';
  VIZ.bars = [];
  VIZ.smoothed = [];
  for (let i = 0; i < VIZ.NUM; i++) {
    const b = document.createElement('div');
    b.className = 'vbar';
    b.style.cssText = 'height:3px;transition:height 0.08s ease';
    el.appendChild(b);
    VIZ.bars.push(b);
    VIZ.smoothed.push(3);
  }
}

// ── Animação principal ─────────────────────────

function animViz(on, mode = 'music') {
  cancelAnimationFrame(VIZ.frame);
  clearInterval(S.vizTimer); // compatibilidade

  if (!on) {
    VIZ.mode = 'idle';
    _decayToIdle();
    return;
  }

  VIZ.mode = mode;
  VIZ.beatPhase = 0;
  VIZ.lastBeat = performance.now();

  // Carrega perfil do gênero atual
  const genre = S.cur?.genre || '_default';
  const [bpm, energy, bassB, trebleB] = GENRE_PROFILES[genre] || GENRE_PROFILES['_default'];
  VIZ.beatBPM   = bpm;
  VIZ.energy    = energy;
  VIZ.bassBoost = bassB;
  VIZ.trebleB   = trebleB;

  _loop();
}

function _loop() {
  if (VIZ.mode === 'idle') return;

  const now = performance.now();

  if (VIZ.mode === 'speech' && VIZ.analyser && VIZ.dataArr) {
    // ── Modo real: análise do AudioContext da voz ──
    VIZ.analyser.getByteFrequencyData(VIZ.dataArr);
    const len = VIZ.dataArr.length;

    for (let i = 0; i < VIZ.NUM; i++) {
      // Mapeia barras para bins de frequência (distribuição logarítmica)
      const t    = i / VIZ.NUM;
      const bin  = Math.floor(Math.pow(t, 1.5) * len * 0.7);
      const raw  = VIZ.dataArr[Math.min(bin, len - 1)] / 255;

      // Boost nas extremidades (graves nas bordas, agudos no meio-extremo)
      let boost = 1;
      if (i < 4 || i > VIZ.NUM - 5) boost = VIZ.bassBoost || 1.2;
      else if (i > VIZ.NUM * 0.6)    boost = VIZ.trebleB   || 1.0;

      const target = 3 + raw * boost * 34;
      VIZ.smoothed[i] = VIZ.smoothed[i] * 0.6 + target * 0.4;
      VIZ.bars[i].style.height = VIZ.smoothed[i].toFixed(1) + 'px';
    }

  } else {
    // ── Modo simulado: ritmo inteligente por gênero ──
    const bps       = (VIZ.beatBPM / 60) * 1000;
    const beatPos   = ((now - VIZ.lastBeat) % bps) / bps; // 0..1 no ciclo da batida
    const onBeat    = beatPos < 0.12; // kick
    const onHalf    = beatPos > 0.48 && beatPos < 0.60; // snare

    const energy    = VIZ.energy || 0.7;
    const bassBoost = VIZ.bassBoost || 1.0;
    const trebleB   = VIZ.trebleB  || 1.0;

    for (let i = 0; i < VIZ.NUM; i++) {
      const t = i / (VIZ.NUM - 1); // 0 = esquerda (graves), 1 = direita (agudos)

      // Envelope de frequência base
      const freqEnv = Math.sin(t * Math.PI) * 0.6 + 0.4;

      // Batida: graves pulsam no kick, agudos no snare
      let beatPulse = 0;
      if (onBeat)  beatPulse = (1 - t) * bassBoost * 0.9; // graves sobem no kick
      if (onHalf)  beatPulse = t * trebleB * 0.6;         // agudos sobem no snare

      // Ruído suave para naturalidade
      const noise = (Math.random() - 0.5) * 0.25;

      const raw    = (freqEnv + beatPulse + noise) * energy;
      const clamped = Math.max(0, Math.min(1, raw));
      const target  = 3 + clamped * 34;

      // Suavização: sobe rápido, cai devagar
      const alpha = target > VIZ.smoothed[i] ? 0.55 : 0.25;
      VIZ.smoothed[i] = VIZ.smoothed[i] * (1 - alpha) + target * alpha;
      VIZ.bars[i].style.height = VIZ.smoothed[i].toFixed(1) + 'px';
    }
  }

  VIZ.frame = requestAnimationFrame(_loop);
}

function _decayToIdle() {
  let alive = false;
  for (let i = 0; i < VIZ.bars.length; i++) {
    VIZ.smoothed[i] = VIZ.smoothed[i] * 0.82;
    VIZ.bars[i].style.height = VIZ.smoothed[i].toFixed(1) + 'px';
    if (VIZ.smoothed[i] > 3.5) alive = true;
  }
  if (alive) VIZ.frame = requestAnimationFrame(_decayToIdle);
  else VIZ.bars.forEach(b => b.style.height = '3px');
}

// ── AudioContext para a voz do DJ ─────────────

function connectSpeechToViz(utterance) {
  try {
    if (!VIZ.ctx) {
      VIZ.ctx      = new (window.AudioContext || window.webkitAudioContext)();
      VIZ.analyser = VIZ.ctx.createAnalyser();
      VIZ.analyser.fftSize = 128;
      VIZ.dataArr  = new Uint8Array(VIZ.analyser.frequencyBinCount);
      VIZ.analyser.connect(VIZ.ctx.destination);
    }
    // Para a voz sintetizada, usamos o nó de mídia do speechSynthesis
    // Nem todos os browsers suportam — fallback para simulação se falhar
    if (VIZ.ctx.state === 'suspended') VIZ.ctx.resume();
  } catch (e) {
    console.warn('AudioContext não disponível para voz:', e.message);
  }
}

// ── Cores dinâmicas por gênero ─────────────────

function updateVizColors(genre) {
  const palettes = {
    'Rock':       ['#f87171', '#fb923c'],
    'Pop':        ['#8b7cf8', '#f472b6'],
    'MPB':        ['#2dd4bf', '#34d399'],
    'Sertanejo':  ['#fbbf24', '#f59e0b'],
    'Hip-Hop':    ['#a78bfa', '#818cf8'],
    'Eletrônica': ['#22d3ee', '#6366f1'],
    'Jazz':       ['#f0abfc', '#e879f9'],
    'Clássico':   ['#fde68a', '#fbbf24'],
    'R&B':        ['#fb7185', '#f43f5e'],
  };
  const [c1, c2] = palettes[genre] || ['#8b7cf8', '#f472b6'];
  document.querySelectorAll('.vbar').forEach((b, i) => {
    const t = i / VIZ.NUM;
    b.style.background = `linear-gradient(180deg, ${c1}, ${c2})`;
    b.style.opacity = 0.7 + t * 0.3;
  });
}
