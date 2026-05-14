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
    // Tenta carregar voz salva
    const saved = localStorage.getItem('air_voice');
    if (saved) {
      const v = SPEECH.voices.find(x => x.name === saved);
      if (v) SPEECH.voice = v;
    }
    // Padrão: primeira voz em português
    if (!SPEECH.voice) {
      SPEECH.voice = SPEECH.voices.find(v => v.lang.startsWith('pt')) || SPEECH.voices[0] || null;
    }
    updateVoicePreview();
  };

  if (window.speechSynthesis.getVoices().length) load();
  window.speechSynthesis.onvoiceschanged = load;

  // Carrega preferências
  const en = localStorage.getItem('air_speech_enabled');
  SPEECH.enabled = en === 'true';
  document.getElementById('speech-toggle').checked = SPEECH.enabled;

  const rate = localStorage.getItem('air_speech_rate');
  if (rate) { SPEECH.rate = parseFloat(rate); document.getElementById('speech-rate').value = rate; }

  const pitch = localStorage.getItem('air_speech_pitch');
  if (pitch) { SPEECH.pitch = parseFloat(pitch); document.getElementById('speech-pitch').value = pitch; }
}

function renderVoiceSelect() {
  const sel = document.getElementById('voice-select');
  if (!sel) return;
  sel.innerHTML = SPEECH.voices.map(v =>
    `<option value="${escHtml(v.name)}" ${v.lang.startsWith('pt') ? '⭐ ' : ''}>${v.name} (${v.lang})</option>`
  ).join('');
  if (SPEECH.voice) sel.value = SPEECH.voice.name;
}

function setVoice(name) {
  SPEECH.voice = SPEECH.voices.find(v => v.name === name) || SPEECH.voice;
  localStorage.setItem('air_voice', name);
}

function setSpeechRate(v) {
  SPEECH.rate = parseFloat(v);
  document.getElementById('rate-val').textContent = v;
  localStorage.setItem('air_speech_rate', v);
}

function setSpeechPitch(v) {
  SPEECH.pitch = parseFloat(v);
  document.getElementById('pitch-val').textContent = v;
  localStorage.setItem('air_speech_pitch', v);
}

function toggleSpeech(el) {
  SPEECH.enabled = el.checked;
  localStorage.setItem('air_speech_enabled', SPEECH.enabled);
  if (!SPEECH.enabled) stopSpeech();
  toast(SPEECH.enabled ? '🔊 DJ vai falar!' : '🔇 DJ mudo');
}

function updateVoicePreview() {
  const sel = document.getElementById('voice-select');
  if (sel && SPEECH.voice) sel.value = SPEECH.voice.name;
}

// ── Falar ─────────────────────────────────────

function speak(text, priority = false) {
  if (!SPEECH.enabled || !SPEECH.synth || !text) return;

  // Limpa texto de emojis e símbolos para a voz
  const clean = text
    .replace(/[\u{1F000}-\u{1FFFF}]/gu, '')
    .replace(/[🎵🎶🎤🎙️📻💪📡❤️🤍▶⏸⏮⏭🔀🔁🔊]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

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

  // Pausa o YouTube enquanto fala
  _muteYT(true);

  const utt = new SpeechSynthesisUtterance(text);
  utt.voice  = SPEECH.voice;
  utt.rate   = SPEECH.rate;
  utt.pitch  = SPEECH.pitch;
  utt.volume = SPEECH.volume;
  utt.lang   = SPEECH.voice?.lang || 'pt-BR';

  utt.onend = () => {
    SPEECH.speaking = false;
    _muteYT(false);
    setTimeout(_nextSpeak, 500);
  };
  utt.onerror = () => {
    SPEECH.speaking = false;
    _muteYT(false);
    setTimeout(_nextSpeak, 500);
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
  const msg = track
    ? `Olá! Sou o DJ da AIR Rádio. Estamos ouvindo ${track.title} de ${track.artist}. Aproveite!`
    : `Olá! Sou o DJ da AIR Rádio. Configure sua música favorita e vamos nessa!`;
  stopSpeech();
  const saved = SPEECH.enabled;
  SPEECH.enabled = true;
  speak(msg, true);
  SPEECH.enabled = saved;
}

// ── Volume YouTube ────────────────────────────

function _muteYT(mute) {
  try {
    const iframe = document.getElementById('yt-iframe');
    if (!iframe || !iframe.contentWindow) return;
    // Baixa o volume do YT enquanto fala (não muta totalmente)
    const vol = mute ? Math.max(0, S.vol - 60) : S.vol;
    iframe.contentWindow.postMessage(
      JSON.stringify({ event: 'command', func: 'setVolume', args: [vol] }), '*'
    );
  } catch { }
}
