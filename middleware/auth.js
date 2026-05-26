const axios = require('axios');

const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL || 'https://script.google.com/macros/s/AKfycbyHibCtMpA45wVMtp8p76NDlTAmdmXtrHuuSQC84ID2D8F0pWuJyEVWKCsHvWhbNWZJ5A/exec';

async function obtenerContextoUsuario(telefono) {
  const tel = String(telefono || '').replace(/\D/g, '');
  if (!tel || tel.length < 10) {
    return { ok: false, error: 'TELEFONO_INVALIDO' };
  }
  try {
    console.log('[auth] Llamando Apps Script para:', tel);
    const response = await axios.get(APPS_SCRIPT_URL, {
      params: { accion: 'identificar_usuario', telefono: tel },
      timeout: 25000,
      maxRedirects: 5,
      headers: { 'Accept': 'application/json' }
    });
    console.log('[auth] Status:', response.status);
    const data = response.data;
    console.log('[auth] ok:', data.ok);
    if (!data.ok) {
      return { ok: false, error: data.error || 'USUARIO_NO_AUTORIZADO' };
    }
    return {
      ok: true,
      usuario_id:   data.usuario_id,
      nombre:       data.nombre,
      rol:          data.rol,
      parroquia_id: data.parroquia_id,
      diocesis:     data.diocesis,
      estado:       data.estado
    };
  } catch (err) {
    console.error('[auth] Error:', err.code, err.message);
    return { ok: false, error: 'SERVICIO_IDENTIDAD_NO_DISPONIBLE', detalle: err.message };
  }
}

module.exports = { obtenerContextoUsuario };