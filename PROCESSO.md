# Processo de desenvolvimento

## Contexto

Este projeto foi desenvolvido com o apoio de IA , usada como ferramenta de
aprendizado e pareamento — não apenas como gerador de código pronto. Meu conhecimento prévio era
concentrado em Salesforce, com algum conhecimento em Node.js e docker porém quase nada de PostgreSQL. 
O desafio foi usado deliberadamente como oportunidade de aprender essas tecnologias na prática, dado 
que a vaga pede conhecimento em JavaScript/TypeScript, SQL/Postgres e ferramentas de IA para 
desenvolvimento.

## Como a IA foi usada

- **Explicação de conceitos**: processamento assíncrono, filas via banco de dados, containers
  Docker, volumes, queries parametrizadas, diferença entre CommonJS e ES Modules, entre outros
 — explicados de forma incremental antes de eu escrever ou aplicar o código correspondente.
- **Pareamento na escrita de código**: parte do código como rotas Express, worker, parser,
  foi gerado em conjunto com IA com explicação do que cada parte faz, e por mim aplicado, 
  testado e ajustado.
- **Depuração**: vários erros reais durante o desenvolvimento foram diagnosticados com ajuda da
  IA, incluindo: incompatibilidade de versão da biblioteca `pdf-parse`, bug de estado (`lastIndex`) 
  em uso de regex global reutilizada, diferença de sintaxe entre PowerShell e Bash para `curl`.
- **Priorização de tarefas**: a IA ajudou a identificar, onde cortar escopo  sem comprometer o 
  ciclo funcional completo.

## O que eu fiz manualmente

- Todas as decisões de arquitetura e escopo foram minhas, tomadas a partir de decisões próprias e
  trade-offs apresentados pela IA.
- Toda a execução de comandos, testes manuais, instalação de ferramentas (Node, Git, Docker) e 
  resolução de problemas de ambiente foi feita por mim, com orientação se fosse necessário.
- A revisão dos dados extraídos contra o texto bruto dos PDFs  foi feita por mim, comparando a saída da 
  IA com o conteúdo real dos documentos de exemplo.

  ## Perguntas do enunciado

**1. Três decisões em que havia mais de uma resposta razoável — por que escolhi essa?**

- *SQL puro (`pg`) vs. ORM (Prisma/Sequelize)*: escolhi SQL puro porque estava aprendendo
  e queria entender a query real, não abstrair atrás de uma ferramenta. Custo: mais código
  manual e mais superfície para erro de sintaxe.
- *Um tipo de documento completo vs. dois tipos parciais*: o README recomenda explicitamente
  cortar profundidade e manter os dois tipos parcialmente funcionais. Escolhi o oposto —
  cartão de ponto parcialmente completo, holerite ausente — porque, dado o tempo real que tinha,
  avaliei que dois pipelines de extração pela metade seria pior do que um funcionando de ponta a 
  ponta e auditável. Reconheço que isso diverge da orientação do enunciado.
- *Tesseract.js (WASM, local) vs. serviço de nuvem (AWS Textract)*: escolhi Tesseract.js para não
  depender de credenciais de nuvem nem custo por chamada, aceitando um OCR provavelmente menos
  preciso que um serviço comercial.

**2. O que na minha solução quebra primeiro em produção?**

O worker processa um item por vez, em loop com espera fixa e sob upload simultâneo de vários PDFs
grandes, a fila cresce e o tempo de espera do usuário aumenta sem nenhum feedback de posição na 
fila. Em paralelo, no plano gratuito do Render, o sistema de arquivos não é persistente — um 
restart do serviço nesse meio-tempo perde os PDFs ainda não processados, com o registro no banco
ficando preso em `processando` indefinidamente.

**3. Onde eu não confio no que entreguei?**

No parser de cartão de ponto em si, para qualquer documento fora do padrão exato dos exemplos que
usei para construir e testar. Ele depende de padrões textuais específicos
(`Mes/Ano :`, `N - ABREVIAÇÃO`) que provavelmente não existem em outros sistemas de ponto
eletrônico. Também não confio na ausência de marcação `?` por caractere incerto — o parser não
tem esse mecanismo, então um caractere mal lido pelo OCR hoje aparece como um valor errado
silencioso, não como incerteza sinalizada, o que é exatamente o tipo de risco que o enunciado
mais pede para evitar.