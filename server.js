require('dotenv').config(); // Cargar variables de entorno desde .env
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet'); // Middleware de seguridad HTTP
const rateLimit = require('express-rate-limit'); // Limitar tasa de solicitudes

// Inicializar la aplicación Express
const app = express();

// Middleware para parsear solicitudes JSON (application/json)
app.use(express.json());

// Configuración de Helmet con Content Security Policy para permitir scripts inline
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            ...helmet.contentSecurityPolicy.getDefaultDirectives(),
            "script-src": ["'self'", "'unsafe-inline'"]
        }
    }
}));

// Configuración de Rate Limiting para prevenir abusos (limita 100 req/15min por IP)
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100, // Límite de 100 solicitudes por IP
    message: 'Demasiadas solicitudes desde esta IP, por favor intenta de nuevo más tarde.'
});
app.use(limiter);

// Configuración de CORS para permitir solicitudes del frontend específico
app.use(cors({
    origin: [
        'http://127.0.0.1:8080',              // Desarrollo local
        'http://localhost:8080',              // Desarrollo local alternativo
        'https://lavirtualzone-backend.onrender.com', // Backend en Render
        'https://lavirtualzone-frontend.onrender.com'  // Frontend en Render
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],           // Métodos HTTP permitidos
    allowedHeaders: ['Content-Type', 'x-auth-token']     // Encabezados permitidos
}));

// Servir archivos estáticos desde la carpeta 'public'
app.use(express.static(path.join(__dirname, 'public')));

// Conexión a MongoDB usando la URI de entorno
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('Conectado a MongoDB'))
    .catch(err => {
        console.error('Error al conectar a MongoDB:', err);
        process.exit(1); // Detener el servidor si falla la conexión a la base de datos
    });

// Clave secreta para JWT (desde variable de entorno)
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET === 'tu-secreto-jwt-muy-seguro') {
    console.warn('⚠️ ATENCIÓN: Configura un JWT_SECRET seguro en producción');
}

// Importar rutas modulares de la API
const authRoutes = require('./routes/auth');
const clubRoutes = require('./routes/club');
const playerRoutes = require('./routes/players');
const transactionRoutes = require('./routes/transactions');

// Registrar las rutas de la API con prefijo '/api'
app.use('/api/auth', authRoutes);           // Rutas de autenticación
app.use('/api/club', clubRoutes);           // Rutas de clubes
app.use('/api/players', playerRoutes);      // Rutas de jugadores
app.use('/api/transactions', transactionRoutes); // Rutas de transacciones

// Ruta de health-check para verificar que el servidor está vivo
app.get('/api/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        message: 'Servidor funcionando correctamente'
    });
});

// Manejador para rutas no definidas: si es una ruta de API, responder 404; de lo contrario, devolver index.html (SPA fallback)
app.use((req, res) => {
    if (req.path.startsWith('/api/')) {
        return res.status(404).json({ message: 'Ruta no encontrada' });
    }
    // Si no es API, servir el archivo principal de la aplicación (index.html)
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Manejador global de errores
app.use((err, req, res, next) => {
    console.error('Error global:', err.stack);
    res.status(500).json({ message: 'Error interno del servidor' });
});

// Iniciar el servidor en el puerto configurado
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
});
