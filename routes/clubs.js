const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Club = require('../models/Club');

// Middleware para verificar token
const auth = (req, res, next) => {
  const token = req.header('x-auth-token');
  if (!token) return res.status(401).json({ msg: 'No hay token, autorización denegada' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded.userId;
    next();
  } catch (err) {
    res.status(401).json({ msg: 'Token inválido' });
  }
};

// Crear o actualizar club
router.post('/', auth, async (req, res) => {
  const { name, color } = req.body;
  try {
    let club = await Club.findOne({ userId: req.user });
    if (club) {
      club.name = name;
      club.color = color;
    } else {
      club = new Club({ name, userId: req.user, color });
    }
    await club.save();
    res.json(club);
  } catch (err) {
    res.status(500).json({ msg: 'Error del servidor' });
  }
});

// Obtener club del usuario
router.get('/me', auth, async (req, res) => {
  try {
    const club = await Club.findOne({ userId: req.user });
    if (!club) return res.status(404).json({ msg: 'Club no encontrado' });
    res.json(club);
  } catch (err) {
    res.status(500).json({ msg: 'Error del servidor' });
  }
});

module.exports = router;