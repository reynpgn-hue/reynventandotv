// ---------------------------------------------------------
// live-status.js — versão Netlify Funções do antigo
//api/live-status.php. Guarda se o canal está ao vivo agora.
//
// GET /api/live-status.php
// -> { ao_vivo: true|false, atualizar_em: "..." }
//
// POST /api/live-status.php (uso do SEU bot, não do site)
// -> { ao_vivo: true|false, chave: "SUA_CHAVE_SECRETA" }
//
// A chave secreta agora vem de uma variável de ambiente do
//Netlify (LIVE_STATUS_SECRET), configurado em:
// Configurações do site -> Variáveis ​​de ambiente.
// Configure uma chave MESMA no seu bot Node (tiktok-live-connector).
// Se a variável ainda não existir, usa um valor padrão só pra
// não quebrar — troque assim que no painel do Netlify.
// ---------------------------------------------------------

const { connectLambda, getStore } = require('@netlify/blobs');

const HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Access-Control-Allow-Origin': '*',
};

const CHAVE_SECRETA = process.env.LIVE_STATUS_SECRET || 'TROQUE_ESTA_CHAVE_POR_UMA_SUA';

exports.handler = async (event) => {
  // Necessário porque esta função usa o formato clássico (exports.handler),
  // chamado de "modo de compatibilidade Lambda" — nesse modo o Netlify não
  // injeta a configuração do Blobs sozinho, então precisamos conectar manualmente.
  conectarLambda(evento);

  const store = getStore('reynventando-live');

  se (evento.httpMethod === 'GET') {
    const status = (await store.get('status', { type: 'json' })) || {
      ao_vivo: falso,
      atualizar_em: new Date().toISOString(),
    };
    return { statusCode: 200, headers: HEADERS, body: JSON.stringify(status) };
  }

  se (evento.httpMethod === 'POST') {
    vamos dados;
    tentar {
      dados = JSON.parse(event.body || '{}');
    } pegar {
      return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ erro: 'JSON inválido.' }) };
    }

    if ((dados.chave || '') !== CHAVE_SECRETA) {
      return { statusCode: 403, cabeçalhos: HEADERS, corpo: JSON.stringify({erro: 'Chave inválida.' }) };
    }

    const status = { ao_vivo: !!dados.ao_vivo, atualizado_em: new Date().toISOString() };
    aguarde store.setJSON('status', status);

    return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ ok: true }) };
  }

  return {statusCode: 405, headers: HEADERS, body: JSON.stringify({erro: 'Método não permitido.' }) };
};
