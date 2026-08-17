import express from 'express';
import pool from './db.js';
import multer from 'multer';
import crypto from 'crypto';
import XLSX from 'xlsx';

const app = express();

app.use(express.json());

const upload = multer({
  storage: multer.diskStorage({
    destination: 'uploads/',
    filename: (req, file, cb) => {
      const extensao = file.originalname.split('.').pop();
      cb(null, `${crypto.randomUUID()}.${extensao}`);
    },
  }),
});;

app.get('/healthz', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.post('/api/transcricoes', upload.single('pdf'), async(req, res) =>{
  const caminhoArquivo = req.file.path;
  const tipo = req.body.tipo;
  const resultado = await pool.query( "INSERT INTO transcricoes (tipo, status, caminho_arquivo) VALUES ( $1, 'pendente', $2) RETURNING id", [tipo, caminhoArquivo]);
  const id = resultado.rows[0].id;
  res.status(202).json({ id });
});

// GET - consulta status e resultado
app.get('/api/transcricoes/:id', async (req, res) => {
  const { id } = req.params;
  const resultado = await pool.query(
    'SELECT id, tipo, status, resultado FROM transcricoes WHERE id = $1',
    [id]
  );
  if (resultado.rows.length === 0) {
    return res.status(404).json({ erro: 'transcricao nao encontrada' });
  }
  res.json(resultado.rows[0]);
});

// PUT - usuario envia correcoes no resultado
app.put('/api/transcricoes/:id', async (req, res) => {
  const { id } = req.params;
  const { resultado } = req.body;
  const atualizado = await pool.query(
    'UPDATE transcricoes SET resultado = $1 WHERE id = $2 RETURNING id',
    [JSON.stringify(resultado), id]
  );
  if (atualizado.rows.length === 0) {
    return res.status(404).json({ erro: 'transcricao nao encontrada' });
  }
  res.json({ ok: true });
});

// GET - baixa a planilha final
app.get('/api/transcricoes/:id/planilha', async (req, res) => {
  const { id } = req.params;
  const resultado = await pool.query(
    'SELECT resultado FROM transcricoes WHERE id = $1',
    [id]
  );
  if (resultado.rows.length === 0) {
    return res.status(404).json({ erro: 'transcricao nao encontrada' });
  }

  const dados = resultado.rows[0].resultado;
  const linhas = (dados.dias || []).map((dia) => ({
    Data: dia.data,
    Batidas: (dia.batidas || []).join(' | '),
  }));

  const planilha = XLSX.utils.json_to_sheet(linhas);
  const livro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(livro, planilha, 'Transcricao');
  const buffer = XLSX.write(livro, { type: 'buffer', bookType: 'xlsx' });

  res.setHeader('Content-Disposition', `attachment; filename=transcricao-${id}.xlsx`);
  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  res.send(buffer);
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});

