// routes/players.js
const express = require('express');
const router = express.Router();
const Player = require('../models/Player');
const Club = require('../models/Club');
const auth = require('../middleware/auth');
const { validateRequiredFields } = require('../middleware/validation');

// GET /api/players - Obtener jugadores que no estén en el club del usuario
router.get('/', auth, async (req, res) => {
  try {
    const club = await Club.findOne({ userId: req.user }).populate('players');
    const clubPlayerIds = club ? club.players.map((p) => p._id.toString()) : [];
    // Jugadores que NO estén en la lista del club
    const players = await Player.find({ _id: { $nin: clubPlayerIds } });
    res.json(players);
  } catch (err) {
    console.error('Error en GET /api/players:', err);
    res.status(500).json({ message: 'Error del servidor' });
  }
});

// POST /api/players - Crear un jugador (solo para admin o pruebas)
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

    // Verificar si el jugador ya existe
    const existingPlayer = await Player.findOne({ name });
    if (existingPlayer) {
      return res.status(400).json({ message: 'El jugador ya existe' });
    }

    // Crear jugador con ID autogenerado
    const player = new Player({
      name,
      position,
      rating,
      value
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
    if (club.players.some((p) => p._id.toString() === playerId)) {
      return res.status(400).json({ message: 'El jugador ya está en tu club' });
    }

    // Verificar presupuesto
    if (club.budget < player.value) {
      return res.status(400).json({ message: 'Presupuesto insuficiente' });
    }

    // Actualizar club
    club.budget -= player.value;
    club.players.push(player._id);
    club.transactions.push({
      type: 'compra',
      playerName: player.name,
      value: player.value,
      date: new Date()
    });
    await club.save();

    // Actualizar el jugador
    player.clubId = club._id;
    await player.save();

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
    const club = await Club.findOne({ userId: req.user }).populate('players');
    if (!club) return res.status(404).json({ message: 'Club no encontrado' });

    const playerIndex = club.players.findIndex((p) => p._id.toString() === playerId);
    if (playerIndex === -1) {
      return res.status(404).json({ message: 'Jugador no encontrado en tu club' });
    }

    const player = club.players[playerIndex];
    const sellValue = Math.floor(player.value * 0.8); // ejemplo: 80% del valor

    // Actualizar club
    club.budget += sellValue;
    club.players.splice(playerIndex, 1);
    club.transactions.push({
      type: 'venta',
      playerName: player.name,
      value: sellValue,
      date: new Date()
    });
    await club.save();

    // Actualizar el jugador
    const foundPlayer = await Player.findById(player._id);
    if (foundPlayer) {
      foundPlayer.clubId = null;
      await foundPlayer.save();
    }

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
    const club = await Club.findOne({ userId: req.user });
    if (!club) return res.status(404).json({ message: 'Club no encontrado' });

    const player = await Player.findById(playerId);
    if (!player) return res.status(404).json({ message: 'Jugador no encontrado' });

    // Verificar si ya está en la watchlist
    if (club.watchlist.some((w) => w._id.toString() === playerId)) {
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
  try {
    const { playerId } = req.params;
    const club = await Club.findOne({ userId: req.user });
    if (!club) return res.status(404).json({ message: 'Club no encontrado' });

    const initialLength = club.watchlist.length;
    club.watchlist = club.watchlist.filter((w) => w._id.toString() !== playerId);

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

// Manejo de errores específico de este router
router.use((err, req, res, next) => {
  console.error('Error en players.js:', err);
  res.status(500).json({ message: 'Error interno del servidor' });
});

module.exports = router;
