import express from 'express';
import pool from './db.js';

const app = express();

app.get('/healthz', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});

