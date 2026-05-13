// ════════════════════════════════════════════
// AIR — Rádio Inteligente
// state.js — Estado global da aplicação
// ════════════════════════════════════════════

const S = {
  user: null,
  playing: false,
  cur: null,
  idx: 0,
  queue: [],
  liked: [],
  shuffle: false,
  repeat: false,
  vol: 80,
  mode: 'fav',
  weather: null,
  traffic: null,
  chatHistory: [],
  prefs: {},
  ytPanelOpen: false,
  simPos: 0,
  simDur: 240,
  simTimer: null,
  simStart: 0,
  simOffset: 0,
  vizTimer: null,
  apiKeys: {},
  aiProvider: 'auto',
  transitionInProgress: false,
  motivTimer: null,
};