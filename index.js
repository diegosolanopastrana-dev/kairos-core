const express = require('express');
const app = express();

app.use(express.json());

app.get('/', (req, res) => {
  res.json({ 
    ok: true, 
    mensaje: 'EDOAI Core funcionando correctamente',
    version: '1.0.0'
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`EDOAI Core corriendo en puerto ${PORT}`);
});