// ---------------------------------------------------------
// live-status.js — versão Netlify Functions do antigo
// api/live-status.php. Guarda se o canal está ao vivo agora.
//
// GET  /api/live-status.php
//   -> { ao_vivo: true|false, atualizado_em: "..." }
//
// POST /api/live-status.php   (uso do SEU bot, não do site)
//   -> { ao_vivo: true|false, chave: "SUA_CHAVE_SECRETA" }
//
// A chave secreta agora vem de uma variável de ambiente do
// Netlify (LIVE_STATUS_SECRET), configurada em:
// Site settings -> Environment variables.
// Configure a MESMA chave no seu bot Node (tiktok-live-connector).
// Se a variável não existir ainda, usa um valor padrão só pra
// não quebrar — troque assim que configurar no painel do Netlify.
// ---------------------------------------------------------

const { getStore } = require('@netlify/blobs');

const HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Access-Control-Allow-Origin': '*',
};

const CHAVE_SECRETA = process.env.LIVE_STATUS_SECRET || 'TROQUE_ESTA_CHAVE_POR_UMA_SUA';

exports.handler = async (event) => {
  const store = getStore('reynventando-live');

  if (event.httpMethod === 'GET') {
    const status = (await store.get('status', { type: 'json' })) || {
      ao_vivo: false,
      atualizado_em: new Date().toISOString(),
    };
    return { statusCode: 200, headers: HEADERS, body: JSON.stringify(status) };
  }

  if (event.httpMethod === 'POST') {
    let dados;
    try {
      dados = JSON.parse(event.body || '{}');
    } catch {
      return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ erro: 'JSON inválido.' }) };
    }

    if ((dados.chave || '') !== CHAVE_SECRETA) {
      return { statusCode: 403, headers: HEADERS, body: JSON.stringify({ erro: 'Chave inválida.' }) };
    }

    const status = { ao_vivo: !!dados.ao_vivo, atualizado_em: new Date().toISOString() };
    await store.setJSON('status', status);

    return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ ok: true }) };
  }

  return { statusCode: 405, headers: HEADERS, body: JSON.stringify({ erro: 'Método não permitido.' }) };
};
