// ---------------------------------------------------------
// noticias-extra.js — seção "Além dos games"
//
// Lê data/noticias-extra.json (gerado pelo robô
// ingest/fetch-newsdata.js) e monta as abas de tecnologia,
// filmes, séries e TV, shows e música.
// Não precisa mexer neste arquivo pra trocar notícias.
// ---------------------------------------------------------

(() => {
  'use strict';

  const SCRIPT_URL = document.currentScript && document.currentScript.src;
  const section = document.getElementById('noticias-extra');
  const tabsBox = document.getElementById('nx-tabs');
  const grid = document.getElementById('nx-grid');
  const atualizado = document.getElementById('nx-atualizado');

  // Avisos de diagnóstico: só aparecem no seu computador (Live Server)
  // ou com ?debug no endereço. O visitante do site nunca vê.
  const IS_LOCAL = ['localhost', '127.0.0.1', '[::1]', ''].includes(location.hostname)
    || location.protocol === 'file:'
    || /[?&]debug\b/.test(location.search);

  function avisoLocal(texto) {
    console.error('Notícias extras: ' + texto);
    if (!IS_LOCAL) return;
    let bar = document.getElementById('nx-aviso');
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'nx-aviso';
      bar.setAttribute('role', 'alert');
      bar.style.cssText = 'position:fixed;left:12px;right:12px;bottom:12px;z-index:99998;'
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
    linha.textContent = '\u26a0 Notícias extras: ' + texto;
    bar.appendChild(linha);
  }

  if (!section || !tabsBox || !grid) {
    avisoLocal('o bloco com id="noticias-extra" não está neste index.html. '
      + 'Cole o conteúdo de bloco-noticias-extra.html e salve com Ctrl + S.');
    return;
  }

  const DATA_URL = SCRIPT_URL
    ? new URL('data/noticias-extra.json', SCRIPT_URL).href
    : 'data/noticias-extra.json';

  const ABAS = [
    { id: 'tecnologia', rotulo: 'Tecnologia', glifo: 'TECH' },
    { id: 'filmes', rotulo: 'Filmes', glifo: 'CINE' },
    { id: 'series', rotulo: 'Séries e TV', glifo: 'TV' },
    { id: 'shows', rotulo: 'Shows e música', glifo: 'SHOW' },
  ];
  const POR_ABA = 7;  // 1 notícia em faixa + 6 cards

  let abasAtivas = [];   // abas que têm notícia pra mostrar
  let dadosPorAba = {};
  let atual = null;

  // ---------- dados ----------

  function linkValido(n) {
    return /^https?:\/\//i.test(n.link || '') || (n.exemplo && n.link === '#');
  }

  function visiveis(lista) {
    return (Array.isArray(lista) ? lista : [])
      .filter(n => n && typeof n.titulo === 'string' && n.titulo.trim() !== '')
      .filter(n => IS_LOCAL || !n.exemplo)   // exemplos só aparecem no seu computador
      .filter(linkValido)
      .slice(0, POR_ABA);
  }

  function formatarData(iso) {
    if (!iso) return '';
    const d = new Date(iso + 'T00:00:00');
    if (isNaN(d)) return '';
    return d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' });
  }

  // ---------- desenho ----------

  function criar(tag, classe, texto) {
    const e = document.createElement(tag);
    if (classe) e.className = classe;
    if (texto) e.textContent = texto;
    return e;
  }

  function montarCard(n, aba, lead) {
    const a = criar('a', 'nx-card' + (lead ? ' nx-lead' : ''));
    a.href = n.link;
    if (n.link !== '#') {
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
    }

    const thumb = criar('div', 'nx-thumb');
    thumb.dataset.cat = aba.id;

    const mostrarGlifo = () => {
      if (thumb.querySelector('.nx-glifo')) return;
      thumb.appendChild(criar('span', 'nx-glifo', aba.glifo));
    };

    if (n.imagem && /^https?:\/\//i.test(n.imagem)) {
      const img = new Image();
      img.alt = '';
      img.loading = 'lazy';
      img.decoding = 'async';
      img.referrerPolicy = 'no-referrer'; // alguns sites bloqueiam foto quando chega o endereço do seu site
      img.addEventListener('error', () => { img.remove(); mostrarGlifo(); });
      img.src = n.imagem;
      thumb.appendChild(img);
    } else {
      mostrarGlifo();
    }
    a.appendChild(thumb);

    const corpo = criar('div', 'nx-corpo');
    const meta = criar('div', 'nx-meta');
    meta.appendChild(criar('span', 'nx-fonte', n.fonte || 'Fonte'));
    meta.appendChild(criar('span', 'nx-data', formatarData(n.data)));
    corpo.appendChild(meta);
    corpo.appendChild(criar('h3', 'nx-titulo', n.titulo));
    if (n.resumo) corpo.appendChild(criar('p', 'nx-resumo', n.resumo));
    a.appendChild(corpo);
    return a;
  }

  function mostrarAba(id, animar) {
    atual = id;
    const aba = ABAS.find(x => x.id === id);

    tabsBox.querySelectorAll('.nx-tab').forEach(btn => {
      const ativo = btn.dataset.aba === id;
      btn.setAttribute('aria-selected', String(ativo));
      btn.tabIndex = ativo ? 0 : -1;
    });
    grid.setAttribute('aria-labelledby', 'nx-tab-' + id);

    grid.replaceChildren(...dadosPorAba[id].map((n, i) => montarCard(n, aba, i === 0 && dadosPorAba[id].length >= 3)));

    if (animar) {
      grid.classList.remove('is-trocando');
      void grid.offsetWidth;
      grid.classList.add('is-trocando');
    }
  }

  function montarAbas() {
    tabsBox.replaceChildren(...abasAtivas.map(aba => {
      const b = criar('button', 'nx-tab', aba.rotulo);
      b.type = 'button';
      b.id = 'nx-tab-' + aba.id;
      b.dataset.aba = aba.id;
      b.setAttribute('role', 'tab');
      b.addEventListener('click', () => mostrarAba(aba.id, true));
      return b;
    }));

    // setas do teclado trocam de aba
    tabsBox.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      const i = abasAtivas.findIndex(a => a.id === atual);
      const n = abasAtivas.length;
      const prox = abasAtivas[(i + (e.key === 'ArrowRight' ? 1 : -1) + n) % n];
      mostrarAba(prox.id, true);
      document.getElementById('nx-tab-' + prox.id).focus();
      e.preventDefault();
    });
  }

  // ---------- início ----------

  function init(json) {
    const cats = json && json.categorias;
    if (!cats || typeof cats !== 'object') {
      throw new Error('o noticias-extra.json precisa ter o campo "categorias".');
    }

    ABAS.forEach(aba => {
      const lista = visiveis(cats[aba.id]);
      if (lista.length > 0) {
        dadosPorAba[aba.id] = lista;
        abasAtivas.push(aba);
      }
    });

    if (abasAtivas.length === 0) {
      if (IS_LOCAL) avisoLocal('ainda não há notícias no noticias-extra.json. Rode o robô: node ingest/fetch-newsdata.js');
      section.hidden = true;
      return;
    }

    const temExemplo = abasAtivas.some(a => dadosPorAba[a.id].some(n => n.exemplo));
    if (temExemplo) {
      atualizado.textContent = 'Conteúdo de exemplo: só aparece no seu computador.';
    } else if (json.atualizadoEm) {
      const d = new Date(json.atualizadoEm);
      if (!isNaN(d)) {
        atualizado.textContent = 'Atualizado em ' + d.toLocaleString('pt-BR', {
          day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
        });
      }
    }

    montarAbas();
    mostrarAba(abasAtivas[0].id, false);
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
      let json;
      try {
        json = JSON.parse(texto);
      } catch (e) {
        throw new Error('o noticias-extra.json tem erro de escrita (' + e.message + ').');
      }
      init(json);
    })
    .catch(err => {
      avisoLocal(err.message);
      section.hidden = true;
    });
})();
