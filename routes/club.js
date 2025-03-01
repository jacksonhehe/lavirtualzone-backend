const express = require('express');
const router = express.Router();
const Club = require('../models/Club');
const Player = require('../models/Player');
const Transaction = require('../models/Transaction');

// Middleware de autenticación (alineado con server.js y auth.js)
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

// GET /api/club/me - Obtener datos del club del usuario autenticado
router.get('/me', auth, async (req, res) => {
  try {
    let club = await Club.findOne({ userId: req.user }).populate('players');
    if (!club) {
      // Crear un club por defecto si no existe
      club = new Club({
        userId: req.user,
        name: '[Sin registrar]',
        budget: 100000000,
        players: [],
        color: '#00ffff',
        wins: 0,
        watchlist: [],
        gamesPlayed: 0
      });
      await club.save();
    }
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
    let club = await Club.findOne({ userId: req.user });
    if (!club) {
      club = new Club({ userId: req.user });
    }

    if (name) club.name = name;
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
    const { playerId, cost } = req.body;
    if (!playerId || cost === undefined) {
      return res.status(400).json({ message: 'Faltan datos: playerId y cost son requeridos' });
    }

    const club = await Club.findOne({ userId: req.user });
    if (!club) return res.status(404).json({ message: 'Club no encontrado' });

    const player = club.players.id(playerId);
    if (!player) return res.status(404).json({ message: 'Jugador no encontrado en el club' });

    if (club.budget < cost) return res.status(400).json({ message: 'Presupuesto insuficiente' });

    club.budget -= cost;
    player.rating = Math.min((player.rating || 0) + 1, 99); // Incrementar rating, máximo 99
    player.value = (player.value || 0) + cost; // Incrementar valor

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
    const { win } = req.body;
    if (win === undefined) return res.status(400).json({ message: 'Falta el parámetro win' });

    const club = await Club.findOne({ userId: req.user });
    if (!club) return res.status(404).json({ message: 'Club no encontrado' });
    if (club.players.length === 0) return res.status(400).json({ message: 'No hay jugadores en el club' });

    club.gamesPlayed = (club.gamesPlayed || 0) + 1;
    if (win) {
      club.wins = (club.wins || 0) + 1;
      club.budget += 500000; // Recompensa por victoria
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

    club.name = '[Sin registrar]';
    club.budget = 100000000;
    club.players = [];
    club.color = '#00ffff';
    club.wins = 0;
    club.watchlist = [];
    club.gamesPlayed = 0;

    await club.save();
    res.json({ club, message: 'Club reiniciado exitosamente' });
  } catch (err) {
    console.error('Error en POST /api/club/me/reset:', err);
    res.status(500).json({ message: 'Error del servidor' });
  }
});

// GET /api/club/leaderboard - Obtener clasificación de clubes
router.get('/leaderboard', auth, async (req, res) => {
  try {
    const clubs = await Club.find().sort({ wins: -1 }).populate('players');
    const leaderboard = clubs.map(club => ({
      clubName: club.name,
      wins: club.wins || 0,
      avgRating: club.players.length ? club.players.reduce((sum, p) => sum + (p.rating || 0), 0) / club.players.length : 0
    }));
    res.json(leaderboard);
  } catch (err) {
    console.error('Error en GET /api/club/leaderboard:', err);
    res.status(500).json({ message: 'Error del servidor' });
  }
});

// GET /api/club/best-team - Verificar si el club del usuario es el mejor
router.get('/best-team', auth, async (req, res) => {
  try {
    const clubs = await Club.find().populate('players');
    if (!clubs.length) return res.status(404).json({ message: 'No hay clubes disponibles' });

    const bestTeam = clubs.reduce((best, current) => {
      const currentAvg = current.players.length ? current.players.reduce((sum, p) => sum + (p.rating || 0), 0) / current.players.length : 0;
      const bestAvg = best.players.length ? best.players.reduce((sum, p) => sum + (p.rating || 0), 0) / best.players.length : 0;
      return currentAvg > bestAvg ? current : best;
    }, clubs[0]);

    const isBestTeam = bestTeam.userId && bestTeam.userId.toString() === req.user;
    res.json({ isBestTeam: !!isBestTeam });
  } catch (err) {
    console.error('Error en GET /api/club/best-team:', err);
    res.status(500).json({ message: 'Error del servidor' });
  }
});

// GET /api/club/count - Contar clubes (para estadísticas)
router.get('/count', auth, async (req, res) => {
  try {
    const count = await Club.countDocuments();
    res.json({ success: true, count });
  } catch (err) {
    console.error('Error en GET /api/club/count:', err);
    res.status(500).json({ message: 'Error del servidor' });
  }
});

module.exports = router;