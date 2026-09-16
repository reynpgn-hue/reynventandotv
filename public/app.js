// ---------------------------------------------------------
// app.js — camada de LÓGICA DE EXIBIÇÃO
// Única responsabilidade: buscar data/news.json e desenhar
// os elementos na tela. Não sabe nada sobre "de onde vem"
// a notícia — só sabe como transformar dado em HTML.
// ---------------------------------------------------------

async function carregarNoticias() {
  try {
    const resposta = await fetch('./data/news.json');
    if (!resposta.ok) throw new Error('Não foi possível carregar news.json');
    const noticias = await resposta.json();

    // ordena da mais recente pra mais antiga
    noticias.sort((a, b) => new Date(b.data) - new Date(a.data));

    montarTicker(noticias);
    montarOnAir(noticias);
    montarDestaque(noticias);
    montarReportagens(noticias);
    montarArquivo(noticias);
  } catch (erro) {
    console.error('Erro ao carregar notícias:', erro);
    document.getElementById('archive-grid').innerHTML =
      '<p style="color:var(--text-dim)">Não foi possível carregar as notícias agora. Tente novamente mais tarde.</p>';
  }
}

// Monta o conteúdo visual de um card: usa a imagem real da notícia
// quando existir; se não existir (ou falhar ao carregar), cai pro
// visual antigo (sigla + gradiente de cor).
function mediaConteudo(n) {
  if (n.imagem) {
    const tituloSeguro = n.titulo.replace(/"/g, '&quot;');
    const siglaSegura = (n.sigla || '?').replace(/'/g, '');
    return `<img src="${n.imagem}" alt="${tituloSeguro}" loading="lazy" onerror="handleImgError(this,'${siglaSegura}')">`;
  }
  return `<span class="glyph">${n.sigla || '?'}</span>`;
}

// Chamado via onerror quando a imagem quebra (link caiu, hotlink bloqueado etc.)
window.handleImgError = function (imgEl, sigla) {
  imgEl.parentElement.innerHTML = `<span class="glyph">${sigla || '?'}</span>`;
};

function formatarData(dataISO) {
  const d = new Date(dataISO + 'T00:00:00');
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

// ---------- TICKER ----------
function montarTicker(noticias) {
  const track = document.getElementById('ticker-track');
  const itens = noticias.slice(0, 6);
  // duplica a lista pra dar efeito de loop contínuo
  const html = [...itens, ...itens]
    .map(n => `<span>📡 <b>${n.categoriaLabel.toUpperCase()}</b> — ${n.titulo}</span>`)
    .join('');
  track.innerHTML = html;
}

// ---------- NO AR AGORA (hero) ----------
function montarOnAir(noticias) {
  const container = document.getElementById('onair-list');
  const itens = noticias.slice(0, 3);
  container.innerHTML = itens.map((n, i) => `
    <div class="onair-item">
      <div class="onair-num">0${i + 1}</div>
      <div>
        <p>${n.titulo}</p>
        <small>${n.categoriaLabel.toUpperCase()}</small>
      </div>
    </div>
  `).join('');
}

// ---------- MATÉRIA EM DESTAQUE ----------
function montarDestaque(noticias) {
  const container = document.getElementById('featured-container');
  const destaque = noticias.find(n => n.destaque) || noticias[0];
  if (!destaque) return;

  container.innerHTML = `
    <div class="featured-media tema-${destaque.tema ? destaque.tema.split('-')[1] : 'a'}">
      ${mediaConteudo(destaque)}
    </div>
    <div class="featured-text">
      <span class="tag tag-${destaque.categoria}">${destaque.categoriaLabel}</span>
      <h3 class="display">${destaque.titulo}</h3>
      <p>${destaque.resumo}</p>
      <div class="meta-row">
        <span>Fonte: <b>${destaque.fonte}</b></span>
        <span>Publicado: <b>${formatarData(destaque.data)}</b></span>
      </div>
      <a href="${destaque.link}" class="btn btn-outline" style="margin-top:16px;">Ler matéria completa</a>
    </div>
  `;
}

// ---------- REPORTAGENS EM LINHA (alternadas) ----------
function montarReportagens(noticias) {
  const container = document.getElementById('news-rows-container');
  const destaqueId = (noticias.find(n => n.destaque) || {}).id;
  const itens = noticias.filter(n => n.id !== destaqueId).slice(0, 3);

  container.innerHTML = itens.map((n, i) => `
    <div class="news-row ${i % 2 === 1 ? 'reverse' : ''}">
      <div class="news-media tema-${n.tema ? n.tema.split('-')[1] : 'a'}">
        ${mediaConteudo(n)}
      </div>
      <div class="news-text">
        <span class="tag tag-${n.categoria}">${n.categoriaLabel}</span>
        <h3>${n.titulo}</h3>
        <p>${n.resumo}</p>
        <a href="${n.link}" class="btn btn-outline">Ler mais</a>
      </div>
    </div>
  `).join('');
}

// ---------- ARQUIVO (grade completa) ----------
function montarArquivo(noticias) {
  const container = document.getElementById('archive-grid');

  container.innerHTML = noticias.map(n => `
    <div class="archive-card">
      <div class="archive-thumb tema-${n.tema ? n.tema.split('-')[1] : 'a'}">
        ${mediaConteudo(n)}
      </div>
      <div class="archive-body">
        <span class="tag tag-${n.categoria}">${n.categoriaLabel}</span>
        <h4>${n.titulo}</h4>
        <small>por ${n.fonte} · ${formatarData(n.data)}</small>
      </div>
    </div>
  `).join('');
}

document.addEventListener('DOMContentLoaded', carregarNoticias);
