const express = require('express');
const app = express();

app.get('/', (req, res) => {
  console.log('ROOT OK');
  res.send('ok');
});

app.get('/test', (req, res) => {
  console.log('TEST OK');
  res.send('test ok');
});

app.get('/ping', (req, res) => {
  console.log('PING OK');
  res.json({ ok: true, mensaje: 'pong' });
});

app.listen(process.env.PORT || 3000, '0.0.0.0', () => {
  console.log('Test server corriendo en puerto', process.env.PORT || 3000);
});