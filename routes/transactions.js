const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Transaction = require('../models/Transaction');
const Club = require('../models/Club');
const Player = require('../models/Player');

// Middleware de autenticación
const auth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1] || req.header('x-auth-token');
  if (!token) return res.status(401).json({ message: 'No autorizado, falta token' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded.id; // El ID del usuario autenticado (ObjectId)
    next();
  } catch (err) {
    console.error('Error en autenticación:', err);
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expirado' });
    } else if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Token inválido' });
    }
    res.status(500).json({ message: 'Error del servidor en autenticación' });
  }
};

// Función auxiliar para validar campos requeridos
const validateRequiredFields = (req, res, fields) => {
  for (const field of fields) {
    if (!req.body[field]) {
      return res.status(400).json({ message: `El campo ${field} es requerido` });
    }
  }
  return null;
};

// POST /api/transactions - Crear una nueva transacción (ej: comprar, vender o prestar un jugador)
router.post('/', auth, async (req, res) => {
  try {
    const requiredFields = ['type', 'playerId', 'value'];
    const validationError = validateRequiredFields(req, res, requiredFields);
    if (validationError) return validationError;

    const { type, playerId, value } = req.body;
    const club = await Club.findOne({ userId: req.user });
    if (!club) return res.status(404).json({ message: 'Club no encontrado' });

    const player = await Player.findById(playerId);
    if (!player) return res.status(404).json({ message: 'Jugador no encontrado' });

    // Verificar presupuesto para compras
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
    } else if (type === 'venta') {
      club.budget += value;
      club.players = club.players.filter(p => p._id.toString() !== playerId);
    } else if (type === 'prestamo') {
      // Lógica básica para préstamos (puedes personalizarla según tus necesidades)
      // Por ejemplo, podrías agregar una fecha de devolución o condiciones específicas
    }

    await club.save();
    res.status(201).json({ transaction, message: 'Transacción realizada exitosamente' });
  } catch (err) {
    console.error('Error en POST /api/transactions:', err);
    res.status(500).json({ message: 'Error del servidor' });
  }
});

// GET /api/transactions - Obtener todas las transacciones del club del usuario
router.get('/', auth, async (req, res) => {
  try {
    const club = await Club.findOne({ userId: req.user });
    if (!club) return res.status(404).json({ message: 'Club no encontrado' });

    const transactions = await Transaction.find({ clubId: club._id }).sort({ date: -1 });
    res.json(transactions);
  } catch (err) {
    console.error('Error en GET /api/transactions:', err);
    res.status(500).json({ message: 'Error del servidor' });
  }
});

// GET /api/transactions/:id - Obtener una transacción específica por ID
router.get('/:id', auth, async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id);
    if (!transaction) return res.status(404).json({ message: 'Transacción no encontrada' });

    // Verificar que la transacción pertenezca al club del usuario
    const club = await Club.findOne({ userId: req.user, _id: transaction.clubId });
    if (!club) return res.status(403).json({ message: 'No autorizado para ver esta transacción' });

    res.json(transaction);
  } catch (err) {
    console.error('Error en GET /api/transactions/:id:', err);
    res.status(500).json({ message: 'Error del servidor' });
  }
});

// Middleware para manejar errores globales en este router
router.use((err, req, res, next) => {
  console.error('Error en transactions.js:', err);
  res.status(500).json({ message: 'Error interno del servidor' });
});

module.exports = router;