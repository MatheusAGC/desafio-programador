import express from 'express';
import pool from './db.js';

const app = express();

app.get('/healthz', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.post('/api/transcricoes', async (req, res) => {
  const resultado = await pool.query("INSERT INTO transcricoes (tipo, status) VALUES ('cartao_ponto', 'pendente') RETURNING id");
  const id = resultado.rows[0].id;
  res.status(202).json({ id });
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});

