// server.js

require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');

// Importar rutas
const authRoutes = require('./routes/auth');
const clubRoutes = require('./routes/club');
const transactionsRoutes = require('./routes/transactions');
const playersRoutes = require('./routes/players');

const app = express();

// Configuración para evitar advertencias de Mongoose
mongoose.set('strictQuery', false);

// Conexión a la base de datos usando MONGO_URI de .env
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  })
  .then(() => console.log('Conectado a MongoDB'))
  .catch((err) => console.error('Error al conectar a MongoDB:', err));

// Middleware para parsear JSON en el body de las peticiones
app.use(express.json());

// Montar las rutas de la API
app.use('/api/auth', authRoutes);
app.use('/api/club', clubRoutes);
app.use('/api/transactions', transactionsRoutes);
app.use('/api/players', playersRoutes);

// Servir archivos estáticos desde la carpeta "public" (HTML, CSS, JS de frontend)
app.use(express.static(path.join(__dirname, 'public')));

// Determinar el puerto desde variable de entorno o por defecto 5000
const PORT = process.env.PORT || 5000;

// Iniciar el servidor en el puerto indicado
app.listen(PORT, () => {
  console.log(`Servidor escuchando en el puerto ${PORT}`);
});
