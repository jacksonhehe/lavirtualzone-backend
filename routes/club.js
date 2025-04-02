// routes/club.js
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Club = require('../models/Club');
const Player = require('../models/Player');
const Transaction = require('../models/Transaction');
const { validateRequiredFields } = require('../middleware/validation');

// Middleware de autenticación local (en vez de '../middleware/auth')
function auth(req, res, next) {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ message: 'No hay token, autorización denegada' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // Usar "id" o la propiedad que definiste en el payload
    req.user = decoded.id;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Token inválido' });
  }
}

// GET /api/club/me - Obtener el club del usuario autenticado
router.get('/me', auth, async (req, res) => {
  try {
    const club = await Club.findOne({ userId: req.user });
    if (!club) return res.status(404).json({ message: 'Club no encontrado' });
    res.json(club);
  } catch (err) {
    console.error('Error en GET /api/club/me:', err);
    res.status(500).json({ message: 'Error del servidor' });
  }
});

// PUT /api/club/me - Actualizar nombre y color del club
router.put('/me', auth, async (req, res) => {
  try {
    const { name, color } = req.body;
    const club = await Club.findOne({ userId: req.user });
    if (!club) return res.status(404).json({ message: 'Club no encontrado' });

    if (name && name !== club.name) {
      const existingClub = await Club.findOne({ name });
      if (existingClub) {
        return res.status(400).json({ message: 'El nombre del club ya está en uso' });
      }
      club.name = name;
    }
    if (color) {
      club.color = color;
    }

    await club.save();
    res.json(club);
  } catch (err) {
    console.error('Error en PUT /api/club/me:', err);
    res.status(500).json({ message: 'Error del servidor' });
  }
});

// POST /api/club/me/train - Entrenar un jugador
router.post('/me/train', auth, async (req, res) => {
  try {
    const requiredFields = ['playerId', 'cost'];
    const validationError = validateRequiredFields(req, res, requiredFields);
    if (validationError) return validationError;

    const { playerId, cost } = req.body;
    if (typeof cost !== 'number' || cost <= 0) {
      return res.status(400).json({ message: 'El costo debe ser un número positivo' });
    }

    const club = await Club.findOne({ userId: req.user });
    if (!club) return res.status(404).json({ message: 'Club no encontrado' });

    const player = await Player.findById(playerId);
    if (!player || !player.clubId || player.clubId.toString() !== club._id.toString()) {
      return res.status(404).json({ message: 'Jugador no encontrado en el club' });
    }

    if (club.budget < cost) {
      return res.status(400).json({ message: 'Presupuesto insuficiente' });
    }

    // Actualizar presupuesto, rating y valor
    club.budget -= cost;
    player.rating = Math.min((player.rating || 0) + 1, 99);
    player.value = (player.value || 0) + cost;
    await player.save();

    // Registrar la transacción
    await Transaction.recordTransaction(
      req.user,
      club._id,
      'entrenamiento',
      player.name,
      cost,
      player._id
    );

    club.transactions.push({
      type: 'Entrenamiento',
      playerName: player.name,
      value: cost,
      date: new Date()
    });

    await club.save();
    res.json({ club, message: 'Jugador entrenado exitosamente' });
  } catch (err) {
    console.error('Error en POST /api/club/me/train:', err);
    res.status(500).json({ message: 'Error del servidor' });
  }
});

// POST /api/club/me/simulate - Simular un partido
router.post('/me/simulate', auth, async (req, res) => {
  try {
    const requiredFields = ['win'];
    const validationError = validateRequiredFields(req, res, requiredFields);
    if (validationError) return validationError;

    const { win } = req.body;
    if (typeof win !== 'boolean') {
      return res.status(400).json({ message: 'El campo win debe ser un booleano' });
    }

    const club = await Club.findOne({ userId: req.user });
    if (!club) return res.status(404).json({ message: 'Club no encontrado' });

    if (club.players.length === 0) {
      return res.status(400).json({ message: 'No hay jugadores en el club' });
    }

    club.gamesPlayed = (club.gamesPlayed || 0) + 1;
    if (win) {
      club.wins = (club.wins || 0) + 1;
      club.seasonWins = (club.seasonWins || 0) + 1;
      club.budget += 500000; // Recompensa por la victoria
    }

    await club.save();
    res.json({ club, message: win ? '¡Victoria simulada!' : 'Derrota simulada' });
  } catch (err) {
    console.error('Error en POST /api/club/me/simulate:', err);
    res.status(500).json({ message: 'Error del servidor' });
  }
});

// POST /api/club/me/reset - Reiniciar el club
router.post('/me/reset', auth, async (req, res) => {
  try {
    const club = await Club.findOne({ userId: req.user });
    if (!club) return res.status(404).json({ message: 'Club no encontrado' });

    Object.assign(club, {
      name: '[Sin registrar]',
      budget: 100000000,
      players: [],
      color: '#00ffff',
      wins: 0,
      watchlist: [],
      gamesPlayed: 0,
      transactions: [],
      seasonWins: 0
    });
    await club.save();

    res.json({ club: club.toObject(), message: 'Club reiniciado correctamente' });
  } catch (err) {
    console.error('Error en POST /api/club/me/reset:', err);
    res.status(500).json({ message: 'Error del servidor' });
  }
});

module.exports = router;
