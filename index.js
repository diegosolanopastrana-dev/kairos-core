const express = require('express');
const axios = require('axios');
const { obtenerContextoUsuario } = require('./middleware/auth');
const app = express();

app.use(express.json());

const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyHibCtMpA45wVMtp8p76NDlTAmdmXtrHuuSQC84ID2D8F0pWuJyEVWKCsHvWhbNWZJ5A/exec';

// SESSION MANAGER
const sessions = {};

app.get('/', (req, res) => {
  res.json({ ok: true, mensaje: 'EDOAI Core v4.1.0', version: '4.1.0' });
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

// IDENTIFICAR USUARIO — Middleware de identidad
app.get('/identificar', async (req, res) => {
  const telefono = req.query.telefono || req.query.numero || '';
  if (!telefono) return res.json({ ok: false, rol: 'DESCONOCIDO', error: 'TELEFONO_REQUERIDO' });
  const resultado = await obtenerContextoUsuario(telefono);
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
});

// RESUMEN DEL DÍA — texto plano
app.get('/resumen', async (req, res) => {
  try {
    const response = await axios.get(APPS_SCRIPT_URL, { params: { accion: 'resumen' } });
    const data = response.data;
    res.send(data.ok ? data.answer : '⚠️ No hay registros para hoy.');
  } catch (err) {
    res.send('⚠️ Error al obtener el resumen. Intente nuevamente.');
  }
});

// RESUMEN — JSON con campo body para BBC
app.get('/resumen-texto', async (req, res) => {
  try {
    const response = await axios.get(APPS_SCRIPT_URL, { params: { accion: 'resumen' } });
    const data = response.data;
    res.json({ ok: true, body: data.answer || '⚠️ Sin registros hoy.' });
  } catch (err) {
    res.json({ ok: false, body: '⚠️ Error al obtener el resumen.' });
  }
});

// NOTIFICAR RESUMEN — JSON con campo answer para BBC
app.get('/notificar-resumen', async (req, res) => {
  try {
    const response = await axios.get(APPS_SCRIPT_URL, { params: { accion: 'resumen' } });
    const data = response.data;
    res.json({ ok: true, answer: data.answer || '⚠️ Sin registros hoy.' });
  } catch (err) {
    res.json({ ok: false, answer: '⚠️ Error al obtener el resumen.' });
  }
});

// DASHBOARD HTML — resumen del día visual
app.get('/dashboard/resumen', async (req, res) => {
  try {
    const telefono = req.query.telefono || '';
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
  .ingresos{color:#27ae60;font-weight:bold;font-size:16px;}
  .btn{display:block;text-align:center;background:#27ae60;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-size:15px;font-weight:bold;margin:16px 0;}
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
    res.send('<h3>Error al obtener el resumen. Intente nuevamente.</h3>');
  }
});

// DASHBOARD HTML — informe mensual
app.get('/dashboard/informe-mensual', async (req, res) => {
  try {
    const mes = req.query.mes || '';
    const anio = req.query.anio || '';
    const telefono = req.query.telefono || '';

    // Obtener contexto del usuario si viene el teléfono
    let contexto = null;
    if (telefono) {
      contexto = await obtenerContextoUsuario(telefono);
    }

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
  .btn{display:block;text-align:center;background:#27ae60;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-size:15px;font-weight:bold;margin:16px 0;}
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
    res.send('<h3>Error al generar el informe. Intente nuevamente.</h3>');
  }
});

// PDF INFORME MENSUAL
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
    const sacramentos = [
      ['Bautismos', d.detalle.bautismos.total],
      ['Confirmaciones', d.detalle.confirmaciones.total],
      ['Matrimonios', d.detalle.matrimonios.total],
      ['Defunciones', d.detalle.defunciones.total],
      ['TOTAL', d.total_sacramentos]
    ];
    sacramentos.forEach(([label, valor]) => {
      const esTotal = label === 'TOTAL';
      doc.fontSize(esTotal ? 12 : 11)
         .fillColor(esTotal ? '#2c3e50' : '#555')
         .text(label, 60, doc.y, { continued: true, width: 300 })
         .fillColor(esTotal ? '#27ae60' : '#2c3e50')
         .text(String(valor), { align: 'right' });
    });
    doc.moveDown();

    doc.moveTo(50, doc.y).lineTo(550, doc.y).strokeColor('#ecf0f1').stroke();
    doc.moveDown(0.5);
    doc.fontSize(12).fillColor('#2c3e50').text('INGRESOS DEL MES', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(14).fillColor('#27ae60')
       .text(`$${d.total_ingresos.toLocaleString('es-CO')}`, { align: 'center' });
    doc.moveDown();

    doc.moveTo(50, doc.y).lineTo(550, doc.y).strokeColor('#ecf0f1').stroke();
    doc.moveDown(0.5);
    doc.fontSize(12).fillColor('#2c3e50').text('PENDIENTES DE ARCHIVO', { underline: true });
    doc.moveDown(0.5);
    const pendientes = [
      ['Bautismos', d.detalle.bautismos.pendientes],
      ['Confirmaciones', d.detalle.confirmaciones.pendientes],
      ['Matrimonios', d.detalle.matrimonios.pendientes],
      ['Defunciones', d.detalle.defunciones.pendientes],
      ['TOTAL', d.total_pendientes]
    ];
    pendientes.forEach(([label, valor]) => {
      const esTotal = label === 'TOTAL';
      doc.fontSize(esTotal ? 12 : 11)
         .fillColor(esTotal ? '#2c3e50' : '#555')
         .text(label, 60, doc.y, { continued: true, width: 300 })
         .fillColor(valor > 0 ? '#e74c3c' : '#27ae60')
         .text(String(valor), { align: 'right' });
    });
    doc.moveDown();

    doc.moveTo(50, doc.y).lineTo(550, doc.y).strokeColor('#ecf0f1').stroke();
    doc.moveDown(0.5);
    doc.fontSize(9).fillColor('#bdc3c7')
       .text(`Generado por EDOAI · ${new Date().toLocaleDateString('es-CO')}`, { align: 'center' });

    doc.end();
  } catch (err) {
    console.error('Error PDF:', err.message);
    res.status(500).send('Error al generar el PDF.');
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`EDOAI Core v4.1.0 corriendo en puerto ${PORT}`);
});