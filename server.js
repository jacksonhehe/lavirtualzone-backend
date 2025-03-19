require('dotenv').config(); // Cargar variables de entorno desde .env
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

// Inicializar la aplicación Express
const app = express();

// Middleware para parsear JSON
app.use(express.json());

// Configuración de CORS para permitir solicitudes desde el frontend
app.use(cors({
    origin: [
        'http://127.0.0.1:8080',
        'http://localhost:8080',
        'https://lavirtualzone-backend.onrender.com',
        'https://lavirtualzone-frontend.onrender.com'
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'x-auth-token']
}));

// Servir archivos estáticos desde la carpeta 'public'
app.use(express.static(path.join(__dirname, 'public')));

// Conectar a MongoDB usando la URI desde .env
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('Conectado a MongoDB'))
    .catch(err => {
        console.error('Error al conectar a MongoDB:', err);
        process.exit(1); // Detener el servidor si no se conecta a MongoDB
    });

// Clave secreta JWT desde .env
const JWT_SECRET = process.env.JWT_SECRET || 'tu-secreto-jwt-muy-seguro';
if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'tu-secreto-jwt-muy-seguro') {
    console.warn('⚠️ Usa un JWT_SECRET seguro en producción');
}

// Rutas modulares
const authRoutes = require('./routes/auth');
const clubRoutes = require('./routes/club');
const playerRoutes = require('./routes/players');
const transactionRoutes = require('./routes/transactions');

// Usar las rutas modulares
app.use('/api/auth', authRoutes);
app.use('/api/club', clubRoutes);
app.use('/api/players', playerRoutes);
app.use('/api/transactions', transactionRoutes);

// Ruta para verificar el estado del servidor
app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'OK', message: 'Servidor funcionando correctamente' });
});

// Middleware para manejar errores globales
app.use((err, req, res, next) => {
    console.error('Error global:', err.stack);
    res.status(500).json({ message: 'Error interno del servidor' });
});

// Puerto del servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
});