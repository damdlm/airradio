// ════════════════════════════════════════════
// AIR — Rádio Inteligente
// server.js — Proxy para chamadas de IA + persistência de chaves
// ════════════════════════════════════════════

const express = require('express');
const cors    = require('cors');
const path    = require('path');
const fs      = require('fs');

const app  = express();
const PORT = process.env.PORT || 3000;

// Caminho do arquivo de chaves
const KEYS_FILE = path.join(__dirname, 'keys.json');

// Garante que o arquivo keys.json existe
function initKeysFile() {
  if (!fs.existsSync(KEYS_FILE)) {
    fs.writeFileSync(KEYS_FILE, JSON.stringify({}, null, 2));
  }
}
initKeysFile();

// Helper para ler as chaves
function readKeys() {
  try {
    const data = fs.readFileSync(KEYS_FILE, 'utf8');
    return JSON.parse(data);
  } catch {
    return {};
  }
}

// Helper para salvar as chaves
function saveKeys(keys) {
  fs.writeFileSync(KEYS_FILE, JSON.stringify(keys, null, 2));
}

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// ── ROTAS PARA GERENCIAR CHAVES ─────────────────
// Retorna todas as chaves
app.get('/api/keys', (req, res) => {
  const keys = readKeys();
  res.json(keys);
});

// Salva/atualiza uma chave
app.post('/api/keys', (req, res) => {
  const { provider, key } = req.body;
  if (!provider || key === undefined) {
    return res.status(400).json({ error: 'Provider e key sao obrigatorios' });
  }
  const keys = readKeys();
  keys[provider] = key;
  saveKeys(keys);
  res.json({ success: true, message: `Chave para ${provider} salva` });
});

// Remove uma chave
app.delete('/api/keys/:provider', (req, res) => {
  const { provider } = req.params;
  const keys = readKeys();
  if (keys[provider]) {
    delete keys[provider];
    saveKeys(keys);
    res.json({ success: true });
  } else {
    res.status(404).json({ error: 'Provedor nao encontrado' });
  }
});

// ── PROXYS ─────────────────────────────────────
app.post('/proxy/anthropic', async (req, res) => {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey) return res.status(400).json({ error: { message: 'Chave Anthropic nao enviada' } });
  try {
    const { default: fetch } = await import('node-fetch');
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(req.body),
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    console.error('[Anthropic]', err.message);
    res.status(502).json({ error: { message: 'Erro ao conectar com Anthropic: ' + err.message } });
  }
});

app.post('/proxy/google', async (req, res) => {
  const apiKey = req.query.key || req.headers['x-google-key'];
  if (!apiKey) return res.status(400).json({ error: { message: 'Chave Google nao enviada' } });
  const model = req.query.model || 'gemini-1.5-flash';
  const url   = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  try {
    const { default: fetch } = await import('node-fetch');
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    console.error('[Google]', err.message);
    res.status(502).json({ error: { message: 'Erro ao conectar com Google: ' + err.message } });
  }
});

app.post('/proxy/openai', async (req, res) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.status(400).json({ error: { message: 'Chave OpenAI nao enviada' } });
  try {
    const { default: fetch } = await import('node-fetch');
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': authHeader },
      body: JSON.stringify(req.body),
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    console.error('[OpenAI]', err.message);
    res.status(502).json({ error: { message: 'Erro ao conectar com OpenAI: ' + err.message } });
  }
});

app.post('/proxy/deepseek', async (req, res) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.status(400).json({ error: { message: 'Chave DeepSeek nao enviada' } });
  try {
    const { default: fetch } = await import('node-fetch');
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': authHeader },
      body: JSON.stringify(req.body),
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    console.error('[DeepSeek]', err.message);
    res.status(502).json({ error: { message: 'Erro ao conectar com DeepSeek: ' + err.message } });
  }
});

app.post('/proxy/elevenlabs/:voiceId', async (req, res) => {
  const apiKey  = req.headers['xi-api-key'];
  const voiceId = req.params.voiceId;
  if (!apiKey) return res.status(400).json({ detail: { message: 'Chave ElevenLabs nao enviada' } });
  try {
    const { default: fetch } = await import('node-fetch');
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method:  'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key':   apiKey,
        'Accept':       'audio/mpeg',
      },
      body: JSON.stringify(req.body),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      return res.status(response.status).json(data);
    }
    res.setHeader('Content-Type', 'audio/mpeg');
    response.body.pipe(res);
  } catch (err) {
    console.error('[ElevenLabs]', err.message);
    res.status(502).json({ detail: { message: 'Erro ao conectar com ElevenLabs: ' + err.message } });
  }
});

app.post('/proxy/groq', async (req, res) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.status(400).json({ error: { message: 'Chave Groq nao enviada' } });
  try {
    const { default: fetch } = await import('node-fetch');
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': authHeader },
      body: JSON.stringify(req.body),
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    console.error('[Groq]', err.message);
    res.status(502).json({ error: { message: 'Erro ao conectar com Groq: ' + err.message } });
  }
});

app.post('/proxy/cohere', async (req, res) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.status(400).json({ error: { message: 'Chave Cohere nao enviada' } });
  try {
    const { default: fetch } = await import('node-fetch');
    const response = await fetch('https://api.cohere.com/v2/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': authHeader },
      body: JSON.stringify(req.body),
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    console.error('[Cohere]', err.message);
    res.status(502).json({ error: { message: 'Erro ao conectar com Cohere: ' + err.message } });
  }
});

app.post('/proxy/mistral', async (req, res) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.status(400).json({ error: { message: 'Chave Mistral nao enviada' } });
  try {
    const { default: fetch } = await import('node-fetch');
    const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': authHeader },
      body: JSON.stringify(req.body),
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    console.error('[Mistral]', err.message);
    res.status(502).json({ error: { message: 'Erro ao conectar com Mistral: ' + err.message } });
  }
});

app.listen(PORT, () => {
  console.log(`\nAIR Radio rodando em http://localhost:${PORT}`);
  console.log('Proxy de IA ativo | Chaves salvas em keys.json\n');
});
