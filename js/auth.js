// ════════════════════════════════════════════
// AIR — Rádio Inteligente
// auth.js — Autenticação e usuários
// ════════════════════════════════════════════

let selG = [];

function switchTab(t, el) {
  document.querySelectorAll('.tab').forEach(x => x.classList.remove('on'));
  el.classList.add('on');
  document.getElementById('frm-login').style.display = t === 'login' ? 'block' : 'none';
  document.getElementById('frm-reg').style.display   = t === 'reg'   ? 'block' : 'none';
}

function toggleG(el) {
  const g = el.dataset.g;
  if (selG.includes(g)) {
    selG = selG.filter(x => x !== g);
    el.classList.remove('on');
  } else {
    selG.push(g);
    el.classList.add('on');
  }
}

function getUsers() {
  try {
    return JSON.parse(localStorage.getItem('air5_users') || '{}');
  } catch {
    return {};
  }
}

function saveUsers(u) {
  localStorage.setItem('air5_users', JSON.stringify(u));
}

function doLogin() {
  const email = document.getElementById('l-email').value.trim();
  const pass  = document.getElementById('l-pass').value;
  if (!email || !pass) { toast('⚠️ Preencha todos os campos'); return; }

  let u = getUsers();
  // Cria conta demo se não existir
  if (!u[email]) {
    u[email] = {
      name: 'Demo', pass: '123456',
      genres: ['Rock', 'Pop', 'MPB'],
      prefs: { Rock: 72, Pop: 65, MPB: 48, Sertanejo: 22 },
      liked: [], history: []
    };
    saveUsers(u);
  }

  // Verifica senha (exceto conta demo recém-criada)
  if (u[email].pass !== pass && !(email === 'demo@air.fm' && pass === '123456')) {
    toast('❌ Senha incorreta');
    return;
  }

  S.user  = { email, ...u[email] };
  S.liked = [...(u[email].liked || [])];
  S.prefs = { ...(u[email].prefs || {}) };
  enterApp();
}

function doRegister() {
  const name  = document.getElementById('r-name').value.trim();
  const email = document.getElementById('r-email').value.trim();
  const pass  = document.getElementById('r-pass').value;

  if (!name || !email || !pass) { toast('⚠️ Preencha tudo'); return; }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { toast('⚠️ E-mail inválido'); return; }
  if (pass.length < 4) { toast('⚠️ Senha deve ter ao menos 4 caracteres'); return; }
  if (selG.length < 1) { toast('⚠️ Escolha ao menos 1 gênero'); return; }

  const u = getUsers();
  if (u[email]) { toast('⚠️ E-mail já cadastrado'); return; }

  const prefs = {};
  selG.forEach(g => { prefs[g] = 40 + Math.floor(Math.random() * 30); });

  u[email] = { name, pass, genres: selG, prefs, liked: [], history: [] };
  saveUsers(u);

  S.user  = { email, name, genres: selG, prefs, liked: [], history: [] };
  S.liked = [];
  S.prefs = { ...prefs };
  enterApp();
}

function logout() {
  persistUser();
  stopSim();
  animViz(false);
  clearInterval(S.motivTimer);

  S.user    = null;
  S.playing = false;
  S.chatHistory = [];
  S.cur     = null;
  S.transitionInProgress = false;

  document.getElementById('app').classList.remove('on');
  document.getElementById('auth').classList.remove('gone');
  // Limpa iframe para parar vídeo/áudio
  document.getElementById('yt-iframe').src = '';
  toast('👋 Até logo!');
}

function persistUser() {
  if (!S.user) return;
  const u = getUsers();
  if (u[S.user.email]) {
    u[S.user.email].liked = S.liked;
    u[S.user.email].prefs = S.prefs;
    saveUsers(u);
  }
}