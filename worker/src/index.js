// Cloudflare Worker — remoção de fundo via HuggingFace RMBG-1.4
// Retry automático para cold starts do modelo (pode demorar 20-50s)

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400'
};

const HF_MODEL_URL = 'https://api-inference.huggingface.co/models/briaai/RMBG-1.4';
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 8000; // 8s entre tentativas — dá tempo ao modelo acordar

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function callHuggingFace(buffer, token, attempt = 1) {
  const response = await fetch(HF_MODEL_URL, {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + token,
      'Content-Type': 'application/octet-stream',
      'x-wait-for-model': 'true'   // HF aguarda o modelo em vez de retornar 503
    },
    body: buffer
  });

  // 503 = modelo a carregar — tentativa seguinte
  if (response.status === 503 && attempt < MAX_RETRIES) {
    await sleep(RETRY_DELAY_MS);
    return callHuggingFace(buffer, token, attempt + 1);
  }

  if (!response.ok) {
    const errText = await response.text().catch(() => 'erro desconhecido');
    throw new Error('HuggingFace ' + response.status + ': ' + errText.slice(0, 200));
  }

  return response;
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    const url = new URL(request.url);

    if (url.pathname === '/' || url.pathname === '/health') {
      return new Response(JSON.stringify({ ok: true, service: 'tuka-api' }), {
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
      });
    }

    if (url.pathname === '/remove-bg' && request.method === 'POST') {
      try {
        if (!env.HF_TOKEN) {
          return new Response(JSON.stringify({ error: 'HF_TOKEN não configurado' }), {
            status: 500,
            headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
          });
        }

        const formData = await request.formData();
        const file = formData.get('image');

        if (!file) {
          return new Response(JSON.stringify({ error: 'Nenhuma imagem recebida' }), {
            status: 400,
            headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
          });
        }

        if (file.size > 5 * 1024 * 1024) {
          return new Response(JSON.stringify({ error: 'Imagem demasiado grande (máx 5MB)' }), {
            status: 400,
            headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
          });
        }

        const buffer = await file.arrayBuffer();
        const hfResponse = await callHuggingFace(buffer, env.HF_TOKEN);
        const resultBuffer = await hfResponse.arrayBuffer();

        return new Response(resultBuffer, {
          headers: {
            ...CORS_HEADERS,
            'Content-Type': 'image/png',
            'Cache-Control': 'no-store'
          }
        });

      } catch (err) {
        console.error('remove-bg error:', err.message);
        return new Response(JSON.stringify({ error: err.message }), {
          status: 500,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
        });
      }
    }

    return new Response('Not found', { status: 404, headers: CORS_HEADERS });
  }
};
