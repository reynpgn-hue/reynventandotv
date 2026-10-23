// ---------------------------------------------------------
// loja.js — vitrine de produtos com links de afiliados
//
// Lê data/produtos.json e monta os cards. Pra adicionar ou
// tirar produto, edite só o JSON. Não precisa mexer aqui.
//
// O pagamento NÃO acontece no seu site: o botão leva o cliente
// pra loja (Amazon, Shopee, Mercado Livre...), que cuida do
// checkout, do pagamento e da entrega.
// ---------------------------------------------------------

(() => {
  'use strict';

  const SCRIPT_URL = document.currentScript && document.currentScript.src;
  const section = document.getElementById('loja');
  const filtrosBox = document.getElementById('loja-filtros');
  const grid = document.getElementById('loja-grid');
  const avisoAmazon = document.getElementById('loja-amazon');

  // Avisos de diagnóstico: só aparecem no seu computador (Live Server)
  // ou com ?debug no endereço. O visitante do site nunca vê.
  const IS_LOCAL = ['localhost', '127.0.0.1', '[::1]', ''].includes(location.hostname)
    || location.protocol === 'file:'
    || /[?&]debug\b/.test(location.search);

  function avisoLocal(texto) {
    console.error('Loja: ' + texto);
    if (!IS_LOCAL) return;
    let bar = document.getElementById('loja-aviso-local');
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'loja-aviso-local';
      bar.setAttribute('role', 'alert');
      bar.style.cssText = 'position:fixed;left:12px;right:12px;bottom:12px;z-index:99997;'
        + 'background:#7a0f26;color:#fff;font:14px/1.5 system-ui,sans-serif;'
        + 'padding:12px 44px 12px 16px;border-radius:10px;box-shadow:0 6px 24px rgba(0,0,0,.5)';
      const fechar = document.createElement('button');
      fechar.type = 'button';
      fechar.textContent = '\u00d7';
      fechar.setAttribute('aria-label', 'Fechar aviso');
      fechar.style.cssText = 'position:absolute;top:6px;right:10px;background:none;border:0;'
        + 'color:#fff;font-size:24px;line-height:1;cursor:pointer';
      fechar.addEventListener('click', () => bar.remove());
      bar.appendChild(fechar);
      document.body.appendChild(bar);
    }
    const linha = document.createElement('div');
    linha.textContent = '\u26a0 Loja: ' + texto;
    bar.appendChild(linha);
  }

  if (!section || !filtrosBox || !grid) {
    avisoLocal('o bloco com id="loja" não está neste index.html. '
      + 'Cole o conteúdo de bloco-loja.html e salve com Ctrl + S.');
    return;
  }

  const DATA_URL = SCRIPT_URL
    ? new URL('data/produtos.json', SCRIPT_URL).href
    : 'data/produtos.json';

  // cor da etiqueta de cada loja (aparece no canto da foto)
  const LOJAS = {
    amazon:       { nome: 'Amazon',        prep: 'na', fundo: '#ff9900', texto: '#111' },
    shopee:       { nome: 'Shopee',        prep: 'na', fundo: '#ee4d2d', texto: '#fff' },
    mercadolivre: { nome: 'Mercado Livre', prep: 'no', fundo: '#ffe600', texto: '#111' },
    magalu:       { nome: 'Magalu',        prep: 'no', fundo: '#0086ff', texto: '#fff' },
    aliexpress:   { nome: 'AliExpress',    prep: 'no', fundo: '#e62e04', texto: '#fff' },
  };

  let produtos = [];
  let categoriaAtual = 'Tudo';

  // ---------- dados ----------

  function infoLoja(p) {
    const base = LOJAS[String(p.loja || '').toLowerCase().replace(/[\s_-]/g, '')];
    if (base) return base;
    return { nome: p.lojaNome || 'Loja parceira', prep: 'em', fundo: '#3a3d47', texto: '#fff' };
  }

  function linkValido(p) {
    return /^https?:\/\//i.test(p.link || '') || (p.exemplo && p.link === '#');
  }

  // ---------- desenho ----------

  function criar(tag, classe, texto) {
    const e = document.createElement(tag);
    if (classe) e.className = classe;
    if (texto) e.textContent = texto;
    return e;
  }

  function montarCard(p) {
    const loja = infoLoja(p);
    const card = criar('article', 'loja-card');

    const foto = criar('div', 'loja-foto');
    const semFoto = () => {
      if (foto.querySelector('.loja-sem-foto')) return;
      foto.appendChild(criar('span', 'loja-sem-foto', 'Sem foto'));
    };
    if (p.imagem) {
      const img = new Image();
      img.alt = p.nome || '';
      img.loading = 'lazy';
      img.decoding = 'async';
      img.addEventListener('error', () => { img.remove(); semFoto(); });
      img.src = p.imagem;
      foto.appendChild(img);
    } else {
      semFoto();
    }

    const origem = criar('span', 'loja-origem', loja.nome);
    origem.style.setProperty('--origem-fundo', loja.fundo);
    origem.style.setProperty('--origem-texto', loja.texto);
    foto.appendChild(origem);

    if (p.destaque) foto.appendChild(criar('span', 'loja-selo', 'Escolha da casa'));
    card.appendChild(foto);

    const corpo = criar('div', 'loja-corpo');
    if (p.categoria) corpo.appendChild(criar('span', 'loja-categoria', p.categoria));
    corpo.appendChild(criar('h3', 'loja-nome', p.nome || 'Produto'));
    if (p.descricao) corpo.appendChild(criar('p', 'loja-desc', p.descricao));

    const cta = criar('a', 'loja-cta', 'Ver ' + loja.prep + ' ' + loja.nome);
    cta.href = p.link;
    if (p.link !== '#') {
      cta.target = '_blank';
      // "sponsored" avisa o Google que é link pago/afiliado
      cta.rel = 'sponsored noopener noreferrer';
    }
    cta.setAttribute('aria-label', 'Ver ' + (p.nome || 'produto') + ' ' + loja.prep + ' ' + loja.nome + ' (abre em nova aba)');
    corpo.appendChild(cta);

    if (p.exemplo) corpo.appendChild(criar('span', 'loja-exemplo', 'Exemplo: só aparece no seu computador.'));

    card.appendChild(corpo);
    return card;
  }

  function desenhar() {
    const lista = categoriaAtual === 'Tudo'
      ? produtos
      : produtos.filter(p => p.categoria === categoriaAtual);
    grid.replaceChildren(...lista.map(montarCard));
  }

  function montarFiltros() {
    const categorias = ['Tudo'];
    produtos.forEach(p => {
      if (p.categoria && !categorias.includes(p.categoria)) categorias.push(p.categoria);
    });

    if (categorias.length <= 2) { // só 1 categoria: filtro não serve pra nada
      filtrosBox.hidden = true;
      return;
    }

    filtrosBox.replaceChildren(...categorias.map(cat => {
      const b = criar('button', 'loja-chip', cat);
      b.type = 'button';
      b.setAttribute('aria-pressed', String(cat === categoriaAtual));
      b.addEventListener('click', () => {
        categoriaAtual = cat;
        filtrosBox.querySelectorAll('.loja-chip').forEach(x =>
          x.setAttribute('aria-pressed', String(x.textContent === cat)));
        desenhar();
      });
      return b;
    }));
  }

  // ---------- início ----------

  function init(lista) {
    if (!Array.isArray(lista)) {
      throw new Error('o produtos.json precisa começar com [ e terminar com ].');
    }

    produtos = lista
      .filter(p => p && typeof p === 'object' && p.nome)
      .filter(p => IS_LOCAL || !p.exemplo)   // exemplos só aparecem no seu computador
      .filter(p => {
        if (linkValido(p)) return true;
        avisoLocal('o produto "' + p.nome + '" ficou de fora: o link precisa começar com https://');
        return false;
      });

    if (produtos.length === 0) {
      if (IS_LOCAL) avisoLocal('nenhum produto com link válido no produtos.json.');
      section.hidden = true; // loja vazia não aparece pro visitante
      return;
    }

    // a frase da Amazon só aparece se tem produto da Amazon na vitrine
    if (avisoAmazon) {
      avisoAmazon.hidden = !produtos.some(p => infoLoja(p).nome === 'Amazon');
    }

    montarFiltros();
    desenhar();
  }

  fetch(DATA_URL)
    .then(r => {
      if (!r.ok) {
        throw new Error(r.status === 404
          ? 'não achei ' + DATA_URL + ' (erro 404). O arquivo precisa estar em public/data/.'
          : 'erro ' + r.status + ' ao abrir ' + DATA_URL + '.');
      }
      return r.text();
    })
    .then(texto => {
      let lista;
      try {
        lista = JSON.parse(texto);
      } catch (e) {
        throw new Error('o produtos.json tem erro de escrita (' + e.message + '). '
          + 'Quase sempre é vírgula sobrando ou faltando, ou aspas.');
      }
      init(lista);
    })
    .catch(err => {
      avisoLocal(err.message);
      section.hidden = true;
    });
})();
