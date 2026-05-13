// ════════════════════════════════════════════
// AIR — Rádio Inteligente
// weather.js — Clima, localização, tráfego, relógio
// ════════════════════════════════════════════

function initLocation() {
  if (!navigator.geolocation) { fakeWeather(); return; }
  navigator.geolocation.getCurrentPosition(
    pos => {
      fetchWeather(pos.coords.latitude, pos.coords.longitude);
      reverseGeo(pos.coords.latitude, pos.coords.longitude);
    },
    () => fakeWeather(),
    { timeout: 8000 }
  );
}

async function fetchWeather(lat, lon) {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,apparent_temperature,uv_index,weather_code&timezone=auto`;
    const r   = await fetch(url);
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const d   = await r.json();
    const c   = d.current;
    const desc = wcode(c.weather_code || 0);

    document.getElementById('wtemp').textContent  = Math.round(c.temperature_2m) + '°';
    document.getElementById('wdesc').textContent  = desc;
    document.getElementById('whum').textContent   = c.relative_humidity_2m + '%';
    document.getElementById('wwind').textContent  = Math.round(c.wind_speed_10m) + ' km/h';
    document.getElementById('wfeel').textContent  = Math.round(c.apparent_temperature) + '°';
    document.getElementById('wuv').textContent    = Math.round(c.uv_index || 0);

    S.weather = {
      temp: Math.round(c.temperature_2m),
      desc,
      hum:  c.relative_humidity_2m,
      wind: Math.round(c.wind_speed_10m),
    };
    setTraffic();
  } catch {
    fakeWeather();
  }
}

async function reverseGeo(lat, lon) {
  try {
    const r = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`,
      { headers: { 'Accept-Language': 'pt-BR' } }
    );
    if (!r.ok) return;
    const d    = await r.json();
    const city = d.address?.city || d.address?.town || d.address?.village || 'Sua cidade';
    const st   = d.address?.state || '';
    document.getElementById('wcity').textContent    = city;
    document.getElementById('loc-badge').textContent = `📍 ${city}${st ? ', ' + st.slice(0, 2) : ''}`;
  } catch { /* silencioso */ }
}

function wcode(c) {
  if (c === 0)  return '☀️ Céu limpo';
  if (c <= 3)   return '⛅ Nublado';
  if (c <= 48)  return '🌫 Névoa';
  if (c <= 67)  return '🌧 Chuva';
  if (c <= 77)  return '❄️ Neve';
  if (c <= 82)  return '🌦 Pancadas';
  return '⛈ Tempestade';
}

function fakeWeather() {
  const t    = 18 + Math.floor(Math.random() * 14);
  const ds   = ['☀️ Ensolarado', '⛅ Parcialmente nublado', '🌧 Chuva leve', '🌦 Garoa', '☁️ Nublado'];
  const desc = ds[Math.floor(Math.random() * ds.length)];

  document.getElementById('wtemp').textContent    = t + '°';
  document.getElementById('wcity').textContent    = 'Jaraguá do Sul';
  document.getElementById('wdesc').textContent    = desc;
  document.getElementById('whum').textContent     = (50 + Math.floor(Math.random() * 40)) + '%';
  document.getElementById('wwind').textContent    = (5  + Math.floor(Math.random() * 20)) + ' km/h';
  document.getElementById('wfeel').textContent    = (t - 2) + '°';
  document.getElementById('wuv').textContent      = Math.floor(Math.random() * 9);
  document.getElementById('loc-badge').textContent = '📍 Jaraguá do Sul, SC';

  S.weather = { temp: t, desc, hum: 65, wind: 12 };
  setTraffic();
}

let _trafficTimeout = null;
function setTraffic() {
  clearTimeout(_trafficTimeout);
  const tr = TRAFFIC_DATA[Math.floor(Math.random() * TRAFFIC_DATA.length)];
  document.getElementById('tdot').style.background = tr.c;
  document.getElementById('tlbl').textContent      = tr.l;
  document.getElementById('tdesc').textContent     = tr.d;
  S.traffic = tr;
  _trafficTimeout = setTimeout(setTraffic, 8 * 60 * 1000);
}

function startClock() {
  const tick = () => {
    const n = new Date();
    document.getElementById('time-badge').textContent =
      `🕐 ${String(n.getHours()).padStart(2, '0')}:${String(n.getMinutes()).padStart(2, '0')}`;
  };
  tick();
  setInterval(tick, 30000);
}