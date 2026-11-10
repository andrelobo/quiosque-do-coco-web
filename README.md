# Quiosque do Coco — Web

Frontend do PDV e da gestão de turnos do Quiosque do Coco.
React 18 + Vite 6 + React Router + PWA (vite-plugin-pwa).

- Repositório da API: `quiosque-do-coco-api`
- API padrão em desenvolvimento: `http://localhost:4000`

## Requisitos

- Node.js 20+
- API rodando (local ou VPS)

## Desenvolvimento

```bash
npm install
cp .env.example .env    # VITE_API_URL apontando para a API
npm run dev             # http://localhost:5173
```

### Variáveis de ambiente

| Variável | Padrão | Descrição |
| --- | --- | --- |
| `VITE_API_URL` | `http://localhost:4000` | Base da API, sem barra no final |

### Scripts

| Comando | Função |
| --- | --- |
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção em `dist/` |
| `npm run preview` | Pré-visualiza o build |

## Telas

`Login` · `PDV` (pedido + pagamento) · `Pedidos` · `Turnos` · `Produtos` ·
`Estoque` · `Relatórios`.

Rotas protegidas por sessão; o menu é filtrado por papel
(`admin`, `responsavel`, `atendente`).

## Deploy no Vercel

1. Importe este repositório no Vercel (framework detectado: **Vite**).
2. Configure a variável de ambiente de produção:
   `VITE_API_URL=https://<sua-api-na-vps>`.
3. Deploy. `vercel.json` já reescreve as rotas para `index.html` (SPA), então
   recarregar `/pdv` ou `/reports` não gera 404.

A API precisa liberar a origem do Vercel via `FRONTEND_URL` (CORS com
credenciais) e usar HTTPS — o cookie de sessão é `SameSite=None; Secure`.

## PWA

O build gera service worker e manifest (`dist/sw.js`, `manifest.webmanifest`).
Ícones em `public/icon-192.png` e `public/icon-512.png`.
