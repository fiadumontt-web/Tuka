// store.js — guarda a sessão de trabalho e os favoritos no próprio aparelho.
// Tudo em IndexedDB, no dispositivo. Nada vai para servidor.

(function () {
  var DB_NAME = 'tuka';
  var DB_VERSION = 1;
  var SESSION_KEY = 'current';
  var SESSION_MAX_AGE = 3 * 24 * 60 * 60 * 1000; // 3 dias
  var FAV_LIMIT = 12;

  var dbPromise = null;
  function openDB() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise(function (resolve, reject) {
      var req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = function () {
        var db = req.result;
        if (!db.objectStoreNames.contains('session')) db.createObjectStore('session');
        if (!db.objectStoreNames.contains('favorites')) db.createObjectStore('favorites', { keyPath: 'id' });
      };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error); };
    });
    return dbPromise;
  }

  function idbGet(store, key) {
    return openDB().then(function (db) {
      return new Promise(function (resolve, reject) {
        var r = db.transaction(store, 'readonly').objectStore(store).get(key);
        r.onsuccess = function () { resolve(r.result); };
        r.onerror = function () { reject(r.error); };
      });
    });
  }
  function idbGetAll(store) {
    return openDB().then(function (db) {
      return new Promise(function (resolve, reject) {
        var r = db.transaction(store, 'readonly').objectStore(store).getAll();
        r.onsuccess = function () { resolve(r.result || []); };
        r.onerror = function () { reject(r.error); };
      });
    });
  }
  function idbPut(store, value, key) {
    return openDB().then(function (db) {
      return new Promise(function (resolve, reject) {
        var t = db.transaction(store, 'readwrite');
        var os = t.objectStore(store);
        if (key === undefined) os.put(value); else os.put(value, key);
        t.oncomplete = function () { resolve(); };
        t.onerror = function () { reject(t.error); };
      });
    });
  }
  function idbDelete(store, key) {
    return openDB().then(function (db) {
      return new Promise(function (resolve, reject) {
        var t = db.transaction(store, 'readwrite');
        t.objectStore(store).delete(key);
        t.oncomplete = function () { resolve(); };
        t.onerror = function () { reject(t.error); };
      });
    });
  }

  function toast(msg, err) { if (window.showToast) window.showToast(msg, !!err); }
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function cssFont(f) {
    if (f === 'Fraunces') return "'Fraunces',Georgia,serif";
    if (f === 'DM Sans') return "'DM Sans',sans-serif";
    return f || 'sans-serif';
  }

  // ---------- Sessão de trabalho ----------
  function snapshot() {
    return {
      savedAt: Date.now(),
      step: state.currentStep,
      photos: state.photos.map(function (p) { return { blob: p.file, name: p.name, override: p.override || null }; }),
      logo: {
        type: state.logo.type,
        text: state.logo.text || '',
        font: state.logo.font || 'DM Sans',
        color: state.logo.color || '#ffffff',
        format: state.logo.format || 'original',
        textBg: state.logo.textBg || { enabled: false, color: '#000000', opacity: 0.7 },
        image: state.logo.image ? { blob: state.logo.image.file, name: state.logo.image.name, hasBgRemoved: !!state.logo.image.hasBgRemoved } : null
      },
      position: {
        x: state.position.x, y: state.position.y, size: state.position.size,
        opacity: state.position.opacity, rotation: state.position.rotation
      }
    };
  }
  function saveSession() { return idbPut('session', snapshot(), SESSION_KEY).catch(function () {}); }
  function clearSession() { return idbDelete('session', SESSION_KEY).catch(function () {}); }
  window.tukaClearSession = clearSession;

  function maybeSave() {
    try {
      if (typeof state === 'undefined' || !state.photos || state.photos.length === 0) return;
      if (state.currentStep >= 4) { clearSession(); return; }
      saveSession();
    } catch (e) {}
  }

  function restoreSession(rec) {
    try {
      state.photos = rec.photos.map(function (p) {
        return { file: p.blob, url: URL.createObjectURL(p.blob), name: p.name, override: p.override || undefined };
      });
      state.position = rec.position || state.position;
      state.logo.format = rec.logo.format || 'original';
      state.logo.textBg = rec.logo.textBg || state.logo.textBg;

      if (rec.logo.type === 'text') {
        if (window.tukaApplyLogoName) window.tukaApplyLogoName(rec.logo);
      } else if (rec.logo.image) {
        if (window.tukaApplyLogoImage) window.tukaApplyLogoImage({ file: rec.logo.image.blob, name: rec.logo.image.name, hasBgRemoved: rec.logo.image.hasBgRemoved });
      }

      if (window.tukaPhotosRefresh) window.tukaPhotosRefresh();
      if (typeof goToStep === 'function') goToStep(rec.step && rec.step <= 3 ? rec.step : 1);
      toast('Trabalho recuperado.');
    } catch (e) { console.warn('restore:', e); }
  }

  function showBanner(rec) {
    var banner = document.getElementById('session-banner');
    if (!banner) return;
    var count = document.getElementById('sb-count');
    var n = (rec.photos || []).length;
    if (count) count.textContent = '· ' + n + (n === 1 ? ' foto' : ' fotos');
    banner.hidden = false;
    var cont = document.getElementById('sb-continue');
    var disc = document.getElementById('sb-discard');
    if (cont) cont.onclick = function () { banner.hidden = true; restoreSession(rec); };
    if (disc) disc.onclick = function () { banner.hidden = true; clearSession(); };
  }

  function initSession() {
    idbGet('session', SESSION_KEY).then(function (rec) {
      if (!rec) return;
      if (Date.now() - (rec.savedAt || 0) > SESSION_MAX_AGE || !rec.photos || rec.photos.length === 0) { clearSession(); return; }
      showBanner(rec);
    }).catch(function () {});

    document.addEventListener('visibilitychange', function () { if (document.hidden) maybeSave(); });
    window.addEventListener('pagehide', maybeSave);

    var pin = document.getElementById('input-photos');
    if (pin) pin.addEventListener('change', function () { setTimeout(maybeSave, 300); });
    ['btn-photos-next', 'btn-logo-next', 'btn-position-next', 'btn-logo-back', 'btn-position-back'].forEach(function (id) {
      var b = document.getElementById(id);
      if (b) b.addEventListener('click', function () { setTimeout(maybeSave, 0); });
    });
  }

  // ---------- Favoritos ----------
  function getFavorites() {
    return idbGetAll('favorites').then(function (list) {
      return list.sort(function (a, b) { return (b.createdAt || 0) - (a.createdAt || 0); });
    });
  }
  function addFavoriteLogo(image) {
    return getFavorites().then(function (list) {
      if (list.length >= FAV_LIMIT) { toast('Já tens ' + FAV_LIMIT + ' favoritos. Apaga um para guardar outro.', true); return; }
      var fav = { id: 'f' + Date.now() + Math.round(Math.random() * 1000), kind: 'logo', name: image.name || 'logótipo', blob: image.file, hasBgRemoved: !!image.hasBgRemoved, createdAt: Date.now() };
      return idbPut('favorites', fav).then(function () { toast('Logótipo guardado nos favoritos.'); renderFavorites(); });
    });
  }
  function addFavoriteName(cfg) {
    return getFavorites().then(function (list) {
      if (list.length >= FAV_LIMIT) { toast('Já tens ' + FAV_LIMIT + ' favoritos. Apaga um para guardar outro.', true); return; }
      var fav = { id: 'f' + Date.now() + Math.round(Math.random() * 1000), kind: 'name', text: cfg.text, font: cfg.font, color: cfg.color, textBg: cfg.textBg || null, createdAt: Date.now() };
      return idbPut('favorites', fav).then(function () { toast('Nome guardado nos favoritos.'); renderFavorites(); });
    });
  }
  function deleteFavorite(id) { return idbDelete('favorites', id).then(renderFavorites); }

  function renderFavorites() {
    var wrap = document.getElementById('favorites-list');
    var empty = document.getElementById('favorites-empty');
    if (!wrap) return;
    getFavorites().then(function (list) {
      wrap.innerHTML = '';
      if (empty) empty.hidden = list.length > 0;
      list.forEach(function (fav) {
        var chip = document.createElement('div');
        chip.className = 'fav-chip';
        var apply = document.createElement('button');
        apply.type = 'button';
        apply.className = 'fav-apply';
        if (fav.kind === 'logo') {
          var url = URL.createObjectURL(fav.blob);
          apply.innerHTML = '<span class="fav-thumb"><img src="' + url + '" alt=""></span><span class="fav-name">' + escapeHtml(fav.name) + '</span>';
          apply.onclick = function () { if (window.tukaApplyLogoImage) window.tukaApplyLogoImage({ file: fav.blob, name: fav.name, hasBgRemoved: fav.hasBgRemoved }); toast('Logótipo aplicado.'); };
        } else {
          apply.innerHTML = '<span class="fav-name-tile" style="font-family:' + cssFont(fav.font) + ';color:' + (fav.color || '#faf6f0') + '">' + escapeHtml(fav.text || '') + '</span>';
          apply.onclick = function () { if (window.tukaApplyLogoName) window.tukaApplyLogoName(fav); toast('Nome aplicado.'); };
        }
        var del = document.createElement('button');
        del.type = 'button';
        del.className = 'fav-del';
        del.setAttribute('aria-label', 'Apagar favorito');
        del.textContent = '✕';
        del.onclick = function (e) { e.stopPropagation(); deleteFavorite(fav.id); };
        chip.appendChild(apply);
        chip.appendChild(del);
        wrap.appendChild(chip);
      });
    });
  }
  window.tukaRenderFavorites = renderFavorites;

  function initFavorites() {
    var favLogoBtn = document.getElementById('btn-fav-logo');
    if (favLogoBtn) favLogoBtn.addEventListener('click', function (e) {
      e.preventDefault();
      if (state.logo.image) addFavoriteLogo(state.logo.image);
      else toast('Adiciona um logótipo primeiro.', true);
    });
    var favNameBtn = document.getElementById('btn-fav-name');
    if (favNameBtn) favNameBtn.addEventListener('click', function (e) {
      e.preventDefault();
      var t = (state.logo.text || '').trim();
      if (t) addFavoriteName({ text: t, font: state.logo.font, color: state.logo.color, textBg: state.logo.textBg });
      else toast('Escreve o nome primeiro.', true);
    });

    getFavorites().then(function (list) {
      if (list.length > 0 && window.tukaSelectLogoTab) {
        var nb = document.getElementById('btn-photos-next');
        if (nb) nb.addEventListener('click', function () {
          setTimeout(function () {
            if (state.currentStep === 2) { window.tukaSelectLogoTab('favorites'); renderFavorites(); }
          }, 30);
        });
      }
    });
  }

  window.addEventListener('DOMContentLoaded', function () {
    if (!('indexedDB' in window)) return;
    initSession();
    initFavorites();
  });
})();
