// routes/players.js
const express = require('express');
const router = express.Router();
const Player = require('../models/Player');
const Club = require('../models/Club');
const auth = require('../middleware/auth');
const { validateRequiredFields } = require('../middleware/validation');

// GET /api/players/ - Obtener jugadores disponibles (no en el club del usuario)
router.get('/', auth, async (req, res) => {
  try {
    const club = await Club.findOne({ userId: req.user.id }).populate('players');
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
    if (rating < 0 || rating > 99) {
      return res.status(400).json({ message: 'El rating debe estar entre 0 y 99' });
    }
    if (value < 0) {
      return res.status(400).json({ message: 'El valor no puede ser negativo' });
    }
    const existingPlayer = await Player.findOne({ name });
    if (existingPlayer) {
      return res.status(400).json({ message: 'El jugador ya existe' });
    }
    const player = new Player({
      name,
      position,
      rating: Math.max(0, Math.min(99, rating)),
      value: Math.max(0, value)
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
    const club = await Club.findOne({ userId: req.user.id }).populate('players');
    if (!club) return res.status(404).json({ message: 'Club no encontrado' });
    const player = await Player.findById(playerId);
    if (!player) return res.status(404).json({ message: 'Jugador no encontrado' });
    if (club.players.some(p => p._id.toString() === playerId)) {
      return res.status(400).json({ message: 'El jugador ya está en tu club' });
    }
    if (club.budget < player.value) {
      return res.status(400).json({ message: 'Presupuesto insuficiente' });
    }
    club.budget -= player.value;
    club.players.push(player._id);
    club.transactions.push({
      type: 'compra',
      playerName: player.name,
      value: player.value,
      date: new Date()
    });
    // Actualizar el clubId del jugador
    player.clubId = club._id;
    await player.save();
    await club.save();
    res.json({ club, message: 'Jugador comprado exitosamente' });
  } catch (err) {
    console.error('Error en POST /api/players/buy:', err);
    res.status(500).json({ message: 'Error del servidor' });
  }
});

// POST /api/players/sell - Vender un jugador del club
router.post('/sell', auth, async (req, res) => {
  try {
    const requiredFields = ['playerId'];
    const validationError = validateRequiredFields(req, res, requiredFields);
    if (validationError) return validationError;
    const { playerId } = req.body;
    const club = await Club.findOne({ userId: req.user.id }).populate('players');
    if (!club) return res.status(404).json({ message: 'Club no encontrado' });
    const playerIndex = club.players.findIndex(p => p._id.toString() === playerId);
    if (playerIndex === -1) {
      return res.status(404).json({ message: 'Jugador no encontrado en tu club' });
    }
    const player = club.players[playerIndex];
    const sellValue = Math.floor(player.value * 0.8);
    club.budget += sellValue;
    club.players.splice(playerIndex, 1);
    club.transactions.push({
      type: 'venta',
      playerName: player.name,
      value: sellValue,
      date: new Date()
    });
    // Actualizar el clubId del jugador a null
    const playerDoc = await Player.findById(playerId);
    if (playerDoc) {
      playerDoc.clubId = null;
      await playerDoc.save();
    }
    await club.save();
    res.json({ club, message: `Jugador vendido por $${sellValue}` });
  } catch (err) {
    console.error('Error en POST /api/players/sell:', err);
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
    const club = await Club.findOne({ userId: req.user.id });
    if (!club) return res.status(404).json({ message: 'Club no encontrado' });
    const player = await Player.findById(playerId);
    if (!player) return res.status(404).json({ message: 'Jugador no encontrado' });
    if (club.watchlist.some(w => w._id.toString() === playerId)) {
      return res.status(400).json({ message: 'El jugador ya está en tu watchlist' });
    }
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
    const club = await Club.findOne({ userId: req.user.id });
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

router.use((err, req, res, next) => {
  console.error('Error en players.js:', err);
  res.status(500).json({ message: 'Error interno del servidor' });
});

module.exports = router;
