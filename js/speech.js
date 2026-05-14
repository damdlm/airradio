// ════════════════════════════════════════════
// AIR — Rádio Inteligente
// speech.js — DJ Falado (Web Speech API)
// ════════════════════════════════════════════

const SPEECH = {
  enabled: false,
  voice: null,
  voices: [],
  rate: 1.0,
  pitch: 1.0,
  volume: 1.0,
  speaking: false,
  queue: [],
  synth: window.speechSynthesis,
};

// ── Init ──────────────────────────────────────

function initSpeech() {
  if (!window.speechSynthesis) {
    console.warn('Speech API não suportada neste browser');
    return;
  }

  const load = () => {
    SPEECH.voices = window.speechSynthesis.getVoices();
    renderVoiceSelect();

    // Carrega voz salva
    const saved = localStorage.getItem('air_voice');
    if (saved) {
      const v = SPEECH.voices.find(x => x.name === saved);
      if (v) { SPEECH.voice = v; }
    }
    // Padrão: primeira voz em português
    if (!SPEECH.voice) {
      SPEECH.voice =
        SPEECH.voices.find(v => v.lang === 'pt-BR') ||
        SPEECH.voices.find(v => v.lang.startsWith('pt')) ||
        SPEECH.voices[0] || null;
    }
    updateVoicePreview();
  };

  if (window.speechSynthesis.getVoices().length) load();
  window.speechSynthesis.onvoiceschanged = load;

  // Carrega preferências salvas
  const en = localStorage.getItem('air_speech_enabled');
  SPEECH.enabled = en === 'true';
  const tog = document.getElementById('speech-toggle');
  if (tog) tog.checked = SPEECH.enabled;

  const rate = localStorage.getItem('air_speech_rate');
  if (rate) {
    SPEECH.rate = parseFloat(rate);
    const el = document.getElementById('speech-rate');
    if (el) el.value = rate;
    const lbl = document.getElementById('rate-val');
    if (lbl) lbl.textContent = parseFloat(rate).toFixed(1);
  }

  const pitch = localStorage.getItem('air_speech_pitch');
  if (pitch) {
    SPEECH.pitch = parseFloat(pitch);
    const el = document.getElementById('speech-pitch');
    if (el) el.value = pitch;
    const lbl = document.getElementById('pitch-val');
    if (lbl) lbl.textContent = parseFloat(pitch).toFixed(1);
  }

  const interval = localStorage.getItem('air_dj_interval');
  if (interval) {
    const el = document.getElementById('dj-interval');
    if (el) el.value = interval;
    const lbl = document.getElementById('dj-interval-val');
    if (lbl) lbl.textContent = interval + 's';
  }
}

// ── Seletor de Voz ────────────────────────────

function renderVoiceSelect() {
  const sel = document.getElementById('voice-select');
  if (!sel) return;

  // Agrupa: PT-BR → PT → Outros idiomas
  const ptBR  = SPEECH.voices.filter(v => v.lang === 'pt-BR');
  const ptPT  = SPEECH.voices.filter(v => v.lang === 'pt-PT');
  const ptOth = SPEECH.voices.filter(v => v.lang.startsWith('pt') && v.lang !== 'pt-BR' && v.lang !== 'pt-PT');
  const outros = SPEECH.voices.filter(v => !v.lang.startsWith('pt'));

  let html = '';

  if (ptBR.length) {
    html += `<optgroup label="🇧🇷 Português Brasil">`;
    ptBR.forEach(v => {
      html += `<option value="${escHtml(v.name)}">${escHtml(v.name)}${v.localService ? ' ✓' : ''}</option>`;
    });
    html += `</optgroup>`;
  }

  if (ptPT.length) {
    html += `<optgroup label="🇵🇹 Português Portugal">`;
    ptPT.forEach(v => {
      html += `<option value="${escHtml(v.name)}">${escHtml(v.name)}${v.localService ? ' ✓' : ''}</option>`;
    });
    html += `</optgroup>`;
  }

  if (ptOth.length) {
    html += `<optgroup label="🌐 Português (outros)">`;
    ptOth.forEach(v => {
      html += `<option value="${escHtml(v.name)}">${escHtml(v.name)} (${v.lang})</option>`;
    });
    html += `</optgroup>`;
  }

  if (outros.length) {
    // Agrupa outros por idioma
    const byLang = {};
    outros.forEach(v => {
      const lang = v.lang.split('-')[0].toUpperCase();
      if (!byLang[lang]) byLang[lang] = [];
      byLang[lang].push(v);
    });
    Object.keys(byLang).sort().forEach(lang => {
      html += `<optgroup label="🔤 ${lang}">`;
      byLang[lang].forEach(v => {
        html += `<option value="${escHtml(v.name)}">${escHtml(v.name)} (${v.lang})</option>`;
      });
      html += `</optgroup>`;
    });
  }

  sel.innerHTML = html || '<option>Nenhuma voz disponível</option>';
  updateVoicePreview();
}

function setVoice(name) {
  const v = SPEECH.voices.find(v => v.name === name);
  if (v) {
    SPEECH.voice = v;
    localStorage.setItem('air_voice', name);
    // Mini preview ao trocar voz
    previewVoice(v);
  }
}

function previewVoice(v) {
  if (!SPEECH.synth) return;
  SPEECH.synth.cancel();
  const utt = new SpeechSynthesisUtterance('AIR Rádio, com você!');
  utt.voice  = v;
  utt.rate   = SPEECH.rate;
  utt.pitch  = SPEECH.pitch;
  utt.lang   = v.lang;
  SPEECH.synth.speak(utt);
}

function updateVoicePreview() {
  const sel = document.getElementById('voice-select');
  if (sel && SPEECH.voice) sel.value = SPEECH.voice.name;
}

function setSpeechRate(v) {
  SPEECH.rate = parseFloat(v);
  const lbl = document.getElementById('rate-val');
  if (lbl) lbl.textContent = parseFloat(v).toFixed(1);
  localStorage.setItem('air_speech_rate', v);
}

function setSpeechPitch(v) {
  SPEECH.pitch = parseFloat(v);
  const lbl = document.getElementById('pitch-val');
  if (lbl) lbl.textContent = parseFloat(v).toFixed(1);
  localStorage.setItem('air_speech_pitch', v);
}

function toggleSpeech(el) {
  SPEECH.enabled = el.checked;
  localStorage.setItem('air_speech_enabled', SPEECH.enabled);
  if (!SPEECH.enabled) stopSpeech();
  toast(SPEECH.enabled ? '🔊 DJ vai falar!' : '🔇 DJ no mudo');
}

// ── Limpeza de texto para fala ─────────────────

function cleanForSpeech(text) {
  return text
    // Remove emojis
    .replace(/[\u{1F300}-\u{1FFFF}]/gu, '')
    .replace(/[\u{2600}-\u{26FF}]/gu, '')
    .replace(/[\u{2700}-\u{27BF}]/gu, '')
    // Remove símbolos soltos
    .replace(/[*_~`#|>]/g, '')
    // Limpa espaços
    .replace(/\s+/g, ' ')
    .trim();
}

// ── Falar ─────────────────────────────────────

function speak(text, priority = false) {
  if (!SPEECH.enabled || !SPEECH.synth || !text) return;
  const clean = cleanForSpeech(text);
  if (!clean) return;

  if (priority) {
    stopSpeech();
    _doSpeak(clean);
  } else {
    SPEECH.queue.push(clean);
    if (!SPEECH.speaking) _nextSpeak();
  }
}

function _doSpeak(text) {
  if (!SPEECH.synth) return;
  SPEECH.speaking = true;
  _muteYT(true);

  const utt = new SpeechSynthesisUtterance(text);
  utt.voice  = SPEECH.voice;
  utt.rate   = SPEECH.rate;
  utt.pitch  = SPEECH.pitch;
  utt.volume = 1.0;
  utt.lang   = SPEECH.voice?.lang || 'pt-BR';

  utt.onend = () => {
    SPEECH.speaking = false;
    _muteYT(false);
    setTimeout(_nextSpeak, 600);
  };
  utt.onerror = (e) => {
    console.warn('Speech error:', e.error);
    SPEECH.speaking = false;
    _muteYT(false);
    setTimeout(_nextSpeak, 600);
  };

  SPEECH.synth.speak(utt);
}

function _nextSpeak() {
  if (SPEECH.queue.length === 0) { SPEECH.speaking = false; return; }
  _doSpeak(SPEECH.queue.shift());
}

function stopSpeech() {
  if (SPEECH.synth) SPEECH.synth.cancel();
  SPEECH.speaking = false;
  SPEECH.queue = [];
  _muteYT(false);
}

function testVoice() {
  const track = S.cur;
  const hora  = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const msg = track
    ? `AIR Rádio, são ${hora}! Acabamos de tocar ${track.title}, de ${track.artist}. Que clássico!`
    : `Olá! Aqui é o DJ da AIR Rádio. Selecione uma música e vamos nessa!`;

  stopSpeech();
  const saved = SPEECH.enabled;
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
  } catch { }
}
