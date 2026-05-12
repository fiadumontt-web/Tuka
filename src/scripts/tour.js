// Tour guiado do Tuka — implementação simples e robusta
// Apenas um overlay, criado uma só vez, sem conflitos

(function() {
  'use strict';

  const STEPS = [
    {
      title: 'Bem-vinda ao Tuka',
      text: 'Vamos mostrar-te tudo em 4 passos rápidos.',
      target: null
    },
    {
      title: 'Adiciona as tuas fotos',
      text: 'Toca aqui para escolher até 20 fotos dos teus produtos da galeria.',
      target: 'dropzone'
    },
    {
      title: 'Escolhe o teu logo',
      text: 'Depois de adicionar as fotos, escolhes o logo da empresa em imagem ou só o nome escrito.',
      target: null
    },
    {
      title: 'Move com o dedo',
      text: 'Arrasta o logo para a posição que quiseres. Usa dois dedos para mudar o tamanho.',
      target: null
    },
    {
      title: 'Configurações por foto',
      text: 'Precisas de posições diferentes em cada foto? Tens essa opção dentro do passo 3.',
      target: null
    }
  ];

  let currentStep = 0;
  let elements = null;

  function buildTour() {
    // Container principal
    const root = document.createElement('div');
    root.id = 'tk-tour-root';
    root.setAttribute('style', [
      'position: fixed',
      'inset: 0',
      'z-index: 999999',
      'background: rgba(0,0,0,0.78)',
      'display: flex',
      'align-items: center',
      'justify-content: center',
      'padding: 20px',
      'animation: tkfade 250ms ease'
    ].join(';'));

    // Animação de fade
    const styleTag = document.createElement('style');
    styleTag.id = 'tk-tour-style';
    styleTag.textContent = '@keyframes tkfade{from{opacity:0}to{opacity:1}}';
    document.head.appendChild(styleTag);

    // Spotlight (rectângulo destacado quando há target)
    const spot = document.createElement('div');
    spot.id = 'tk-tour-spot';
    spot.setAttribute('style', [
      'position: fixed',
      'border: 3px solid #ff8c42',
      'border-radius: 12px',
      'pointer-events: none',
      'transition: all 350ms cubic-bezier(0.4,0,0.2,1)',
      'opacity: 0',
      'box-shadow: 0 0 0 4px rgba(255,140,66,0.25)',
      'z-index: 1000000'
    ].join(';'));

    // Card do tooltip
    const card = document.createElement('div');
    card.id = 'tk-tour-card';
    card.setAttribute('style', [
      'background: #1a1410',
      'border: 1px solid #4a3f35',
      'border-radius: 16px',
      'padding: 22px',
      'max-width: 340px',
      'width: 100%',
      'box-shadow: 0 12px 40px rgba(0,0,0,0.6)',
      'position: relative',
      'z-index: 1000001'
    ].join(';'));

    document.body.appendChild(root);
    document.body.appendChild(spot);
    root.appendChild(card);

    // Click fora do card fecha o tour
    root.addEventListener('click', function(e) {
      if (e.target === root) closeTour();
    });

    return { root, spot, card };
  }

  function renderStep(index) {
    const step = STEPS[index];
    const isLast = index === STEPS.length - 1;
    const dotsHtml = STEPS.map((_, i) =>
      '<span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:' +
      (i === index ? '#ff8c42' : '#4a3f35') + ';margin-right:5px"></span>'
    ).join('');

    elements.card.innerHTML = [
      '<div style="margin-bottom:14px">' + dotsHtml + '</div>',
      '<h3 style="font-family:Fraunces,Georgia,serif;font-size:20px;font-weight:500;color:#faf6f0;margin:0 0 8px">',
      step.title,
      '</h3>',
      '<p style="font-size:14px;color:#a8a39a;line-height:1.6;margin:0 0 20px">',
      step.text,
      '</p>',
      '<div style="display:flex;align-items:center;justify-content:space-between;gap:12px">',
        '<button id="tk-skip" style="background:transparent;border:none;color:#8a857c;font-size:14px;cursor:pointer;padding:8px 4px;font-family:inherit">Pular</button>',
        '<button id="tk-next" style="background:#ff8c42;color:#0d0a08;border:none;padding:11px 22px;border-radius:9px;font-size:14px;font-weight:500;cursor:pointer;font-family:inherit">' + (isLast ? 'Começar ✓' : 'Próximo →') + '</button>',
      '</div>'
    ].join('');

    // Spotlight no elemento alvo se existir
    if (step.target) {
      const targetEl = document.getElementById(step.target);
      if (targetEl) {
        const r = targetEl.getBoundingClientRect();
        const pad = 10;
        elements.spot.style.top = (r.top - pad) + 'px';
        elements.spot.style.left = (r.left - pad) + 'px';
        elements.spot.style.width = (r.width + pad * 2) + 'px';
        elements.spot.style.height = (r.height + pad * 2) + 'px';
        elements.spot.style.opacity = '1';
        // Fazer scroll se estiver fora de vista
        if (r.top < 0 || r.bottom > window.innerHeight) {
          targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      } else {
        elements.spot.style.opacity = '0';
      }
    } else {
      elements.spot.style.opacity = '0';
    }

    // Ligar botões
    document.getElementById('tk-next').onclick = function() {
      if (currentStep < STEPS.length - 1) {
        currentStep++;
        renderStep(currentStep);
      } else {
        closeTour();
      }
    };
    document.getElementById('tk-skip').onclick = closeTour;
  }

  function closeTour() {
    if (elements) {
      if (elements.root && elements.root.parentNode) elements.root.parentNode.removeChild(elements.root);
      if (elements.spot && elements.spot.parentNode) elements.spot.parentNode.removeChild(elements.spot);
      elements = null;
    }
    const styleEl = document.getElementById('tk-tour-style');
    if (styleEl && styleEl.parentNode) styleEl.parentNode.removeChild(styleEl);
    try {
      localStorage.setItem('tuka-tour-seen', 'true');
    } catch (e) { /* ignore */ }
  }

  function startTour() {
    // Se já há um tour activo, limpar primeiro
    const existing = document.getElementById('tk-tour-root');
    if (existing) existing.remove();
    const existingSpot = document.getElementById('tk-tour-spot');
    if (existingSpot) existingSpot.remove();

    elements = buildTour();
    currentStep = 0;
    renderStep(0);
  }

  // Função global para iniciar
  window.initTour = function() {
    let seen = false;
    try {
      seen = localStorage.getItem('tuka-tour-seen') === 'true';
    } catch (e) { /* ignore */ }
    if (seen) return;
    // Pequeno delay para o DOM estar 100% pronto
    setTimeout(startTour, 100);
  };

  // Função para reabrir manualmente (útil para o botão de ajuda)
  window.restartTour = function() {
    try {
      localStorage.removeItem('tuka-tour-seen');
    } catch (e) { /* ignore */ }
    startTour();
  };
})();
