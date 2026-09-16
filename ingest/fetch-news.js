// ---------------------------------------------------------
// fetch-news.js — camada de INGESTÃO
// Única responsabilidade: ler feeds RSS de sites de games
// e gravar o resultado em public/data/news.json, no formato
// que o app.js espera. Não sabe nada sobre layout ou cor.
//
// Como rodar localmente:
//   1. cd ingest
//   2. npm install
//   3. node fetch-news.js
//
// Isso vai atualizar o arquivo public/data/news.json.
// ---------------------------------------------------------

const Parser = require('rss-parser');
const fs = require('fs');
const path = require('path');

const parser = new Parser({
  customFields: {
    item: [
      ['media:content', 'mediaContent', { keepArray: true }],
      ['media:thumbnail', 'mediaThumbnail'],
    ],
  },
});

// Adicione ou remova feeds aqui. Cada site de games costuma ter
// uma URL de RSS pública, geralmente em /feed ou /rss.
const FONTES = [
  { url: 'https://www.ign.com/rss/articles/feed', fonte: 'IGN', categoria: 'lancamento', categoriaLabel: 'Lançamento' },
  { url: 'https://www.gamespot.com/feeds/mashup/', fonte: 'GameSpot', categoria: 'atualizacao', categoriaLabel: 'Atualização' },
  // adicione mais feeds conforme necessário
];

const MAX_POR_FONTE = 5;
const SAIDA = path.join(__dirname, '..', 'public', 'data', 'news.json');

// Tradução automática (inglês -> português) usando o endpoint
// público e não-oficial do Google Tradutor. É gratuito e não
// exige chave/cadastro, mas por não ser oficial pode falhar ou
// ficar instável em uso muito intenso. Se isso acontecer no seu
// caso, a alternativa mais robusta é usar a Cloud Translation
// API do Google (paga, com chave) ou um LibreTranslate próprio.
async function traduzir(texto) {
  if (!texto || texto.trim() === '') return texto;
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=pt&dt=t&q=${encodeURIComponent(texto)}`;
    const resposta = await fetch(url);
    const dados = await resposta.json();
    // dados[0] é uma lista de trechos traduzidos; junta tudo
    return dados[0].map(trecho => trecho[0]).join('');
  } catch (erro) {
    console.error('Falha ao traduzir, mantendo texto original:', erro.message);
    return texto; // se a tradução falhar, não quebra o site — só mantém em inglês
  }
}

function pausa(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function gerarSigla(titulo) {
  return titulo
    .split(' ')
    .filter(p => p.length > 2)
    .slice(0, 2)
    .map(p => p[0].toUpperCase())
    .join('') || 'NW';
}

function extrairImagem(item) {
  // 1) enclosure (padrão mais comum de imagem em RSS)
  if (item.enclosure && item.enclosure.url) return item.enclosure.url;

  // 2) media:content (usado por IGN, GameSpot e outros)
  if (item.mediaContent && item.mediaContent.length) {
    const primeiro = item.mediaContent[0];
    if (primeiro && primeiro.$ && primeiro.$.url) return primeiro.$.url;
  }

  // 3) media:thumbnail
  if (item.mediaThumbnail && item.mediaThumbnail.$ && item.mediaThumbnail.$.url) {
    return item.mediaThumbnail.$.url;
  }

  // 4) fallback: procura a primeira <img src="..."> dentro do HTML do conteúdo
  const html = item['content:encoded'] || item.content || item.summary || '';
  const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (match) return match[1];

  return null; // sem imagem — o site cai pro visual com sigla + gradiente
}

function gerarTema(indice) {
  const temas = ['tema-a', 'tema-b', 'tema-c', 'tema-d', 'tema-e', 'tema-f'];
  return temas[indice % temas.length];
}

async function buscarFonte(fonte, indiceGlobalInicial) {
  try {
    const feed = await parser.parseURL(fonte.url);
    const itensBrutos = feed.items.slice(0, MAX_POR_FONTE);
    const itensTraduzidos = [];

    for (let i = 0; i < itensBrutos.length; i++) {
      const item = itensBrutos[i];
      const tituloOriginal = item.title || '';
      const resumoOriginal = (item.contentSnippet || item.summary || '').slice(0, 220);

      const tituloPt = await traduzir(tituloOriginal);
      await pausa(300); // evita bater rápido demais no serviço de tradução gratuito
      const resumoPt = await traduzir(resumoOriginal);
      await pausa(300);

      itensTraduzidos.push({
        id: (item.guid || item.link || item.title).toString().slice(0, 80),
        titulo: tituloPt,
        resumo: resumoPt,
        categoria: fonte.categoria,
        categoriaLabel: fonte.categoriaLabel,
        fonte: fonte.fonte,
        data: item.isoDate ? item.isoDate.slice(0, 10) : new Date().toISOString().slice(0, 10),
        link: item.link,
        imagem: extrairImagem(item),
        destaque: false,
        sigla: gerarSigla(tituloOriginal),
        tema: gerarTema(indiceGlobalInicial + i),
      });
    }

    return itensTraduzidos;
  } catch (erro) {
    console.error(`Falha ao ler feed de ${fonte.fonte}:`, erro.message);
    return [];
  }
}

async function main() {
  let todasNoticias = [];
  let indice = 0;

  for (const fonte of FONTES) {
    const itens = await buscarFonte(fonte, indice);
    todasNoticias = todasNoticias.concat(itens);
    indice += itens.length;
  }

  // ordena por data (mais recente primeiro) e marca a primeira como destaque
  todasNoticias.sort((a, b) => new Date(b.data) - new Date(a.data));
  if (todasNoticias.length > 0) todasNoticias[0].destaque = true;

  fs.mkdirSync(path.dirname(SAIDA), { recursive: true });
  fs.writeFileSync(SAIDA, JSON.stringify(todasNoticias, null, 2), 'utf-8');

  console.log(`✅ ${todasNoticias.length} notícias salvas em ${SAIDA}`);
}

main();
