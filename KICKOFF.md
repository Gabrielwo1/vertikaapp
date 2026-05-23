# 🏠 VirtualTour — Kickoff Document

## Visão do Produto

Plataforma SaaS B2B que permite corretores de imóveis criar tours virtuais
3D fotorrealistas usando apenas o celular para captura. Nenhum equipamento
especial, nenhum técnico necessário. O corretor grava, o sistema processa,
o comprador navega.

## Problema que resolvemos

Tours virtuais existentes (Matterport, iGuide) exigem câmeras caras (US$3k+),
técnicos especializados e apps proprietários. Nosso produto democratiza isso:
qualquer corretor com smartphone pode criar um tour em 30 minutos.

## Personas

- **Corretor/Gestor** — usa o PWA mobile para capturar e publicar
- **Comprador** — acessa o link do tour no browser, sem instalar nada
- **Admin da plataforma** — monitora jobs, storage e contas

## Módulos do Sistema

virtualtour/
├── apps/
│   ├── mobile-pwa/        # App de captura — React + Vite PWA
│   ├── dashboard/         # Painel web corretor — React + @playcanvas/react
│   ├── viewer/            # Tour público — supersplat-viewer fork
│   └── admin/             # Painel interno — React + pcui
├── packages/
│   ├── api/               # Backend REST — Node.js + Fastify
│   ├── worker/            # Pipeline GPU — Python + Docker (RunPod)
│   ├── shared/            # Types, schemas, utils compartilhados
│   └── splat-config/      # Configurações do splat-transform
├── infra/
│   ├── docker/
│   └── runpod/
├── KICKOFF.md
└── CLAUDE.md

## Stack Técnica

### Frontend (mobile-pwa)
- React 18 + Vite + TypeScript
- Vite PWA Plugin — Service Worker, offline, install prompt
- WebRTC getUserMedia — câmera traseira
- DeviceOrientationEvent — giroscópio
- MediaRecorder API — gravação em chunks
- TanStack Query — estado assíncrono e upload

### Backend (api)
- Node.js 20 + Fastify + TypeScript
- BullMQ + Redis — fila de jobs
- Prisma + PostgreSQL
- Supabase Storage (S3-compatible)
- JWT + Google OAuth

### Worker GPU (Python)
- Python 3.11 + Docker nvidia/cuda:12.8
- ffmpeg, COLMAP, gsplat 1.5.x, @playcanvas/splat-transform
- Deploy: RunPod Serverless

## Fluxo Técnico

[Celular] → chunked upload → [API] → BullMQ → [Worker RunPod] → ffmpeg → COLMAP → gsplat → splat-transform → Supabase Storage → webhook → [API] → push notification → [Dashboard] → editor → [Viewer]

## Regras de Negócio

- Cada tour tem tourId (UUID) e pertence a uma imobiliariaId
- Status do tour: draft → uploading → processing → ready → published → archived
- Storage path: tours/{tourId}/{roomId}/scene.sog
- Viewer URL: {VIEWER_DOMAIN}/tour/{tourId}
- Armazenamento mínimo free tier: 2GB por imobiliária
- Tempo estimado de processamento: ~15-20 min por cômodo (GPU A10G)
