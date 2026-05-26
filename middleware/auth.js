const axios = require('axios');

const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL || 'https://script.google.com/macros/s/AKfycbyHibCtMpA45wVMtp8p76NDlTAmdmXtrHuuSQC84ID2D8F0pWuJyEVWKCsHvWhbNWZJ5A/exec';

async function obtenerContextoUsuario(telefono) {
  const tel = String(telefono || '').replace(/\D/g, '');
  if (!tel || tel.length < 10) {
    return { ok: false, error: 'TELEFONO_INVALIDO' };
  }
  try {
    const response = await axios.get(APPS_SCRIPT_URL, {
      params: { accion: 'identificar_usuario', telefono: tel },
      timeout: 10000
    });
    const data = response.data;
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
    console.error('Auth error:', err.message);
    return { ok: false, error: 'SERVICIO_IDENTIDAD_NO_DISPONIBLE' };
  }
}

// Alias para compatibilidad
const identificarUsuario = obtenerContextoUsuario;

module.exports = { obtenerContextoUsuario, identificarUsuario };