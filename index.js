const express = require('express');
const app = express();

app.use(express.json());

// SESSION MANAGER — guarda variables entre flujos
const sessions = {};

app.get('/', (req, res) => {
  res.json({ 
    ok: true, 
    mensaje: 'EDOAI Core funcionando correctamente',
    version: '2.0.0'
  });
});

// Guardar variable en sesión
app.get('/session/set', (req, res) => {
  const { phone, key, value } = req.query;
  if (!phone || !key || !value) {
    return res.json({ ok: false, error: 'Faltan parámetros: phone, key, value' });
  }
  if (!sessions[phone]) sessions[phone] = {};
  sessions[phone][key] = value;
  sessions[phone].updated = new Date().toISOString();
  res.json({ ok: true, phone, key, value });
});

// Obtener variable de sesión
app.get('/session/get', (req, res) => {
  const { phone, key } = req.query;
  if (!phone || !key) {
    return res.json({ ok: false, error: 'Faltan parámetros: phone, key' });
  }
  const value = sessions[phone]?.[key] || null;
  res.json({ ok: true, phone, key, value });
});

// Limpiar sesión completa
app.get('/session/clear', (req, res) => {
  const { phone } = req.query;
  if (!phone) {
    return res.json({ ok: false, error: 'Falta parámetro: phone' });
  }
  delete sessions[phone];
  res.json({ ok: true, phone, mensaje: 'Sesión limpiada' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`EDOAI Core v2.0.0 corriendo en puerto ${PORT}`);
});