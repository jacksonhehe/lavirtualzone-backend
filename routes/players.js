const express = require('express');
const router = express.Router();
const Player = require('../models/Player');
const Club = require('../models/Club');
const Transaction = require('../models/Transaction');
const jwt = require('jsonwebtoken');

// Middleware de autenticación (alineado con server.js, auth.js y club.js)
const auth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1] || req.header('x-auth-token');
  if (!token) return res.status(401).json({ message: 'No autorizado' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'tu_secreto_muy_largo_y_seguro');
    req.user = decoded.id;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Token inválido' });
  }
};

// GET /api/players/ - Obtener jugadores disponibles (no en el club del usuario)
router.get('/', auth, async (req, res) => {
  try {
    const club = await Club.findOne({ userId: req.user }).populate('players');
    const clubPlayerIds = club && club.players.length ? club.players.map(p => p._id.toString()) : [];
    const players = await Player.find({ _id: { $nin: clubPlayerIds } });
    res.json(players);
  } catch (err) {
    console.error('Error en GET /api/players:', err);
    res.status(500).json({ message: 'Error del servidor' });
  }
});

// POST /api/players/ - Crear un jugador (para pruebas o admin)
router.post('/', auth, async (req, res) => {
  const { name, position, rating, value } = req.body;
  try {
    // Validación de campos requeridos
    if (!name || !position || rating === undefined || value === undefined) {
      return res.status(400).json({ message: 'Faltan datos requeridos: name, position, rating, value' });
    }

    const player = new Player({
      name,
      position,
      rating: Math.max(0, Math.min(99, rating)), // Asegurar que rating esté entre 0 y 99
      value: Math.max(0, value) // Asegurar que value no sea negativo
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
  const { playerId } = req.body;
  try {
    // Validación de campo requerido
    if (!playerId) return res.status(400).json({ message: 'Falta el playerId' });

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
    await club.save();

    // Registrar la transacción
    const transaction = new Transaction({
      userId: req.user,
      type: 'compra',
      playerName: player.name,
      value: player.value
    });
    await transaction.save();

    res.json({ club, transaction, message: 'Jugador comprado exitosamente' });
  } catch (err) {
    console.error('Error en POST /api/players/buy:', err);
    res.status(500).json({ message: 'Error del servidor' });
  }
});

// POST /api/players/watchlist - Agregar un jugador a la watchlist
router.post('/watchlist', auth, async (req, res) => {
  const { playerId } = req.body;
  try {
    // Validación de campo requerido
    if (!playerId) return res.status(400).json({ message: 'Falta el playerId' });

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

module.exports = router;