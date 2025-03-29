require('dotenv').config(); // Cargar variables de entorno desde .env
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet'); // Middleware para seguridad HTTP
const rateLimit = require('express-rate-limit'); // Limitar la tasa de solicitudes

// Inicializar la aplicación Express
const app = express();

// Middleware para parsear solicitudes JSON
app.use(express.json());

// Configuración de Helmet para seguridad HTTP
app.use(helmet());

// Configuración de Rate Limiting para prevenir abusos (100 solicitudes por 15 minutos por IP)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // Limitar a 100 solicitudes por IP
  message: 'Demasiadas solicitudes desde esta IP, por favor intenta de nuevo más tarde.'
});
app.use(limiter);

// Configuración de CORS para permitir solicitudes desde el frontend
app.use(cors({
  origin: [
    'http://127.0.0.1:8080',              // Desarrollo local
    'http://localhost:8080',              // Desarrollo local alternativo
    'https://lavirtualzone-backend.onrender.com', // Backend en Render
    'https://lavirtualzone-frontend.onrender.com' // Frontend en Render
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'x-auth-token']
}));

// Servir archivos estáticos desde la carpeta 'public' (frontend)
app.use(express.static(path.join(__dirname, 'public')));

// Conexión a MongoDB usando la URI desde las variables de entorno
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('Conectado a MongoDB'))
  .catch(err => {
    console.error('Error al conectar a MongoDB:', err);
    process.exit(1); // Detener el servidor si falla la conexión
  });

// Configurar la clave secreta para JWT (advertencia para producción)
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET === 'tu-secreto-jwt-muy-seguro') {
  console.warn('⚠️ ATENCIÓN: Configura un JWT_SECRET seguro en producción');
}

// Rutas modulares para la API
const authRoutes = require('./routes/auth');
const clubRoutes = require('./routes/club');
const playerRoutes = require('./routes/players');
const transactionRoutes = require('./routes/transactions');

// Usar las rutas modulares con prefijo '/api'
app.use('/api/auth', authRoutes);          // Rutas de autenticación
app.use('/api/club', clubRoutes);          // Rutas de clubes
app.use('/api/players', playerRoutes);     // Rutas de jugadores
app.use('/api/transactions', transactionRoutes); // Rutas de transacciones

// Ruta para verificar el estado del servidor (health check)
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'Servidor funcionando correctamente'
  });
});

// Middleware para manejar rutas no encontradas (404)
app.use((req, res, next) => {
  res.status(404).json({ message: 'Ruta no encontrada' });
});

// Middleware para manejar errores globales
app.use((err, req, res, next) => {
  console.error('Error global:', err.stack);
  res.status(500).json({ message: 'Error interno del servidor' });
});

// Configuración del puerto del servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});
