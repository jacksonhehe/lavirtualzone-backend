require('dotenv').config(); // Cargar variables de entorno desde .env
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

// Inicializar la aplicación Express
const app = express();

// Middleware para parsear solicitudes JSON
app.use(express.json());

// Configuración de CORS para permitir solicitudes desde el frontend
app.use(cors({
    origin: [
        'http://127.0.0.1:8080',              // Desarrollo local
        'http://localhost:8080',              // Desarrollo local alternativo
        'https://lavirtualzone-backend.onrender.com', // Backend en Render
        'https://lavirtualzone-frontend.onrender.com' // Frontend en Render
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE'], // Métodos HTTP permitidos
    allowedHeaders: ['Content-Type', 'x-auth-token'] // Headers permitidos
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

// Clave secreta para JWT desde variables de entorno
const JWT_SECRET = process.env.JWT_SECRET || 'tu-secreto-jwt-muy-seguro';
if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'tu-secreto-jwt-muy-seguro') {
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

// Middleware para manejar errores globales
app.use((err, req, res, next) => {
    console.error('Error global:', err.stack); // Registro del error
    res.status(500).json({ message: 'Error interno del servidor' });
});

// Configuración del puerto del servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
});