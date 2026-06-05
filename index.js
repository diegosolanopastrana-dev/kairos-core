const express = require('express');
const axios = require('axios');
const { obtenerContextoUsuario } = require('./middleware/auth');
const app = express();

app.use(express.json());

const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyHibCtMpA45wVMtp8p76NDlTAmdmXtrHuuSQC84ID2D8F0pWuJyEVWKCsHvWhbNWZJ5A/exec';

const sessions = {};

app.get('/', (req, res) => {
  res.json({ ok: true, mensaje: 'EDOAI Core v4.1.0', version: '4.1.0' });
});

app.get('/session/set', (req, res) => {
  const { phone, key, value } = req.query;
  if (!phone || !key || !value) return res.json({ ok: false, error: 'Faltan parámetros' });
  if (!sessions[phone]) sessions[phone] = {};
  sessions[phone][key] = value;
  res.json({ ok: true, phone, key, value });
});

app.get('/session/get', (req, res) => {
  const { phone, key } = req.query;
  if (!phone || !key) return res.json({ ok: false, error: 'Faltan parámetros' });
  const value = sessions[phone]?.[key] || null;
  res.json({ ok: true, phone, key, value });
});

app.get('/session/clear', (req, res) => {
  const { phone } = req.query;
  if (!phone) return res.json({ ok: false, error: 'Falta phone' });
  delete sessions[phone];
  res.json({ ok: true, phone, mensaje: 'Sesión limpiada' });
});

app.get('/identificar', async (req, res) => {
  const telefono = req.query.telefono || req.query.numero || '';
  if (!telefono) return res.json({ ok: false, rol: 'DESCONOCIDO', error: 'TELEFONO_REQUERIDO' });
  try {
    console.log('Identificando:', telefono);
    const resultado = await obtenerContextoUsuario(telefono);
    console.log('Resultado:', JSON.stringify(resultado));
    if (resultado.ok) {
      res.json({
        ok: true,
        rol: resultado.rol,
        nombre: resultado.nombre,
        usuario_id: resultado.usuario_id,
        parroquia_id: resultado.parroquia_id,
        diocesis: resultado.diocesis
      });
    } else {
      res.json({ ok: false, rol: 'DESCONOCIDO', error: resultado.error });
    }
  } catch (err) {
    console.error('Error identificar:', err.message);
    res.json({ ok: false, error: err.message });
  }
});

app.get('/resumen', async (req, res) => {
  try {
    const response = await axios.get(APPS_SCRIPT_URL, { params: { accion: 'resumen' } });
    const data = response.data;
    res.send(data.ok ? data.answer : '⚠️ No hay registros para hoy.');
  } catch (err) {
    res.send('⚠️ Error al obtener el resumen.');
  }
});

app.get('/resumen-texto', async (req, res) => {
  try {
    const response = await axios.get(APPS_SCRIPT_URL, { params: { accion: 'resumen' } });
    const data = response.data;
    res.json({ ok: true, body: data.answer || '⚠️ Sin registros hoy.' });
  } catch (err) {
    res.json({ ok: false, body: '⚠️ Error al obtener el resumen.' });
  }
});

app.get('/notificar-resumen', async (req, res) => {
  try {
    const response = await axios.get(APPS_SCRIPT_URL, { params: { accion: 'resumen' } });
    const data = response.data;
    res.json({ ok: true, answer: data.answer || '⚠️ Sin registros hoy.' });
  } catch (err) {
    res.json({ ok: false, answer: '⚠️ Error al obtener el resumen.' });
  }
});

app.get('/dashboard/resumen', async (req, res) => {
  try {
    const response = await axios.get(APPS_SCRIPT_URL, { params: { accion: 'resumen' } });
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
  body{font-family:Arial,sans-serif;background:#f5f5f5;margin:0;padding:20px;}
  .card{background:white;border-radius:12px;padding:24px;max-width:480px;margin:0 auto;box-shadow:0 2px 8px rgba(0,0,0,0.1);}
  .linea{padding:8px 0;border-bottom:1px solid #ecf0f1;font-size:15px;color:#2c3e50;}
  .linea:last-child{border-bottom:none;}
  .ingresos{color:#27ae60;font-weight:bold;}
  .btn{display:block;text-align:center;background:#27ae60;color:white;padding:12px;border-radius:8px;text-decoration:none;font-size:15px;font-weight:bold;margin:16px 0;}
</style>
</head>
<body>
<div class="card">
  <a class="btn" href="/pdf/informe-mensual" target="_blank">📄 Descargar PDF mensual</a>
  ${lineas.map(l => `<div class="linea ${l.includes('$') ? 'ingresos' : ''}">${l || '&nbsp;'}</div>`).join('')}
</div>
</body>
</html>`;
    res.send(html);
  } catch (err) {
    res.send('<h3>Error al obtener el resumen.</h3>');
  }
});

app.get('/dashboard/informe-mensual', async (req, res) => {
  try {
    const mes = req.query.mes || '';
    const anio = req.query.anio || '';
    const response = await axios.get(APPS_SCRIPT_URL, {
      params: { accion: 'informe_mensual', mes, anio }
    });
    const d = response.data;
    if (!d.ok) return res.send('<h3>Error al generar el informe.</h3>');
    const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>EDOAI — Informe Mensual</title>
<style>
  body{font-family:Arial,sans-serif;background:#f5f5f5;margin:0;padding:20px;}
  .card{background:white;border-radius:12px;padding:24px;max-width:520px;margin:0 auto;box-shadow:0 2px 8px rgba(0,0,0,0.1);}
  h1{color:#2c3e50;font-size:20px;margin-bottom:4px;}
  .sub{color:#7f8c8d;font-size:13px;margin-bottom:8px;}
  .seccion{margin-bottom:16px;}
  .seccion h2{font-size:14px;color:#7f8c8d;text-transform:uppercase;margin-bottom:8px;}
  .fila{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #ecf0f1;font-size:15px;}
  .fila:last-child{border-bottom:none;}
  .valor{font-weight:bold;color:#2c3e50;}
  .ingresos{color:#27ae60;font-size:18px;font-weight:bold;}
  .pendiente{color:#e74c3c;}
  .btn{display:block;text-align:center;background:#27ae60;color:white;padding:12px;border-radius:8px;text-decoration:none;font-size:15px;font-weight:bold;margin:16px 0;}
</style>
</head>
<body>
<div class="card">
  <h1>📊 Informe Mensual</h1>
  <div class="sub">${d.mes} ${d.anio} · ${d.total_sacramentos} sacramentos registrados</div>
  <a class="btn" href="/pdf/informe-mensual" target="_blank">📄 Descargar PDF</a>
  <div class="seccion">
    <h2>Sacramentos</h2>
    <div class="fila"><span>✝️ Bautismos</span><span class="valor">${d.detalle.bautismos.total}</span></div>
    <div class="fila"><span>🕊️ Confirmaciones</span><span class="valor">${d.detalle.confirmaciones.total}</span></div>
    <div class="fila"><span>💍 Matrimonios</span><span class="valor">${d.detalle.matrimonios.total}</span></div>
    <div class="fila"><span>⚰️ Defunciones</span><span class="valor">${d.detalle.defunciones.total}</span></div>
  </div>
  <div class="seccion">
    <h2>Ingresos</h2>
    <div class="fila"><span>💰 Total del mes</span><span class="ingresos">$${d.total_ingresos.toLocaleString('es-CO')}</span></div>
  </div>
  <div class="seccion">
    <h2>Pendientes de archivo</h2>
    <div class="fila"><span>Bautismos</span><span class="pendiente">${d.detalle.bautismos.pendientes}</span></div>
    <div class="fila"><span>Confirmaciones</span><span class="pendiente">${d.detalle.confirmaciones.pendientes}</span></div>
    <div class="fila"><span>Matrimonios</span><span class="pendiente">${d.detalle.matrimonios.pendientes}</span></div>
    <div class="fila"><span>Defunciones</span><span class="pendiente">${d.detalle.defunciones.pendientes}</span></div>
  </div>
</div>
</body>
</html>`;
    res.send(html);
  } catch (err) {
    res.send('<h3>Error al generar el informe.</h3>');
  }
});

const PDFDocument = require('pdfkit');

app.get('/pdf/informe-mensual', async (req, res) => {
  try {
    const mes = req.query.mes || '';
    const anio = req.query.anio || '';
    const response = await axios.get(APPS_SCRIPT_URL, {
      params: { accion: 'informe_mensual', mes, anio }
    });
    const d = response.data;
    if (!d.ok) return res.status(500).send('Error al obtener datos.');
    const doc = new PDFDocument({ margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=informe-${d.mes}-${d.anio}.pdf`);
    doc.pipe(res);
    doc.fontSize(20).fillColor('#2c3e50').text('EDOAI — Sistema Parroquial', { align: 'center' });
    doc.fontSize(14).fillColor('#7f8c8d').text(`Informe Mensual — ${d.mes} ${d.anio}`, { align: 'center' });
    doc.moveDown();
    doc.moveTo(50, doc.y).lineTo(550, doc.y).strokeColor('#ecf0f1').stroke();
    doc.moveDown();
    doc.fontSize(12).fillColor('#2c3e50').text('SACRAMENTOS', { underline: true });
    doc.moveDown(0.5);
    [['Bautismos', d.detalle.bautismos.total], ['Confirmaciones', d.detalle.confirmaciones.total],
     ['Matrimonios', d.detalle.matrimonios.total], ['Defunciones', d.detalle.defunciones.total],
     ['TOTAL', d.total_sacramentos]].forEach(([label, valor]) => {
      const esTotal = label === 'TOTAL';
      doc.fontSize(esTotal ? 12 : 11).fillColor(esTotal ? '#2c3e50' : '#555')
         .text(label, 60, doc.y, { continued: true, width: 300 })
         .fillColor(esTotal ? '#27ae60' : '#2c3e50').text(String(valor), { align: 'right' });
    });
    doc.moveDown();
    doc.moveTo(50, doc.y).lineTo(550, doc.y).strokeColor('#ecf0f1').stroke();
    doc.moveDown(0.5);
    doc.fontSize(12).fillColor('#2c3e50').text('INGRESOS DEL MES', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(14).fillColor('#27ae60').text(`$${d.total_ingresos.toLocaleString('es-CO')}`, { align: 'center' });
    doc.moveDown();
    doc.moveTo(50, doc.y).lineTo(550, doc.y).strokeColor('#ecf0f1').stroke();
    doc.moveDown(0.5);
    doc.fontSize(12).fillColor('#2c3e50').text('PENDIENTES DE ARCHIVO', { underline: true });
    doc.moveDown(0.5);
    [['Bautismos', d.detalle.bautismos.pendientes], ['Confirmaciones', d.detalle.confirmaciones.pendientes],
     ['Matrimonios', d.detalle.matrimonios.pendientes], ['Defunciones', d.detalle.defunciones.pendientes],
     ['TOTAL', d.total_pendientes]].forEach(([label, valor]) => {
      const esTotal = label === 'TOTAL';
      doc.fontSize(esTotal ? 12 : 11).fillColor(esTotal ? '#2c3e50' : '#555')
         .text(label, 60, doc.y, { continued: true, width: 300 })
         .fillColor(valor > 0 ? '#e74c3c' : '#27ae60').text(String(valor), { align: 'right' });
    });
    doc.moveDown();
    doc.moveTo(50, doc.y).lineTo(550, doc.y).strokeColor('#ecf0f1').stroke();
    doc.moveDown(0.5);
    doc.fontSize(9).fillColor('#bdc3c7').text(`Generado por EDOAI · ${new Date().toLocaleDateString('es-CO')}`, { align: 'center' });
    doc.end();
  } catch (err) {
    console.error('Error PDF:', err.message);
    res.status(500).send('Error al generar el PDF.');
  }
});
// PING TEST — sin llamadas externas
app.get('/ping-test', (req, res) => {
  console.log('PING TEST OK');
  res.json({ ok: true, mensaje: 'ping ok' });
});

// FAKE IDENTIFICAR — sin Apps Script
app.get('/fake-identificar', async (req, res) => {
  console.log('FAKE IDENTIFICAR inicio');
  await new Promise(r => setTimeout(r, 1000));
  console.log('FAKE IDENTIFICAR fin');
  res.json({ ok: true, usuario: { rol: 'PARROQUIA' } });
});
// ============================================================
// SPRINT 3B.1 — DASHBOARD SECRETARÍA
// ============================================================

// Catálogo centralizado de servicios — fuente única de verdad
const SERVICE_CATALOG = {
  // Sacramentos
  'Confirmacion':          { label: 'Confirmación',          categoria: 'Sacramento' },
  'PrimeraComunion':       { label: 'Primera Comunión',       categoria: 'Sacramento' },
  // Servicios
  'MisaIntencion':         { label: 'Misa con Intención',    categoria: 'Servicio' },
  'Exequias':              { label: 'Exequias',              categoria: 'Servicio' },
  'Diezmo':                { label: 'Diezmo / Donación',     categoria: 'Servicio' },
  'Osario':                { label: 'Osario / Cementerio',   categoria: 'Servicio' },
  'OtroServicio':          { label: 'Otro Servicio',         categoria: 'Servicio' },
  // Certificados — nuevos
  'PartidaBautismo':       { label: 'Partida de Bautismo',   categoria: 'Certificado' },
  'PartidaConfirmacion':   { label: 'Partida de Confirmación', categoria: 'Certificado' },
  'CertificadoMatrimonial':{ label: 'Certificado Matrimonial', categoria: 'Certificado' },
  // Certificados — legado (para medir migración pendiente)
  'Certificado':           { label: 'Certificado (Legado)',  categoria: 'Certificado' },
};

// IDs a excluir de métricas reales
const SERVICIOS_EXCLUIDOS = ['TestAntiDup'];

// Normaliza label para display
function labelServicio(id) {
  return SERVICE_CATALOG[id]?.label || id;
}

// ============================================================
// DashboardService — lógica centralizada
// ============================================================
const DashboardService = {

  // Parsea fecha desde query: ?fecha=2026-06-05 o ?desde=...&hasta=...
  parseFechas(query) {
    const hoy = new Date().toISOString().slice(0, 10);
    if (query.desde && query.hasta) {
      return { desde: query.desde, hasta: query.hasta, modo: 'rango' };
    }
    return { desde: query.fecha || hoy, hasta: query.fecha || hoy, modo: 'dia' };
  },

  // Llama Apps Script con timeout
  async fetchAS(params) {
    const response = await axios.get(APPS_SCRIPT_URL, {
      params,
      timeout: 15000
    });
    return response.data;
  },

  // Bloque A — Resumen del día
  async resumen(desde, hasta) {
    try {
      const data = await this.fetchAS({ accion: 'dashboard_resumen', desde, hasta });
      return data.ok ? data : { serviciosHoy: 0, ingresosHoy: 0, actualizacionesHoy: 0, duplicadosBloqueados: 0 };
    } catch(e) {
      return { serviciosHoy: 0, ingresosHoy: 0, actualizacionesHoy: 0, duplicadosBloqueados: 0, error: e.message };
    }
  },

  // Bloque B — Ingresos por método de pago
  async pagos(desde, hasta) {
    try {
      const data = await this.fetchAS({ accion: 'dashboard_pagos', desde, hasta });
      return data.ok ? data : { efectivo: 0, transferencia: 0, datafono: 0, mixto: 0 };
    } catch(e) {
      return { efectivo: 0, transferencia: 0, datafono: 0, mixto: 0, error: e.message };
    }
  },

  // Bloque C — Top servicios
  async topServicios(desde, hasta) {
    try {
      const data = await this.fetchAS({ accion: 'dashboard_top_servicios', desde, hasta });
      return data.ok ? data.items : [];
    } catch(e) {
      return [];
    }
  },

  // Bloque D — Actividad sacramental
  async sacramentos(desde, hasta) {
    try {
      const data = await this.fetchAS({ accion: 'dashboard_sacramentos', desde, hasta });
      return data.ok ? data : { bautismos: 0, confirmaciones: 0, matrimonios: 0, defunciones: 0 };
    } catch(e) {
      return { bautismos: 0, confirmaciones: 0, matrimonios: 0, defunciones: 0, error: e.message };
    }
  },

  // Maestro — agrega todo en una sola llamada
  async maestro(desde, hasta) {
    const [resumen, pagos, topServicios, sacramentos] = await Promise.all([
      this.resumen(desde, hasta),
      this.pagos(desde, hasta),
      this.topServicios(desde, hasta),
      this.sacramentos(desde, hasta)
    ]);
    return {
      fecha: desde === hasta ? desde : `${desde} → ${hasta}`,
      generatedAt: new Date().toISOString(),
      resumen,
      pagos,
      topServicios,
      sacramentos
    };
  }
};

// ============================================================
// ENDPOINTS — Dashboard Secretaría
// ============================================================

// Maestro — una sola llamada agrega todo
app.get('/dashboard/secretaria', async (req, res) => {
  try {
    const { desde, hasta } = DashboardService.parseFechas(req.query);
    const data = await DashboardService.maestro(desde, hasta);
    res.json(data);
  } catch(e) {
    res.status(500).json({ ok: false, error: e.message, generatedAt: new Date().toISOString() });
  }
});

// Bloque A — Resumen
app.get('/dashboard/secretaria/resumen', async (req, res) => {
  try {
    const { desde, hasta } = DashboardService.parseFechas(req.query);
    const data = await DashboardService.resumen(desde, hasta);
    res.json({ ...data, generatedAt: new Date().toISOString() });
  } catch(e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Bloque B — Pagos
app.get('/dashboard/secretaria/pagos', async (req, res) => {
  try {
    const { desde, hasta } = DashboardService.parseFechas(req.query);
    const data = await DashboardService.pagos(desde, hasta);
    res.json({ ...data, generatedAt: new Date().toISOString() });
  } catch(e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Bloque C — Top servicios
app.get('/dashboard/secretaria/top-servicios', async (req, res) => {
  try {
    const { desde, hasta } = DashboardService.parseFechas(req.query);
    const items = await DashboardService.topServicios(desde, hasta);
    res.json({ items, generatedAt: new Date().toISOString() });
  } catch(e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Bloque D — Sacramentos
app.get('/dashboard/secretaria/sacramentos', async (req, res) => {
  try {
    const { desde, hasta } = DashboardService.parseFechas(req.query);
    const data = await DashboardService.sacramentos(desde, hasta);
    res.json({ ...data, generatedAt: new Date().toISOString() });
  } catch(e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});



const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`EDOAI Core v4.1.0 corriendo en puerto ${PORT}`);
});
