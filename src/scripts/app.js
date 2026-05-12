// Estado global do app
const state = {
  currentStep: 1,
  photos: [],          // [{file, url, name, override?: {logo state}}]
  logo: {
    type: 'image',     // 'image' ou 'text'
    image: null,       // {file, url, name, hasBgRemoved}
    text: '',
    font: 'DM Sans',
    color: '#ffffff'
  },
  position: {
    x: 0.7,            // posição relativa (0-1)
    y: 0.85,
    size: 0.20,        // tamanho do logo (0-1)
    opacity: 1,
    rotation: 0
  },
  activePhotoIndex: 0,
  results: [],         // fotos processadas (Blob)
  checkedPhotos: []    // fotos marcadas no modo avançado
};

// Mostrar toast
function showToast(message, isError = false) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = 'toast' + (isError ? ' error' : '');
  toast.hidden = false;
  setTimeout(() => { toast.hidden = true; }, 3000);
}

// Navegação entre ecrãs
function goToStep(step) {
  document.querySelectorAll('.screen').forEach(s => {
    s.hidden = parseInt(s.dataset.step) !== step;
  });
  state.currentStep = step;
  document.getElementById('step-bar-inner').style.width = (step * 20) + '%';
  window.scrollTo({ top: 0, behavior: 'smooth' });

  if (step === 3) {
    initCanvas();
  }
}

// Tema
function initTheme() {
  const saved = localStorage.getItem('tuka-theme') || 'dark';
  document.documentElement.dataset.theme = saved;
}

document.getElementById('btn-theme').addEventListener('click', () => {
  const current = document.documentElement.dataset.theme || 'dark';
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  localStorage.setItem('tuka-theme', next);
});

// Botão de ajuda
document.getElementById('btn-help').addEventListener('click', () => {
  window.location.href = '/pages/ajuda.html';
});

// Navegação dos ecrãs
document.getElementById('btn-photos-next').addEventListener('click', () => {
  if (state.photos.length === 0) {
    showToast('Adiciona pelo menos uma foto', true);
    return;
  }
  goToStep(2);
});

document.getElementById('btn-logo-back').addEventListener('click', () => goToStep(1));

document.getElementById('btn-logo-next').addEventListener('click', () => {
  if (state.logo.type === 'image' && !state.logo.image) {
    showToast('Adiciona o logo ou escolhe o modo texto', true);
    return;
  }
  if (state.logo.type === 'text' && !state.logo.text.trim()) {
    showToast('Escreve o nome da empresa', true);
    return;
  }
  goToStep(3);
});

document.getElementById('btn-position-back').addEventListener('click', () => goToStep(2));

document.getElementById('btn-position-next').addEventListener('click', async () => {
  goToStep(4);
  await processAllPhotos();
  goToStep(5);
});

document.getElementById('btn-restart').addEventListener('click', () => {
  if (confirm('Queres começar de novo? Vais perder as fotos actuais.')) {
    location.reload();
  }
});

// Inicialização
window.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initPhotos();
  initLogo();
  initLimits();
  initTour();
});
