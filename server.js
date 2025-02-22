const express = require('express');
const app = express();
const PORT = process.env.PORT || 5000;
app.get('/', (req, res) => res.send('¡Backend de La Virtual Zone funcionando!'));
app.listen(PORT, () => console.log(`Servidor en puerto ${PORT}`));