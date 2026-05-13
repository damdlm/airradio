// ════════════════════════════════════════════
// AIR — Rádio Inteligente
// data.js — Catálogo e constantes
// ════════════════════════════════════════════

const CATALOG = [
  { id: 'dQw4w9WgXcQ', title: 'Never Gonna Give You Up',  artist: 'Rick Astley',          genre: 'Pop',       year: 1987, dur: 213 },
  { id: 'hTWKbfoikeg', title: 'Smells Like Teen Spirit',  artist: 'Nirvana',               genre: 'Rock',      year: 1991, dur: 301 },
  { id: 'y6120QOlsfU', title: 'Billie Jean',              artist: 'Michael Jackson',        genre: 'Pop',       year: 1982, dur: 294 },
  { id: 'fJ9rUzIMcZQ', title: 'Bohemian Rhapsody',        artist: 'Queen',                  genre: 'Rock',      year: 1975, dur: 354 },
  { id: '1w7OgIMMRc4', title: "Sweet Child O' Mine",      artist: "Guns N' Roses",          genre: 'Rock',      year: 1988, dur: 356 },
  { id: 'OPf0YbXqDm0', title: 'Shape of You',             artist: 'Ed Sheeran',             genre: 'Pop',       year: 2017, dur: 234 },
  { id: 'SlPhMPnQ58k', title: 'Blinding Lights',          artist: 'The Weeknd',             genre: 'Pop',       year: 2019, dur: 200 },
  { id: 'ktvTqknDobU', title: 'Radioactive',              artist: 'Imagine Dragons',        genre: 'Rock',      year: 2012, dur: 186 },
  { id: 'XqOBOrfBhFk', title: 'Garota de Ipanema',        artist: 'Tom Jobim',              genre: 'MPB',       year: 1962, dur: 279 },
  { id: 'rY0WxgSXdEE', title: 'Construção',               artist: 'Chico Buarque',          genre: 'MPB',       year: 1971, dur: 387 },
  { id: '2vjPBrBU-TM', title: 'Asa Branca',               artist: 'Luiz Gonzaga',           genre: 'MPB',       year: 1947, dur: 210 },
  { id: 'btPJPFnesV4', title: 'Evidências',               artist: 'Chitãozinho & Xororó',   genre: 'Sertanejo', year: 1990, dur: 276 },
  { id: 'sNmoDOJOp7k', title: 'Ai Se Eu Te Pego',         artist: 'Michel Teló',            genre: 'Sertanejo', year: 2011, dur: 181 },
  { id: 'RgKAFK5djSk', title: 'See You Again',            artist: 'Wiz Khalifa ft. Puth',   genre: 'Hip-Hop',   year: 2015, dur: 229 },
  { id: 'CevxZvSJLk8', title: 'Thinking Out Loud',        artist: 'Ed Sheeran',             genre: 'Pop',       year: 2014, dur: 281 },
  { id: '09R8_2nJtjg', title: 'Sugar',                    artist: 'Maroon 5',               genre: 'Pop',       year: 2014, dur: 235 },
  { id: 'nfWlot6h_JM', title: 'Shake It Off',             artist: 'Taylor Swift',           genre: 'Pop',       year: 2014, dur: 219 },
  { id: 'hLQl3WQQoQ0', title: 'Someone Like You',         artist: 'Adele',                  genre: 'Pop',       year: 2011, dur: 285 },
  { id: 'lp-EO5I60KA', title: 'Rolling in the Deep',      artist: 'Adele',                  genre: 'Pop',       year: 2010, dur: 228 },
  { id: '7PCkvCPvDXk', title: 'Stay With Me',             artist: 'Sam Smith',              genre: 'Pop',       year: 2014, dur: 172 },
  { id: 'pRpeEdMmmQ0', title: 'Chandelier',               artist: 'Sia',                    genre: 'Pop',       year: 2014, dur: 221 },
  { id: '60ItHLz5WEA', title: 'All of Me',                artist: 'John Legend',            genre: 'R&B',       year: 2013, dur: 270 },
  { id: 'JGwWNGJdvx8', title: 'Perfect',                  artist: 'Ed Sheeran',             genre: 'Pop',       year: 2017, dur: 263 },
  { id: 'bkIqBQBnSO4', title: 'Aquarela do Brasil',       artist: 'Gal Costa',              genre: 'MPB',       year: 1975, dur: 248 },
  { id: '450p7goxZqg', title: 'Wrecking Ball',            artist: 'Miley Cyrus',            genre: 'Pop',       year: 2013, dur: 222 },
];

const ALL_GENRES = ['Rock', 'Pop', 'MPB', 'Sertanejo', 'Hip-Hop', 'Eletrônica', 'Jazz', 'Clássico', 'R&B'];

const TRAFFIC_DATA = [
  { c: '#2dd4bf', l: 'Trânsito Livre',    d: 'Vias desobstruídas. Boa viagem! 🚗' },
  { c: '#fbbf24', l: 'Trânsito Moderado', d: 'Lentidão em alguns pontos. Atenção! ⚠️' },
  { c: '#f87171', l: 'Trânsito Intenso',  d: 'Congestionamento nas principais vias. 🚨' },
];