// ════════════════════════════════════════════
// AIR — Rádio Inteligente
// ai.js — Chamadas de IA com rate limiting
// ════════════════════════════════════════════

// ── Rate limiting: 1 chamada por vez, 5s de intervalo ──
let _aiLocked = false;
const _aiQueue = [];

function queueAI(fn) {
  return new Promise((resolve, reject) => {
    _aiQueue.push({ fn, resolve, reject });
    _drainQueue();
  });
}

async function _drainQueue() {
  if (_aiLocked || _aiQueue.length === 0) return;
  _aiLocked = true;
  const { fn, resolve, reject } = _aiQueue.shift();
  try { resolve(await fn()); }
  catch (e) { reject(e); }
  finally {
    await new Promise(r => setTimeout(r, 5000));
    _aiLocked = false;
    _drainQueue();
  }
}

// ── Chaves de API ─────────────────────────────

function loadApiKeys() {
  try {
    const saved = localStorage.getItem('air_api_keys');
    if (saved) S.apiKeys = JSON.parse(saved);
    const prov = localStorage.getItem('air_ai_provider');
    if (prov) S.aiProvider = prov;
  } catch { }
  fillApiFields();
}

function fillApiFields() {
  const fa = document.getElementById('key-anthropic');
  const fg = document.getElementById('key-google');
  const fo = document.getElementById('key-openai');
  const fd = document.getElementById('key-deepseek');
  const fp = document.getElementById('ai-provider');
  if (fa) fa.value = S.apiKeys.anthropic || '';
  if (fg) fg.value = S.apiKeys.google    || '';
  if (fo) fo.value = S.apiKeys.openai    || '';
  if (fd) fd.value = S.apiKeys.deepseek  || '';
  if (fp) fp.value = S.aiProvider;
}

function saveApiKeys() {
  S.apiKeys = {
    anthropic: document.getElementById('key-anthropic').value.trim(),
    google:    document.getElementById('key-google').value.trim(),
    openai:    document.getElementById('key-openai').value.trim(),
    deepseek:  document.getElementById('key-deepseek').value.trim(),
  };
  S.aiProvider = document.getElementById('ai-provider').value;
  localStorage.setItem('air_api_keys', JSON.stringify(S.apiKeys));
  localStorage.setItem('air_ai_provider', S.aiProvider);
  toast('💾 Chaves salvas! IAs prontas.');
}

// ── Chamadas de API ───────────────────────────

async function callClaude(prompt) {
  if (!S.apiKeys.anthropic) throw new Error('Chave Anthropic não configurada');
  const res = await fetch('/proxy/anthropic', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': S.apiKeys.anthropic },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001', max_tokens: 300,
      system: 'Você é DJ de rádio brasileiro, descontraído, máximo 3 frases.',
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.content[0].text;
}

async function callGemini(prompt) {
  if (!S.apiKeys.google) throw new Error('Chave Google não configurada');
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${S.apiKeys.google}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.candidates[0].content.parts[0].text;
}

async function callChatGPT(prompt) {
  if (!S.apiKeys.openai) throw new Error('Chave OpenAI não configurada');
  const res = await fetch('/proxy/openai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${S.apiKeys.openai}` },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo', max_tokens: 150,
      messages: [
        { role: 'system', content: 'Você é DJ brasileiro, alegre, máximo 40 palavras.' },
        { role: 'user',   content: prompt },
      ],
    }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.choices[0].message.content;
}

async function callDeepSeek(prompt) {
  if (!S.apiKeys.deepseek) throw new Error('Chave DeepSeek não configurada');
  const res = await fetch('/proxy/deepseek', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${S.apiKeys.deepseek}` },
    body: JSON.stringify({
      model: 'deepseek-chat', max_tokens: 150,
      messages: [
        { role: 'system', content: 'Você é DJ brasileiro animado, máximo 3 frases.' },
        { role: 'user',   content: prompt },
      ],
    }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.choices[0].message.content;
}

// Tenta cada IA em sequência (não em paralelo) para evitar 429
async function getMultiAIComment(prompt) {
  return queueAI(async () => {
    const prov = S.aiProvider;
    const keys = S.apiKeys;

    // Provedor específico selecionado
    if (prov === 'anthropic' && keys.anthropic) return await callClaude(prompt);
    if (prov === 'google'    && keys.google)    return await callGemini(prompt);
    if (prov === 'openai'    && keys.openai)    return await callChatGPT(prompt);
    if (prov === 'deepseek'  && keys.deepseek)  return await callDeepSeek(prompt);

    // Modo auto: tenta cada uma EM SEQUÊNCIA (não paralelo) até uma funcionar
    if (prov === 'auto') {
      const providers = [];
      if (keys.google)    providers.push(() => callGemini(prompt));
      if (keys.anthropic) providers.push(() => callClaude(prompt));
      if (keys.openai)    providers.push(() => callChatGPT(prompt));
      if (keys.deepseek)  providers.push(() => callDeepSeek(prompt));
      if (providers.length === 0) throw new Error('Nenhuma chave de IA configurada');

      for (const fn of providers) {
        try { return await fn(); } catch (e) { console.warn('IA falhou, tentando próxima:', e.message); }
      }
      throw new Error('Todas as IAs falharam');
    }

    throw new Error('Nenhuma IA selecionada ou chave configurada');
  });
}

// ── Comentários do DJ ─────────────────────────

async function generateTransitionComment(prevTrack, nextTrack) {
  const userName = S.user?.name?.split(' ')[0] || 'ouvinte';
  const clima    = S.weather ? `${S.weather.temp}°C, ${S.weather.desc}` : 'clima agradável';
  const trafego  = S.traffic?.l || 'trânsito normal';
  return await getMultiAIComment(
    `Comente como DJ animado de rádio brasileira (AIR). Tocou "${prevTrack.title}" de ${prevTrack.artist}. Agora: "${nextTrack.title}" de ${nextTrack.artist} (${nextTrack.genre}). Clima: ${clima}. Trânsito: ${trafego}. Saudação para ${userName}. Máximo 3 frases.`
  );
}

async function announceTrack(track) {
  if (!track) return;
  const userName = S.user?.name?.split(' ')[0] || 'ouvinte';
  const clima    = S.weather ? `${S.weather.temp}°C, ${S.weather.desc}` : 'clima agradável';
  try {
    const text = await getMultiAIComment(
      `DJ da rádio AIR. Tocando "${track.title}" de ${track.artist} (${track.genre}, ${track.year}). Curiosidade sobre artista, clima ${clima}, abraço para ${userName}. Máximo 3 frases.`
    );
    if (text) addBubble(text, track, false);
  } catch {
    addBubble(`🎤 Tocando "${track.title}" de ${track.artist}! ❤️`, track, false);
  }
}

async function aiAbout() {
  if (!S.cur) { toast('Nenhuma música tocando'); return; }
  switchFeed('ai', document.querySelectorAll('.ftab')[1]);
  showTyping();
  try {
    const text = await getMultiAIComment(
      `Curiosidade fascinante sobre "${S.cur.title}" de ${S.cur.artist} — bastidores, impacto cultural. Seja entusiasmado! Máximo 3 frases.`
    );
    hideTyping();
    addBubble(text, S.cur);
  } catch (e) {
    hideTyping();
    addBubble(`📡 Erro: ${e.message}`, S.cur);
  }
}

async function sendMotivationalMessage() {
  if (!S.user || !S.playing) return;
  const userName = S.user.name?.split(' ')[0] || 'amigo';
  const hoje     = new Date().toLocaleDateString('pt-BR', { weekday: 'long' });
  try {
    const text = await getMultiAIComment(
      `Mensagem motivacional (2 frases) para ${userName}. Dia: ${hoje}. Clima: ${S.weather?.desc || 'agradável'}. Tom positivo.`
    );
    if (text) addBubble(text, null, false, '💪 Motivação');
  } catch { }
}

function startMotivationScheduler() {
  clearInterval(S.motivTimer);
  S.motivTimer = setInterval(() => {
    if (S.playing && S.user) sendMotivationalMessage();
  }, 300000); // 5 minutos
}

function scheduleAnnounce() {
  setTimeout(async () => {
    if (S.cur && S.playing) await announceTrack(S.cur);
    scheduleAnnounce();
  }, 60000 + Math.random() * 90000); // 1-2.5 min
}

// ── Bubbles e Chat ────────────────────────────

let typEl = null;

function showTyping(pre = true) {
  hideTyping();
  typEl = document.createElement('div');
  typEl.className = 'aibub';
  typEl.id = 'typ-el';
  typEl.innerHTML = `
    <div class="ai-hdr">
      <div class="ai-ico">🎙️</div>
      <span class="ai-badge">DJ AIR</span>
    </div>
    <div class="typing">
      <div class="tyd"></div><div class="tyd"></div><div class="tyd"></div>
    </div>`;
  const m = document.getElementById('aimsgs');
  pre ? m.insertBefore(typEl, m.firstChild) : m.appendChild(typEl);
}

function hideTyping() {
  const e = document.getElementById('typ-el');
  if (e) e.remove();
  typEl = null;
}

function addBubble(text, track, prepend = false, customTitle = null) {
  const aimsg = document.getElementById('aimsgs');
  if (!aimsg) return;
  const n  = new Date();
  const el = document.createElement('div');
  el.className = 'aibub';
  const title = customTitle
    ? `<span class="ai-badge">${escHtml(customTitle)}</span>`
    : `<div class="ai-ico">🎙️</div><span class="ai-badge">DJ AIR</span>${track ? `<span class="ai-tr"> · ${escHtml(track.title)}</span>` : ''}`;
  el.innerHTML = `
    <div class="ai-hdr">
      ${title}
      <span class="ai-tm">${String(n.getHours()).padStart(2,'0')}:${String(n.getMinutes()).padStart(2,'0')}</span>
    </div>
    <div class="ai-txt">${escHtml(text)}</div>`;
  prepend ? aimsg.insertBefore(el, aimsg.firstChild) : aimsg.appendChild(el);
  aimsg.scrollTop = aimsg.scrollHeight;
}

async function sendChat() {
  const inp = document.getElementById('chat-inp');
  const msg = inp.value.trim();
  if (!msg) return;
  inp.value = '';

  const btn = document.getElementById('chat-send');
  btn.disabled = true;

  const ub = document.createElement('div');
  ub.className = 'ubub';
  ub.innerHTML = `<strong>Você:</strong> ${escHtml(msg)}`;
  document.getElementById('aimsgs').appendChild(ub);

  S.chatHistory.push({ role: 'user', content: msg });
  if (S.chatHistory.length > 24) S.chatHistory = S.chatHistory.slice(-24);

  showTyping(false);
  try {
    const system = `Você é DJ da rádio AIR. Amigo animado, português brasileiro, máximo 3 frases. Clima: ${S.weather?.desc || '?'}. Música: ${S.cur?.title || 'nenhuma'}.`;
    const text   = await getMultiAIComment(system + '\n\nUsuário: ' + msg);
    S.chatHistory.push({ role: 'assistant', content: text });
    hideTyping();
    addBubble(text, null, false);
  } catch (e) {
    hideTyping();
    addBubble(`📡 Erro: ${e.message}`, null, false);
  }
  btn.disabled = false;
  document.getElementById('aimsgs').scrollTop = 999999;
}

function switchFeed(t, el) {
  ['queue', 'ai', 'prefs'].forEach(x => {
    document.getElementById('f-' + x).style.display = x === t ? 'block' : 'none';
  });
  document.querySelectorAll('.ftab').forEach(x => x.classList.remove('on'));
  if (el) el.classList.add('on');
  if (t === 'prefs') { renderPrefs(); fillApiFields(); }
}
