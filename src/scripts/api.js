// Remoção de fundo — corre 100% no telemóvel do utilizador.
// Sem servidor, sem HuggingFace serverless (a API antiga foi desligada).
// Usa Transformers.js + modelo RMBG-1.4. WebGPU quando existe, senão WASM.
// Mantém a mesma assinatura de antes: removeBgFromLogo(file) -> Promise<Blob PNG>.
// O logo.js não precisa de nenhuma alteração.

const TRANSFORMERS_CDN = 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1';
const BG_MODEL = 'briaai/RMBG-1.4'; // se trocares de modelo, muda só aqui

let _bgEngine = null; // biblioteca + modelo carregam uma vez e ficam em memória

async function _loadBgEngine(onProgress) {
  if (_bgEngine) return _bgEngine;

  _bgEngine = (async () => {
    const { AutoModel, AutoProcessor, RawImage, env } = await import(TRANSFORMERS_CDN);

    // Vai buscar o modelo ao CDN em vez de procurar ficheiros locais.
    env.allowLocalModels = false;

    async function build(device) {
      const model = await AutoModel.from_pretrained(BG_MODEL, {
        config: { model_type: 'custom' },
        dtype: 'q8',              // quantizado — modelo mais pequeno e leve
        device,                   // 'webgpu' ou 'wasm'
        progress_callback: onProgress
      });
      const processor = await AutoProcessor.from_pretrained(BG_MODEL, {
        config: {
          do_normalize: true,
          do_pad: false,
          do_rescale: true,
          do_resize: true,
          image_mean: [0.5, 0.5, 0.5],
          image_std: [1, 1, 1],
          resample: 2,
          size: { width: 1024, height: 1024 }
        }
      });
      return { model, processor, RawImage };
    }

    // Tenta WebGPU (telemóveis novos, computadores). Se não houver, usa WASM.
    if (typeof navigator !== 'undefined' && 'gpu' in navigator) {
      try {
        return await build('webgpu');
      } catch (e) {
        console.warn('WebGPU indisponível — a usar WASM.', e);
      }
    }
    return await build('wasm');
  })();

  return _bgEngine;
}

async function removeBgFromLogo(file, onProgress) {
  const { model, processor, RawImage } = await _loadBgEngine(onProgress);

  const url = URL.createObjectURL(file);
  try {
    const image = await RawImage.fromURL(url);

    const { pixel_values } = await processor(image);

    const result = await model({ input: pixel_values });
    const outputTensor = result.output ?? Object.values(result)[0];

    // A saída é a máscara (transparência). Ajusta ao tamanho original do logótipo.
    const mask = await RawImage.fromTensor(
      outputTensor[0].mul(255).to('uint8')
    ).resize(image.width, image.height);

    // Junta a imagem original com a máscara como canal de transparência.
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(image.toCanvas(), 0, 0);

    const pixels = ctx.getImageData(0, 0, image.width, image.height);
    for (let i = 0; i < mask.data.length; i++) {
      pixels.data[4 * i + 3] = mask.data[i];
    }
    ctx.putImageData(pixels, 0, 0);

    return await new Promise((resolve, reject) => {
      canvas.toBlob(
        b => (b ? resolve(b) : reject(new Error('Falha ao gerar o PNG'))),
        'image/png'
      );
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}
