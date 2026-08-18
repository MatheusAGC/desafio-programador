import pool, { garantirTabela } from './db.js';
import fs from 'fs';
import { PDFParse } from 'pdf-parse';
import { pdfToPng } from 'pdf-to-png-converter';
import { createWorker } from 'tesseract.js';

// Extrai o texto de um PDF. Se vier vazio (PDF escaneado), cai pro OCR.
async function extrairTexto(caminhoArquivo) {
  const buffer = fs.readFileSync(caminhoArquivo);
  const parser = new PDFParse({ data: buffer });
  const resultado = await parser.getText();
  await parser.destroy();

  if (resultado.text && resultado.text.trim().length > 0) {
    console.log('Texto extraido diretamente do PDF (sem OCR)');
    return resultado.text;
  }

  console.log('PDF sem camada de texto — usando OCR (pode demorar um pouco)');
  const paginasPng = await pdfToPng(caminhoArquivo, { viewportScale: 2.0 });

  const worker = await createWorker('por'); // 'por' = portugues
  let textoCompleto = '';
  for (const pagina of paginasPng) {
    const { data } = await worker.recognize(pagina.content);
    textoCompleto += data.text + '\n';
  }
  await worker.terminate();

  return textoCompleto;
}

// Transforma o texto bruto em JSON estruturado de cartao de ponto.
// Heuristica basica: procura linhas com data + pares de horarios.
function parseCartaoPonto(texto) {
  const textoSemDuracao = texto.replace(
    /(HE-BCO DE HORAS|HE-REMUNERADA|HE COMPENSADA|REG\.\s*SUSPENSO|ABN\/DEC\.CHEFIA)\s*\d{2}:\d{2}/g,
    ''
  );

  // pdf-parse separa paginas com "-- N of M --"; usamos isso pra saber a pagina de cada dia
  const blocosPagina = textoSemDuracao.split(/-- (\d+) of \d+ --/);
  // blocosPagina alterna: [textoAntes, "1", textoPagina1, "2", textoPagina2, ...]

  const regexMesAno = /Mes\/Ano\s*:\s*(\d{1,2})\s*\/\s*(\d{4})/;
  const regexDia = /^(\d{1,2})\s*-\s*([A-ZÇÃÕa-z]{3})\s*(.*)$/;
  const linhasIgnorar = /(Horario de Trabalho|Mes\/Ano|Assinado eletronicamente|Número do|Matricula|Unidade de Lotacao|Ass\.Respons|SIPON|F O L H A|Dia Semana Jornada|ID\.|Fls\.:|POEL,C|¯)/;

  const pages = [];
  let numeroPagina = 1;

  for (let i = 0; i < blocosPagina.length; i++) {
    // pula os indices que sao so o numero da pagina (capturados pelo split)
    if (/^\d+$/.test(blocosPagina[i].trim()) && blocosPagina[i].trim().length < 3) continue;

    const textoPagina = blocosPagina[i];
    if (!textoPagina || !textoPagina.includes('Dia Semana')) continue;

    const linhas = textoPagina.split('\n');
    let mesAtual = null;
    let anoAtual = null;
    let diaAtualIdx = null;
    const days = [];

    for (const linhaRaw of linhas) {
      const linha = linhaRaw.trim();
      if (!linha) continue;

      const matchMesAno = linha.match(regexMesAno);
      if (matchMesAno) {
        mesAtual = matchMesAno[1].padStart(2, '0');
        anoAtual = matchMesAno[2];
        diaAtualIdx = null;
        continue;
      }

      if (linhasIgnorar.test(linha)) {
        diaAtualIdx = null;
        continue;
      }

      const matchDia = linha.match(regexDia);
      if (matchDia && mesAtual && anoAtual) {
        const diaNum = matchDia[1].padStart(2, '0');
        const resto = matchDia[3];
        const horarios = [...resto.matchAll(/\d{2}:\d{2}/g)].map((m) => m[0]);
        const batidas = horarios.slice(1); // primeiro = jornada esperada, descarta

        const dateRaw = `${diaNum}/${mesAtual}/${anoAtual}`;

        // linha repetida (mesmo dia, continuacao com "N - DIA" de novo) -> mesmo indice
        const existente = days.findIndex((d) => d.date_raw === dateRaw);
        if (existente >= 0) {
          adicionarPunches(days[existente], batidas);
          diaAtualIdx = existente;
        } else {
          const novoDay = { date_raw: dateRaw, punches: [] };
          adicionarPunches(novoDay, batidas);
          days.push(novoDay);
          diaAtualIdx = days.length - 1;
        }
        continue;
      }

      if (diaAtualIdx !== null) {
        const horariosContinuacao = [...linha.matchAll(/\d{2}:\d{2}/g)].map((m) => m[0]);
        if (horariosContinuacao.length > 0) {
          adicionarPunches(days[diaAtualIdx], horariosContinuacao);
        }
      }
    }

    if (days.length > 0) {
      pages.push({ page: numeroPagina, days });
      numeroPagina++;
    }
  }

  return { pages };
}

function adicionarPunches(day, horarios) {
  horarios.forEach((h) => {
    const kind = day.punches.length % 2 === 0 ? 'IN' : 'OUT';
    day.punches.push({ kind, time_raw: h, time_hhmm: h });
  });
}

async function processarUm() {
  const { rows } = await pool.query(
    "SELECT id, caminho_arquivo FROM transcricoes WHERE status = 'processando' AND resultado IS NULL AND caminho_arquivo IS NOT NULL LIMIT 1"
  );

  if (rows.length === 0) return false; // nada pra fazer

  const { id, caminho_arquivo } = rows[0];
  console.log(`Processando transcricao ${id}...`);

  await pool.query("UPDATE transcricoes SET status = 'processando' WHERE id = $1", [id]);

  try {
    const texto = await extrairTexto(caminho_arquivo);
    const resultado = parseCartaoPonto(texto);

    await pool.query(
      "UPDATE transcricoes SET status = 'concluido', resultado = $1 WHERE id = $2",
      [JSON.stringify(resultado), id]
    );
    console.log(`Transcricao ${id} concluida.`);
  } catch (erro) {
    console.error(`Erro processando ${id}:`, erro.message);
    await pool.query(
      "UPDATE transcricoes SET status = 'erro', resultado = $1 WHERE id = $2",
      [JSON.stringify({ erro: erro.message }), id]
    );
  }

  return true;
}

async function loop() {
  await garantirTabela();
  console.log('Worker iniciado. Verificando transcricoes pendentes...');
  while (true) {
    const processou = await processarUm();
    if (!processou) {
      await new Promise((resolve) => setTimeout(resolve, 3000)); // espera 3s
    }
  }
}

loop();