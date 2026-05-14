// ════════════════════════════════════════════
// AIR — Rádio Inteligente
// server.js — Proxy para chamadas de IA (resolve CORS)
// ════════════════════════════════════════════
// Uso: node server.js
// Acesse em: http://localhost:3000
// ════════════════════════════════════════════

const express = require('express');
const cors    = require('cors');
const path    = require('path');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// ── Proxy: Claude (Anthropic) ────────────────
app.post('/proxy/anthropic', async (req, res) => {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey) return res.status(400).json({ error: { message: 'Chave Anthropic não enviada' } });
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

// ── Proxy: Gemini (Google) ───────────────────
app.post('/proxy/google', async (req, res) => {
  const apiKey = req.query.key || req.headers['x-google-key'];
  if (!apiKey) return res.status(400).json({ error: { message: 'Chave Google não enviada' } });
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

// ── Proxy: OpenAI (ChatGPT) ──────────────────
app.post('/proxy/openai', async (req, res) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.status(400).json({ error: { message: 'Chave OpenAI não enviada' } });
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

// ── Proxy: DeepSeek ──────────────────────────
app.post('/proxy/deepseek', async (req, res) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.status(400).json({ error: { message: 'Chave DeepSeek não enviada' } });
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

app.listen(PORT, () => {
  console.log(`\n🎵 AIR Rádio rodando em http://localhost:${PORT}`);
  console.log('   Proxy de IA ativo — CORS resolvido!\n');
});

// ── Proxy: Groq ──────────────────────────────
app.post('/proxy/groq', async (req, res) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.status(400).json({ error: { message: 'Chave Groq não enviada' } });
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

// ── Proxy: Cohere ────────────────────────────
app.post('/proxy/cohere', async (req, res) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.status(400).json({ error: { message: 'Chave Cohere não enviada' } });
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

// ── Proxy: Mistral ───────────────────────────
app.post('/proxy/mistral', async (req, res) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.status(400).json({ error: { message: 'Chave Mistral não enviada' } });
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
