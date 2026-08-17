# Solução

## O que foi implementado

- Fluxo completo para **cartão de ponto**: upload de PDF → fila (banco) → worker assíncrono →
  extração de texto (com fallback para OCR) → parser estruturado → revisão em interface web →
  correção manual → download de planilha (.xlsx).
- API HTTP seguindo o contrato pedido: `POST /api/transcricoes`, `GET /api/transcricoes/:id`,
  `PUT /api/transcricoes/:id`, `GET /api/transcricoes/:id/planilha`, `GET /healthz`.
- Processamento assíncrono real: a API responde `202` imediatamente após enfileirar (inserir no
  banco com `status: pendente`); um processo separado (`worker.js`) roda em loop, consumindo a
  fila e atualizando o status conforme processa.
- `docker-compose.yml` com três serviços (`db`, `api`, `worker`), construídos a partir do mesmo
  `Dockerfile`, com volumes persistentes para o banco e para os arquivos enviados.

## O que NÃO foi implementado 

- **Holerite não foi implementado.**  Priorizei entregar um único tipo
  de documento (cartão de ponto) funcional — incluindo OCR, revisão e
  planilha — em vez de dois tipos parcialmente funcionais. A arquitetura (fila, worker, rotas,
  frontend) foi desenhada para ser genérica; adicionar holerite exigiria principalmente um novo
  parser de texto e um schema de planilha diferente, reaproveitando o resto do pipeline.
- **Deploy em produção**: Não completo. A aplicação roda localmente via
  `docker compose up --build`, o que já demonstra a arquitetura completa (API, worker e banco
  como serviços separados).

## Arquitetura

- **API (Node.js + Express)**: recebe uploads (via `multer`), grava metadados no Postgres,
  serve as rotas de consulta/edição/planilha, e serve o frontend estático (`public/`).
- **Worker (Node.js, processo separado)**: fica em loop, consultando a cada poucos segundos por
  transcrições com `status = pendente`. Para cada uma: tenta extrair texto diretamente do PDF
  (`pdf-parse`); se vier vazio (PDF escaneado), converte as páginas em imagem e roda OCR
  (`tesseract.js`). Em seguida, aplica um parser específico do tipo de documento para estruturar
  o resultado em JSON.
- **Banco de dados (Postgres)**: funciona tanto como armazenamento persistente quanto como a
  "fila" de trabalho — a coluna `status` é o visualizador sobre o que falta processar.
- **Frontend**: uma página HTML/JS simples (sem framework), que faz upload, consulta o status
  periodicamente, exibe uma tabela editável com os dados extraídos, permite salvar
  correções e baixar a planilha final.

## Honestidade dos dados

O parser de cartão de ponto foi construído a partir da observação direta dos exemplos fornecidos,
 não de uma especificação genérica. Ele assume que:
- O documento contém uma seção `Mes/Ano` por página, usada para resolver o ano/mês de cada dia.
- Cada dia começa com o padrão `N - ABREVIAÇÃO_DIA_SEMANA` (ex: `2 - SEG`).
- O primeiro horário em cada linha de dia é a jornada esperada (não uma batida real) e é
  descartado.
- Trechos de duração de horas extras (ex: `HE-BCO DE HORAS 00:13`) são removidos antes da
  extração de horários, para não serem confundidos com batidas reais.


Uma limitação conhecida e esperada, parser não funcionará corretamente em todos os modelos de dados, dado que o desafio explicitamente avisa que os exemplos não são
a especificação completa.

Não há geração de caracteres inventados: o parser extrai apenas o que consegue identificar com
confiança nos padrões observados; dias sem batidas ficam com lista vazia, não com valores
inventados.

## Uso de IA

Ver `PROCESSO.md` para o relato detalhado do uso de IA ao longo do desenvolvimento.