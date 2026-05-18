// ════════════════════════════════════════════
// AIR — Rádio Inteligente
// speech.js — DJ Falado com vozes naturais
// Suporta: Web Speech API + ElevenLabs + Google TTS
// ════════════════════════════════════════════

const SPEECH = {
  enabled: false,
  engine: 'browser',   // 'browser' | 'elevenlabs' | 'google'
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

  // Google TTS
  googleVoice: 'pt-BR-Chirp3-HD-Achernar', // voz PT-BR de alta qualidade
  googleVoices: [
    { id: 'pt-BR-Chirp3-HD-Achernar',  name: '👨 Achernar — Masculino HD (PT-BR)',   gender: 'm' },
    { id: 'pt-BR-Chirp3-HD-Aoede',     name: '👩 Aoede — Feminino HD (PT-BR)',        gender: 'f' },
    { id: 'pt-BR-Chirp3-HD-Charon',    name: '👨 Charon — Masculino grave HD (PT-BR)', gender: 'm' },
    { id: 'pt-BR-Chirp3-HD-Fenrir',    name: '👨 Fenrir — Masculino jovem HD (PT-BR)', gender: 'm' },
    { id: 'pt-BR-Chirp3-HD-Kore',      name: '👩 Kore — Feminino suave HD (PT-BR)',  gender: 'f' },
    { id: 'pt-BR-Chirp3-HD-Leda',      name: '👩 Leda — Feminino animado HD (PT-BR)', gender: 'f' },
    { id: 'pt-BR-Standard-A',          name: '👩 Standard A — Feminino (PT-BR)',       gender: 'f' },
    { id: 'pt-BR-Standard-B',          name: '👨 Standard B — Masculino (PT-BR)',      gender: 'm' },
    { id: 'pt-BR-Neural2-A',           name: '👩 Neural2 A — Feminino natural (PT-BR)', gender: 'f' },
    { id: 'pt-BR-Neural2-B',           name: '👨 Neural2 B — Masculino natural (PT-BR)', gender: 'm' },
    { id: 'pt-BR-Neural2-C',           name: '👨 Neural2 C — Masculino jovem (PT-BR)', gender: 'm' },
  ],

  // Vozes ElevenLabs — IDs atualizados em 2025
  elVoices: [
    { id: 'pNInz6obpgDQGcFmaJgB', name: '👨 Adam — Masculino (EN/PT)',             gender: 'm' },
    { id: 'EXAVITQu4vr4xnSDxMaL', name: '👩 Bella — Feminino suave (EN/PT)',        gender: 'f' },
    { id: 'ErXwobaYiN019PkySvjV', name: '👨 Antoni — Masculino jovem',              gender: 'm' },
    { id: 'MF3mGyEYCl7XYWbV9V6O', name: '👩 Elli — Feminino energético',            gender: 'f' },
    { id: 'TxGEqnHWrfWFTfGW9XjX', name: '👨 Josh — Masculino grave',               gender: 'm' },
    { id: 'VR6AewLTigWG4xSOukaG', name: '👨 Arnold — Masculino robusto',            gender: 'm' },
    { id: 'ThT5KcBeYPX3keUQqHPh', name: '👩 Dorothy — Feminino britânico',          gender: 'f' },
    { id: 'AZnzlk1XvdvUeBnXmlld', name: '👩 Domi — Feminino dinâmico',              gender: 'f' },
    { id: 'D38z5RcWu1voky8WS1ja', name: '👨 Fin — Masculino irlandês',              gender: 'm' },
    { id: 'IKne3meq5aSn9XLyUdCD', name: '👨 Charlie — Masculino casual',            gender: 'm' },
    { id: 'XB0fDUnXU5powFXDhCwa', name: '👩 Charlotte — Feminino versátil',         gender: 'f' },
    { id: 'jBpfuIE2acCO8z3wKNLl', name: '👩 Gigi — Feminino animado',              gender: 'f' },
  ],
};

// ── Init ──────────────────────────────────────

function initSpeech() {
  // Carrega preferências salvas
  try {
    const saved = localStorage.getItem('air_speech_prefs');
    if (saved) {
      const p = JSON.parse(saved);
      Object.assign(SPEECH, p);
    }
  } catch {}

  // FIX: Carrega a chave do ElevenLabs do S.apiKeys (sincronizado com keys.json)
  _syncKeysFromServer();

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

  // Popula seletores
  _renderElVoices();
  _renderGoogleVoices();
}

// FIX: sincroniza a chave do ElevenLabs e Google com S.apiKeys (carregado do servidor)
function _syncKeysFromServer() {
  if (S.apiKeys) {
    if (S.apiKeys.elevenlabs && !SPEECH.elApiKey) {
      SPEECH.elApiKey = S.apiKeys.elevenlabs;
    }
    // Google TTS usa a mesma chave do Gemini
    if (S.apiKeys.google && !SPEECH.googleApiKey) {
      SPEECH.googleApiKey = S.apiKeys.google;
    }
  }
  // Atualiza o campo de chave do ElevenLabs na UI se estiver visível
  const el = document.getElementById('el-api-key');
  if (el && SPEECH.elApiKey) el.value = SPEECH.elApiKey;
}

function _applyPrefsToUI() {
  const set  = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };
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
    enabled:      SPEECH.enabled,
    engine:       SPEECH.engine,
    rate:         SPEECH.rate,
    pitch:        SPEECH.pitch,
    elVoiceId:    SPEECH.elVoiceId,
    elApiKey:     SPEECH.elApiKey,
    googleVoice:  SPEECH.googleVoice,
    googleApiKey: SPEECH.googleApiKey,
  };
  if (SPEECH.voice) localStorage.setItem('air_voice', SPEECH.voice.name);
  localStorage.setItem('air_speech_prefs', JSON.stringify(toSave));
}

// ── Seletor de Vozes do Browser ───────────────

function renderVoiceSelect() {
  const sel = document.getElementById('voice-select');
  if (!sel) return;

  const ptBR   = SPEECH.voices.filter(v => v.lang === 'pt-BR');
  const ptPT   = SPEECH.voices.filter(v => v.lang === 'pt-PT');
  const ptOth  = SPEECH.voices.filter(v => v.lang.startsWith('pt') && !['pt-BR','pt-PT'].includes(v.lang));
  const outros = SPEECH.voices.filter(v => !v.lang.startsWith('pt'));

  const grp = (label, voices) => {
    if (!voices.length) return '';
    let g = `<optgroup label="${label}">`;
    voices.forEach(v => {
      const local = v.localService ? ' ✓' : '';
      g += `<option value="${escHtml(v.name)}">${escHtml(v.name)}${local}</option>`;
    });
    return g + '</optgroup>';
  };

  let html = '';
  html += grp('🇧🇷 Português Brasil', ptBR);
  html += grp('🇵🇹 Português Portugal', ptPT);
  html += grp('🌐 Português (outros)', ptOth);

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

function _renderGoogleVoices() {
  const sel = document.getElementById('google-voice-select');
  if (!sel) return;
  sel.innerHTML = SPEECH.googleVoices.map(v =>
    `<option value="${v.id}">${v.name}</option>`
  ).join('');
  sel.value = SPEECH.googleVoice;
}

// ── Controles UI ──────────────────────────────

function setVoice(name) {
  const v = SPEECH.voices.find(v => v.name === name);
  if (v) {
    SPEECH.voice = v;
    _savePrefs();
    _browserSpeak('AIR Rádio. Com você!', true);
  }
}

function setElVoice(id) {
  SPEECH.elVoiceId = id;
  _savePrefs();
}

function setGoogleVoice(id) {
  SPEECH.googleVoice = id;
  _savePrefs();
}

function setEngine(engine) {
  SPEECH.engine = engine;
  _toggleEngineUI(engine);
  _savePrefs();
}

function _toggleEngineUI(engine) {
  const brow   = document.getElementById('browser-voice-section');
  const el     = document.getElementById('el-voice-section');
  const google = document.getElementById('google-voice-section');
  if (brow)   brow.style.display   = engine === 'browser'     ? 'block' : 'none';
  if (el)     el.style.display     = engine === 'elevenlabs'  ? 'block' : 'none';
  if (google) google.style.display = engine === 'google'      ? 'block' : 'none';
}

function saveElKey() {
  const el = document.getElementById('el-api-key');
  if (el) {
    SPEECH.elApiKey = el.value.trim();
    // FIX: também salva no S.apiKeys e persiste no servidor
    if (S.apiKeys) S.apiKeys.elevenlabs = SPEECH.elApiKey;
    fetch('/api/keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider: 'elevenlabs', key: SPEECH.elApiKey }),
    }).catch(err => console.warn('Erro ao salvar chave ElevenLabs no servidor:', err));
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
    .replace(/\. /g,  '.  ')
    .replace(/, /g,   ',  ')
    .replace(/! /g,   '!  ')
    .replace(/\? /g,  '?  ')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g,     '$1')
    .replace(/`(.*?)`/g,       '$1')
    .replace(/[\u{1F300}-\u{1FFFF}]/gu, '')
    .replace(/[\u{2600}-\u{27BF}]/gu,   '')
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
    if (SPEECH.engine === 'elevenlabs') {
      // FIX: verifica a chave em S.apiKeys também (sincronizado com o servidor)
      const key = SPEECH.elApiKey || S.apiKeys?.elevenlabs;
      if (!key) throw new Error('Chave ElevenLabs não configurada');
      SPEECH.elApiKey = key;
      await _elSpeak(text);
    } else if (SPEECH.engine === 'google') {
      const key = SPEECH.googleApiKey || S.apiKeys?.google;
      if (!key) throw new Error('Chave Google não configurada');
      SPEECH.googleApiKey = key;
      await _googleSpeak(text);
    } else {
      await _browserSpeak(text);
    }
  } catch (e) {
    console.warn('Erro na fala:', e.message);
    toast('⚠️ Voz: ' + e.message + ' — usando voz do browser');
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

    const utt   = new SpeechSynthesisUtterance(text);
    utt.voice   = SPEECH.voice;
    utt.rate    = preview ? 1.0 : SPEECH.rate;
    utt.pitch   = SPEECH.pitch;
    utt.volume  = 1.0;
    utt.lang    = SPEECH.voice?.lang || 'pt-BR';
    utt.onend   = resolve;
    utt.onerror = resolve;
    window.speechSynthesis.speak(utt);
  });
}

// ── ElevenLabs TTS ────────────────────────────

async function _elSpeak(text) {
  const res = await fetch(`/proxy/elevenlabs/${SPEECH.elVoiceId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'xi-api-key':   SPEECH.elApiKey,
    },
    body: JSON.stringify({
      text,
      model_id: 'eleven_multilingual_v2',
      voice_settings: {
        stability:         0.45,
        similarity_boost:  0.82,
        style:             0.30,
        use_speaker_boost: true,
      },
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const msg = err?.detail?.message || err?.detail || `ElevenLabs erro ${res.status}`;
    throw new Error(msg);
  }

  const blob = await res.blob();
  const url  = URL.createObjectURL(blob);
  return new Promise((resolve, reject) => {
    const audio    = new Audio(url);
    audio.volume   = 1.0;
    audio.onended  = () => { URL.revokeObjectURL(url); resolve(); };
    audio.onerror  = (e) => { URL.revokeObjectURL(url); reject(new Error('Erro ao reproduzir áudio ElevenLabs')); };
    audio.play().catch(reject);
  });
}

// ── Google Cloud Text-to-Speech ───────────────
// Usa a mesma chave do Gemini (já configurada em S.apiKeys.google)
// Gratuito: 4 milhões de caracteres/mês para vozes Neural2
// Chirp3-HD: 1 milhão de caracteres/mês gratuitos

async function _googleSpeak(text) {
  const key = SPEECH.googleApiKey || S.apiKeys?.google;
  const url = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${key}`;

  // Detecta se é voz Chirp3-HD para usar modelo correto
  const isChirp = SPEECH.googleVoice.includes('Chirp3-HD');
  const isNeural = SPEECH.googleVoice.includes('Neural2');

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      input: { text },
      voice: {
        languageCode: 'pt-BR',
        name: SPEECH.googleVoice,
      },
      audioConfig: {
        audioEncoding: 'MP3',
        speakingRate: SPEECH.rate,
        pitch: (SPEECH.pitch - 1) * 10, // Google usa escala -20..20 semitones
        ...(isChirp ? {} : {}), // Chirp3-HD ignora pitch/rate
      },
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const msg = err?.error?.message || `Google TTS erro ${res.status}`;
    throw new Error(msg);
  }

  const data     = await res.json();
  const audioB64 = data.audioContent;
  if (!audioB64) throw new Error('Google TTS: sem áudio retornado');

  // Converte base64 para blob e toca
  const bytes    = atob(audioB64);
  const buffer   = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) buffer[i] = bytes.charCodeAt(i);
  const blob = new Blob([buffer], { type: 'audio/mpeg' });
  const url2 = URL.createObjectURL(blob);

  return new Promise((resolve, reject) => {
    const audio    = new Audio(url2);
    audio.volume   = 1.0;
    audio.onended  = () => { URL.revokeObjectURL(url2); resolve(); };
    audio.onerror  = () => { URL.revokeObjectURL(url2); reject(new Error('Erro ao reproduzir áudio Google TTS')); };
    audio.play().catch(reject);
  });
}

function stopSpeech() {
  if (window.speechSynthesis) window.speechSynthesis.cancel();
  SPEECH.speaking = false;
  SPEECH.queue    = [];
  _muteYT(false);
}

function testVoice() {
  const track = S.cur;
  const hora  = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const msg   = track
    ? `São ${hora} e você está ouvindo ${track.title}, de ${track.artist}. Que seleção incrível!`
    : `Olá! Aqui é o DJ da AIR Rádio. Selecione uma música e vamos nessa!`;
  stopSpeech();
  const saved    = SPEECH.enabled;
  SPEECH.enabled = true;
  speak(msg, true);
  SPEECH.enabled = saved;
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