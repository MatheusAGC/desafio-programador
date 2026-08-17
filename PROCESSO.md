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