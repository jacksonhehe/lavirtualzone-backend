// routes/club.js
const express = require('express');
const router = express.Router();
const Club = require('../models/Club');
const Player = require('../models/Player');
const Transaction = require('../models/Transaction');
const { validateRequiredFields } = require('../middleware/validation');
const auth = require('../middleware/auth');

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
      if (existingClub) return res.status(400).json({ message: 'El nombre del club ya está en uso' });
      club.name = name;
    }
    if (color) club.color = color;
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
    if (validateRequiredFields(req, res, ['playerId', 'cost'])) return;
    const { playerId, cost } = req.body;
    if (typeof cost !== 'number' || cost <= 0) return res.status(400).json({ message: 'El costo debe ser un número positivo' });
    const club = await Club.findOne({ userId: req.user });
    if (!club) return res.status(404).json({ message: 'Club no encontrado' });
    const player = await Player.findById(playerId);
    if (!player || !player.clubId || player.clubId.toString() !== club._id.toString()) {
      return res.status(404).json({ message: 'Jugador no encontrado en el club' });
    }
    if (club.budget < cost) return res.status(400).json({ message: 'Presupuesto insuficiente' });
    club.budget -= cost;
    player.rating = Math.min((player.rating || 0) + 1, 99);
    player.value += cost;
    await player.save();
    await Transaction.recordTransaction(req.user, club._id, 'entrenamiento', player.name, cost, player._id);
    club.transactions.push({ type: 'entrenamiento', playerName: player.name, value: cost, date: new Date() });
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
    if (validateRequiredFields(req, res, ['win'])) return;
    const { win } = req.body;
    if (typeof win !== 'boolean') return res.status(400).json({ message: 'El campo win debe ser un booleano' });
    const club = await Club.findOne({ userId: req.user });
    if (!club) return res.status(404).json({ message: 'Club no encontrado' });
    if (club.players.length === 0) return res.status(400).json({ message: 'No hay jugadores en el club' });
    club.gamesPlayed += 1;
    if (win) {
      club.wins += 1;
      club.seasonWins += 1;
      club.budget += 500000;
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
