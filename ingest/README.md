# Reynventando TV — versão sem PHP (Netlify)

Essa é a mesma estrutura do projeto original, mas sem PHP nem MySQL,
pronta pra rodar 100% no Netlify.

## O que mudou

| Antes (Hostinger) | Agora (Netlify) |
|---|---|
| `api/chat.php` | `netlify/functions/chat.js` |
| `api/subscribe.php` | `netlify/functions/subscribe.js` |
| `api/live-status.php` | `netlify/functions/live-status.js` |
| Banco MySQL (`schema.sql`) | Netlify Blobs (armazenamento embutido, sem configurar nada) |

O `netlify.toml` redireciona as URLs antigas (`/api/chat.php`, etc.)
pras novas funções — por isso **`public/community.js` não precisou
ser alterado**, ele continua chamando os mesmos endereços de sempre.

`public/`, `ingest/` (RSS + tradução) e o GitHub Action
(`.github/workflows/update-news.yml`) continuam exatamente iguais —
essa parte já era estática e já funcionava independente do PHP.

## ⚠️ Importante: isso não pode ser arrastado direto pro Netlify

Esse foi o motivo do erro 404 que você teve antes: o deploy por
"arrastar a pasta" (drag and drop) no Netlify **não processa
Netlify Functions** — ele só publica arquivos estáticos, mesmo que a
pasta `netlify/functions` esteja lá dentro.

Pra chat, cadastro e status da live funcionarem, você precisa usar
um dos dois caminhos abaixo:

### Opção recomendada: conectar pelo GitHub

1. Suba essa pasta pro seu repositório `reynventando` no GitHub
   (pode ser o mesmo repositório de sempre, só substituindo o
   conteúdo).
2. No Netlify: **Add new site → Import an existing project → Deploy
   with GitHub** e selecione o repositório.
3. O Netlify já vai detectar o `netlify.toml` sozinho:
   - Diretório publicado: `public`
   - Pasta de funções: `netlify/functions`
4. Clique em **Deploy**. Ele instala o `@netlify/blobs` e publica
   tudo automaticamente — inclusive as funções.

### Opção alternativa: Netlify CLI (sem GitHub)

Se preferir não usar Git:

```bash
npm install -g netlify-cli
cd reynventando-tv
netlify login
netlify deploy --prod
```

O comando `deploy` (via CLI) processa as funções normalmente —
diferente do drag and drop pelo site.

## Configurar a chave secreta da live

No painel do Netlify: **Site settings → Environment variables**,
crie uma variável:

- Nome: `LIVE_STATUS_SECRET`
- Valor: uma senha só sua (a mesma que o bot Node do TikTok vai
  usar pra avisar quando a live começa/termina)

Depois de criar a variável, faça um novo deploy pra ela entrar em
efeito.

## Dados armazenados (chat, inscritos, status da live)

Ficam guardados no **Netlify Blobs**, que já vem ativado
automaticamente em todo site do Netlify — não precisa criar conta em
nenhum banco externo nem configurar nada além do que já está aqui.

## RSS / tradução automática de notícias

Continua do jeito que já era: o GitHub Action
(`.github/workflows/update-news.yml`) roda o `ingest/fetch-news.js`
periodicamente e atualiza `public/data/news.json`. Nenhuma mudança
necessária aí.
