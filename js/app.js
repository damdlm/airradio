// ════════════════════════════════════════════
// AIR — Rádio Inteligente
// app.js — Inicialização, toast, visualizer, utilitários
// ════════════════════════════════════════════

// ── Utilitários ───────────────────────────────

/** Escapa HTML para evitar XSS ao inserir conteúdo dinâmico */
function escHtml(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ── Toast ─────────────────────────────────────

function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('show'), 3300);
}

// ── Waveform Visualizer ───────────────────────

function buildViz() {
  const el = document.getElementById('visualizer');
  el.innerHTML = '';
  for (let i = 0; i < 32; i++) {
    const b = document.createElement('div');
    b.className = 'vbar';
    b.style.height = '3px';
    el.appendChild(b);
  }
}

function animViz(on) {
  clearInterval(S.vizTimer);
  const bars = document.querySelectorAll('.vbar');
  if (!on) {
    bars.forEach(b => b.style.height = '3px');
    return;
  }
  S.vizTimer = setInterval(() => {
    bars.forEach(b => {
      const h = 3 + Math.random() * 34;
      b.style.height = h + 'px';
    });
  }, 120);
}

// ── Status bar ────────────────────────────────

function setStatus(msg, type = 'info') {
  const b = document.getElementById('sbar');
  b.textContent = msg;
  b.className   = 'sbar ' + type;
}

// ── App init ──────────────────────────────────

function enterApp() {
  document.getElementById('auth').classList.add('gone');
  document.getElementById('app').classList.add('on');

  const n = S.user.name || S.user.email.split('@')[0];
  document.getElementById('tav').textContent  = n[0].toUpperCase();
  document.getElementById('tname').textContent = n;

  buildViz();
  buildQueue();
  renderQueue();
  renderPrefs();
  initLocation();
  startClock();
  scheduleAnnounce();
  startMotivationScheduler();

  setStatus(`Olá, ${n}! Clique ▶ em qualquer música para começar.`, 'info');
  updateNP(S.queue[0]);
  toast(`🎵 Bem-vindo(a), ${n}!`);
}

// ── Bootstrap ─────────────────────────────────

// Salva automaticamente a cada minuto
setInterval(persistUser, 60000);

// Carrega chaves salvas (elementos já existem no DOM)
document.addEventListener('DOMContentLoaded', () => {
  loadApiKeys();
});