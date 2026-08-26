function initLogo() {
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabImage = document.getElementById('tab-image');
  const tabText = document.getElementById('tab-text');
  const inputLogo = document.getElementById('input-logo');
  const logoUpload = document.getElementById('logo-upload');
  const logoControls = document.getElementById('logo-controls');
  const logoPreviewImg = document.getElementById('logo-preview-img');
  const logoFilename = document.getElementById('logo-filename');
  const btnChangeLogo = document.getElementById('btn-change-logo');
  const btnRemoveBg = document.getElementById('btn-remove-bg');
  const bgLimit = document.getElementById('bg-limit');
  const inputText = document.getElementById('input-text');
  const textFont = document.getElementById('text-font');
  const nextBtn = document.getElementById('btn-logo-next');

  state.logo.format = 'original';
  state.logo.color = '#ffffff';
  state.logo.textBg = { enabled: false, color: '#000000', opacity: 0.7 };

  // Formato
  document.querySelectorAll('.format-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.format-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.logo.format = btn.dataset.format;
    });
  });

  // Tabs
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.logo.type = btn.dataset.tab;
      tabImage.hidden = btn.dataset.tab !== 'image';
      tabText.hidden = btn.dataset.tab !== 'text';
      updateNextBtn();
    });
  });

  // Upload
  inputLogo.addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) { showToast('Ficheiro demasiado grande. Máximo 8 MB.', true); return; }
    const url = URL.createObjectURL(file);
    state.logo.image = { file, url, name: file.name, hasBgRemoved: false };
    logoPreviewImg.src = url;
    logoFilename.textContent = file.name;
    logoUpload.hidden = true;
    logoControls.hidden = false;
    updateLimitDisplay();
    updateNextBtn();
  });

  btnChangeLogo.addEventListener('click', e => { e.preventDefault(); inputLogo.click(); });

  // Remoção de fundo — com feedback de progresso e retry no lado cliente
  // Nota discreta por baixo do botão — só aparece se a remoção demorar.
  let bgNote = document.getElementById('bg-note');
  if (!bgNote) {
    bgNote = document.createElement('div');
    bgNote.id = 'bg-note';
    bgNote.className = 'limit-counter';
    bgNote.style.marginTop = '8px';
    bgNote.hidden = true;
    bgNote.textContent = 'A primeira vez pode demorar, pois o modelo é descarregado uma única vez. Se estiver muito lento, verifique a sua ligação à internet.';
    btnRemoveBg.insertAdjacentElement('afterend', bgNote);
  }

  btnRemoveBg.addEventListener('click', async () => {
    if (!state.logo.image) return;
    if (getRemainingUses() <= 0) { showToast('Limite diário atingido. Volte amanhã.', true); return; }

    btnRemoveBg.disabled = true;

    // Mostrar progresso ao utilizador enquanto espera
    const messages = [
      'A remover o fundo...',
      'Ainda a processar...',
      'Quase pronto...'
    ];
    let msgIndex = 0;
    btnRemoveBg.innerHTML = '<span>' + messages[0] + '</span>';

    const msgInterval = setInterval(() => {
      msgIndex = Math.min(msgIndex + 1, messages.length - 1);
      btnRemoveBg.innerHTML = '<span>' + messages[msgIndex] + '</span>';
    }, 10000);

    // Se passar dos 12 segundos, mostrar a nota de transparência.
    const noteTimeout = setTimeout(() => { bgNote.hidden = false; }, 12000);

    function cleanup() {
      clearInterval(msgInterval);
      clearTimeout(noteTimeout);
      bgNote.hidden = true;
    }

    try {
      const result = await removeBgFromLogo(state.logo.image.file);
      cleanup();
      const newUrl = URL.createObjectURL(result);
      URL.revokeObjectURL(state.logo.image.url);
      state.logo.image = { file: result, url: newUrl, name: state.logo.image.name, hasBgRemoved: true };
      logoPreviewImg.src = newUrl;
      consumeUse();
      updateLimitDisplay();
      showToast('Fundo removido com sucesso.');
      btnRemoveBg.innerHTML = '✓ Fundo removido';
      btnRemoveBg.style.background = 'var(--success)';
      btnRemoveBg.style.color = 'var(--bg)';
    } catch (err) {
      cleanup();
      console.error('remove-bg:', err);
      showToast('Não foi possível remover o fundo. Verifique a sua ligação e tente novamente.', true);
      btnRemoveBg.disabled = false;
      btnRemoveBg.style.background = '';
      btnRemoveBg.style.color = '';
      btnRemoveBg.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg> Remover fundo do logótipo';
    }
  });

  function updateLimitDisplay() {
    const r = getRemainingUses();
    bgLimit.textContent = r + ' de 3 utilizações disponíveis hoje';
    if (r === 0) btnRemoveBg.disabled = true;
  }

  // Cor do texto
  document.querySelectorAll('#color-palette .color-tile').forEach(tile => {
    tile.addEventListener('click', () => {
      document.querySelectorAll('#color-palette .color-tile').forEach(t => t.classList.remove('active'));
      tile.classList.add('active');
      state.logo.color = tile.dataset.color;
    });
  });

  // Fundo atrás do texto
  const textBgToggle = document.getElementById('text-bg-enabled');
  const textBgOptions = document.getElementById('text-bg-options');
  const textBgOpacity = document.getElementById('text-bg-opacity');
  const textBgOpacityVal = document.getElementById('text-bg-opacity-val');

  textBgToggle.addEventListener('change', e => {
    state.logo.textBg.enabled = e.target.checked;
    textBgOptions.hidden = !e.target.checked;
  });

  document.querySelectorAll('#bg-palette .bg-tile').forEach(tile => {
    tile.addEventListener('click', () => {
      document.querySelectorAll('#bg-palette .bg-tile').forEach(t => t.classList.remove('active'));
      tile.classList.add('active');
      state.logo.textBg.color = tile.dataset.color;
    });
  });

  textBgOpacity.addEventListener('input', e => {
    const val = parseInt(e.target.value);
    textBgOpacityVal.textContent = val + '%';
    state.logo.textBg.opacity = val / 100;
  });

  // Texto
  inputText.addEventListener('input', e => { state.logo.text = e.target.value; updateNextBtn(); });
  textFont.addEventListener('change', e => { state.logo.font = e.target.value; });

  function updateNextBtn() {
    if (state.logo.type === 'image') nextBtn.disabled = !state.logo.image;
    else nextBtn.disabled = !(state.logo.text && state.logo.text.trim());
  }

  updateLimitDisplay();
}
