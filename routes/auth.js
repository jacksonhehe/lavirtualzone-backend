// routes/auth.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('config');
const { check, validationResult } = require('express-validator');
const User = require('../models/User');

// Middleware para proteger rutas (autenticación con JWT)
const authMiddleware = async (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ message: 'No hay token, autorización denegada' });
  }
  try {
    const decoded = jwt.verify(token, config.get('jwtSecret'));
    req.user = decoded; 
    next();
  } catch (err) {
    res.status(401).json({ message: 'Token inválido' });
  }
};

// @route    POST api/auth/register
// @desc     Registrar un nuevo usuario
// @access   Public
router.post(
  '/register',
  [
    check('name', 'El nombre es requerido').not().isEmpty(),
    check('email', 'Por favor, ingresa un email válido').isEmail(),
    check('password', 'La contraseña debe tener al menos 6 caracteres').isLength({ min: 6 })
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, password, parsecId } = req.body;
    try {
      // Verificar si el usuario ya existe (email)
      let user = await User.findOne({ email });
      if (user) {
        return res.status(400).json({ message: 'El usuario ya existe' });
      }
      // Verificar si el parsecId ya está registrado
      user = await User.findOne({ parsecId });
      if (user) {
        return res.status(400).json({ message: 'El ID de Parsec ya está registrado' });
      }

      // Crear nuevo usuario
      user = new User({ name, email, password, parsecId });
      await user.save();

      // Generar token JWT
      const payload = { id: user.id };
      const token = jwt.sign(payload, config.get('jwtSecret'), { expiresIn: '1h' });
      res.json({ token, user: { name: user.name } });
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Error del servidor');
    }
  }
);

// @route    POST api/auth/login
// @desc     Iniciar sesión y obtener token
// @access   Public
router.post(
  '/login',
  [
    check('email', 'Por favor, ingresa un email válido').isEmail(),
    check('password', 'La contraseña es requerida').exists()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;
    try {
      // Buscar usuario por email
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(400).json({ message: 'Credenciales inválidas' });
      }
      // Verificar contraseña
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(400).json({ message: 'Credenciales inválidas' });
      }
      // Generar token JWT
      const payload = { id: user.id };
      const token = jwt.sign(payload, config.get('jwtSecret'), { expiresIn: '1h' });
      res.json({ token, user: { name: user.name } });
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Error del servidor');
    }
  }
);

// @route    GET api/auth/me
// @desc     Obtener datos del usuario autenticado
// @access   Private
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Error del servidor');
  }
});

module.exports = router;
