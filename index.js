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
// RESUMEN TEXTO PLANO — BBC puede mostrar directamente sin messageMapping
app.get('/resumen-texto', async (req, res) => {
  try {
    const response = await axios.get(APPS_SCRIPT_URL, {
      params: { accion: 'resumen' }
    });
    const data = response.data;
    const texto = data.answer || '⚠️ Sin registros para hoy.';
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.send(texto);
  } catch (err) {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.send('⚠️ Error al obtener el resumen. Intente nuevamente.');
  }
});
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`EDOAI Core v4.0.0 corriendo en puerto ${PORT}`);
});