# Quiosque do Coco — Web

Frontend do PDV e da gestão de turnos do Quiosque do Coco.
React 18 + Vite 6 + React Router + PWA (vite-plugin-pwa).

- Repositório da API: `quiosque-do-coco-api`
- API padrão em desenvolvimento: `http://localhost:4000`
- Estado detalhado: [`current_state.en.md`](./current_state.en.md) · contexto: [`context.en.md`](./context.en.md)

## Requisitos

- Node.js 20+
- API rodando (local ou VPS)
- Google Chrome (apenas para o teste de UI mobile)

## Desenvolvimento

```bash
npm install
cp .env.example .env    # VITE_API_URL apontando para a API
npm run dev             # http://localhost:5173
```

O `vite dev` faz proxy de `/api` para a API local e reescreve navegações HTML
para `/index.html`, então recarregar `/orders`, `/reports` etc. funciona no
desenvolvimento e no `npm run preview`.

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
| `npm run test:ui:mobile` | Checa overflow horizontal em 320–768 px e a gaveta do menu (Chrome headless); `SITE=` para apontar outro endereço, `SHOTS=1` para salvar prints |

## Telas

`Login` · `PDV` (pedido + pagamento) · `Pedidos` · `Turnos` · `Produtos` ·
`Estoque` · `Relatórios`.

Rotas protegidas por sessão; o menu é filtrado por papel
(`admin`, `responsavel`, `atendente`) e `/products`, `/stock` e `/reports`
redirecionam para `/pdv` quando o papel não tem acesso (`RequireRole`).

## Buscas

- **Pedidos**: busca e paginação no servidor (`GET /orders?search=&page=&limit=`),
  com debounce de 300 ms e reset para a página 1. Termo numérico procura o
  código do pedido; texto procura nome de retirada, itens e dia — sem acento e
  sem diferenciar maiúsculas.
- **Produtos e PDV**: filtro local com `matchesSearch` (`src/lib/search.ts`),
  tolerante a acentos (`coco` encontra `Côco`).

## Relatórios

- Envia `?start=&end=` em `YYYY-MM-DD`. Datas vazias significam **hoje** no fuso
  do negócio; formato inválido ou início depois do fim retorna 400.
- Vendas consideram apenas pedidos pagos. O PDF não é gerado pelo app:
  use `Ctrl+P` → **Salvar como PDF** (avaliado e não implementado em 16/11/2026).

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

O registro é manual em `src/main.tsx` com atualização automática. Depois de um
deploy, o service worker pode servir um bundle antigo: um recarregamento forçado
(`Ctrl+Shift+R`) garante a versão nova.

## Pendências conhecidas

- Sem lint/testes automatizados no CI (só o teste manual de UI mobile).
- `npm audit` com vulnerabilidades pendentes de revisão.
