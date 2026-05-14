// ════════════════════════════════════════════
// AIR — Rádio Inteligente
// ai.js — 7 provedores de IA + DJ Falado
// ════════════════════════════════════════════

// ── Rate limiting: 1 chamada por vez, 4s de intervalo ──
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
    await new Promise(r => setTimeout(r, 4000));
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
  ['anthropic','google','openai','deepseek','groq','cohere','mistral'].forEach(id => {
    const el = document.getElementById('key-' + id);
    if (el) el.value = S.apiKeys[id] || '';
  });
  const fp = document.getElementById('ai-provider');
  if (fp) fp.value = S.aiProvider;
}

function saveApiKeys() {
  ['anthropic','google','openai','deepseek','groq','cohere','mistral'].forEach(id => {
    const el = document.getElementById('key-' + id);
    if (el) S.apiKeys[id] = el.value.trim();
  });
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
      model: 'claude-haiku-4-5-20251001', max_tokens: 150,
      system: 'Você é DJ de rádio brasileiro. Respostas CURTAS, máximo 2 frases, para serem faladas em voz. Sem emojis.',
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
      model: 'gpt-3.5-turbo', max_tokens: 100,
      messages: [
        { role: 'system', content: 'DJ de rádio brasileiro. CURTO, máximo 2 frases. Sem emojis.' },
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
      model: 'deepseek-chat', max_tokens: 100,
      messages: [
        { role: 'system', content: 'DJ de rádio brasileiro. CURTO, máximo 2 frases. Sem emojis.' },
        { role: 'user',   content: prompt },
      ],
    }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.choices[0].message.content;
}

async function callGroq(prompt) {
  if (!S.apiKeys.groq) throw new Error('Chave Groq não configurada');
  const res = await fetch('/proxy/groq', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${S.apiKeys.groq}` },
    body: JSON.stringify({
      model: 'llama-3.1-8b-instant', max_tokens: 120,
      messages: [
        { role: 'system', content: 'Você é DJ de rádio brasileiro. Respostas CURTAS (máximo 2 frases), diretas, para serem faladas em voz alta. Sem emojis. Em português brasileiro.' },
        { role: 'user',   content: prompt },
      ],
    }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.choices[0].message.content;
}

async function callCohere(prompt) {
  if (!S.apiKeys.cohere) throw new Error('Chave Cohere não configurada');
  const res = await fetch('/proxy/cohere', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${S.apiKeys.cohere}` },
    body: JSON.stringify({
      model: 'command-r',
      messages: [
        { role: 'system', content: 'DJ de rádio brasileiro. CURTO, máximo 2 frases, sem emojis.' },
        { role: 'user',   content: prompt },
      ],
    }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));
  return data.message?.content?.[0]?.text || data.text;
}

async function callMistral(prompt) {
  if (!S.apiKeys.mistral) throw new Error('Chave Mistral não configurada');
  const res = await fetch('/proxy/mistral', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${S.apiKeys.mistral}` },
    body: JSON.stringify({
      model: 'mistral-small-latest', max_tokens: 120,
      messages: [
        { role: 'system', content: 'DJ de rádio brasileiro. CURTO, máximo 2 frases, sem emojis.' },
        { role: 'user',   content: prompt },
      ],
    }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.choices[0].message.content;
}

// ── Orquestrador ──────────────────────────────

const PROVIDER_FNS = {
  anthropic: callClaude,
  google:    callGemini,
  openai:    callChatGPT,
  deepseek:  callDeepSeek,
  groq:      callGroq,
  cohere:    callCohere,
  mistral:   callMistral,
};

async function getMultiAIComment(prompt) {
  return queueAI(async () => {
    const prov = S.aiProvider;
    const keys = S.apiKeys;

    if (prov !== 'auto') {
      const fn = PROVIDER_FNS[prov];
      if (!fn || !keys[prov]) throw new Error(`Chave ${prov} não configurada`);
      return await fn(prompt);
    }

    const order = ['groq','mistral','cohere','google','anthropic','openai','deepseek'];
    const available = order.filter(p => keys[p]);
    if (available.length === 0) throw new Error('Nenhuma chave de IA configurada');

    for (const p of available) {
      try { return await PROVIDER_FNS[p](prompt); }
      catch (e) { console.warn(`[${p}] falhou:`, e.message); }
    }
    throw new Error('Todas as IAs falharam');
  });
}

// ── Tipos de comentário aleatório do DJ ───────

const DJ_TOPICS = [
  'musica',      // sobre a música tocando
  'banda',       // sobre a banda/artista
  'composicao',  // curiosidade de composição
  'piada',       // piada musical
  'tempo',       // clima na região
  'hora',        // hora e saudação
  'noticia',     // notícia relevante
  'motivacao',   // frase motivacional
];

function _randomTopic() {
  return DJ_TOPICS[Math.floor(Math.random() * DJ_TOPICS.length)];
}

function _buildPrompt(topic, track) {
  const t    = track ? `"${track.title}" de ${track.artist} (${track.genre}, ${track.year})` : 'a rádio AIR';
  const hora = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const dia  = new Date().toLocaleDateString('pt-BR', { weekday: 'long' });
  const clima = S.weather ? `${S.weather.temp}°C e ${S.weather.desc} em ${document.getElementById('wcity')?.textContent || 'sua cidade'}` : 'clima agradável';
  const nome = S.user?.name?.split(' ')[0] || 'ouvinte';

  const prompts = {
    musica:     `Fale UMA curiosidade rápida e surpreendente sobre ${t}. Máximo 2 frases curtas, em português brasileiro, como se fosse ao vivo no rádio. Sem emojis.`,
    banda:      `Fale UMA curiosidade fascinante sobre o artista ${track?.artist || 'desta música'}. Máximo 2 frases curtas, em português brasileiro, tom de rádio ao vivo. Sem emojis.`,
    composicao: `Fale algo curioso sobre como ${t} foi composta ou gravada. Máximo 2 frases, em português, tom de rádio. Sem emojis.`,
    piada:      `Conte UMA piada curta e leve relacionada a música ou ao artista ${track?.artist || ''}. Máximo 2 frases, em português. Sem emojis.`,
    tempo:      `Como DJ de rádio, mencione o clima atual (${clima}) de forma descontraída. 1 frase curta. Sem emojis.`,
    hora:       `Como DJ de rádio, informe que são ${hora} de ${dia} e faça uma saudação curta para ${nome}. 1 frase. Sem emojis.`,
    noticia:    `Invente UMA notícia curiosa ou interessante sobre o mundo da música, tecnologia ou esporte de hoje. Máximo 2 frases, em português. Sem emojis.`,
    motivacao:  `Fale uma frase motivacional curta e animada para ${nome} que está ouvindo música agora. 1 frase. Sem emojis.`,
  };

  return prompts[topic] || prompts.musica;
}

// ── DJ automático entre músicas ───────────────

let _djIntervalTimer = null;
let _djIntervalMs = 45000; // 45s padrão

function startDJScheduler() {
  stopDJScheduler();
  _scheduleDJ();
}

function stopDJScheduler() {
  clearTimeout(_djIntervalTimer);
  _djIntervalTimer = null;
}

function setDJInterval(seconds) {
  _djIntervalMs = parseInt(seconds) * 1000;
  localStorage.setItem('air_dj_interval', seconds);
  document.getElementById('dj-interval-val').textContent = seconds + 's';
  // Reinicia com novo intervalo
  if (S.playing) startDJScheduler();
}

function _scheduleDJ() {
  const jitter = _djIntervalMs + (Math.random() * 15000 - 7500); // ±7.5s aleatório
  _djIntervalTimer = setTimeout(async () => {
    if (S.playing && S.user && S.cur) {
      await _fireDJComment();
    }
    _scheduleDJ(); // agenda próximo
  }, jitter);
}

async function _fireDJComment() {
  const topic = _randomTopic();
  try {
    const text = await getMultiAIComment(_buildPrompt(topic, S.cur));
    if (!text) return;
    // Mostra na bolha do chat
    addBubble(text, topic === 'musica' || topic === 'banda' || topic === 'composicao' ? S.cur : null, false, _topicLabel(topic));
    // Fala em voz
    speak(text);
  } catch (e) {
    console.warn('DJ comment falhou:', e.message);
  }
}

function _topicLabel(topic) {
  const labels = {
    musica: '🎵 DJ — Sobre a Música',
    banda: '🎸 DJ — Sobre o Artista',
    composicao: '🎼 DJ — Curiosidade',
    piada: '😄 DJ — Piada',
    tempo: '🌤 DJ — Clima',
    hora: '🕐 DJ — Horário',
    noticia: '📰 DJ — Notícia',
    motivacao: '💪 DJ — Motivação',
  };
  return labels[topic] || '🎙️ DJ AIR';
}

// ── Transição entre músicas ───────────────────

async function generateTransitionComment(prevTrack, nextTrack) {
  const nome  = S.user?.name?.split(' ')[0] || 'ouvinte';
  const clima = S.weather ? `${S.weather.temp}°C, ${S.weather.desc}` : '';
  const prompt = `DJ de rádio ao vivo. Acabou "${prevTrack.title}" de ${prevTrack.artist}. Próxima: "${nextTrack.title}" de ${nextTrack.artist}. ${clima ? 'Clima: ' + clima + '.' : ''} Faça uma passagem animada, mencione ${nome}. Máximo 2 frases, sem emojis, português brasileiro.`;
  return await getMultiAIComment(prompt);
}

async function announceTrack(track) {
  if (!track) return;
  try {
    const text = await getMultiAIComment(_buildPrompt('musica', track));
    if (text) { addBubble(text, track, false, '🎵 DJ — Sobre a Música'); speak(text); }
  } catch {
    // silencioso
  }
}

async function aiAbout() {
  if (!S.cur) { toast('Nenhuma música tocando'); return; }
  switchFeed('ai', document.querySelectorAll('.ftab')[1]);
  showTyping();
  try {
    const text = await getMultiAIComment(_buildPrompt('musica', S.cur));
    hideTyping();
    addBubble(text, S.cur, false, '🎵 DJ — Sobre a Música');
    speak(text);
  } catch (e) {
    hideTyping();
    addBubble(`Erro: ${e.message}`, S.cur);
  }
}

// ── Agendadores legados (mantidos) ────────────

function startMotivationScheduler() {
  // Agora tudo vai pelo DJ scheduler
}

function scheduleAnnounce() {
  // Agora tudo vai pelo DJ scheduler
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

  showTyping(false);
  try {
    const system = `DJ da rádio AIR. Amigo animado, português brasileiro, máximo 2 frases, sem emojis. Clima: ${S.weather?.desc || '?'}. Música: ${S.cur?.title || 'nenhuma'}.`;
    const text   = await getMultiAIComment(system + '\nOuvinte disse: ' + msg);
    hideTyping();
    addBubble(text, null, false);
    speak(text);
  } catch (e) {
    hideTyping();
    addBubble(`Erro: ${e.message}`, null, false);
  }
  btn.disabled = false;
}

function switchFeed(t, el) {
  ['queue', 'ai', 'prefs'].forEach(x => {
    document.getElementById('f-' + x).style.display = x === t ? 'block' : 'none';
  });
  document.querySelectorAll('.ftab').forEach(x => x.classList.remove('on'));
  if (el) el.classList.add('on');
  if (t === 'prefs') { renderPrefs(); fillApiFields(); }
}
