# Publicar Tuka no Google Play

## Uma versão ou duas?

**Uma só.** O mesmo código serve o site (Vercel) e a app Android (Google Play via TWA).
Não há duplicação de ficheiros.

---

## Passo 1 — Instalar Bubblewrap

```bash
npm install -g @bubblewrap/cli
bubblewrap --version
```

Alternativa mais fácil (sem linha de comandos): usa https://www.pwabuilder.com

---

## Passo 2 — Gerar o projecto Android

```bash
bubblewrap init --manifest https://tuka.fiadumont.com/manifest.json
```

Bubblewrap vai perguntar:
- Package name: `com.fiadumont.tuka` (ou o que quiseres — nunca muda depois)
- App name: `Tuka`
- Signing key: gera um novo keystore quando pedido

Guarda o ficheiro `.keystore` em segurança — sem ele não consegues publicar actualizações.

---

## Passo 3 — Obter o SHA-256 do teu keystore

```bash
keytool -list -v -keystore tuka.keystore -alias android
```

Copia a linha `SHA256:` — precisas dela para o passo seguinte.

---

## Passo 4 — Preencher assetlinks.json

Edita `src/.well-known/assetlinks.json` e substitui:
- `SUBSTITUI_PELO_TEU_PACKAGE_NAME` → ex: `com.fiadumont.tuka`
- `SUBSTITUI_PELO_TEU_SHA256_DO_KEYSTORE` → o valor SHA256 do passo 3

Depois faz deploy no Vercel. Confirma que funciona em:
`https://tuka.fiadumont.com/.well-known/assetlinks.json`

---

## Passo 5 — Compilar o APK/AAB

```bash
bubblewrap build
```

Produz `app-release-bundle.aab` — este é o ficheiro que carregas no Google Play.

---

## Passo 6 — Google Play Console

1. Cria uma nova app → "App Android" → package name = o mesmo do passo 2
2. Carrega o `.aab` em "Testes internos" primeiro
3. Preenche a ficha: descrição, screenshots, ícone (512×512 já existe em `/icons/icon-512.png`)
4. Content rating: preenche o questionário (a tua app não tem conteúdo adulto)
5. Publica

---

## Notas

- **Screenshots obrigatórias**: o Google exige pelo menos 2 screenshots de telemóvel (1080×1920 ou similar). Tira screenshots do app no browser antes de publicar.
- **Política de privacidade**: o link `/pages/privacidade.html` serve. Cola o URL na ficha do Google Play.
- **Actualizações futuras**: muda o código no Vercel → o TWA actualiza automaticamente (é um wrapper do site). Só precisas de publicar nova versão no Play se mudares o `package_name`, ícone nativo, ou configurações do TWA.
