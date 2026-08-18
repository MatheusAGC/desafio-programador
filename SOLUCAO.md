# Solução

## Como rodar

Sobe três serviços: `db`, `api` e `worker`. Acesse `http://localhost:3000`.

Antes de subir, copie `.env.example` para `.env` e ajuste os valores se quiser.

Aplicação publicada: <https://desafio-programador-e3zr.onrender.com>

## O que foi implementado

- Fluxo completo para **cartão de ponto**: upload de PDF → fila → worker assíncrono →
  extração de texto → parser estruturado → revisão em interface web →
  correção manual → download de planilha.
- API HTTP seguindo o contrato pedido: `POST /api/transcricoes`, `GET /api/transcricoes/:id`,
  `PUT /api/transcricoes/:id`, `GET /api/transcricoes/:id/planilha`, `GET /healthz`.
  - JSON de saída no schema exigido: `{ pages: [{ page, days: [{ date_raw, punches: [{ kind,
  time_raw, time_hhmm }] }] }] }`.
- Processamento assíncrono real: a API responde `202` imediatamente após enfileirar; um 
  processo separado roda em loop, consumindo a fila e atualizando o status conforme processa.
- `docker-compose.yml` com três serviços, construídos a partir do mesmo
  `Dockerfile`, com volumes persistentes para o banco e para os arquivos enviados.
- Configuração via variáveis de ambiente; `.env.example` documenta as chaves esperadas.
- A tabela do banco é criada automaticamente no startup, então a
  aplicação funciona em qualquer banco Postgres vazio, local ou em produção, sem passo manual.

## O que NÃO foi implementado 

- **Holerite não foi implementado.** O README pede explicitamente priorizar profundidade em vez
  de cortar o ciclo — o ideal seria os dois tipos parcialmente funcionais. Dado o prazo real
  disponível, optei por um único tipo completo, incluindo OCR e interface, para não entregar 
  dois tipos quebrados.
- **Avisos derivados (batidas ímpares, data não sequencial)** não estão implementados nem na
  interface nem na planilha — a estrutura de dados já suporta calcular isso, mas o cálculo 
  e o destaque visual não foram feitos.
- **Exportação apenas em `.xlsx`** — os formatos `csv` e `json` via `?formato=` não foram
  implementados.
- **Validação de upload**: não há limite de tamanho de arquivo nem verificação de que o arquivo
  enviado é de fato um PDF válido.
- **Rastreabilidade visual, detecção automática de tipo e ficha financeira** (bônus) não foram
  implementados.

## Segurança e privacidade

- **Retenção**: os PDFs enviados ficam salvos em disco e os dados extraídos
  ficam no Postgres, sem expiração automática — não há rotina de limpeza. Em produção, o sistema
  de arquivos não é persistente entre reinícios do serviço: PDFs enviados
  podem ser perdidos se o serviço reiniciar antes do processamento terminar. Isso é uma limitação
  conhecida do plano gratuito, não uma escolha de design; para produção real seria necessário
  armazenamento externo e uma política de expiração explícita dos dados.
- **Segredos**: credenciais de banco não estão mais hardcoded no repositório — vêm de variáveis
  de ambiente (`.env` local, não versionado; variáveis de ambiente do Render em produção).
- **Logs**: os logs do worker imprimem apenas o `id` da transcrição (UUID), nunca o conteúdo do
  documento ou dados extraídos.
- **Não implementado**: limite de tamanho de upload, validação de assinatura de arquivo para 
  confirmar que é um PDF real.


## Arquitetura

- **API (Node.js + Express)**: recebe uploads , grava metadados no Postgres,
  serve as rotas de consulta/edição/planilha, e serve o frontend estático.
- **Worker (Node.js, processo separado)**: fica em loop, consultando a cada poucos segundos por
  transcrições com `status = processando` e `resultado` ainda nulo. Para cada uma: tenta extrair
  texto diretamente do PDF; se vier vazio (PDF escaneado), converte as páginas em
  imagem e roda OCR. Em seguida, aplica um parser específico do tipo de
  documento para estruturar o resultado no schema exigido.
- **Banco de dados (Postgres)**: funciona tanto como armazenamento persistente quanto como a
  "fila" de trabalho — a coluna `status` é o visualizador sobre o que falta processar.
- **Frontend**: uma página HTML/JS simples (sem framework), que faz upload, consulta o status
  periodicamente, exibe uma tabela editável com os dados extraídos, permite salvar
  correções e baixar a planilha final.
- **Deploy no Render**: rodam no mesmo processo em produção, enquanto localmente continuam como
  dois processos/containers separados, que é a arquitetura de referência.

## Honestidade dos dados

O parser de cartão de ponto foi construído a partir da observação direta dos exemplos fornecidos, 
não de uma especificação genérica. Ele assume que:

- O documento tem uma seção `Mes/Ano` por página, usada para resolver o ano/mês de cada dia.
- Cada dia começa com o padrão `N - ABREVIAÇÃO_DIA_SEMANA`.
- O primeiro horário em cada linha de dia é a jornada esperada e é descartado.
- Trechos de duração de horas extras são removidos antes da extração de horários, para não 
  serem confundidos com batidas reais.

**Limitação importante**: o parser não implementa a marcação `?` por caractere ilegível — ele
extrai o que reconhece com confiança nos padrões observados, mas não tem um mecanismo de
"incerteza parcial" dentro de um valor. Isso é uma lacuna real frente ao que o README pede.

Esse parser não foi testado contra layouts de outros sistemas de ponto eletrônico além dos
exemplos fornecidos, e é esperado que precise de ajustes para outros formatos.

## Uso de IA

Ver `PROCESSO.md` para o relato detalhado do uso de IA ao longo do desenvolvimento.