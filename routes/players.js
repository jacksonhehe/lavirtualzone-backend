const express = require('express');
const router = express.Router();
const Player = require('../models/Player');
const Club = require('../models/Club');

// Middleware de autenticación (alineado con server.js)
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

// Obtener jugadores disponibles (no en el club del usuario)
router.get('/', auth, async (req, res) => {
  try {
    const club = await Club.findOne({ userId: req.user });
    const clubPlayerIds = club && club.players.length ? club.players.map(p => p._id) : [];
    const players = await Player.find({ _id: { $nin: clubPlayerIds } });
    res.json(players);
  } catch (err) {
    console.error('Error en GET /players:', err);
    res.status(500).json({ message: 'Error del servidor' });
  }
});

// Crear un jugador (para pruebas o admin)
router.post('/', auth, async (req, res) => {
  const { name, position, rating, value } = req.body;
  try {
    if (!name || !position || rating === undefined || value === undefined) {
      return res.status(400).json({ message: 'Faltan datos requeridos' });
    }
    const player = new Player({ name, position, rating, value });
    await player.save();
    res.status(201).json(player);
  } catch (err) {
    console.error('Error en POST /players:', err);
    res.status(500).json({ message: 'Error del servidor' });
  }
});

// Comprar un jugador (vincula al club del usuario)
router.post('/buy', auth, async (req, res) => {
  const { playerId } = req.body;
  try {
    const club = await Club.findOne({ userId: req.user });
    if (!club) return res.status(404).json({ message: 'Club no encontrado' });

    const player = await Player.findById(playerId);
    if (!player) return res.status(404).json({ message: 'Jugador no encontrado' });

    // Verificar si el jugador ya está en otro club podría ir aquí si tienes una lógica de mercado más compleja
    if (club.players.some(p => p._id.toString() === playerId)) {
      return res.status(400).json({ message: 'El jugador ya está en tu club' });
    }

    if (club.budget < player.value) {
      return res.status(400).json({ message: 'Presupuesto insuficiente' });
    }

    club.budget -= player.value;
    club.players.push(player._id);
    await club.save();

    res.json({ message: 'Jugador comprado exitosamente', club });
  } catch (err) {
    console.error('Error en POST /players/buy:', err);
    res.status(500).json({ message: 'Error del servidor' });
  }
});

// Agregar un jugador a la watchlist (lista de seguimiento)
router.post('/watchlist', auth, async (req, res) => {
  const { playerId } = req.body;
  try {
    const club = await Club.findOne({ userId: req.user });
    if (!club) return res.status(404).json({ message: 'Club no encontrado' });

    const player = await Player.findById(playerId);
    if (!player) return res.status(404).json({ message: 'Jugador no encontrado' });

    if (club.watchlist.some(w => w._id.toString() === playerId)) {
      return res.status(400).json({ message: 'El jugador ya está en tu watchlist' });
    }

    club.watchlist.push({ _id: player._id, name: player.name, value: player.value });
    await club.save();

    res.json({ message: 'Jugador agregado a la watchlist', club });
  } catch (err) {
    console.error('Error en POST /players/watchlist:', err);
    res.status(500).json({ message: 'Error del servidor' });
  }
});

// Eliminar un jugador de la watchlist
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
    res.json({ message: 'Jugador eliminado de la watchlist', club });
  } catch (err) {
    console.error('Error en DELETE /players/watchlist:', err);
    res.status(500).json({ message: 'Error del servidor' });
  }
});

module.exports = router;