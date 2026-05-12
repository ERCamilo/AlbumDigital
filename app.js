/**
 * ╔═══════════════════════════════════════════════════════════╗
 * ║  PageAlbum — Sistema de Pantallas con Transiciones       ║
 * ║  Uso:                                                     ║
 * ║    const a = new PageAlbum('#album-root', {               ║
 * ║      transition: 'gift' // gift|swipe|balloon|candle|envelope ║
 * ║    });                                                    ║
 * ║    a.screen('Familia',{emoji:'👨‍👩‍👧',color:'pink'})        ║
 * ║      .foto(src, opts).collage([...], opts);               ║
 * ║    a.render();                                            ║
 * ╚═══════════════════════════════════════════════════════════╝
 */

/* ── Inyectar CSS ── */
(function injectCSS() {
  const style = document.createElement('style');
  style.textContent = `
/* ═══════════════════════════════
   PAGE-ALBUM: Base
═══════════════════════════════ */
.pa-container { position: relative; width: 100%; overflow: visible; }
.pa-screen {
  display: none; flex-direction: column; align-items: center;
  position: relative;
  isolation: isolate;
  width: calc(100% + 32px); margin-left: -16px;
  min-height: 100vh; min-height: 100dvh;
  padding: 0 16px max(40px, env(safe-area-inset-bottom));
  box-sizing: border-box;
  animation: paFadeIn .6s ease both;
}
.pa-screen.active { display: flex; }
.pa-screen-bg {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background-size: cover;
  background-position: center center;
  background-repeat: no-repeat;
}
.pa-screen-header,
.pa-screen-content,
.pa-screen .album-section,
.pa-screen .anim-target {
  position: relative;
  z-index: 2;
}
.pa-screen.active .anim-target {
  opacity: 1;
}
.pa-screen.active .col-cell,
.pa-screen.active .wish-item,
.pa-screen.active .stat-box,
.pa-screen.active .scatter-item {
  opacity: 1;
  transform: none;
}
@keyframes paFadeIn { from { opacity:0; transform:translateY(30px); } to { opacity:1; transform:translateY(0); } }
@keyframes paFadeOut { from { opacity:1; transform:translateY(0); } to { opacity:0; transform:translateY(-40px); } }
.pa-screen.exiting { animation: paFadeOut .5s ease both; }

/* ── Barra de progreso ── */
.pa-progress {
  position: fixed; top: 10px; left: 50%; transform: translateX(-50%);
  display: flex; gap: 6px; z-index: 9500;
  background: rgba(15,10,35,.5); backdrop-filter: blur(8px);
  border: 1px solid rgba(168,85,247,.15); border-radius: 20px;
  padding: 5px 10px;
  opacity: 0.15; transition: opacity .4s ease;
}
.pa-progress:hover, .pa-progress.visible { opacity: 1; }
.pa-dot {
  width: 8px; height: 8px; border-radius: 50%;
  background: rgba(255,255,255,.2); cursor: pointer;
  transition: all .3s ease; border: none; padding: 0;
}
.pa-dot.active {
  background: linear-gradient(135deg, #a855f7, #f472b6);
  box-shadow: 0 0 8px rgba(168,85,247,.5);
  transform: scale(1.4);
}
.pa-dot:hover { background: rgba(255,255,255,.5); }

/* ── Encabezado de pantalla ── */
.pa-screen-header {
  text-align: center; padding: 30px 16px 10px; width: 100%;
}
.pa-screen-emoji { font-size: 48px; display: block; margin-bottom: 6px; animation: bounce 1.3s ease-in-out infinite; }
.pa-screen-title {
  font-family: 'Pacifico', cursive; font-size: clamp(26px, 7vw, 40px);
  background-clip: text; -webkit-background-clip: text; -webkit-text-fill-color: transparent;
}

/* ── Contenido de pantalla ── */
.pa-screen-content {
  width: 100%; max-width: 460px; padding: 0 16px;
  display: flex; flex-direction: column; align-items: center; gap: 16px;
}

/* ═══════════════════════════════
   TRANSICIÓN: GIFT (Caja de regalo)
═══════════════════════════════ */
.pa-trigger-gift {
  position: relative; width: 140px; height: 160px;
  margin: 40px auto 20px; cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}
.gift-box {
  position: absolute; bottom: 0; width: 120px; height: 90px; left: 10px;
  background: linear-gradient(135deg, #a855f7, #7c3aed);
  border-radius: 8px; box-shadow: 0 8px 25px rgba(124,58,237,.5);
}
.gift-box::before {
  content: ''; position: absolute; top: 0; left: 50%; width: 22px; height: 100%;
  transform: translateX(-50%); background: linear-gradient(135deg, #f9c846, #fb923c);
  border-radius: 2px;
}
.gift-lid {
  position: absolute; bottom: 90px; left: 2px; width: 136px; height: 28px;
  background: linear-gradient(135deg, #c084fc, #a855f7);
  border-radius: 6px 6px 2px 2px; transition: transform .6s cubic-bezier(.34,1.5,.64,1);
  transform-origin: center bottom; box-shadow: 0 -4px 15px rgba(168,85,247,.3);
}
.gift-lid::before {
  content: ''; position: absolute; top: -16px; left: 50%; transform: translateX(-50%);
  width: 40px; height: 20px; border: 4px solid #f9c846; border-bottom: none;
  border-radius: 20px 20px 0 0;
}
.gift-label {
  position: absolute; bottom: -30px; width: 100%; text-align: center;
  font-size: 13px; color: rgba(240,230,255,.6); letter-spacing: 2px;
  text-transform: uppercase; animation: nudge 2s ease-in-out infinite;
}
.pa-trigger-gift:hover .gift-lid,
.pa-trigger-gift.opening .gift-lid {
  transform: translateY(-40px) rotate(-25deg);
}
.pa-trigger-gift.opening .gift-box {
  animation: giftShake .4s ease;
}
@keyframes giftShake {
  0%,100% { transform: rotate(0); }
  25% { transform: rotate(-5deg); }
  75% { transform: rotate(5deg); }
}

/* ═══════════════════════════════
   TRANSICIÓN: BALLOON (Globo)
═══════════════════════════════ */
.pa-trigger-balloon {
  position: relative; margin: 34px auto 18px;
  cursor: pointer; -webkit-tap-highlight-color: transparent;
  text-align: center;
  min-height: 190px;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
}
.balloon-wrap {
  display: inline-block; animation: balloonFloat 2.5s ease-in-out infinite;
}
.balloon-body {
  width: 80px; height: 100px; border-radius: 50% 50% 50% 50% / 60% 60% 40% 40%;
  background: linear-gradient(135deg, #f472b6, #ec4899);
  box-shadow: inset -10px -10px 30px rgba(0,0,0,.15), 0 10px 30px rgba(244,114,182,.4);
  position: relative; margin: 0 auto;
}
.balloon-body::after {
  content: ''; position: absolute; bottom: -12px; left: 50%; transform: translateX(-50%);
  width: 0; height: 0; border-left: 8px solid transparent;
  border-right: 8px solid transparent; border-top: 14px solid #ec4899;
}
.balloon-string {
  width: 2px; height: 60px; background: rgba(255,255,255,.3);
  margin: 0 auto; border-radius: 1px;
}
.balloon-text {
  font-size: 13px; color: rgba(240,230,255,.6); letter-spacing: 2px;
  text-transform: uppercase; margin-top: 10px;
}
@keyframes balloonFloat {
  0%, 100% { transform: translateY(0) rotate(-2deg); }
  50% { transform: translateY(-15px) rotate(2deg); }
}
.pa-trigger-balloon.popping .balloon-body {
  animation: balloonPop .3s ease forwards;
}
@keyframes balloonPop {
  0% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.4); opacity: .8; }
  100% { transform: scale(0); opacity: 0; }
}

/* ═══════════════════════════════
   TRANSICIÓN: CANDLE (Vela)
═══════════════════════════════ */
.pa-trigger-candle {
  position: relative; margin: 34px auto 18px;
  cursor: pointer; -webkit-tap-highlight-color: transparent;
  text-align: center;
  min-height: 170px;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
}
.candle-wrap { display: inline-block; position: relative; }
.candle-body {
  width: 30px; height: 80px; background: linear-gradient(to bottom, #fef3c7, #fbbf24);
  border-radius: 4px 4px 2px 2px; margin: 0 auto; position: relative;
  box-shadow: 0 5px 20px rgba(251,191,36,.3);
}
.candle-body::before {
  content: ''; position: absolute; top: -8px; left: 50%; transform: translateX(-50%);
  width: 3px; height: 12px; background: #666; border-radius: 1px;
}
.candle-flame {
  position: absolute; top: -35px; left: 50%; transform: translateX(-50%);
  width: 16px; height: 28px;
  background: radial-gradient(ellipse at bottom, #fbbf24, #f97316, transparent 70%);
  border-radius: 50% 50% 50% 50% / 60% 60% 40% 40%;
  animation: flameFlicker 0.4s ease-in-out infinite alternate;
  filter: blur(1px);
}
.candle-glow {
  position: absolute; top: -50px; left: 50%; transform: translateX(-50%);
  width: 60px; height: 60px; background: radial-gradient(circle, rgba(251,191,36,.3), transparent 70%);
  border-radius: 50%;
}
.candle-text {
  font-size: 13px; color: rgba(240,230,255,.6); letter-spacing: 2px;
  text-transform: uppercase; margin-top: 16px;
}
@keyframes flameFlicker {
  0% { transform: translateX(-50%) scale(1) rotate(-3deg); }
  100% { transform: translateX(-50%) scale(1.1) rotate(3deg); }
}
.pa-trigger-candle.blowing .candle-flame {
  animation: blowOut .5s ease forwards;
}
@keyframes blowOut {
  0% { opacity: 1; transform: translateX(-50%) scale(1); }
  60% { opacity: .6; transform: translateX(-30%) scale(1.3, .5) skewX(-20deg); }
  100% { opacity: 0; transform: translateX(-20%) scale(0); }
}
.pa-trigger-candle.blowing .candle-glow {
  animation: glowFade .5s ease forwards;
}
@keyframes glowFade { to { opacity: 0; } }

/* ═══════════════════════════════
   TRANSICIÓN: ENVELOPE (Sobre)
═══════════════════════════════ */
.pa-trigger-envelope {
  position: relative; margin: 34px auto 18px;
  cursor: pointer; -webkit-tap-highlight-color: transparent;
  text-align: center;
  min-height: 160px;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
}
.envelope-wrap {
  width: 160px; height: 110px; position: relative;
  margin: 0 auto; perspective: 600px;
}
.envelope-body {
  width: 100%; height: 100%; background: linear-gradient(135deg, #818cf8, #6366f1);
  border-radius: 4px; position: relative; overflow: visible;
  box-shadow: 0 8px 25px rgba(99,102,241,.4);
}
.envelope-flap {
  position: absolute; top: 0; left: 0; width: 100%; height: 55px;
  background: linear-gradient(135deg, #a78bfa, #818cf8);
  clip-path: polygon(0 0, 50% 100%, 100% 0);
  transform-origin: top center; transition: transform .6s cubic-bezier(.34,1.5,.64,1);
  z-index: 2;
}
.envelope-card {
  position: absolute; top: 10px; left: 15px; right: 15px; height: 70px;
  background: linear-gradient(135deg, rgba(255,255,255,.95), rgba(240,230,255,.95));
  border-radius: 4px; display: flex; align-items: center; justify-content: center;
  font-size: 14px; color: #4c1d95; font-weight: 700; letter-spacing: 1px;
  transition: transform .6s cubic-bezier(.34,1.5,.64,1) .1s;
  z-index: 1;
}
.envelope-text {
  font-size: 13px; color: rgba(240,230,255,.6); letter-spacing: 2px;
  text-transform: uppercase; margin-top: 16px;
}
.pa-trigger-envelope:hover .envelope-flap,
.pa-trigger-envelope.opening .envelope-flap {
  transform: rotateX(-180deg);
}
.pa-trigger-envelope.opening .envelope-card {
  transform: translateY(-50px);
}

/* ═══════════════════════════════
   TRANSICIÓN: SWIPE (Deslizar)
═══════════════════════════════ */
.pa-trigger-swipe {
  position: relative; margin: 24px auto 18px;
  cursor: pointer; -webkit-tap-highlight-color: transparent;
  text-align: center;
  width: 100%;
  padding: 0 12px;
  display: flex; justify-content: center;
}
.swipe-indicator {
  display: flex; align-items: center; justify-content: center; gap: 12px;
  max-width: min(340px, 100%);
  padding: 13px 18px;
  background: linear-gradient(135deg, rgba(168,85,247,.2), rgba(244,114,182,.2));
  border: 1px solid rgba(168,85,247,.3); border-radius: 30px;
  animation: swipePulse 2s ease-in-out infinite;
  box-shadow: 0 10px 24px rgba(15, 10, 35, .22);
}
.swipe-arrow {
  font-size: 22px; color: rgba(255,255,255,.7);
  animation: swipeArrow 1.5s ease-in-out infinite;
}
.swipe-label {
  min-width: 0;
  font-size: 13px; color: rgba(240,230,255,.84); letter-spacing: .3px;
  font-weight: 800;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
@keyframes swipePulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(168,85,247,.3); }
  50% { box-shadow: 0 0 0 10px rgba(168,85,247,0); }
}
@keyframes swipeArrow {
  0%, 100% { transform: translateX(0); }
  50% { transform: translateX(8px); }
}

/* ═══════════════════════════════
   OVERLAY DE OSCURECIMIENTO (para candle)
═══════════════════════════════ */
.pa-dark-overlay {
  position: fixed; inset: 0; background: #000; opacity: 0;
  z-index: 9400; pointer-events: none;
  transition: opacity .5s ease;
}
.pa-dark-overlay.active { opacity: .85; }

@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}
@keyframes nudge {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(5px); }
}

/* ═══════════════════════════════
   LIGHTBOX (foto a pantalla completa)
═══════════════════════════════ */
.pa-lightbox {
  position: fixed; inset: 0; z-index: 10000;
  background: rgba(0,0,0,.92); backdrop-filter: blur(16px);
  display: flex; align-items: center; justify-content: center;
  opacity: 0; visibility: hidden;
  transition: opacity .35s ease, visibility .35s ease;
  cursor: zoom-out; -webkit-tap-highlight-color: transparent;
}
.pa-lightbox.open { opacity: 1; visibility: visible; }
.pa-lightbox img {
  max-width: 92vw; max-height: 88vh;
  object-fit: contain; border-radius: 8px;
  box-shadow: 0 20px 60px rgba(0,0,0,.6);
  transform: scale(.85); opacity: 0;
  transition: transform .4s cubic-bezier(.34,1.5,.64,1), opacity .35s ease;
}
.pa-lightbox.open img { transform: scale(1); opacity: 1; }
.pa-lightbox-close {
  position: absolute; top: 16px; right: 20px;
  font-size: 28px; color: rgba(255,255,255,.7);
  background: rgba(255,255,255,.1); border: none;
  width: 44px; height: 44px; border-radius: 50%;
  cursor: pointer; transition: all .25s ease;
  display: flex; align-items: center; justify-content: center;
}
.pa-lightbox-close:hover { background: rgba(255,255,255,.25); color: #fff; }
/* Cursor pointer en fotos clickeables */
.photo-frame img, .col-cell img, .scatter-item img { cursor: zoom-in; }

/* ── Audio compacto (mini botón junto al título) ── */
.audio-card.compact { display: none !important; }
.audio-mini-inline {
  display: inline-flex; align-items: center; justify-content: center;
  width: 32px; height: 32px; border-radius: 50%;
  background: linear-gradient(135deg, #a855f7, #f472b6);
  border: none; color: #fff; font-size: 14px;
  cursor: pointer; vertical-align: middle; margin-left: 8px;
  box-shadow: 0 2px 10px rgba(168,85,247,.4);
  transition: transform .2s ease, box-shadow .2s ease;
  flex-shrink: 0;
}
.audio-mini-inline:hover {
  transform: scale(1.15);
  box-shadow: 0 4px 16px rgba(168,85,247,.6);
}
.audio-mini-inline.playing {
  background: linear-gradient(135deg, #f472b6, #a855f7);
  animation: pulse-glow 1.5s ease-in-out infinite;
}
@keyframes pulse-glow {
  0%, 100% { box-shadow: 0 2px 10px rgba(168,85,247,.4); }
  50% { box-shadow: 0 4px 20px rgba(244,114,182,.6); }
}
  `;
  document.head.appendChild(style);
})();


/* ═══════════════════════════════
   LIGHTBOX — Foto a pantalla completa
═══════════════════════════════ */
(function initLightbox() {
  // Crear el elemento lightbox
  const lb = document.createElement('div');
  lb.className = 'pa-lightbox';
  lb.innerHTML = `<img src="" alt="">`;
  document.body.appendChild(lb);

  const lbImg = lb.querySelector('img');

  function open(src) {
    lbImg.src = src;
    // Forzar reflow para que la transición funcione
    void lb.offsetWidth;
    lb.classList.add('open');
  }

  function close() {
    lb.classList.remove('open');
  }

  // Cerrar al hacer clic en cualquier parte del lightbox
  lb.addEventListener('click', close);

  // Cerrar con Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') close();
  });

  // Delegación de eventos: clic en cualquier foto del álbum
  document.addEventListener('click', (e) => {
    const img = e.target.closest('.photo-frame img, .col-cell img, .scatter-item img');
    if (img && img.src) {
      e.stopPropagation();
      open(img.src);
    }
  });
})();


/* ═══════════════════════════════
   CLASE: ScreenBuilder (chainable)
═══════════════════════════════ */
class ScreenBuilder {
  constructor(container, albumAPI) {
    this._container = container;
    this._album = albumAPI;
    this._sections = [];
  }

  /** Ejecutar una función album.* y capturar el DOM que genera */
  _capture(fn) {
    const root = document.getElementById('album-root');
    const before = root.children.length;
    fn();
    // Mover los nuevos elementos al contenedor de esta pantalla
    while (root.children.length > before) {
      this._container.appendChild(root.children[before]);
    }
    return this;
  }

  foto(src, opts) { return this._capture(() => this._album.foto(src, opts)); }
  video(src, opts) { return this._capture(() => this._album.video(src, opts)); }
  gif(src, opts) { return this._capture(() => this._album.gif(src, opts)); }
  collage(fotos, opts) { return this._capture(() => this._album.collage(fotos, opts)); }
  mensaje(opts) { return this._capture(() => this._album.mensaje(opts)); }
  musica(opts) { return this._capture(() => this._album.musica(opts)); }
  deseos(lista) { return this._capture(() => this._album.deseos(lista)); }
  estadisticas(lista) { return this._capture(() => this._album.estadisticas(lista)); }
  separador(emojis) { return this._capture(() => this._album.separador(emojis)); }
  titulo(texto, sub, color) { return this._capture(() => this._album.titulo(texto, sub, color)); }
  inicio(opts) { return this._capture(() => this._album.inicio(opts)); }
  cierre(opts) { return this._capture(() => this._album.cierre(opts)); }
}


/* ═══════════════════════════════
   CLASE: PageAlbum (principal)
═══════════════════════════════ */
class PageAlbum {
  static _escapeHTML(value = '') {
    return String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  static _filterValue(filter = '') {
    const filters = {
      grayscale: 'grayscale(1)',
      bw: 'grayscale(1) contrast(1.18)',
      sepia: 'sepia(.78) saturate(.88)',
      warm: 'sepia(.25) saturate(1.25) contrast(1.05)',
      cool: 'saturate(.9) hue-rotate(18deg)',
      soft: 'brightness(1.08) contrast(.92) saturate(.9)'
    };
    return filters[filter] || '';
  }

  /**
   * @param {string} rootSelector - Selector del contenedor (#album-root)
   * @param {object} opts
   * @param {string} opts.transition - 'gift'|'swipe'|'balloon'|'candle'|'envelope'
   * @param {boolean} opts.progress - mostrar barra de progreso (default: true)
   */
  constructor(rootSelector, albumAPI, opts = {}) {
    this._root = document.querySelector(rootSelector);
    this._albumAPI = albumAPI;
    this._transition = opts.transition || 'gift';
    this._showProgress = opts.progress !== false;
    this._screens = [];
    this._screenAudios = []; // Arreglo para guardar las canciones de cada pantalla
    this._currentIndex = 0;
    this._transitioning = false;

    // Limpiar root
    this._root.innerHTML = '';
    this._root.classList.add('pa-container');

    // Limpiar todas las pistas previas si estamos en el Editor refrescando
    const oldPlayers = document.querySelectorAll('.pa-screen-music-player');
    oldPlayers.forEach(p => p.remove());
    const oldAudios = document.querySelectorAll('.pa-screen-audio');
    oldAudios.forEach(a => { a.pause(); a.remove(); });
  }

  /** Gradientes por color */
  static GRADIENTS = {
    pink: 'linear-gradient(135deg, #fce7f3 0%, #fbcfe8 100%)',
    yellow: 'linear-gradient(135deg, #fef9c3 0%, #fef08a 100%)',
    teal: 'linear-gradient(135deg, #ccfbf1 0%, #99f6e4 100%)',
    blue: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
    green: 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)',
    purple: 'linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 100%)'
  };

  /** Colores de globo por tema */
  static BALLOON_COLORS = {
    pink: ['#f472b6', '#ec4899', '#db2777'],
    yellow: ['#f9c846', '#fbbf24', '#f59e0b'],
    teal: ['#2dd4bf', '#14b8a6', '#0f766e'],
    blue: ['#60a5fa', '#3b82f6', '#2563eb'],
    green: ['#4ade80', '#22c55e', '#16a34a'],
    purple: ['#c084fc', '#a855f7', '#7e22ce'],
  };

  /** Construir a partir de JSON (Nuevo para el Album Builder) */
  static hydrate(rootSelector, albumAPI, json, startIndex = 0) {
    if (!json || !json.screens) return null;
    const pa = new PageAlbum(rootSelector, albumAPI, json.global || {});
    const sourceTypes = new Set(['foto', 'video', 'gif', 'collage']);

    json.screens.forEach(screenData => {
      const builder = pa.screen(screenData.name, screenData.opts);
      if (screenData.sections) {
        screenData.sections.forEach(sec => {
          // El nombre del tipo debe coincidir con el método del builder (ej. 'foto', 'collage', etc)
          if (typeof builder[sec.type] === 'function') {
            // Manejar diferentes formatos de parámetros (algunos tienen src(string/array) + opts, otros solo opts)
            if (sourceTypes.has(sec.type)) {
              const src = sec.src !== undefined ? sec.src : (sec.type === 'collage' ? [] : '');
              builder[sec.type](src, sec.data || {});
            } else {
              builder[sec.type](sec.data || {});
            }
          }
        });
      }
    });
    pa._currentIndex = startIndex >= 0 && startIndex < pa._screens.length ? startIndex : 0;

    // Configurar la pantalla activa inicial en base al startIndex
    pa._screens.forEach((s, idx) => {
      if (idx === pa._currentIndex) s.el.classList.add('active');
      else s.el.classList.remove('active');
    });

    return pa;
  }
  static BALLOON_COLORS = ['#f472b6', '#a855f7', '#2dd4bf', '#f9c846', '#60a5fa', '#4ade80'];

  /**
   * Crear una pantalla temática
   * @param {string} name - Nombre del tema
   * @param {object} opts - { emoji, color, music }
   * @returns {ScreenBuilder}
   */
  screen(name, opts = {}) {
    const idx = this._screens.length;
    const screenEl = document.createElement('div');
    screenEl.className = 'pa-screen';
    screenEl.dataset.index = idx;
    this._applyScreenBackground(screenEl, opts.background || {});
    // La clase active se asigna ahora en hydrate() o render()

    // Header
    const header = document.createElement('div');
    header.className = 'pa-screen-header';
    const grad = PageAlbum.GRADIENTS[opts.color] || PageAlbum.GRADIENTS.pink;
    header.innerHTML = `
      ${opts.emoji ? `<span class="pa-screen-emoji">${opts.emoji}</span>` : ''}
      <h2 class="pa-screen-title" style="background:${grad};background-clip:text;-webkit-background-clip:text;-webkit-text-fill-color:transparent">${name}</h2>
    `;
    screenEl.appendChild(header);

    // Reproductor de Música por Pantalla
    let screenAudioInfo = null;
    if (opts.music && opts.music.src) {
      const audio = new Audio(opts.music.src);
      audio.className = 'pa-screen-audio';
      audio.loop = opts.music.loop !== false;
      audio.volume = opts.music.volume !== undefined ? opts.music.volume : 0.5;
      document.body.appendChild(audio);

      const wrapper = document.createElement('div');
      wrapper.className = 'pa-screen-music-player';
      wrapper.style.cssText = 'position: fixed; bottom: 24px; left: 16px; z-index: 900; display: flex; align-items: center; gap: 0; pointer-events: auto; transition: all 0.3s ease;';

      const title = opts.music.title || 'Música de Fondo';
      wrapper.innerHTML = `
            <button class="btn-sm-play" style="width: 50px; height: 50px; border-radius: 50%; background: linear-gradient(135deg, #3b82f6, #06b6d4); border: 3px solid rgba(255,255,255,0.3); cursor: pointer; font-size: 20px; padding: 0; display: flex; align-items: center; justify-content: center; color: #fff; box-shadow: 0 0 20px rgba(59,130,246,0.6), 0 0 40px rgba(6,182,212,0.3); transition: transform 0.2s, box-shadow 0.2s; flex-shrink: 0; animation: musicBtnPulse 2s ease-in-out infinite; position: relative;">
                ▶️
            </button>
            <span class="music-title-label" style="font-weight: 600; color: #fff; white-space: nowrap; max-width: 0; overflow: hidden; opacity: 0; font-size: 12px; background: linear-gradient(135deg, rgba(59,130,246,0.85), rgba(6,182,212,0.85)); backdrop-filter: blur(8px); padding: 6px 0; border-radius: 0 20px 20px 0; transition: max-width 0.35s ease, opacity 0.3s ease, padding 0.3s ease;">🎵 ${title}</span>
        `;
      // Inject pulse animation if not already there
      if (!document.getElementById('music-btn-pulse-style')) {
        const style = document.createElement('style');
        style.id = 'music-btn-pulse-style';
        style.textContent = '@keyframes musicBtnPulse { 0%, 100% { box-shadow: 0 0 15px rgba(59,130,246,0.5), 0 0 0 0 rgba(59,130,246,0.4); transform: scale(1); } 50% { box-shadow: 0 0 25px rgba(6,182,212,0.7), 0 0 0 12px rgba(59,130,246,0); transform: scale(1.08); } }';
        document.head.appendChild(style);
      }

      // Hover effect: show title
      wrapper.addEventListener('mouseenter', () => {
        const label = wrapper.querySelector('.music-title-label');
        if (label) { label.style.maxWidth = '200px'; label.style.opacity = '1'; label.style.padding = '6px 14px 6px 10px'; }
      });
      wrapper.addEventListener('mouseleave', () => {
        const label = wrapper.querySelector('.music-title-label');
        if (label) { label.style.maxWidth = '0'; label.style.opacity = '0'; label.style.padding = '6px 0'; }
      });

      screenEl.appendChild(wrapper);

      const btn = wrapper.querySelector('.btn-sm-play');
      btn.addEventListener('click', (e) => {
        e.stopPropagation(); // Avoid triggering any "next screen" trigger
        if (!audio.paused) {
          audio.pause();
          btn.innerHTML = '▶️';
        } else {
          audio.play();
          btn.innerHTML = '⏸️';
        }
      });

      screenAudioInfo = { audio, btn };
    }

    this._screenAudios.push(screenAudioInfo);

    // Content container
    const content = document.createElement('div');
    content.className = 'pa-screen-content';
    screenEl.appendChild(content);

    const screenData = { el: screenEl, content, name, opts, index: idx };
    this._screens.push(screenData);

    // Retornar builder encadenado
    return new ScreenBuilder(content, this._albumAPI);
  }

  _applyScreenBackground(screenEl, bg = {}) {
    const type = bg.type || '';
    let layer = screenEl.querySelector(':scope > .pa-screen-bg');
    if (!layer) {
      layer = document.createElement('div');
      layer.className = 'pa-screen-bg';
      screenEl.prepend(layer);
    }
    layer.style.backgroundColor = '';
    layer.style.backgroundImage = '';
    layer.style.backgroundSize = 'cover';
    layer.style.backgroundPosition = bg.position || 'center center';
    layer.style.backgroundRepeat = 'no-repeat';
    layer.style.filter = bg.filter && bg.filter !== 'none' ? PageAlbum._filterValue(bg.filter) : '';

    if (type === 'color' && bg.color) {
      layer.style.backgroundColor = bg.color;
    } else if (type === 'gradient' && bg.gradient) {
      layer.style.backgroundImage = bg.gradient;
      layer.style.backgroundSize = '100% 100%';
    } else if (type === 'image' && bg.image) {
      layer.style.backgroundImage = `linear-gradient(rgba(15, 10, 35, .42), rgba(15, 10, 35, .42)), url("${bg.image}")`;
      layer.style.backgroundColor = bg.color || 'transparent';
      layer.style.backgroundSize = bg.size || 'cover';
    }
  }

  /** Construir todo el DOM */
  render() {
    // Agregar pantallas
    this._screens.forEach((s, i) => {
      // Añadir botón de transición al final de cada pantalla (excepto la última)
      if (i < this._screens.length - 1) {
        const nextName = this._screens[i + 1].name;
        const nextEmoji = this._screens[i + 1].opts.emoji || '🎁';
        s.el.appendChild(this._createTrigger(i, nextName, nextEmoji));
      }
      this._root.appendChild(s.el);
    });

    // Barra de progreso
    if (this._showProgress && this._screens.length > 1) {
      this._createProgress();
    }

    // Overlay para efecto candle
    if (this._transition === 'candle') {
      this._overlay = document.createElement('div');
      this._overlay.className = 'pa-dark-overlay';
      document.body.appendChild(this._overlay);
    }

    // Scroll al inicio
    window.scrollTo(0, 0);

    // Auto-play de música de la pantalla inicial tras la interacción
    const initialAudioInfo = this._screenAudios[this._currentIndex];
    if (initialAudioInfo && initialAudioInfo.audio) {
      // En algunos navegadores esto fallará silenciosamente si es la carga inicial sin interacción previa
      initialAudioInfo.audio.play().then(() => {
        initialAudioInfo.btn.innerHTML = '⏸️';
      }).catch(err => console.log('Autoplay prevenido por el navegador'));
    }
  }

  /** Crear barra de progreso */
  _createProgress() {
    const bar = document.createElement('div');
    bar.className = 'pa-progress';
    this._screens.forEach((s, i) => {
      const dot = document.createElement('button');
      dot.className = 'pa-dot' + (i === 0 ? ' active' : '');
      dot.title = s.name;
      dot.addEventListener('click', () => this.goTo(i));
      bar.appendChild(dot);
    });
    document.body.appendChild(bar);
    this._progressBar = bar;
  }

  /** Actualizar barra de progreso */
  _updateProgress() {
    if (!this._progressBar) return;
    this._progressBar.querySelectorAll('.pa-dot').forEach((dot, i) => {
      dot.classList.toggle('active', i === this._currentIndex);
    });
    // Mostrar brevemente al cambiar de pantalla
    this._progressBar.classList.add('visible');
    clearTimeout(this._progressHideT);
    this._progressHideT = setTimeout(() => {
      this._progressBar.classList.remove('visible');
    }, 2000);
  }

  /** Crear botón de transición */
  _createTrigger(fromIndex, nextName, nextEmoji) {
    const wrap = document.createElement('div');
    wrap.style.cssText = 'width:100%;display:flex;flex-direction:column;align-items:center;margin-top:20px;';

    switch (this._transition) {
      case 'gift': wrap.appendChild(this._triggerGift(fromIndex)); break;
      case 'balloon': wrap.appendChild(this._triggerBalloon(fromIndex)); break;
      case 'candle': wrap.appendChild(this._triggerCandle(fromIndex)); break;
      case 'envelope': wrap.appendChild(this._triggerEnvelope(fromIndex, nextName, nextEmoji)); break;
      case 'swipe': wrap.appendChild(this._triggerSwipe(fromIndex, nextName)); break;
      default: wrap.appendChild(this._triggerGift(fromIndex));
    }
    return wrap;
  }

  /* ═══════════════════════════════
     TRIGGER: Gift Box
  ═══════════════════════════════ */
  _triggerGift(fromIndex) {
    const el = document.createElement('div');
    el.className = 'pa-trigger-gift';
    el.innerHTML = `
          <div class="gift-lid"></div>
      <div class="gift-box"></div>
      <div class="gift-label">Toca para abrir 🎁</div>
        `;
    el.addEventListener('click', () => {
      if (this._transitioning) return;
      el.classList.add('opening');
      setTimeout(() => {
        this._burstConfetti();
        setTimeout(() => this.next(), 400);
      }, 500);
    });
    return el;
  }

  /* ═══════════════════════════════
     TRIGGER: Balloon
  ═══════════════════════════════ */
  _triggerBalloon(fromIndex) {
    const color = PageAlbum.BALLOON_COLORS[fromIndex % PageAlbum.BALLOON_COLORS.length];
    const el = document.createElement('div');
    el.className = 'pa-trigger-balloon';
    el.innerHTML = `
          <div class="balloon-wrap">
        <div class="balloon-body" style="background:linear-gradient(135deg,${color},${color}dd)"></div>
        <div class="balloon-string"></div>
      </div>
          <div class="balloon-text">Toca el globo 🎈</div>
        `;
    // Actualizar color del pseudo-element
    const body = el.querySelector('.balloon-body');
    body.style.setProperty('--color', color);

    el.addEventListener('click', () => {
      if (this._transitioning) return;
      el.classList.add('popping');
      setTimeout(() => {
        this._burstConfetti();
        setTimeout(() => this.next(), 300);
      }, 300);
    });
    return el;
  }

  /* ═══════════════════════════════
     TRIGGER: Candle
  ═══════════════════════════════ */
  _triggerCandle(fromIndex) {
    const el = document.createElement('div');
    el.className = 'pa-trigger-candle';
    el.innerHTML = `
          <div class="candle-wrap">
        <div class="candle-glow"></div>
        <div class="candle-flame"></div>
        <div class="candle-body"></div>
      </div>
          <div class="candle-text">Sopla la vela 🕯️</div>
        `;
    el.addEventListener('click', () => {
      if (this._transitioning) return;
      el.classList.add('blowing');
      // Oscurecer
      if (this._overlay) this._overlay.classList.add('active');
      setTimeout(() => {
        this._burstConfetti();
        setTimeout(() => {
          if (this._overlay) this._overlay.classList.remove('active');
          this.next();
        }, 600);
      }, 500);
    });
    return el;
  }

  /* ═══════════════════════════════
     TRIGGER: Envelope
  ═══════════════════════════════ */
  _triggerEnvelope(fromIndex, nextName, nextEmoji) {
    const el = document.createElement('div');
    el.className = 'pa-trigger-envelope';
    const safeName = PageAlbum._escapeHTML(nextName);
    const safeEmoji = PageAlbum._escapeHTML(nextEmoji);
    el.innerHTML = `
          <div class="envelope-wrap">
            <div class="envelope-body">
              <div class="envelope-card">${safeEmoji} ${safeName}</div>
              <div class="envelope-flap"></div>
            </div>
      </div>
          <div class="envelope-text">Abre el sobre ✉️</div>
        `;
    el.addEventListener('click', () => {
      if (this._transitioning) return;
      el.classList.add('opening');
      setTimeout(() => {
        this._burstConfetti();
        setTimeout(() => this.next(), 400);
      }, 500);
    });
    return el;
  }

  /* ═══════════════════════════════
     TRIGGER: Swipe
  ═══════════════════════════════ */
  _triggerSwipe(fromIndex, nextName) {
    const el = document.createElement('div');
    el.className = 'pa-trigger-swipe';
    const safeName = PageAlbum._escapeHTML(nextName);
    el.innerHTML = `
          <div class="swipe-indicator">
        <span class="swipe-label">Siguiente: ${safeName}</span>
        <span class="swipe-arrow">→</span>
      </div>
          `;
    el.addEventListener('click', () => {
      if (this._transitioning) return;
      this._burstConfetti();
      this.next();
    });

    // Touch swipe support
    let startX = 0;
    el.addEventListener('touchstart', e => { startX = e.touches[0].clientX; }, { passive: true });
    el.addEventListener('touchend', e => {
      const diff = startX - e.changedTouches[0].clientX;
      if (diff > 50) {
        this._burstConfetti();
        this.next();
      }
    }, { passive: true });
    return el;
  }

  /* ═══════════════════════════════
     NAVEGACIÓN
  ═══════════════════════════════ */
  goTo(index) {
    if (index < 0 || index >= this._screens.length || index === this._currentIndex || this._transitioning) return;
    this._transitioning = true;

    const current = this._screens[this._currentIndex].el;
    const next = this._screens[index].el;

    // Detener música de la pantalla actual si la tiene
    const currentAudioInfo = this._screenAudios[this._currentIndex];
    if (currentAudioInfo && currentAudioInfo.audio) {
      currentAudioInfo.audio.pause();
      currentAudioInfo.btn.innerHTML = '▶️';
    }

    // Salida
    current.classList.add('exiting');
    setTimeout(() => {
      current.classList.remove('active', 'exiting');
      next.classList.add('active');
      this._currentIndex = index;
      this._updateProgress();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      this._transitioning = false;

      // Re-observe animation targets on the new active screen
      if (typeof observeActiveScreen === 'function') {
        setTimeout(() => observeActiveScreen(), 100);
      }

      // Intentar auto-reproducir música de la nueva pantalla
      const nextAudioInfo = this._screenAudios[index];
      if (nextAudioInfo && nextAudioInfo.audio) {
        nextAudioInfo.audio.play().then(() => {
          nextAudioInfo.btn.innerHTML = '⏸️';
        }).catch(() => {
          // El navegador bloqueó el autoplay, lo dejamos pausado
          nextAudioInfo.btn.innerHTML = '▶️';
        });
      }

      // Confeti de bienvenida en la nueva pantalla
      setTimeout(() => {
        if (typeof fullBurst === 'function') fullBurst(100);
      }, 300);
    }, 500);
  }

  next() { this.goTo(this._currentIndex + 1); }
  prev() { this.goTo(this._currentIndex - 1); }

  /** Lanzar confeti */
  _burstConfetti() {
    if (typeof fullBurst === 'function') fullBurst(200);
    if (typeof burstAt === 'function') {
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      setTimeout(() => burstAt(cx, cy - 100, 50), 100);
      setTimeout(() => burstAt(cx - 80, cy, 40), 200);
      setTimeout(() => burstAt(cx + 80, cy, 40), 300);
    }
  }
}
