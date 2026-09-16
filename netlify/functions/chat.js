// ---------------------------------------------------------
// chat.js — versão Netlify Functions do antigo api/chat.php.
// Guarda as mensagens do chat comunitário usando o Netlify
// Blobs (armazenamento chave-valor embutido do Netlify — não
// precisa de MySQL nem de nenhum serviço externo).
//
// GET  /api/chat.php  -> últimas 50 mensagens
// POST /api/chat.php  -> { apelido, mensagem }
// (os redirects do netlify.toml mantêm essas URLs funcionando
// exatamente como no site antigo, então o community.js não
// precisou ser alterado)
// ---------------------------------------------------------

const { getStore } = require('@netlify/blobs');

const HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Access-Control-Allow-Origin': '*',
};

exports.handler = async (event) => {
  const store = getStore('reynventando-chat');

  if (event.httpMethod === 'GET') {
    const mensagens = (await store.get('mensagens', { type: 'json' })) || [];
    return { statusCode: 200, headers: HEADERS, body: JSON.stringify(mensagens.slice(-50)) };
  }

  if (event.httpMethod === 'POST') {
    let dados;
    try {
      dados = JSON.parse(event.body || '{}');
    } catch {
      return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ erro: 'JSON inválido.' }) };
    }

    const apelido = (dados.apelido || '').trim().slice(0, 40);
    const mensagem = (dados.mensagem || '').trim().slice(0, 300);

    if (!apelido || !mensagem) {
      return {
        statusCode: 400,
        headers: HEADERS,
        body: JSON.stringify({ erro: 'Apelido e mensagem são obrigatórios.' }),
      };
    }

    const mensagens = (await store.get('mensagens', { type: 'json' })) || [];
    mensagens.push({ apelido, mensagem, criado_em: new Date().toISOString() });

    // mantém só as últimas 200 mensagens, pra não crescer sem limite
    await store.setJSON('mensagens', mensagens.slice(-200));

    return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ ok: true }) };
  }

  return { statusCode: 405, headers: HEADERS, body: JSON.stringify({ erro: 'Método não permitido.' }) };
};
