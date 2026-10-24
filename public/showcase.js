// ---------------------------------------------------------
// showcase.js — janela de apresentação (fotos e vídeos em loop)
//
// Lê data/destaques.json e monta os slides. Pra trocar o
// conteúdo, edite só o JSON e a pasta assets/destaques/.
// Não precisa mexer neste arquivo.
// ---------------------------------------------------------

(() => {
  'use strict';

  const SCRIPT_URL = document.currentScript && document.currentScript.src;
  const section = document.getElementById('streamers');
  const stage = document.getElementById('showcase-stage');

  // Avisos de diagnóstico: só aparecem rodando no seu computador
  // (Live Server / localhost) ou se o endereço terminar com ?debug.
  // No site publicado o visitante nunca vê isso.
  const IS_LOCAL = ['localhost', '127.0.0.1', '[::1]', ''].includes(location.hostname)
    || location.protocol === 'file:'
    || /[?&]debug\b/.test(location.search);

  function avisoLocal(texto) {
    console.error('Janela de streamers: ' + texto);
    if (!IS_LOCAL) return;
    let bar = document.getElementById('showcase-aviso');
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'showcase-aviso';
      bar.setAttribute('role', 'alert');
      bar.style.cssText = 'position:fixed;left:12px;right:12px;bottom:12px;z-index:99999;'
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
    linha.textContent = '\u26a0 Janela de streamers: ' + texto;
    bar.appendChild(linha);
  }

  if (!section || !stage) {
    avisoLocal('o bloco com id="streamers" não está neste index.html. '
      + 'Cole o conteúdo de bloco-streamers.html logo depois do hero e salve com Ctrl + S.');
    return;
  }

  const DATA_URL = SCRIPT_URL
    ? new URL('data/destaques.json', SCRIPT_URL).href
    : 'data/destaques.json';
  const IMAGE_MS = 6500;      // tempo de cada foto
  const VIDEO_MAX_MS = 20000; // vídeo mais longo que isso é cortado
  const FADE_MS = 700;        // mesmo valor do transition no CSS

  const slidesBox = stage.querySelector('.showcase-slides');
  const progressBox = stage.querySelector('.showcase-progress');
  const sweep = stage.querySelector('.showcase-sweep');
  const caption = stage.querySelector('.showcase-caption');
  const nameEl = stage.querySelector('.showcase-name');
  const handleEl = stage.querySelector('.showcase-handle');
  const platformEl = stage.querySelector('.showcase-platform');
  const linkEl = stage.querySelector('.showcase-link');
  const btnPrev = stage.querySelector('.showcase-prev');
  const btnNext = stage.querySelector('.showcase-next');
  const btnPause = stage.querySelector('.showcase-pause');

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let slides = [];
  let index = -1;
  let userPaused = reduceMotion; // com "movimento reduzido" começa parado
  let inView = true;
  let pageVisible = !document.hidden;
  let elapsed = 0;
  let last = performance.now();

  // ---------- helpers ----------

  const goodCount = () => slides.filter(s => !s.broken).length;
  const multi = () => goodCount() > 1;
  const playing = () => !userPaused && inView && pageVisible;

  function inferType(item) {
    if (item.tipo === 'video' || item.tipo === 'imagem') return item.tipo;
    return /\.(mp4|webm|mov)(\?|$)/i.test(item.src || '') ? 'video' : 'imagem';
  }

  // ---------- montagem ----------

  function buildSlide(item, i) {
    const isVideo = item.tipo === 'video';
    const el = document.createElement('div');
    el.className = 'showcase-slide';
    el.setAttribute('aria-hidden', 'true');

    let media;
    if (isVideo) {
      media = document.createElement('video');
      media.muted = true;
      media.defaultMuted = true;
      media.playsInline = true;
      media.setAttribute('playsinline', '');
      media.setAttribute('muted', '');
      media.disablePictureInPicture = true;
      media.preload = 'none';
      if (item.poster) media.poster = item.poster;
      media.setAttribute('aria-label', item.alt || item.nome || 'Vídeo');
    } else {
      media = new Image();
      media.alt = item.alt || item.nome || '';
      media.decoding = 'async';
      media.draggable = false;
    }
    el.appendChild(media);
    slidesBox.appendChild(el);

    const seg = document.createElement('button');
    seg.type = 'button';
    seg.className = 'showcase-seg';
    seg.setAttribute('aria-label', 'Ver ' + (item.nome || 'destaque ' + (i + 1)));
    seg.innerHTML = '<i></i>';
    progressBox.appendChild(seg);

    const s = {
      item, el, media, isVideo, seg,
      fill: seg.firstChild,
      durMs: item.duracao > 0 ? item.duracao * 1000 : IMAGE_MS,
      capMs: item.duracao > 0 ? item.duracao * 1000 : VIDEO_MAX_MS,
      loaded: false,
      broken: false,
      timer: null,
    };

    media.addEventListener('error', () => breakSlide(s));
    seg.addEventListener('click', () => show(i));
    return s;
  }

  function load(s) {
    if (!s || s.loaded) return;
    s.loaded = true;
    s.media.src = s.item.src;
    if (s.isVideo) {
      s.media.preload = 'auto';
      s.media.load();
    }
  }

  function breakSlide(s) {
    if (s.broken) return;
    s.broken = true;
    s.seg.hidden = true;
    avisoLocal('não achei o arquivo ' + (s.media.currentSrc || s.media.src || s.item.src)
      + ' . Confira se ele está nessa pasta e se o nome é igual ao do destaques.json '
      + '(maiúscula/minúscula e .jpg x .jpeg).');
    if (goodCount() === 0) {
      avisoLocal('nenhuma foto ou vídeo carregou, por isso o banner ficou escondido.');
      section.hidden = true;
      return;
    }
    section.classList.toggle('is-single', !multi());
    if (slides[index] === s) step(1);
  }

  // ---------- troca de slide ----------

  function show(i, instant) {
    const n = slides.length;
    const target = ((i % n) + n) % n;
    const cur = slides[target];
    if (cur.broken) {
      if (goodCount() === 0) return;
      return step(1);
    }

    const prev = slides[index];
    if (prev && prev !== cur) deactivate(prev);

    index = target;
    clearTimeout(cur.timer);
    cur.el.classList.remove('is-leaving');
    load(cur);
    load(slides[peek(index, 1)]); // já carrega o próximo

    cur.el.classList.add('is-active');
    cur.el.removeAttribute('aria-hidden');
    cur.el.style.setProperty('--dur', (cur.isVideo ? 0 : cur.durMs) + 'ms');
    if (cur.isVideo) {
      try { cur.media.currentTime = 0; } catch (e) { /* ainda sem metadados */ }
    }

    elapsed = 0;
    updateSegments();
    updateCaption(cur);
    if (!instant && !reduceMotion) runSweep();
    applyPlayState();
  }

  function deactivate(s) {
    s.el.classList.remove('is-active');
    s.el.classList.add('is-leaving'); // segura a animação durante o fade
    s.el.setAttribute('aria-hidden', 'true');
    clearTimeout(s.timer);
    s.timer = setTimeout(() => {
      s.el.classList.remove('is-leaving');
      if (s.isVideo) s.media.pause();
    }, FADE_MS + 100);
  }

  function peek(from, dir) {
    const n = slides.length;
    for (let k = 1; k <= n; k++) {
      const j = (((from + dir * k) % n) + n) % n;
      if (!slides[j].broken) return j;
    }
    return from;
  }

  function step(dir) {
    show(peek(index, dir));
  }

  function updateSegments() {
    slides.forEach((s, k) => {
      s.seg.classList.toggle('is-done', k < index);
      s.seg.setAttribute('aria-current', k === index ? 'true' : 'false');
      s.fill.style.transform = '';
    });
  }

  function updateCaption(s) {
    const it = s.item;
    nameEl.textContent = it.nome || '';
    handleEl.textContent = it.handle || '';
    handleEl.hidden = !it.handle;
    platformEl.textContent = it.plataforma || '';
    platformEl.hidden = !it.plataforma;

    if (it.link && it.link !== '#') {
      linkEl.href = it.link;
      linkEl.setAttribute('aria-label', 'Ver perfil de ' + (it.nome || 'streamer'));
      linkEl.hidden = false;
    } else {
      linkEl.hidden = true;
    }

    caption.classList.remove('is-in');
    void caption.offsetWidth; // reinicia a animação da legenda
    caption.classList.add('is-in');
  }

  function runSweep() {
    sweep.classList.remove('run');
    void sweep.offsetWidth;
    sweep.classList.add('run');
  }

  sweep.addEventListener('animationend', () => sweep.classList.remove('run'));

  // ---------- play / pause ----------

  function applyPlayState() {
    const s = slides[index];
    if (!s || !s.isVideo) return;
    s.media.loop = !multi(); // se só tem um slide, o vídeo repete
    if (playing()) {
      const p = s.media.play();
      if (p && p.catch) p.catch(() => {});
    } else {
      s.media.pause();
    }
  }

  function setUserPaused(value) {
    userPaused = value;
    stage.classList.toggle('is-paused', userPaused);
    btnPause.setAttribute('aria-pressed', String(userPaused));
    btnPause.setAttribute('aria-label', userPaused ? 'Retomar apresentação' : 'Pausar apresentação');
    applyPlayState();
  }

  // ---------- relógio ----------

  function tick(now) {
    const dt = Math.min(now - last, 120);
    last = now;

    const s = slides[index];
    if (s && playing() && multi()) {
      elapsed += dt;
      let frac;

      if (s.isVideo) {
        const v = s.media;
        const dur = isFinite(v.duration) && v.duration > 0
          ? Math.min(v.duration * 1000, s.capMs)
          : s.capMs;
        const t = v.currentTime * 1000;
        frac = t / dur;
        const nuncaComecou = t < 50 && elapsed > 4000;       // autoplay bloqueado ou travou
        const passouDemais = elapsed > dur + 10000;          // rede lenta
        if (v.ended || nuncaComecou || passouDemais) frac = 1;
      } else {
        frac = elapsed / s.durMs;
      }

      s.fill.style.transform = 'scaleX(' + Math.min(frac, 1) + ')';
      if (frac >= 1) step(1);
    }

    requestAnimationFrame(tick);
  }

  // ---------- eventos ----------

  btnNext.addEventListener('click', () => step(1));
  btnPrev.addEventListener('click', () => step(-1));
  btnPause.addEventListener('click', () => setUserPaused(!userPaused));

  stage.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') { step(1); e.preventDefault(); }
    if (e.key === 'ArrowLeft') { step(-1); e.preventDefault(); }
  });

  // arrastar com o dedo (celular)
  let startX = null;
  slidesBox.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse') startX = e.clientX;
  });
  slidesBox.addEventListener('pointerup', (e) => {
    if (startX === null) return;
    const dx = e.clientX - startX;
    startX = null;
    if (Math.abs(dx) > 50) step(dx < 0 ? 1 : -1);
  });
  slidesBox.addEventListener('pointercancel', () => { startX = null; });

  document.addEventListener('visibilitychange', () => {
    pageVisible = !document.hidden;
    last = performance.now();
    applyPlayState();
  });

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      applyPlayState();
    }, { threshold: 0.2 }).observe(stage);
  }

  // ---------- início ----------

  function init(list) {
    if (!Array.isArray(list)) {
      throw new Error('o destaques.json precisa começar com [ e terminar com ].');
    }

    const items = list
      .filter(it => it && typeof it.src === 'string' && it.src.trim() !== '')
      .filter(it => IS_LOCAL || !it.exemplo)   // itens com "exemplo": true só aparecem no seu computador
      .map(it => ({ ...it, tipo: inferType(it) }));

    if (items.length === 0) {
      throw new Error('o destaques.json está vazio, ou nenhum item tem o campo "src".');
    }

    if (getComputedStyle(stage).position !== 'relative') {
      avisoLocal('o showcase.css não carregou. Ele precisa estar em public/, ao lado do index.html.');
    }

    slides = items.map(buildSlide);
    section.classList.toggle('is-single', slides.length < 2);
    setUserPaused(userPaused);
    show(0, true);
    requestAnimationFrame(tick);
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
        throw new Error('o destaques.json tem erro de escrita (' + e.message + '). '
          + 'Quase sempre é vírgula sobrando ou faltando, ou aspas.');
      }
      init(lista);
    })
    .catch(err => {
      avisoLocal(err.message);
      section.hidden = true;
    });
})();
