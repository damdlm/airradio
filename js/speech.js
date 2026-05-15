// ════════════════════════════════════════════
// AIR — Rádio Inteligente
// speech.js — DJ Falado com vozes naturais
// Suporta: Web Speech API + ElevenLabs
// ════════════════════════════════════════════

const SPEECH = {
  enabled: false,
  engine: 'browser',   // 'browser' | 'elevenlabs'
  voice: null,
  voices: [],
  rate: 0.95,
  pitch: 1.0,
  volume: 1.0,
  speaking: false,
  queue: [],
  synth: window.speechSynthesis,

  // ElevenLabs
  elVoiceId: 'pNInz6obpgDQGcFmaJgB', // "Adam" padrão
  elApiKey: '',

  // Vozes ElevenLabs pré-definidas
  elVoices: [
    { id: 'pNInz6obpgDQGcFmaJgB', name: '👨 Adam — Masculino (EN/PT)',      gender: 'm' },
    { id: 'EXAVITQu4vr4xnSDxMaL', name: '👩 Bella — Feminino suave (EN/PT)', gender: 'f' },
    { id: 'ErXwobaYiN019PkySvjV', name: '👨 Antoni — Masculino jovem',        gender: 'm' },
    { id: 'MF3mGyEYCl7XYWbV9V6O', name: '👩 Elli — Feminino energético',      gender: 'f' },
    { id: 'TxGEqnHWrfWFTfGW9XjX', name: '👨 Josh — Masculino grave',          gender: 'm' },
    { id: 'VR6AewLTigWG4xSOukaG', name: '👨 Arnold — Masculino robusto',      gender: 'm' },
    { id: 'pqHfZKP75CvOlQylNhV4', name: '👩 Bill — Feminino casual',          gender: 'f' },
    { id: 'onwK4e9ZLuTAKqWW03F9', name: '👩 Rachel — Feminino profissional',  gender: 'f' },
  ],
};

// ── Init ──────────────────────────────────────

function initSpeech() {
  // Carrega preferências
  try {
    const saved = localStorage.getItem('air_speech_prefs');
    if (saved) {
      const p = JSON.parse(saved);
      Object.assign(SPEECH, p);
    }
  } catch {}

  // Aplica nos elementos
  _applyPrefsToUI();

  // Carrega vozes do browser
  if (window.speechSynthesis) {
    const load = () => {
      SPEECH.voices = window.speechSynthesis.getVoices();
      renderVoiceSelect();
      _restoreBrowserVoice();
    };
    if (window.speechSynthesis.getVoices().length) load();
    window.speechSynthesis.onvoiceschanged = load;
  }

  // Popula seletor ElevenLabs
  _renderElVoices();
}

function _applyPrefsToUI() {
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };
  const setC = (id, val) => { const el = document.getElementById(id); if (el) el.checked = val; };
  const setT = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };

  setC('speech-toggle', SPEECH.enabled);
  set('speech-rate', SPEECH.rate);
  setT('rate-val', parseFloat(SPEECH.rate).toFixed(2));
  set('speech-pitch', SPEECH.pitch);
  setT('pitch-val', parseFloat(SPEECH.pitch).toFixed(2));
  set('speech-engine', SPEECH.engine);
  set('el-api-key', SPEECH.elApiKey || '');
  set('el-voice-select', SPEECH.elVoiceId);

  const savedInterval = localStorage.getItem('air_dj_interval');
  if (savedInterval) {
    set('dj-interval', savedInterval);
    setT('dj-interval-val', savedInterval + 's');
  }
  _toggleEngineUI(SPEECH.engine);
}

function _savePrefs() {
  const toSave = {
    enabled: SPEECH.enabled,
    engine: SPEECH.engine,
    rate: SPEECH.rate,
    pitch: SPEECH.pitch,
    elVoiceId: SPEECH.elVoiceId,
    elApiKey: SPEECH.elApiKey,
  };
  // Salva nome da voz do browser separado (não serializa objeto Voice)
  if (SPEECH.voice) localStorage.setItem('air_voice', SPEECH.voice.name);
  localStorage.setItem('air_speech_prefs', JSON.stringify(toSave));
}

// ── Seletor de Vozes do Browser ───────────────

function renderVoiceSelect() {
  const sel = document.getElementById('voice-select');
  if (!sel) return;

  const ptBR  = SPEECH.voices.filter(v => v.lang === 'pt-BR');
  const ptPT  = SPEECH.voices.filter(v => v.lang === 'pt-PT');
  const ptOth = SPEECH.voices.filter(v => v.lang.startsWith('pt') && !['pt-BR','pt-PT'].includes(v.lang));
  const outros = SPEECH.voices.filter(v => !v.lang.startsWith('pt'));

  let html = '';

  const grp = (label, voices) => {
    if (!voices.length) return '';
    let g = `<optgroup label="${label}">`;
    voices.forEach(v => {
      const local = v.localService ? ' ✓' : '';
      g += `<option value="${escHtml(v.name)}">${escHtml(v.name)}${local}</option>`;
    });
    return g + '</optgroup>';
  };

  html += grp('🇧🇷 Português Brasil', ptBR);
  html += grp('🇵🇹 Português Portugal', ptPT);
  html += grp('🌐 Português (outros)', ptOth);

  // Outros idiomas agrupados
  const byLang = {};
  outros.forEach(v => {
    const l = v.lang.split('-')[0].toUpperCase();
    if (!byLang[l]) byLang[l] = [];
    byLang[l].push(v);
  });
  Object.keys(byLang).sort().forEach(lang => {
    html += grp(`🔤 ${lang}`, byLang[lang]);
  });

  sel.innerHTML = html || '<option>Nenhuma voz disponível</option>';
  _restoreBrowserVoice();
}

function _restoreBrowserVoice() {
  const saved = localStorage.getItem('air_voice');
  if (saved) {
    const v = SPEECH.voices.find(x => x.name === saved);
    if (v) SPEECH.voice = v;
  }
  if (!SPEECH.voice) {
    SPEECH.voice =
      SPEECH.voices.find(v => v.lang === 'pt-BR') ||
      SPEECH.voices.find(v => v.lang.startsWith('pt')) ||
      SPEECH.voices[0] || null;
  }
  const sel = document.getElementById('voice-select');
  if (sel && SPEECH.voice) sel.value = SPEECH.voice.name;
}

function _renderElVoices() {
  const sel = document.getElementById('el-voice-select');
  if (!sel) return;
  sel.innerHTML = SPEECH.elVoices.map(v =>
    `<option value="${v.id}">${v.name}</option>`
  ).join('');
  sel.value = SPEECH.elVoiceId;
}

// ── Controles UI ──────────────────────────────

function setVoice(name) {
  const v = SPEECH.voices.find(v => v.name === name);
  if (v) {
    SPEECH.voice = v;
    _savePrefs();
    // Mini preview automático
    _browserSpeak('AIR Rádio. Com você!', true);
  }
}

function setElVoice(id) {
  SPEECH.elVoiceId = id;
  _savePrefs();
}

function setEngine(engine) {
  SPEECH.engine = engine;
  _toggleEngineUI(engine);
  _savePrefs();
}

function _toggleEngineUI(engine) {
  const brow = document.getElementById('browser-voice-section');
  const el   = document.getElementById('el-voice-section');
  if (brow) brow.style.display = engine === 'browser' ? 'block' : 'none';
  if (el)   el.style.display   = engine === 'elevenlabs' ? 'block' : 'none';
}

function saveElKey() {
  const el = document.getElementById('el-api-key');
  if (el) {
    SPEECH.elApiKey = el.value.trim();
    _savePrefs();
    toast('🔑 Chave ElevenLabs salva!');
  }
}

function setSpeechRate(v) {
  SPEECH.rate = parseFloat(v);
  const lbl = document.getElementById('rate-val');
  if (lbl) lbl.textContent = parseFloat(v).toFixed(2);
  _savePrefs();
}

function setSpeechPitch(v) {
  SPEECH.pitch = parseFloat(v);
  const lbl = document.getElementById('pitch-val');
  if (lbl) lbl.textContent = parseFloat(v).toFixed(2);
  _savePrefs();
}

function toggleSpeech(el) {
  SPEECH.enabled = el.checked;
  if (!SPEECH.enabled) stopSpeech();
  _savePrefs();
  toast(SPEECH.enabled ? '🔊 DJ vai falar!' : '🔇 DJ no mudo');
}

// ── Naturalidade do texto ─────────────────────

function _addNaturalPauses(text) {
  return text
    // Vírgulas e pontos viram pausas naturais (SSML não suportado pela API nativa,
    // mas podemos ajustar quebrando em pedaços)
    .replace(/\. /g, '.  ')      // pausa após ponto
    .replace(/, /g, ',  ')       // pausa após vírgula
    .replace(/! /g, '!  ')
    .replace(/\? /g, '?  ')
    // Remove markdown
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/`(.*?)`/g, '$1')
    // Remove emojis
    .replace(/[\u{1F300}-\u{1FFFF}]/gu, '')
    .replace(/[\u{2600}-\u{27BF}]/gu, '')
    .replace(/[*_~#|>]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// ── Falar ─────────────────────────────────────

function speak(text, priority = false) {
  if (!SPEECH.enabled || !text) return;
  const clean = _addNaturalPauses(text);
  if (!clean) return;

  if (priority) {
    stopSpeech();
    SPEECH.queue = [clean];
  } else {
    SPEECH.queue.push(clean);
  }
  if (!SPEECH.speaking) _nextSpeak();
}

async function _nextSpeak() {
  if (SPEECH.queue.length === 0) { SPEECH.speaking = false; return; }
  const text = SPEECH.queue.shift();
  SPEECH.speaking = true;
  _muteYT(true);
  if (S.playing) animViz(true, 'speech');

  try {
    if (SPEECH.engine === 'elevenlabs' && SPEECH.elApiKey) {
      await _elSpeak(text);
    } else {
      await _browserSpeak(text);
    }
  } catch (e) {
    console.warn('Erro na fala:', e.message);
    // Fallback para browser se ElevenLabs falhar
    try { await _browserSpeak(text); } catch {}
  }

  SPEECH.speaking = false;
  _muteYT(false);
  if (S.playing) animViz(true, 'music');
  setTimeout(_nextSpeak, 500);
}

// ── Browser Speech ────────────────────────────

function _browserSpeak(text, preview = false) {
  return new Promise((resolve) => {
    if (!window.speechSynthesis) { resolve(); return; }
    window.speechSynthesis.cancel();

    const utt     = new SpeechSynthesisUtterance(text);
    utt.voice     = SPEECH.voice;
    utt.rate      = preview ? 1.0 : SPEECH.rate;
    utt.pitch     = SPEECH.pitch;
    utt.volume    = 1.0;
    utt.lang      = SPEECH.voice?.lang || 'pt-BR';
    utt.onend     = resolve;
    utt.onerror   = resolve;
    window.speechSynthesis.speak(utt);
  });
}

// ── ElevenLabs TTS ────────────────────────────

async function _elSpeak(text) {
  const url = `/proxy/elevenlabs/${SPEECH.elVoiceId}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'xi-api-key':    SPEECH.elApiKey,
    },
    body: JSON.stringify({
      text,
      model_id: 'eleven_multilingual_v2',
      voice_settings: {
        stability:        0.45,
        similarity_boost: 0.82,
        style:            0.30,
        use_speaker_boost: true,
      },
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.detail?.message || `ElevenLabs erro ${res.status}`);
  }

  const blob = await res.blob();
  const url2 = URL.createObjectURL(blob);
  return new Promise((resolve, reject) => {
    const audio = new Audio(url2);
    audio.volume = 1.0;
    audio.onended = () => { URL.revokeObjectURL(url2); resolve(); };
    audio.onerror = (e) => { URL.revokeObjectURL(url2); reject(e); };
    audio.play().catch(reject);
  });
}

function stopSpeech() {
  if (window.speechSynthesis) window.speechSynthesis.cancel();
  SPEECH.speaking = false;
  SPEECH.queue = [];
  _muteYT(false);
}

function testVoice() {
  const track = S.cur;
  const hora  = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const msg = track
    ? `São ${hora} e você está ouvindo ${track.title}, de ${track.artist}. Que seleção incrível!`
    : `Olá! Aqui é o DJ da AIR Rádio. Selecione uma música e vamos nessa!`;
  stopSpeech();
  const saved = SPEECH.enabled;
  SPEECH.enabled = true;
  speak(msg, true);
  SPEECH.enabled = saved;
}

function updateVoicePreview() {
  const sel = document.getElementById('voice-select');
  if (sel && SPEECH.voice) sel.value = SPEECH.voice.name;
}

// ── Volume YouTube durante fala ───────────────

function _muteYT(mute) {
  try {
    const iframe = document.getElementById('yt-iframe');
    if (!iframe?.contentWindow) return;
    const vol = mute ? Math.max(0, (S.vol || 80) - 65) : (S.vol || 80);
    iframe.contentWindow.postMessage(
      JSON.stringify({ event: 'command', func: 'setVolume', args: [vol] }), '*'
    );
  } catch {}
}
