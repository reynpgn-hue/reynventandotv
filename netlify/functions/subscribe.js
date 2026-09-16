// ---------------------------------------------------------
// subscribe.js — versão Netlify Functions do antigo
// api/subscribe.php. Cadastro de inscritos (apelido, TikTok
// e aniversário), sem deixar duplicar @tiktok. Guarda tudo
// no Netlify Blobs.
//
// POST /api/subscribe.php -> { apelido, tiktok, aniversario }
// ---------------------------------------------------------

const { getStore } = require('@netlify/blobs');

const HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Access-Control-Allow-Origin': '*',
};

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: HEADERS, body: JSON.stringify({ erro: 'Método não permitido.' }) };
  }

  let dados;
  try {
    dados = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ erro: 'JSON inválido.' }) };
  }

  const apelido = (dados.apelido || '').trim().slice(0, 60);
  const tiktok = (dados.tiktok || '').trim().replace(/^@+/, '').slice(0, 60);
  const aniversario = (dados.aniversario || '').trim();

  if (!apelido || !tiktok || !aniversario) {
    return {
      statusCode: 400,
      headers: HEADERS,
      body: JSON.stringify({ erro: 'Preencha apelido, TikTok e data de aniversário.' }),
    };
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(aniversario)) {
    return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ erro: 'Data de aniversário inválida.' }) };
  }

  const store = getStore('reynventando-inscritos');
  const inscritos = (await store.get('lista', { type: 'json' })) || [];

  const tiktokMinusculo = tiktok.toLowerCase();
  if (inscritos.some((i) => i.tiktok.toLowerCase() === tiktokMinusculo)) {
    return {
      statusCode: 409,
      headers: HEADERS,
      body: JSON.stringify({ erro: 'Esse @ do TikTok já está cadastrado.' }),
    };
  }

  inscritos.push({ apelido, tiktok, aniversario, criado_em: new Date().toISOString() });
  await store.setJSON('lista', inscritos);

  return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ ok: true }) };
};
