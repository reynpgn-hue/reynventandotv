// ---------------------------------------------------------
// fetch-newsdata.js — notícias de tecnologia, filmes, séries/TV
// e shows/música, em português, pela API NewsData.io (plano grátis).
//
// Grava o resultado em public/data/noticias-extra.json, que é lido
// pelo site (seção "Além dos games"). NÃO mexe no news.json dos
// games nem no fetch-news.js.
//
// Precisa de uma chave grátis de newsdata.io. A chave NUNCA vai
// dentro do código (o repositório é público). Ela vem da variável
// de ambiente NEWSDATA_API_KEY.
//
// Rodar no seu computador (PowerShell):
//   cd ingest
//   $env:NEWSDATA_API_KEY="COLE_SUA_CHAVE_AQUI"
//   node fetch-newsdata.js
//
// No GitHub, a chave fica em Settings > Secrets and variables >
// Actions, com o nome NEWSDATA_API_KEY.
//
// Gasto: 1 pedido = 1 crédito (10 notícias). Este robô usa uns 8 a
// 12 créditos por execução. O plano grátis dá 200 por dia.
// ---------------------------------------------------------

const fs = require('fs');
const path = require('path');

const API_KEY = process.env.NEWSDATA_API_KEY;
const API_URL = 'https://newsdata.io/api/1/latest';
const SAIDA = path.join(__dirname, '..', 'public', 'data', 'noticias-extra.json');

const ITENS_POR_CATEGORIA = 7;
const PAGINAS_MAX = 2;   // 2 páginas x 10 notícias = até 20 candidatas por assunto
const MINIMO_BOM = 4;    // se vier menos que isso, tenta de novo sem o filtro de categoria

// Cada assunto: filtro de categoria da NewsData + palavras-chave (q).
// "OR" = qualquer uma das palavras. Aspas = frase exata.
const ASSUNTOS = {
  tecnologia: {
    category: 'technology',
    q: null,
  },
  filmes: {
    category: 'entertainment',
    q: 'filme OR filmes OR cinema OR estreia OR bilheteria OR trailer',
  },
  series: {
    category: 'entertainment',
    q: 'série OR séries OR streaming OR Netflix OR "Prime Video" OR "Disney+" OR "HBO Max" OR Globoplay OR novela OR reality',
  },
  shows: {
    category: 'entertainment',
    q: 'show OR shows OR turnê OR festival OR "Rock in Rio" OR "novo álbum" OR concerto OR "novo single"',
  },
};

// ---------- utilidades ----------

function limparTexto(t) {
  return String(t || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function chaveTitulo(t) {
  return limparTexto(t)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function urlValida(u) {
  return /^https?:\/\//i.test(u || '');
}

function normalizar(a) {
  const titulo = limparTexto(a.title);
  if (!titulo || !urlValida(a.link)) return null;

  let resumo = limparTexto(a.description);
  // no plano grátis alguns campos vêm com este aviso no lugar do texto
  if (/ONLY AVAILABLE IN/i.test(resumo)) resumo = '';
  if (resumo.length > 220) resumo = resumo.slice(0, 217).replace(/\s+\S*$/, '') + '…';

  // pubDate vem como "2026-10-22 14:30:00" (horário UTC)
  const publicado = a.pubDate ? new Date(String(a.pubDate).replace(' ', 'T') + 'Z') : null;
  const valido = publicado && !isNaN(publicado);

  return {
    id: String(a.article_id || a.link),
    titulo,
    resumo,
    link: a.link,
    imagem: urlValida(a.image_url) ? a.image_url : null,
    fonte: limparTexto(a.source_name || a.source_id || ''),
    data: valido ? publicado.toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
    _t: valido ? publicado.getTime() : 0,
  };
}

// ---------- API ----------

async function pedir(params) {
  const url = new URL(API_URL);
  url.searchParams.set('apikey', API_KEY);
  for (const [k, v] of Object.entries(params)) {
    if (v !== null && v !== undefined && v !== '') url.searchParams.set(k, v);
  }

  const resposta = await fetch(url, { headers: { 'User-Agent': 'reynventando-tv-bot' } });
  let json = {};
  try { json = await resposta.json(); } catch (e) { /* resposta sem JSON */ }

  if (!resposta.ok || json.status !== 'success') {
    const r = json && json.results;
    const motivo = (r && (r.message || r.code)) || resposta.statusText || 'sem detalhes';
    throw new Error('NewsData respondeu ' + resposta.status + ': ' + motivo);
  }
  return json;
}

async function buscarPaginas(params) {
  const achadas = [];
  let pagina = null;
  for (let i = 0; i < PAGINAS_MAX; i++) {
    const json = await pedir({ ...params, page: pagina });
    achadas.push(...(json.results || []));
    pagina = json.nextPage;
    if (!pagina) break;
  }
  return achadas;
}

async function buscarAssunto(nome, cfg) {
  const base = { language: 'pt', country: 'br', q: cfg.q };

  let brutas = await buscarPaginas({ ...base, category: cfg.category });
  if (brutas.length < MINIMO_BOM && cfg.q) {
    console.log('  poucas notícias com a categoria, tentando só com as palavras-chave');
    const mais = await buscarPaginas(base);
    brutas = brutas.concat(mais);
  }
  return brutas.map(normalizar).filter(Boolean);
}

// ---------- principal ----------

function lerAnterior() {
  try {
    return JSON.parse(fs.readFileSync(SAIDA, 'utf-8'));
  } catch (e) {
    return null;
  }
}

async function main() {
  if (!API_KEY) {
    console.error('pub_8f25cd3398554742855cb2607cf5b7c2');
    console.error('No PowerShell:  $env:NEWSDATA_API_KEY="pub_8f25cd3398554742855cb2607cf5b7c2"');
    process.exit(1);
  }

  const anterior = lerAnterior();
  const categorias = {};
  const jaUsados = new Set(); // evita a mesma notícia em duas abas
  let deramCerto = 0;

  for (const [nome, cfg] of Object.entries(ASSUNTOS)) {
    console.log('Buscando: ' + nome);
    let itens = [];
    try {
      itens = await buscarAssunto(nome, cfg);
      deramCerto++;
    } catch (erro) {
      console.error('  falhou: ' + erro.message);
    }

    // tira repetidas (mesmo link ou mesmo título), dentro e entre as abas
    const unicos = [];
    for (const n of itens) {
      const chaves = [n.link, chaveTitulo(n.titulo)];
      if (chaves.some(c => jaUsados.has(c))) continue;
      chaves.forEach(c => jaUsados.add(c));
      unicos.push(n);
    }

    // foto primeiro (card fica mais bonito), depois as mais recentes
    unicos.sort((a, b) => (Number(!!b.imagem) - Number(!!a.imagem)) || (b._t - a._t));
    let escolhidos = unicos.slice(0, ITENS_POR_CATEGORIA).map(({ _t, ...resto }) => resto);

    // se não veio nada novo, mantém o que já estava no arquivo (menos os exemplos)
    if (escolhidos.length === 0 && anterior && anterior.categorias) {
      const antigos = (anterior.categorias[nome] || []).filter(n => !n.exemplo);
      if (antigos.length > 0) {
        console.log('  sem notícias novas, mantendo as anteriores');
        escolhidos = antigos;
      }
    }

    categorias[nome] = escolhidos;
    console.log('  ' + escolhidos.length + ' notícias');
  }

  if (deramCerto === 0) {
    console.error('Nenhum assunto foi buscado com sucesso. O arquivo não foi alterado.');
    process.exit(1);
  }

  fs.mkdirSync(path.dirname(SAIDA), { recursive: true });
  fs.writeFileSync(
    SAIDA,
    JSON.stringify({ atualizadoEm: new Date().toISOString(), categorias }, null, 2),
    'utf-8'
  );
  console.log('Salvo em ' + SAIDA);
}

main().catch(erro => {
  console.error('Erro inesperado:', erro.message);
  process.exit(1);
});
