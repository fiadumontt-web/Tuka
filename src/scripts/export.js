async function processAllPhotos() {
  state.results = [];
  const total = state.photos.length;
  const progressFill = document.getElementById('progress-fill');
  const progressPercent = document.getElementById('progress-percent');
  const processingCount = document.getElementById('processing-count');
  const processingThumb = document.getElementById('processing-thumb');
  const dotsRow = document.getElementById('dots-row');

  dotsRow.innerHTML = '';
  for (let i = 0; i < total; i++) {
    const d = document.createElement('div');
    d.className = 'dot';
    dotsRow.appendChild(d);
  }

  if (state.logo.type === 'image' && state.logo.image && !logoImageEl) {
    logoImageEl = new Image();
    logoImageEl.crossOrigin = 'anonymous';
    logoImageEl.src = state.logo.image.url;
    await new Promise(r => { logoImageEl.onload = r; logoImageEl.onerror = r; });
  }

  for (let i = 0; i < total; i++) {
    const photo = state.photos[i];
    processingCount.textContent = (i + 1) + ' de ' + total;
    processingThumb.innerHTML = '<img src="' + photo.url + '" alt="" style="width:100%;height:100%;object-fit:cover">';

    const blob = await renderPhotoToBlob(photo);
    state.results.push({ blob, name: getOutputName(photo.name, i) });

    const pct = Math.round(((i + 1) / total) * 100);
    progressFill.style.width = pct + '%';
    progressPercent.textContent = pct + '%';
    dotsRow.children[i].classList.add('done');
    await new Promise(r => setTimeout(r, 30));
  }

  const resultGrid = document.getElementById('result-grid');
  resultGrid.innerHTML = '';
  state.results.slice(0, 9).forEach(r => {
    const div = document.createElement('div');
    div.className = 'result-thumb';
    const url = URL.createObjectURL(r.blob);
    div.innerHTML = '<img src="' + url + '" alt="">';
    resultGrid.appendChild(div);
  });

  const count = state.results.length;
  document.getElementById('success-count').textContent =
    count + ' ' + (count === 1 ? 'foto pronta' : 'fotos prontas');

  const label = document.getElementById('btn-download-label');
  label.textContent = count === 1 ? 'Baixar foto' : 'Baixar ' + count + ' fotos';
}

async function renderPhotoToBlob(photo) {
  const img = new Image();
  img.src = photo.url;
  await new Promise(r => { img.onload = r; img.onerror = r; });

  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth || img.width;
  canvas.height = img.naturalHeight || img.height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);

  const cfg = photo.override || state.position;
  drawLogo(ctx, canvas.width, canvas.height, cfg);

  const isPng = photo.file.type === 'image/png';
  return new Promise(resolve => {
    canvas.toBlob(b => resolve(b), isPng ? 'image/png' : 'image/jpeg', 0.92);
  });
}

function getOutputName(originalName, index) {
  const ext = originalName.match(/\.[^.]+$/)?.[0] || '.jpg';
  const base = originalName.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_');
  return 'tuka-' + base + '-' + String(index + 1).padStart(2, '0') + ext;
}

function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
}

// Download de uma foto:
// iOS — abre nova tab; utilizador guarda com toque longo
// Android/Desktop — download directo via <a>
function downloadOne(blob, name) {
  const url = URL.createObjectURL(blob);
  if (isIOS()) {
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  } else {
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }
}

// Download de todas as fotos — sequencial, sem ZIP
// Barra de progresso foto a foto em todas as plataformas
async function downloadAll() {
  const results = state.results;
  if (!results.length) return;

  const btn = document.getElementById('btn-download-all');
  const dlProgress = document.getElementById('download-progress');
  const dlFill = document.getElementById('dl-progress-fill');
  const dlText = document.getElementById('dl-progress-text');

  btn.disabled = true;
  dlProgress.hidden = false;
  dlFill.style.width = '0%';

  if (results.length === 1) {
    dlText.textContent = 'A preparar...';
    dlFill.style.width = '50%';
    downloadOne(results[0].blob, results[0].name);
    dlFill.style.width = '100%';
    dlText.textContent = 'Concluído!';
    if (isIOS()) showToast('Toca e segura na imagem → Guardar imagem');
    setTimeout(() => { dlProgress.hidden = true; btn.disabled = false; }, 2500);
    return;
  }

  if (isIOS()) {
    showToast(results.length + ' fotos vão abrir. Toca e segura em cada uma → Guardar imagem');
  }

  for (let i = 0; i < results.length; i++) {
    dlText.textContent = 'Foto ' + (i + 1) + ' de ' + results.length;
    dlFill.style.width = Math.round(((i + 1) / results.length) * 100) + '%';
    downloadOne(results[i].blob, results[i].name);
    if (i < results.length - 1) {
      await new Promise(r => setTimeout(r, isIOS() ? 1000 : 300));
    }
  }

  dlText.textContent = results.length + ' fotos transferidas!';
  if (!isIOS()) showToast('Fotos guardadas na pasta de Downloads.');
  setTimeout(() => { dlProgress.hidden = true; btn.disabled = false; }, 3000);
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('btn-download-all').addEventListener('click', downloadAll);
});
