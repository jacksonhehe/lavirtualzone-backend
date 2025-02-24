const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
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
const JWT_SECRET = process.env.JWT_SECRET || 'tu_secreto_muy_largo_y_seguro'; // Cambia esto en producción

// Middleware para registrar solicitudes
app.use((req, res, next) => {
  console.log(`Solicitud recibida: ${req.method} ${req.url} a las ${new Date().toISOString()}`);
  next();
});

// Conexión a MongoDB
mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Conectado a MongoDB'))
  .catch(err => console.error('Error de conexión a MongoDB:', err));

// Modelos (puedes moverlos a models/ si no lo has hecho)
const User = mongoose.model('User', new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  parsecId: String
}));

const Club = mongoose.model('Club', new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: String,
  budget: Number,
  players: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Player' }],
  color: String,
  wins: Number
}));

const Player = mongoose.model('Player', new mongoose.Schema({
  name: String,
  value: Number,
  position: String,
  rating: Number
}));

const Transaction = mongoose.model('Transaction', new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: String, // 'compra', 'venta', 'prestamo'
  playerName: String,
  value: Number,
  date: { type: Date, default: Date.now }
}));

// Middleware de autenticación
const auth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1] || req.header('x-auth-token');
  if (!token) return res.status(401).json({ message: 'No autorizado' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded.id;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Token inválido' });
  }
};

// Rutas modulares
const authRoutes = require('./routes/auth');
const clubRoutes = require('./routes/club');
const playerRoutes = require('./routes/players');

app.use('/api/auth', authRoutes);
app.use('/api/club', clubRoutes);
app.use('/api/players', playerRoutes);

// Ruta de transacción
app.post('/api/transaction', auth, async (req, res) => {
  try {
    const { type, playerName, value } = req.body;
    const club = await Club.findOne({ userId: req.user });
    if (!club) return res.status(404).json({ message: 'Club no encontrado' });
    if (type === 'compra' && club.budget < value) {
      return res.status(400).json({ message: 'Presupuesto insuficiente' });
    }
    const transaction = new Transaction({ userId: req.user, type, playerName, value });
    await transaction.save();
    if (type === 'compra') {
      club.budget -= value;
      const player = await Player.findOne({ name: playerName });
      if (player) club.players.push(player._id);
    } else if (type === 'venta') {
      club.budget += value;
      const player = await Player.findOne({ name: playerName });
      if (player) club.players = club.players.filter(p => p.toString() !== player._id.toString());
    } else if (type === 'prestamo') {
      club.budget -= value;
      const player = await Player.findOne({ name: playerName });
      if (player) club.players.push(player._id); // Asumimos que préstamo añade al club temporalmente
    }
    await club.save();
    res.status(201).json({ message: 'Transacción registrada exitosamente', transaction });
  } catch (error) {
    console.error('Error en /api/transaction:', error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
});

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