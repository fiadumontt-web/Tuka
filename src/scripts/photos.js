function initPhotos() {
  const input = document.getElementById('input-photos');
  const dropzone = document.getElementById('dropzone');
  const grid = document.getElementById('photos-grid');
  const counter = document.getElementById('photos-counter');
  const nextBtn = document.getElementById('btn-photos-next');

  function updateCounter() {
    counter.textContent = `${state.photos.length} de 20 fotografias carregadas`;
    nextBtn.disabled = state.photos.length === 0;
  }

  function renderGrid() {
    grid.innerHTML = '';
    state.photos.forEach((photo, i) => {
      const div = document.createElement('div');
      div.className = 'photo-thumb';
      // object-fit: cover garante que a miniatura não distorce
      div.innerHTML = `
        <img src="${photo.url}" alt="Fotografia ${i + 1}" loading="lazy" decoding="async" style="width:100%;height:100%;object-fit:cover;display:block">
        <button class="remove-btn" data-index="${i}" aria-label="Remover">✕</button>
      `;
      grid.appendChild(div);
    });

    grid.querySelectorAll('.remove-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        e.preventDefault();
        const idx = parseInt(btn.dataset.index);
        URL.revokeObjectURL(state.photos[idx].url);
        state.photos.splice(idx, 1);
        renderGrid();
        updateCounter();
      });
    });
  }

  function addFiles(files) {
    const remaining = 20 - state.photos.length;
    if (remaining === 0) {
      showToast('Já atingiu o limite de 20 fotografias. Remova alguma para adicionar mais.', true);
      return;
    }

    const accepted = Array.from(files).slice(0, remaining);
    let rejected = 0;

    accepted.forEach(file => {
      if (!file.type.match(/image\/(jpeg|png)/)) { rejected++; return; }
      if (file.size > 10 * 1024 * 1024) { rejected++; return; }
      state.photos.push({ file, url: URL.createObjectURL(file), name: file.name });
    });

    if (rejected > 0) {
      showToast(`${rejected} ficheiro(s) não aceite(s). Apenas JPG e PNG até 10 MB.`, true);
    }

    renderGrid();
    updateCounter();
  }

  input.addEventListener('change', e => { addFiles(e.target.files); input.value = ''; });

  ['dragenter', 'dragover'].forEach(evt => {
    dropzone.addEventListener(evt, e => { e.preventDefault(); dropzone.classList.add('drag-over'); });
  });
  ['dragleave', 'drop'].forEach(evt => {
    dropzone.addEventListener(evt, e => { e.preventDefault(); dropzone.classList.remove('drag-over'); });
  });
  dropzone.addEventListener('drop', e => addFiles(e.dataTransfer.files));
}
