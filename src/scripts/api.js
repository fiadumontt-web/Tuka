// URL do servidor — vais mudar isto para o teu Worker depois do deploy
const API_URL = 'https://tuka-api.fiadumont.workers.dev/remove-bg';

// Para desenvolvimento local, podes usar:
// const API_URL = 'http://localhost:8787/remove-bg';

async function removeBgFromLogo(file) {
  const formData = new FormData();
  formData.append('image', file);

  const response = await fetch(API_URL, {
    method: 'POST',
    body: formData
  });

  if (!response.ok) {
    throw new Error('Servidor não respondeu correctamente');
  }

  const blob = await response.blob();
  return blob;
}
