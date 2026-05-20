const express = require('express');
const axios = require('axios');
const app = express();

app.use(express.json());

// SESSION MANAGER
const sessions = {};

const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyHibCtMpA45wVMtp8p76NDlTAmdmXtrHuuSQC84ID2D8F0pWuJyEVWKCsHvWhbNWZJ5A/exec';

app.get('/', (req, res) => {
  res.json({ ok: true, mensaje: 'EDOAI Core v3.0.0', version: '3.0.0' });
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

// REGISTRAR OPERACIÓN — puente al Apps Script
app.get('/registrar', async (req, res) => {
  const { phone, servicio, valor, metodo_pago, observacion } = req.query;

  // Obtener detalle exacto de la sesión
  const detalle = sessions[phone]?.detalle || '';

  try {
    const response = await axios.get(APPS_SCRIPT_URL, {
      params: {
        accion: 'registrar',
        servicio: servicio || '',
        valor: valor || '0',
        metodo_pago: metodo_pago || '',
        observacion: observacion || '',
        detalle: detalle
      }
    });

    // Limpiar el detalle de la sesión después de registrar
    if (sessions[phone]) delete sessions[phone].detalle;

    res.json({ ok: true, resultado: response.data });
  } catch (err) {
    res.json({ ok: false, error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`EDOAI Core v3.0.0 corriendo en puerto ${PORT}`);
});