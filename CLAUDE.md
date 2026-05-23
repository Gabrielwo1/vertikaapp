# CLAUDE.md — VirtualTour Monorepo

## Visão Geral

Este repositório contém o monorepo completo do VirtualTour, uma plataforma SaaS B2B
para criação de tours virtuais 3D fotorrealistas usando smartphone.

## Estrutura do Monorepo

```
virtualtour/
├── apps/
│   ├── mobile-pwa/     # PWA de captura (React + Vite + TypeScript)
│   ├── dashboard/      # Painel do corretor (React + PlayCanvas)
│   ├── viewer/         # Visualizador público de tours
│   └── admin/          # Painel administrativo interno
├── packages/
│   ├── api/            # Backend REST (Fastify + Prisma + BullMQ)
│   ├── worker/         # Pipeline de processamento GPU (Python)
│   ├── shared/         # Tipos, schemas e constantes compartilhadas
│   └── splat-config/   # Configurações do splat-transform
└── infra/
    ├── docker/
    └── runpod/
```

## Comandos Principais

```bash
# Desenvolvimento completo
pnpm dev

# Build de todos os pacotes
pnpm build

# Testes
pnpm test

# Lint
pnpm lint

# Migrations do banco
pnpm --filter @virtualtour/api migrate

# Prisma Studio
pnpm --filter @virtualtour/api studio
```

## Convenções de Código

### TypeScript
- **Strict mode obrigatório** em todos os pacotes
- **Sem `any`** — use `unknown` com type guards quando necessário
- **Imports com `@/`** para referências dentro de `src/`
- **Nomes de variáveis/funções em inglês**
- **Strings de UI em português**

### Git
- Commits no formato: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`
- PRs precisam de descrição do que muda e como testar

### Estrutura de Arquivos
- Cada módulo exporta tudo via `index.ts`
- Tipos compartilhados ficam em `packages/shared`
- Nunca importe de `packages/api` dentro de `apps/` — use a API REST

## Variáveis de Ambiente

### packages/api
Copie `.env.example` para `.env` e preencha:
- `DATABASE_URL` — PostgreSQL connection string
- `REDIS_URL` — Redis connection string
- `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` — Supabase project
- `JWT_SECRET` — mínimo 32 caracteres, aleatório
- `RUNPOD_API_KEY` / `RUNPOD_ENDPOINT_ID` — RunPod serverless
- `VAPID_*` — Web Push notifications (gere com `web-push generate-vapid-keys`)

## Fluxo de Dados

```
[Mobile PWA]
    │
    │  chunked video upload (5MB chunks)
    ▼
[API - Fastify]
    │  enqueue job
    ▼
[BullMQ / Redis]
    │  dispatch to RunPod
    ▼
[Worker RunPod - Python]
    │  ffmpeg → COLMAP → gsplat → splat-transform
    ▼
[Supabase Storage]
    │  webhook callback
    ▼
[API - webhook handler]
    │  push notification
    ▼
[Dashboard - corretor]
    │  publicar
    ▼
[Viewer - comprador]
```

## Modelos de Dados Chave

### Tour
- `status`: DRAFT → UPLOADING → PROCESSING → READY → PUBLISHED → ARCHIVED
- `settingsJson`: configurações de experiência (câmeras, efeitos, anotações)

### Room
- `status`: PENDING → UPLOADING → PROCESSING → DONE | ERROR
- Armazena caminhos para vídeo, splat, thumb e voxel no Supabase Storage

## Decisões de Arquitetura

1. **BullMQ sobre workers diretos**: permite retry automático, monitoramento e
   escala horizontal dos workers GPU.

2. **Supabase Storage**: S3-compatible com URLs públicas assinadas. Evita
   manter nossa própria infraestrutura de storage.

3. **RunPod Serverless**: GPU on-demand, sem custo quando idle. Workers ficam
   em containers Docker com CUDA.

4. **Web Push nativo**: evita dependência de serviços de push terceiros.
   Suporta iOS 16.4+ via PWA instalado.

5. **Chunked upload 5MB**: compatível com conexões móveis instáveis. Permite
   retomar uploads interrompidos.

## Tarefas Pendentes / Roadmap

- [ ] Implementar apps/mobile-pwa completo (captura, giroscópio, upload)
- [ ] Implementar apps/dashboard (editor de tour, preview)
- [ ] Implementar apps/viewer (WebGL splat renderer)
- [ ] Implementar packages/worker (pipeline Python COLMAP+gsplat)
- [ ] Autenticação Google OAuth (completar troca de código)
- [ ] Testes E2E com Playwright
- [ ] CI/CD GitHub Actions
- [ ] Infraestrutura Terraform

## Troubleshooting

### API não conecta ao banco
```bash
# Verificar se PostgreSQL está rodando
docker compose up -d postgres redis

# Rodar migrations
pnpm --filter @virtualtour/api migrate
```

### Jobs não processam
```bash
# Verificar se Redis está acessível
redis-cli ping

# Verificar logs do BullMQ
pnpm --filter @virtualtour/api dev
# Observe logs de conexão Redis
```

### Upload falha no meio
- Chunks parciais ficam em `/tmp/{tourId}/{roomId}/`
- Limpar manualmente se necessário
- O cliente deve reenviar a partir do último chunk confirmado
