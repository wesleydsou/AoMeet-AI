# AoMeet AI

AoMeet AI e o MVP da Aosafe Cloud Solutions para registrar reunioes, consolidar transcricoes, gerar atas inteligentes, tarefas, decisoes e relatorios operacionais.

## Stack
- Next.js 16 com App Router e TypeScript
- Tailwind CSS 4
- Prisma ORM com **Prisma Postgres** (managed database)
- Prisma Accelerate para conexao em producao na Vercel
- Autenticacao com cookie `httpOnly` e JWT assinado
- Upload privado em Vercel Blob (producao) ou `storage/uploads` (local)
- Providers de IA (Groq/OpenAI) e transcricao (AssemblyAI/Whisper) com fallback mock
- Deploy preparado para Vercel

## Como rodar localmente
1. Instale dependencias:
   `pnpm install`
2. Copie o ambiente:
   `cp .env.example .env`
3. Configure `DATABASE_URL` e `DIRECT_URL` do [Prisma Console](https://console.prisma.io)
4. Gere o client Prisma:
   `pnpm db:generate`
5. Aplique as migracoes:
   `pnpm db:migrate`
6. Rode o projeto:
   `pnpm dev`

## Variaveis de ambiente
- `DATABASE_URL`: connection string do Prisma Accelerate (runtime na Vercel)
- `DIRECT_URL`: conexao direta ao Postgres para migracoes Prisma
- `AUTH_SECRET`: segredo usado para assinar a sessao (min. 32 caracteres)
- `OPENAI_API_KEY`: Whisper (transcricao) e/ou GPT (IA)
- `ASSEMBLYAI_API_KEY`: transcricao de audio/video (prioridade sobre Whisper)
- `GROQ_API_KEY`: LLM para resumos, tarefas e chat (prioridade sobre OpenAI)
- `BLOB_READ_WRITE_TOKEN`: upload privado na Vercel (opcional em dev local)
- `NEXT_PUBLIC_APP_URL`: URL publica da aplicacao

## Estrutura de pastas
- `src/app`: paginas, layouts e APIs
- `src/components`: UI do painel
- `src/lib`: auth, providers, validacoes, actions e services
- `prisma`: schema e migracoes do banco
- `docs`: documentacao de proximas fases
- `storage/uploads`: arquivos privados em desenvolvimento local

## Fluxo de upload
1. O usuario cria a reuniao em `/meetings/new`.
2. Audio, video e `.txt` sao gravados em Vercel Blob ou storage local.
3. Apenas chaves/URLs privadas ficam no banco — download via rota autenticada.

## Fluxo de processamento
1. O usuario cria a reuniao e pode iniciar o processamento no mesmo submit.
2. O processamento roda em segundo plano (`after()` do Next.js).
3. Transcricao real (AssemblyAI ou Whisper) ou mock consolida o texto.
4. IA real (Groq ou OpenAI) ou mock gera resumo, tarefas, decisoes e follow-up.
5. Erros marcam a reuniao como `failed` com mensagem em `processingError`.

## Fluxo da extensao Chrome
- A extensao detecta Google Meet, abre painel lateral e envia segmentos pelas rotas em `src/app/api/extension`.
- O token seguro por usuario e gerado em `/settings` (armazenado como hash SHA-256).
- O plano detalhado esta em `docs/chrome-extension-plan.md`.

## Banco Prisma Postgres
- Crie o banco em [console.prisma.io](https://console.prisma.io).
- Use `DATABASE_URL` (Accelerate) para a aplicacao e runtime na Vercel.
- Use `DIRECT_URL` para `prisma migrate`.

## Hospedagem
- GitHub + Vercel
- Env vars minimas: `DATABASE_URL`, `DIRECT_URL`, `AUTH_SECRET`, `NEXT_PUBLIC_APP_URL`
- Recomendado em producao: `BLOB_READ_WRITE_TOKEN`, `GROQ_API_KEY` ou `OPENAI_API_KEY`, `ASSEMBLYAI_API_KEY`

## Seguranca e LGPD
- Upload privado sem URLs publicas desnecessarias.
- Validacao no backend com Zod.
- Sessao por cookie `httpOnly` com JWT validado no middleware.
- Token da extensao armazenado como hash — nunca em texto puro.
- Chaves de API ficam restritas ao servidor.
- Campo de consentimento obrigatorio no cadastro da reuniao.
- Plano, creditos, storage e ownership validados no backend.

## Proximos passos
- Implementar extensao Chrome para Google Meet
- Integracao com Zoom/Teams via bot ou upload de gravacao
- Fila dedicada (Inngest/Workflow) para processamentos longos
- Exportacao PDF e retencao automatica de arquivos (LGPD)
