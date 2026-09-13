// Visita guiada do Tuka — coach-marks que acompanham a primeira marcação.
// Destaca o elemento real, aponta com uma seta e avança quando a pessoa age.

(function () {
  'use strict';

  var STEPS = [
    { target: null, title: 'Bem-vindo(a) à Tuka',
      text: 'Em poucos toques marca as suas fotos com o seu logo. Vamos a isso, é rápido.',
      advance: 'next' },
    { target: 'dropzone', title: 'Adicione as suas fotos',
      text: 'Toque aqui para escolher as fotos dos seus produtos, até 20 de cada vez.',
      advance: 'photos' },
    { target: 'btn-photos-next', title: 'Continue',
      text: 'Depois de escolher, toque em Continuar para avançar.',
      advance: 'click' },
    { target: 'logo-upload', title: 'Escolha o seu logo',
      text: 'Use uma imagem do logo, ou toque em Nome para escrever. Se já tem favoritos, estão aqui.',
      advance: 'next' },
    { target: 'btn-logo-next', title: 'Continue',
      text: 'Com o logo pronto, toque em Continuar.',
      advance: 'click' },
    { target: 'position-canvas', title: 'Coloque o logo',
      text: 'Arraste o logo para onde quiser na foto, ou toque numa das posições rápidas em baixo.',
      advance: 'next' },
    { target: 'btn-position-next', title: 'Gere as suas fotos',
      text: 'Toque em Gerar e as suas fotos ficam prontas para baixar. Terminou!',
      advance: 'click-end' }
  ];

  var idx = 0, dim, card, arrow, raf = null, poll = null, clickEl = null, clickFn = null, active = false;

  function el(tag, css) { var e = document.createElement(tag); e.style.cssText = css; return e; }

  function build() {
    dim = el('div', 'position:fixed;border-radius:14px;pointer-events:none;z-index:1000000;' +
      'box-shadow:0 0 0 9999px rgba(0,0,0,0.72);transition:all .35s cubic-bezier(.4,0,.2,1);' +
      'border:2px solid #ff8c42;top:50%;left:50%;width:0;height:0');
    card = el('div', 'position:fixed;z-index:1000002;background:#1a1410;border:1px solid #4a3f35;' +
      'border-radius:16px;padding:20px;max-width:320px;width:calc(100% - 40px);' +
      'box-shadow:0 14px 44px rgba(0,0,0,.6);transition:top .3s ease,left .3s ease');
    arrow = el('div', 'position:fixed;z-index:1000001;width:0;height:0;transition:all .3s ease;opacity:0');
    document.body.appendChild(dim);
    document.body.appendChild(arrow);
    document.body.appendChild(card);
  }

  function targetRect(step) {
    if (!step.target) return null;
    var t = document.getElementById(step.target);
    if (!t) return null;
    var r = t.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) return null;
    return r;
  }

  function place() {
    if (!active) return;
    var step = STEPS[idx];
    var r = targetRect(step);
    var vw = window.innerWidth, vh = window.innerHeight;

    if (r) {
      var pad = 8;
      dim.style.top = (r.top - pad) + 'px';
      dim.style.left = (r.left - pad) + 'px';
      dim.style.width = (r.width + pad * 2) + 'px';
      dim.style.height = (r.height + pad * 2) + 'px';
      dim.style.opacity = '1';

      var below = r.top < vh * 0.5;
      var ch = card.offsetHeight || 150, cw = card.offsetWidth || 300;
      var cardTop = below ? (r.bottom + 18) : (r.top - ch - 18);
      cardTop = Math.max(12, Math.min(cardTop, vh - ch - 12));
      var cardLeft = r.left + r.width / 2 - cw / 2;
      cardLeft = Math.max(20, Math.min(cardLeft, vw - cw - 20));
      card.style.top = cardTop + 'px';
      card.style.left = cardLeft + 'px';

      var ax = Math.max(cardLeft + 16, Math.min(r.left + r.width / 2, cardLeft + cw - 16));
      arrow.style.opacity = '1';
      arrow.style.left = (ax - 9) + 'px';
      if (below) {
        arrow.style.top = (cardTop - 9) + 'px';
        arrow.style.borderLeft = '9px solid transparent';
        arrow.style.borderRight = '9px solid transparent';
        arrow.style.borderBottom = '9px solid #1a1410';
        arrow.style.borderTop = '';
      } else {
        arrow.style.top = (cardTop + ch) + 'px';
        arrow.style.borderLeft = '9px solid transparent';
        arrow.style.borderRight = '9px solid transparent';
        arrow.style.borderTop = '9px solid #1a1410';
        arrow.style.borderBottom = '';
      }
    } else {
      dim.style.top = '50%'; dim.style.left = '50%';
      dim.style.width = '0'; dim.style.height = '0'; dim.style.opacity = '1';
      arrow.style.opacity = '0';
      var cw2 = card.offsetWidth || 300, ch2 = card.offsetHeight || 150;
      card.style.top = (vh / 2 - ch2 / 2) + 'px';
      card.style.left = (vw / 2 - cw2 / 2) + 'px';
    }
  }

  function render() {
    var step = STEPS[idx];
    var last = idx === STEPS.length - 1;
    var dots = STEPS.map(function (_, i) {
      return '<span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:' +
        (i === idx ? '#ff8c42' : '#4a3f35') + ';margin-right:5px"></span>';
    }).join('');
    var showNext = step.advance === 'next';
    card.innerHTML =
      '<div style="margin-bottom:12px">' + dots + '</div>' +
      '<h3 style="font-family:Fraunces,Georgia,serif;font-size:19px;font-weight:500;color:#faf6f0;margin:0 0 8px">' + step.title + '</h3>' +
      '<p style="font-size:14px;color:#a8a39a;line-height:1.6;margin:0 0 18px">' + step.text + '</p>' +
      '<div style="display:flex;align-items:center;justify-content:space-between;gap:12px">' +
        '<button id="tk-skip" style="background:transparent;border:none;color:#8a857c;font-size:14px;cursor:pointer;padding:8px 4px;font-family:inherit">Saltar visita</button>' +
        (showNext || last
          ? '<button id="tk-next" style="background:#ff8c42;color:#0d0a08;border:none;padding:11px 22px;border-radius:9px;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit">' + (last ? 'Terminar ✓' : 'Próximo →') + '</button>'
          : '<span style="color:#ff8c42;font-size:13px">Faça a ação para continuar</span>') +
      '</div>';
    document.getElementById('tk-skip').onclick = finish;
    var nx = document.getElementById('tk-next');
    if (nx) nx.onclick = function () { last ? finish() : go(idx + 1); };
    place();
    wireAdvance();
  }

  function clearAdvance() {
    if (poll) { clearInterval(poll); poll = null; }
    if (clickEl && clickFn) { clickEl.removeEventListener('click', clickFn); clickEl = null; clickFn = null; }
  }

  function wireAdvance() {
    clearAdvance();
    var step = STEPS[idx];
    if (step.advance === 'photos') {
      poll = setInterval(function () {
        try { if (typeof state !== 'undefined' && state.photos && state.photos.length > 0) go(idx + 1); } catch (e) {}
      }, 400);
    } else if (step.advance === 'click' || step.advance === 'click-end') {
      var t = document.getElementById(step.target);
      if (t) {
        clickEl = t;
        clickFn = function () {
          if (step.advance === 'click-end') { setTimeout(finish, 250); }
          else { setTimeout(function () { go(idx + 1); }, 350); }
        };
        t.addEventListener('click', clickFn);
      }
    }
  }

  function go(i) {
    if (!active || i === idx && i !== 0) { }
    idx = i;
    clearAdvance();
    // dá tempo ao ecrã seguinte para aparecer antes de apontar
    setTimeout(render, 300);
  }

  function loop() { if (!active) return; place(); raf = requestAnimationFrame(loop); }

  function start() {
    if (active) return;
    active = true; idx = 0;
    build();
    render();
    raf = requestAnimationFrame(loop);
  }

  function finish() {
    active = false;
    clearAdvance();
    if (raf) cancelAnimationFrame(raf);
    [dim, arrow, card].forEach(function (n) { if (n && n.parentNode) n.parentNode.removeChild(n); });
    dim = card = arrow = null;
    try { localStorage.setItem('tuka-tour-seen', 'true'); } catch (e) {}
  }

  window.initTour = function () {
    var seen = false;
    try { seen = localStorage.getItem('tuka-tour-seen') === 'true'; } catch (e) {}
    if (seen) return;
    setTimeout(start, 600);
  };
  window.restartTour = function () {
    try { localStorage.removeItem('tuka-tour-seen'); } catch (e) {}
    if (!active) start();
  };
})();
