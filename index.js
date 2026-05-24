const express = require('express');
const axios = require('axios');
const app = express();

app.use(express.json());

const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyHibCtMpA45wVMtp8p76NDlTAmdmXtrHuuSQC84ID2D8F0pWuJyEVWKCsHvWhbNWZJ5A/exec';

// SESSION MANAGER
const sessions = {};

app.get('/', (req, res) => {
  res.json({ ok: true, mensaje: 'EDOAI Core v4.0.0', version: '4.0.0' });
});

// Guardar variable en sesión
app.get('/session/set', (req, res) => {
  const { phone, key, value } = req.query;
  if (!phone || !key || !value) return res.json({ ok: false, error: 'Faltan parámetros' });
  if (!sessions[phone]) sessions[phone] = {};
  sessions[phone][key] = value;
  res.json({ ok: true, phone, key, value });
});

// Obtener variable de sesión
app.get('/session/get', (req, res) => {
  const { phone, key } = req.query;
  if (!phone || !key) return res.json({ ok: false, error: 'Faltan parámetros' });
  const value = sessions[phone]?.[key] || null;
  res.json({ ok: true, phone, key, value });
});

// Limpiar sesión
app.get('/session/clear', (req, res) => {
  const { phone } = req.query;
  if (!phone) return res.json({ ok: false, error: 'Falta phone' });
  delete sessions[phone];
  res.json({ ok: true, phone, mensaje: 'Sesión limpiada' });
});

// RESUMEN DEL DÍA — llama al Apps Script y devuelve el texto directamente
app.get('/resumen', async (req, res) => {
  try {
    const response = await axios.get(APPS_SCRIPT_URL, {
      params: { accion: 'resumen' }
    });
    const data = response.data;
    if (data.ok) {
      res.send(data.answer);
    } else {
      res.send('⚠️ No hay registros para hoy.');
    }
  } catch (err) {
    res.send('⚠️ Error al obtener el resumen. Intente nuevamente.');
  }
});

// NOTIFICACIÓN — envía resumen al WhatsApp del usuario via BBC
app.get('/notificar-resumen', async (req, res) => {
  try {
    const response = await axios.get(APPS_SCRIPT_URL, {
      params: { accion: 'resumen' }
    });
    const data = response.data;
    res.json({ ok: true, answer: data.answer || '⚠️ Sin registros hoy.' });
  } catch (err) {
    res.json({ ok: false, answer: '⚠️ Error al obtener el resumen.' });
  }
});
// RESUMEN — devuelve JSON con campo body para BBC
app.get('/resumen-texto', async (req, res) => {
  try {
    const response = await axios.get(APPS_SCRIPT_URL, {
      params: { accion: 'resumen' }
    });
    const data = response.data;
    res.json({
      ok: true,
      body: data.answer || '⚠️ Sin registros hoy.'
    });
  } catch (err) {
    res.json({
      ok: false,
      body: '⚠️ Error al obtener el resumen.'
    });
  }
});
// DASHBOARD HTML — resumen del día visual
app.get('/dashboard/resumen', async (req, res) => {
  try {
    const response = await axios.get(APPS_SCRIPT_URL, {
      params: { accion: 'resumen' }
    });
    const data = response.data;
    const texto = data.answer || '⚠️ Sin registros para hoy.';
    const lineas = texto.split('\n');
    const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>EDOAI — Resumen del Día</title>
<style>
  body { font-family: Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
  .card { background: white; border-radius: 12px; padding: 24px; max-width: 480px; margin: 0 auto; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
  h1 { color: #2c3e50; font-size: 20px; margin-bottom: 4px; }
  .fecha { color: #7f8c8d; font-size: 14px; margin-bottom: 20px; }
  .linea { padding: 8px 0; border-bottom: 1px solid #ecf0f1; font-size: 15px; color: #2c3e50; }
  .linea:last-child { border-bottom: none; }
  .ingresos { color: #27ae60; font-weight: bold; font-size: 16px; }
</style>
</head>
<body>
<div class="card">
${lineas.map((l, i) => `<div class="linea ${l.includes('$') ? 'ingresos' : ''}">${l || '&nbsp;'}</div>`).join('')}
</div>
</body>
</html>`;
    res.send(html);
  } catch (err) {
    res.send('<h3>Error al obtener el resumen. Intente nuevamente.</h3>');
  }
});
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`EDOAI Core v4.0.0 corriendo en puerto ${PORT}`);
});