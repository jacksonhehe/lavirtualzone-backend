const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(express.json());
app.use(cors({
    origin: ['http://localhost:8080', 'https://lavirtualzone-frontend.onrender.com'], // Ajusta según tu frontend
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'x-auth-token']
}));

// Conectar a MongoDB
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log('Conectado a MongoDB'))
  .catch(err => console.error('Error al conectar a MongoDB:', err));

// Rutas
app.use('/api/auth', require('./routes/auth'));
app.use('/api/club', require('./routes/club'));
app.use('/api/players', require('./routes/players'));

// Endpoint de salud para UptimeRobot
app.get('/api/health', (req, res) => res.json({ status: 'OK', timestamp: new Date() }));

// Middleware de errores global
app.use((err, req, res, next) => {
    console.error('Error del servidor:', err);
    res.status(500).json({ message: 'Error interno del servidor' });
});

// Iniciar servidor
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Servidor corriendo en el puerto ${PORT}`));