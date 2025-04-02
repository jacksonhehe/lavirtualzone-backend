// routes/transactions.js
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { validateRequiredFields } = require('../middleware/validation');
const Transaction = require('../models/Transaction');
const Club = require('../models/Club');
const Player = require('../models/Player');

// Middleware de autenticación local (en vez de '../middleware/auth')
function auth(req, res, next) {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ message: 'No hay token, autorización denegada' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded.id;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Token inválido' });
  }
}

// POST /api/transactions - Crear una nueva transacción
router.post('/', auth, async (req, res) => {
  try {
    const requiredFields = ['type', 'playerId', 'value'];
    const validationError = validateRequiredFields(req, res, requiredFields);
    if (validationError) return validationError;

    const { type, playerId, value } = req.body;
    const club = await Club.findOne({ userId: req.user });
    if (!club) {
      return res.status(404).json({ message: 'Club no encontrado' });
    }

    const player = await Player.findById(playerId);
    if (!player) {
      return res.status(404).json({ message: 'Jugador no encontrado' });
    }

    if (type === 'compra' && club.budget < value) {
      return res.status(400).json({ message: 'Presupuesto insuficiente para la compra' });
    }

    // Crear la transacción
    const transaction = new Transaction({
      userId: req.user,
      clubId: club._id,
      type,
      playerId,
      playerName: player.name,
      value,
      date: new Date()
    });
    await transaction.save();

    // Actualizar el club según el tipo de transacción
    if (type === 'compra') {
      club.budget -= value;
      club.players.push(player._id);
      player.clubId = club._id;
    } else if (type === 'venta') {
      club.budget += value;
      club.players = club.players.filter((p) => p._id.toString() !== playerId);
      player.clubId = null;
    } else if (type === 'prestamo') {
      // Lógica específica para préstamos
      // (ej. No cambios en el array 'players' del club, etc.)
    }

    await player.save();
    await club.save();

    res.status(201).json({ transaction, message: 'Transacción realizada exitosamente' });
  } catch (err) {
    console.error('Error en POST /api/transactions:', err);
    res.status(500).json({ message: 'Error del servidor' });
  }
});

// GET /api/transactions - Obtener todas las transacciones del club
router.get('/', auth, async (req, res) => {
  try {
    const club = await Club.findOne({ userId: req.user });
    if (!club) {
      return res.status(404).json({ message: 'Club no encontrado' });
    }

    const transactions = await Transaction.find({ clubId: club._id }).sort({ date: -1 });
    res.json(transactions);
  } catch (err) {
    console.error('Error en GET /api/transactions:', err);
    res.status(500).json({ message: 'Error del servidor' });
  }
});

// GET /api/transactions/:id - Obtener una transacción específica
router.get('/:id', auth, async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id);
    if (!transaction) {
      return res.status(404).json({ message: 'Transacción no encontrada' });
    }

    // Verificar que la transacción pertenezca al club del usuario
    const club = await Club.findOne({ userId: req.user, _id: transaction.clubId });
    if (!club) {
      return res.status(403).json({ message: 'No autorizado para ver esta transacción' });
    }

    res.json(transaction);
  } catch (err) {
    console.error('Error en GET /api/transactions/:id:', err);
    res.status(500).json({ message: 'Error del servidor' });
  }
});

// Middleware de errores específico de este router
router.use((err, req, res, next) => {
  console.error('Error en transactions.js:', err);
  res.status(500).json({ message: 'Error interno del servidor' });
});

module.exports = router;
