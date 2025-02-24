const express = require('express');
const router = express.Router();
const Player = require('../models/Player');
const Club = require('../models/Club');
const jwt = require('jsonwebtoken');

// Middleware de autenticación
const auth = (req, res, next) => {
  const token = req.header('x-auth-token');
  if (!token) return res.status(401).json({ msg: 'No hay token, autorización denegada' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded.id;
    next();
  } catch (err) {
    res.status(401).json({ msg: 'Token inválido' });
  }
};

// Obtener jugadores disponibles
router.get('/', auth, async (req, res) => {
  try {
    const club = await Club.findOne({ userId: req.user });
    const clubPlayerIds = club ? club.players : [];
    const players = await Player.find({ _id: { $nin: clubPlayerIds } });
    res.json(players);
  } catch (err) {
    console.error('Error en GET /players:', err);
    res.status(500).json({ msg: 'Error del servidor' });
  }
});

// Crear un jugador (opcional, para pruebas)
router.post('/', auth, async (req, res) => {
  const { name, position, rating, value } = req.body;
  try {
    const player = new Player({ name, position, rating, value });
    await player.save();
    res.status(201).json(player);
  } catch (err) {
    console.error('Error en POST /players:', err);
    res.status(500).json({ msg: 'Error del servidor' });
  }
});

module.exports = router;