const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Player = require('../models/Player');
const Club = require('../models/Club');

// Middleware de autenticación
const auth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1] || req.header('x-auth-token');
  if (!token) return res.status(401).json({ message: 'No autorizado, falta token' });
  try {
    // Usamos exclusivamente process.env.JWT_SECRET para mayor seguridad
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded.id; // Asegúrate de que sea el ID del usuario (ObjectId)
    next();
  } catch (err) {
    console.error('Error en autenticación:', err);
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expirado' });
    } else if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Token inválido' });
    }
    res.status(500).json({ message: 'Error del servidor en autenticación' });
  }
};

// Función auxiliar para validar campos requeridos
const validateRequiredFields = (req, res, fields) => {
  for (const field of fields) {
    if (!req.body[field]) {
      return res.status(400).json({ message: `El campo ${field} es requerido` });
    }
  }
  return null;
};

// GET /api/players/ - Obtener jugadores disponibles (no en el club del usuario)
router.get('/', auth, async (req, res) => {
  try {
    const club = await Club.findOne({ userId: req.user }).populate('players');
    const clubPlayerIds = club ? club.players.map(p => p._id.toString()) : [];
    const players = await Player.find({ _id: { $nin: clubPlayerIds } });
    res.json(players);
  } catch (err) {
    console.error('Error en GET /api/players:', err);
    res.status(500).json({ message: 'Error del servidor' });
  }
});

// POST /api/players/ - Crear un jugador (para pruebas o admin)
router.post('/', auth, async (req, res) => {
  try {
    const requiredFields = ['name', 'position', 'rating', 'value'];
    const validationError = validateRequiredFields(req, res, requiredFields);
    if (validationError) return validationError;

    const { name, position, rating, value } = req.body;

    // Validar rangos
    if (rating < 0 || rating > 99) {
      return res.status(400).json({ message: 'El rating debe estar entre 0 y 99' });
    }
    if (value < 0) {
      return res.status(400).json({ message: 'El valor no puede ser negativo' });
    }

    // Verificar si el jugador ya existe
    const existingPlayer = await Player.findOne({ name });
    if (existingPlayer) {
      return res.status(400).json({ message: 'El jugador ya existe' });
    }

    const player = new Player({
      _id: `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, // ID único
      name,
      position,
      rating: Math.max(0, Math.min(99, rating)), // Asegurar rango
      value: Math.max(0, value) // Asegurar valor no negativo
    });
    await player.save();

    res.status(201).json({ player, message: 'Jugador creado exitosamente' });
  } catch (err) {
    console.error('Error en POST /api/players:', err);
    res.status(500).json({ message: 'Error del servidor' });
  }
});

// POST /api/players/buy - Comprar un jugador y añadirlo al club
router.post('/buy', auth, async (req, res) => {
  try {
    const requiredFields = ['playerId'];
    const validationError = validateRequiredFields(req, res, requiredFields);
    if (validationError) return validationError;

    const { playerId } = req.body;
    const club = await Club.findOne({ userId: req.user }).populate('players');
    if (!club) return res.status(404).json({ message: 'Club no encontrado' });

    const player = await Player.findById(playerId);
    if (!player) return res.status(404).json({ message: 'Jugador no encontrado' });

    // Verificar si el jugador ya está en el club
    if (club.players.some(p => p._id.toString() === playerId)) {
      return res.status(400).json({ message: 'El jugador ya está en tu club' });
    }

    // Verificar presupuesto
    if (club.budget < player.value) {
      return res.status(400).json({ message: 'Presupuesto insuficiente' });
    }

    // Actualizar el club
    club.budget -= player.value;
    club.players.push(player._id);
    club.transactions.push({
      type: 'compra',
      playerName: player.name,
      value: player.value,
      date: new Date()
    });
    await club.save();

    res.json({ club, message: 'Jugador comprado exitosamente' });
  } catch (err) {
    console.error('Error en POST /api/players/buy:', err);
    res.status(500).json({ message: 'Error del servidor' });
  }
});

// POST /api/players/watchlist - Agregar un jugador a la watchlist
router.post('/watchlist', auth, async (req, res) => {
  try {
    const requiredFields = ['playerId'];
    const validationError = validateRequiredFields(req, res, requiredFields);
    if (validationError) return validationError;

    const { playerId } = req.body;
    const club = await Club.findOne({ userId: req.user });
    if (!club) return res.status(404).json({ message: 'Club no encontrado' });

    const player = await Player.findById(playerId);
    if (!player) return res.status(404).json({ message: 'Jugador no encontrado' });

    // Verificar si el jugador ya está en la watchlist
    if (club.watchlist.some(w => w._id.toString() === playerId)) {
      return res.status(400).json({ message: 'El jugador ya está en tu watchlist' });
    }

    // Agregar a la watchlist
    club.watchlist.push({ _id: player._id, name: player.name, value: player.value });
    await club.save();

    res.json({ club, message: 'Jugador agregado a la watchlist' });
  } catch (err) {
    console.error('Error en POST /api/players/watchlist:', err);
    res.status(500).json({ message: 'Error del servidor' });
  }
});

// DELETE /api/players/watchlist/:playerId - Eliminar un jugador de la watchlist
router.delete('/watchlist/:playerId', auth, async (req, res) => {
  const { playerId } = req.params;
  try {
    const club = await Club.findOne({ userId: req.user });
    if (!club) return res.status(404).json({ message: 'Club no encontrado' });

    const initialLength = club.watchlist.length;
    club.watchlist = club.watchlist.filter(w => w._id.toString() !== playerId);
    if (club.watchlist.length === initialLength) {
      return res.status(404).json({ message: 'Jugador no encontrado en la watchlist' });
    }

    await club.save();
    res.json({ club, message: 'Jugador eliminado de la watchlist' });
  } catch (err) {
    console.error('Error en DELETE /api/players/watchlist:', err);
    res.status(500).json({ message: 'Error del servidor' });
  }
});

// GET /api/players/all - Obtener todos los jugadores (para admin o debugging)
router.get('/all', auth, async (req, res) => {
  try {
    const players = await Player.find();
    res.json(players);
  } catch (err) {
    console.error('Error en GET /api/players/all:', err);
    res.status(500).json({ message: 'Error del servidor' });
  }
});

// Middleware para manejar errores globales en este router
router.use((err, req, res, next) => {
  console.error('Error en players.js:', err);
  res.status(500).json({ message: 'Error interno del servidor' });
});

module.exports = router;