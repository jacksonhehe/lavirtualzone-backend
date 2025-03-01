const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Club = require('../models/Club');

// GET /api/club/me - Obtener datos del club
router.get('/me', auth, async (req, res) => {
    try {
        const club = await Club.findOne({ userId: req.user });
        if (!club) return res.status(404).json({ message: 'Club no encontrado' });
        res.json(club);
    } catch (err) {
        console.error('Error en GET /me:', err);
        res.status(500).json({ message: 'Error del servidor' });
    }
});

// PUT /api/club/me - Actualizar nombre y color del club
router.put('/me', auth, async (req, res) => {
    try {
        const { name, color } = req.body;
        const club = await Club.findOne({ userId: req.user });
        if (!club) return res.status(404).json({ message: 'Club no encontrado' });

        club.name = name || club.name;
        club.color = color || club.color;
        await club.save();
        res.json(club);
    } catch (err) {
        console.error('Error en PUT /me:', err);
        res.status(500).json({ message: 'Error del servidor' });
    }
});

// POST /api/club/me/train - Entrenar un jugador
router.post('/me/train', auth, async (req, res) => {
    try {
        const { playerId, cost } = req.body;
        const club = await Club.findOne({ userId: req.user });
        if (!club) return res.status(404).json({ message: 'Club no encontrado' });

        const player = club.players.id(playerId);
        if (!player) return res.status(404).json({ message: 'Jugador no encontrado' });
        if (club.budget < cost) return res.status(400).json({ message: 'Presupuesto insuficiente' });

        club.budget -= cost;
        player.rating = Math.min((player.rating || 0) + 1, 99);
        player.value = (player.value || 0) + cost;

        await club.save();
        res.json({ club });
    } catch (err) {
        console.error('Error en /me/train:', err);
        res.status(500).json({ message: 'Error del servidor' });
    }
});

// POST /api/club/me/simulate - Simular un partido
router.post('/me/simulate', auth, async (req, res) => {
    try {
        const { win } = req.body;
        const club = await Club.findOne({ userId: req.user });
        if (!club) return res.status(404).json({ message: 'Club no encontrado' });
        if (club.players.length === 0) return res.status(400).json({ message: 'No hay jugadores en el club' });

        club.gamesPlayed = (club.gamesPlayed || 0) + 1;
        if (win) {
            club.wins = (club.wins || 0) + 1;
            club.budget += 500000; // Recompensa por victoria
        }
        await club.save();
        res.json({ club });
    } catch (err) {
        console.error('Error en /me/simulate:', err);
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
        club.gamesPlayed = 0;
        club.watchlist = [];

        await club.save();
        res.json({ club });
    } catch (err) {
        console.error('Error en /me/reset:', err);
        res.status(500).json({ message: 'Error del servidor' });
    }
});

// GET /api/club/leaderboard - Clasificación de clubes
router.get('/leaderboard', auth, async (req, res) => {
    try {
        const clubs = await Club.find().sort({ wins: -1 });
        const leaderboard = clubs.map(club => ({
            clubName: club.name,
            wins: club.wins || 0,
            avgRating: club.players.length ? club.players.reduce((sum, p) => sum + (p.rating || 0), 0) / club.players.length : 0
        }));
        res.json(leaderboard);
    } catch (err) {
        console.error('Error en /leaderboard:', err);
        res.status(500).json({ message: 'Error del servidor' });
    }
});

// GET /api/club/best-team - Verificar si es el mejor equipo
router.get('/best-team', auth, async (req, res) => {
    try {
        const clubs = await Club.find();
        const bestTeam = clubs.reduce((best, current) => {
            const currentAvg = current.players.length ? current.players.reduce((sum, p) => sum + (p.rating || 0), 0) / current.players.length : 0;
            const bestAvg = best.players.length ? best.players.reduce((sum, p) => sum + (p.rating || 0), 0) / best.players.length : 0;
            return currentAvg > bestAvg ? current : best;
        }, clubs[0] || {});
        const isBestTeam = bestTeam.userId && bestTeam.userId.toString() === req.user;
        res.json({ isBestTeam: !!isBestTeam });
    } catch (err) {
        console.error('Error en /best-team:', err);
        res.status(500).json({ message: 'Error del servidor' });
    }
});

module.exports = router;