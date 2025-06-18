const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();

// Habilitar CORS (restringido al frontend en producción si defines FRONTEND_URL)
app.use(cors({ origin: process.env.FRONTEND_URL || '*' }));

// Middleware para parsear JSON
app.use(express.json());

// Configuración de variables de entorno
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://jackson:lolitopro123@cluster0.6gaqc.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

// Middleware para registrar solicitudes
app.use((req, res, next) => {
  console.log(`Solicitud recibida: ${req.method} ${req.url} a las ${new Date().toISOString()}`);
  next();
});

// Configurar Mongoose para evitar la advertencia de strictQuery
mongoose.set('strictQuery', true);

// Conexión a MongoDB
mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Conectado a MongoDB'))
  .catch(err => console.error('Error de conexión a MongoDB:', err));

// Importar modelos desde la carpeta models/
const Club = require('./models/Club');

// Middleware de autenticación
const auth = require('./middleware/auth');

// Rutas modulares
const authRoutes = require('./routes/auth');
const clubRoutes = require('./routes/club');
const playerRoutes = require('./routes/players');

app.use('/api/auth', authRoutes);
app.use('/api/club', clubRoutes);
app.use('/api/players', playerRoutes);

const transactionRoutes = require('./routes/transactions');
app.use('/api/transactions', transactionRoutes);

// Contar clubes para estadísticas
app.get('/api/club/count', auth, async (req, res) => {
  try {
    const count = await Club.countDocuments();
    res.json({ success: true, count });
  } catch (error) {
    console.error('Error en /api/club/count:', error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
});

// Ruta raíz para depuración
app.get('/ping', (req, res) => {
  console.log('Ping recibido a las', new Date().toISOString());
  res.status(200).send('OK');
});

// Servir archivos estáticos desde public/
app.use(express.static(path.join(__dirname, 'public')));

// Ruta raíz para el frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT} a las ${new Date().toISOString()}`);
});