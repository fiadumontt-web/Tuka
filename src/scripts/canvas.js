let logoImageEl = null;
let editMode = 'all'; // 'all' ou índice numérico

async function initCanvas() {
  if (state.logo.type === 'image' && state.logo.image) {
    logoImageEl = new Image();
    logoImageEl.crossOrigin = 'anonymous';
    logoImageEl.src = state.logo.image.url;
    await new Promise(r => { logoImageEl.onload = r; logoImageEl.onerror = r; });
  }
  editMode = 'all';
  state.activePhotoIndex = 0;
  renderThumbsStrip();
  renderAdvancedGrid();
  updateModeIndicator();
  await drawCurrentPhoto();
  setupCanvasInteraction(document.getElementById('position-canvas'));
  setupAdvancedControls();

  const btnEditAll = document.getElementById('btn-edit-all');
  if (btnEditAll) {
    btnEditAll.onclick = () => {
      editMode = 'all';
      updateModeIndicator();
      renderAdvancedGrid();
      syncControlsToMode();
      drawCurrentPhoto();
    };
  }
}

function getActiveCfg() {
  if (editMode !== 'all') {
    const p = state.photos[editMode];
    return p.override ? p.override : { ...state.position };
  }
  return state.position;
}

function applyUpdate(updates) {
  if (editMode !== 'all') {
    const p = state.photos[editMode];
    if (!p.override) p.override = { ...state.position };
    Object.assign(p.override, updates);
  } else {
    Object.assign(state.position, updates);
  }
}

function updateModeIndicator() {
  const dot = document.getElementById('mode-dot');
  const label = document.getElementById('mode-label');
  if (!dot || !label) return;
  if (editMode === 'all') {
    dot.style.background = 'var(--text-faint)';
    label.textContent = 'A editar todas as fotografias';
  } else {
    dot.style.background = 'var(--orange)';
    label.textContent = `A editar fotografia ${editMode + 1} individualmente`;
  }
}

function renderThumbsStrip() {
  const strip = document.getElementById('thumbs-strip');
  strip.innerHTML = '';
  state.photos.forEach((photo, i) => {
    const div = document.createElement('div');
    div.className = 'thumb' + (i === state.activePhotoIndex ? ' active' : '') + (photo.override ? ' has-override' : '');
    div.innerHTML = `<img src="${photo.url}" alt="Fotografia ${i + 1}">`;
    div.addEventListener('click', async () => {
      state.activePhotoIndex = i;
      renderThumbsStrip();
      document.getElementById('canvas-counter').textContent = `Fotografia ${i + 1} de ${state.photos.length}`;
      await drawCurrentPhoto();
    });
    strip.appendChild(div);
  });
  document.getElementById('canvas-counter').textContent = `Fotografia ${state.activePhotoIndex + 1} de ${state.photos.length}`;
}

function renderAdvancedGrid() {
  const grid = document.getElementById('advanced-grid');
  grid.innerHTML = '';
  state.photos.forEach((photo, i) => {
    const div = document.createElement('div');
    div.className = 'check-thumb' + (editMode === i ? ' checked' : '');
    div.style.position = 'relative';
    div.innerHTML = `<img src="${photo.url}" alt="Fotografia ${i + 1}">`;
    if (photo.override) {
      const dot = document.createElement('div');
      dot.style.cssText = 'position:absolute;top:4px;right:4px;width:8px;height:8px;border-radius:50%;background:var(--orange);pointer-events:none';
      div.appendChild(dot);
    }
    div.addEventListener('click', async () => {
      if (editMode === i) {
        state.photos[i].override = null;
        editMode = 'all';
      } else {
        editMode = i;
        state.activePhotoIndex = i;
        renderThumbsStrip();
      }
      updateModeIndicator();
      renderAdvancedGrid();
      syncControlsToMode();
      await drawCurrentPhoto();
    });
    grid.appendChild(div);
  });
}

function syncControlsToMode() {
  const cfg = getActiveCfg();
  const sr = document.getElementById('size-range');
  const sv = document.getElementById('size-value');
  const or = document.getElementById('opacity-range');
  const ov = document.getElementById('opacity-value');
  if (sr) { sr.value = Math.round((cfg.size || 0.2) * 100); sv.textContent = sr.value + '%'; }
  if (or) { or.value = Math.round((cfg.opacity !== undefined ? cfg.opacity : 1) * 100); ov.textContent = or.value + '%'; }
}

async function drawCurrentPhoto() {
  const photo = state.photos[state.activePhotoIndex];
  if (!photo) return;

  const canvas = document.getElementById('position-canvas');
  const ctx = canvas.getContext('2d');

  const img = new Image();
  img.src = photo.url;
  await new Promise(r => { img.onload = r; img.onerror = r; });

  // Canvas com as dimensões REAIS da imagem — sem distorção
  canvas.width = img.naturalWidth || img.width;
  canvas.height = img.naturalHeight || img.height;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  const cfg = photo.override || state.position;
  drawLogo(ctx, canvas.width, canvas.height, cfg);
}

function drawLogo(ctx, w, h, cfg) {
  ctx.save();
  ctx.globalAlpha = cfg.opacity !== undefined ? cfg.opacity : 1;

  const logoW = w * (cfg.size || 0.2);
  const x = w * (cfg.x !== undefined ? cfg.x : 0.7);
  const y = h * (cfg.y !== undefined ? cfg.y : 0.85);
  const rotation = cfg.rotation || 0;

  if (state.logo.type === 'image' && logoImageEl && logoImageEl.complete && logoImageEl.naturalWidth > 0) {
    const ratio = logoImageEl.naturalHeight / logoImageEl.naturalWidth;
    const logoH = logoW * ratio;
    const fmt = state.logo.format || 'original';

    ctx.save();
    ctx.translate(x, y);
    if (rotation) ctx.rotate(rotation * Math.PI / 180);

    if (fmt === 'circle') {
      const r = logoW / 2;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(logoImageEl, -r, -r, logoW, logoW);
    } else if (fmt === 'square') {
      const s = logoW;
      ctx.beginPath();
      roundRectPath(ctx, -s / 2, -s / 2, s, s, s * 0.06);
      ctx.clip();
      ctx.drawImage(logoImageEl, -s / 2, -s / 2, s, s);
    } else {
      ctx.drawImage(logoImageEl, -logoW / 2, -logoH / 2, logoW, logoH);
    }
    ctx.restore();

  } else if (state.logo.type === 'text' && state.logo.text) {
    const fontSize = Math.max(14, w * (cfg.size || 0.2) * 0.45);
    ctx.font = `700 ${fontSize}px "${state.logo.font || 'DM Sans'}", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const textW = ctx.measureText(state.logo.text).width;
    const pad = fontSize * 0.4;

    if (state.logo.textBg && state.logo.textBg.enabled) {
      ctx.save();
      ctx.globalAlpha = (cfg.opacity !== undefined ? cfg.opacity : 1) * state.logo.textBg.opacity;
      ctx.fillStyle = state.logo.textBg.color;
      ctx.beginPath();
      roundRectPath(ctx, x - textW / 2 - pad, y - fontSize / 2 - pad * 0.6, textW + pad * 2, fontSize + pad * 1.2, fontSize * 0.15);
      ctx.fill();
      ctx.restore();
    }

    ctx.save();
    ctx.translate(x, y);
    if (rotation) ctx.rotate(rotation * Math.PI / 180);
    ctx.globalAlpha = cfg.opacity !== undefined ? cfg.opacity : 1;
    ctx.fillStyle = state.logo.color || '#ffffff';
    ctx.shadowColor = 'rgba(0,0,0,0.35)';
    ctx.shadowBlur = fontSize * 0.08;
    ctx.fillText(state.logo.text, 0, 0);
    ctx.restore();
  }

  ctx.restore();
}

// Função auxiliar para rectângulos arredondados (compatibilidade)
function roundRectPath(ctx, x, y, w, h, r) {
  if (ctx.roundRect) {
    ctx.roundRect(x, y, w, h, r);
  } else {
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }
}

function setupCanvasInteraction(canvas) {
  let dragging = false;
  let pinching = false;
  let startDist = 0;
  let startSize = 0;
  let longPressTimer = null;
  let isLongPress = false;
  const ROTATION_STEP = 15; // graus por pressão longa

  function coordsFromEvent(clientX, clientY) {
    const r = canvas.getBoundingClientRect();
    return {
      x: (clientX - r.left) / r.width,
      y: (clientY - r.top) / r.height
    };
  }

  // TOUCH
  canvas.addEventListener('touchstart', e => {
    e.preventDefault();
    isLongPress = false;

    if (e.touches.length === 1) {
      dragging = true;
      // Pressão longa = rodar
      longPressTimer = setTimeout(() => {
        isLongPress = true;
        dragging = false;
        const currentRotation = getActiveCfg().rotation || 0;
        const newRotation = (currentRotation + ROTATION_STEP) % 360;
        applyUpdate({ rotation: newRotation });
        drawCurrentPhoto();
        showToast(`Rotação: ${newRotation}°`);
      }, 600);
    } else if (e.touches.length === 2) {
      clearTimeout(longPressTimer);
      pinching = true;
      dragging = false;
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      startDist = Math.sqrt(dx * dx + dy * dy);
      startSize = getActiveCfg().size || 0.2;
    }
  }, { passive: false });

  canvas.addEventListener('touchmove', e => {
    e.preventDefault();
    clearTimeout(longPressTimer);

    if (pinching && e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const newDist = Math.sqrt(dx * dx + dy * dy);
      const newSize = Math.max(0.04, Math.min(0.65, startSize * (newDist / startDist)));
      applyUpdate({ size: newSize });
      syncControlsToMode();
      drawCurrentPhoto();
    } else if (dragging && !isLongPress && e.touches.length === 1) {
      const c = coordsFromEvent(e.touches[0].clientX, e.touches[0].clientY);
      applyUpdate({ x: c.x, y: c.y });
      drawCurrentPhoto();
    }
  }, { passive: false });

  canvas.addEventListener('touchend', e => {
    clearTimeout(longPressTimer);
    if (e.touches.length === 0) { dragging = false; pinching = false; }
  });

  // MOUSE (desktop)
  canvas.addEventListener('mousedown', e => {
    dragging = true;
    const c = coordsFromEvent(e.clientX, e.clientY);
    applyUpdate({ x: c.x, y: c.y });
    drawCurrentPhoto();
  });
  canvas.addEventListener('mousemove', e => {
    if (!dragging) return;
    const c = coordsFromEvent(e.clientX, e.clientY);
    applyUpdate({ x: c.x, y: c.y });
    drawCurrentPhoto();
  });
  canvas.addEventListener('mouseup', () => dragging = false);
  canvas.addEventListener('mouseleave', () => dragging = false);

  // Scroll do rato = tamanho (desktop)
  canvas.addEventListener('wheel', e => {
    e.preventDefault();
    const newSize = Math.max(0.04, Math.min(0.65, (getActiveCfg().size || 0.2) - e.deltaY * 0.0005));
    applyUpdate({ size: newSize });
    syncControlsToMode();
    drawCurrentPhoto();
  }, { passive: false });

  // Duplo clique (desktop) = rodar
  canvas.addEventListener('dblclick', () => {
    const currentRotation = getActiveCfg().rotation || 0;
    const newRotation = (currentRotation + ROTATION_STEP) % 360;
    applyUpdate({ rotation: newRotation });
    drawCurrentPhoto();
    showToast(`Rotação: ${newRotation}°`);
  });
}

function setupAdvancedControls() {
  const sizeRange = document.getElementById('size-range');
  const sizeValue = document.getElementById('size-value');
  const opacityRange = document.getElementById('opacity-range');
  const opacityValue = document.getElementById('opacity-value');

  syncControlsToMode();

  sizeRange.addEventListener('input', e => {
    const val = parseFloat(e.target.value);
    sizeValue.textContent = val + '%';
    applyUpdate({ size: val / 100 });
    drawCurrentPhoto();
    renderThumbsStrip();
  });

  opacityRange.addEventListener('input', e => {
    const val = parseFloat(e.target.value);
    opacityValue.textContent = val + '%';
    applyUpdate({ opacity: val / 100 });
    drawCurrentPhoto();
  });
}
