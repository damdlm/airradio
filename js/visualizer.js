// ════════════════════════════════════════════
// AIR — Rádio Inteligente
// visualizer.js — Barras de áudio suaves
// ════════════════════════════════════════════

const VIZ = {
  bars: [],
  smoothed: [],
  frame: null,
  mode: 'idle', // 'idle' | 'music' | 'speech'
  targets: [],
  NUM: 32,
  tick: 0,
};

// Gera um conjunto de alturas-alvo suaves usando senos sobrepostos
// Simula uma curva de espectro natural: mais energia no meio
function _genTargets() {
  const t   = VIZ.tick * 0.04;
  const out = [];
  for (let i = 0; i < VIZ.NUM; i++) {
    const x    = i / (VIZ.NUM - 1); // 0..1
    // Envelope em arco: pico no centro, suave nas bordas
    const arch = Math.sin(x * Math.PI);
    // Ondas lentas que se deslocam — dão ilusão de movimento real
    const wave =
      Math.sin(x * 6  + t * 1.1) * 0.35 +
      Math.sin(x * 3  - t * 0.7) * 0.30 +
      Math.sin(x * 10 + t * 1.7) * 0.15 +
      Math.sin(x * 1.5 - t * 0.4) * 0.20;
    // Ruído leve para naturalidade
    const noise = (Math.random() - 0.5) * 0.12;
    const raw   = arch * (0.55 + wave * 0.45 + noise);
    out.push(Math.max(0, Math.min(1, raw)));
  }
  return out;
}

// Mesma ideia mas com ondas mais rápidas e concentradas no meio (voz)
function _genSpeechTargets() {
  const t   = VIZ.tick * 0.08;
  const out = [];
  for (let i = 0; i < VIZ.NUM; i++) {
    const x    = i / (VIZ.NUM - 1);
    // Voz: energia concentrada entre 300–3000Hz → terço central das barras
    const voiceEnv = Math.exp(-Math.pow((x - 0.45) * 3.5, 2));
    const wave =
      Math.sin(x * 8  + t * 2.2) * 0.4 +
      Math.sin(x * 5  - t * 1.5) * 0.3 +
      Math.sin(x * 14 + t * 3.1) * 0.15;
    const noise = (Math.random() - 0.5) * 0.18;
    const raw   = voiceEnv * (0.5 + wave * 0.5 + noise);
    out.push(Math.max(0, Math.min(1, raw)));
  }
  return out;
}

function _loop() {
  if (VIZ.mode === 'idle') return;

  VIZ.tick++;
  const MIN_H  = 3;
  const MAX_H  = 36;
  const targets = VIZ.mode === 'speech' ? _genSpeechTargets() : _genTargets();

  for (let i = 0; i < VIZ.NUM; i++) {
    const target = MIN_H + targets[i] * (MAX_H - MIN_H);
    // Sobe rápido, desce devagar — igual a um VU meter real
    const alpha  = target > VIZ.smoothed[i] ? 0.45 : 0.18;
    VIZ.smoothed[i] = VIZ.smoothed[i] * (1 - alpha) + target * alpha;
    VIZ.bars[i].style.height = VIZ.smoothed[i].toFixed(1) + 'px';
  }

  VIZ.frame = requestAnimationFrame(_loop);
}

function _decayToIdle() {
  let alive = false;
  for (let i = 0; i < VIZ.bars.length; i++) {
    VIZ.smoothed[i] = VIZ.smoothed[i] * 0.80;
    VIZ.bars[i].style.height = VIZ.smoothed[i].toFixed(1) + 'px';
    if (VIZ.smoothed[i] > 3.5) alive = true;
  }
  if (alive) VIZ.frame = requestAnimationFrame(_decayToIdle);
  else VIZ.bars.forEach(b => b.style.height = '3px');
}

// Cores mantidas fixas (gradiente roxo→rosa do design original)
function updateVizColors() {
  // Sem mudança de cor por gênero — mantém o visual original
}
