# Plano da futura extensao Chrome do AoMeet AI

## Objetivo
Preparar a proxima fase do produto para capturar contexto do Google Meet, sincronizar transcricao ao vivo e abrir um painel lateral conectado ao backend do AoMeet AI.

## Escopo funcional
- Detectar paginas do Google Meet.
- Abrir painel lateral do AoMeet AI.
- Mostrar uso do plano e idioma selecionado.
- Iniciar captura e transcricao ao vivo.
- Exibir transcricao incremental em tempo real.
- Permitir notas rapidas durante a reuniao.
- Oferecer botoes de pausar, finalizar e gerar resumo.
- Enviar segmentos para o backend do AoMeet AI.
- Permitir perguntas a IA ao final da reuniao.

## Rotas prontas no MVP
- `POST /api/extension/meetings/start`
- `POST /api/extension/meetings/:id/transcript-segment`
- `POST /api/extension/meetings/:id/finish`
- `GET /api/extension/meetings/:id`

## Seguranca
- Usar `Authorization: Bearer <extensionToken>` por usuario.
- Nunca expor chaves de provider no bundle da extensao.
- Minimizar dados sensiveis em armazenamento local do navegador.
- Deixar o consentimento explicito antes do inicio da captura.

## Proxima arquitetura sugerida
1. Background service worker para autenticar e gerenciar estado.
2. Content script para detectar o Google Meet e montar o painel.
3. Side panel para transcricao ao vivo, notas e status da reuniao.
4. Fila de envio incremental para transcript segments.
5. Reprocessamento final via rota `/finish`.
