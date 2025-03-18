// routes/auth.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('config');
const { check, validationResult } = require('express-validator');
const User = require('../models/User');

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

    const { name, email, password } = req.body;

    try {
      // Verificar si el usuario ya existe
      let user = await User.findOne({ email });
      if (user) {
        return res.status(400).json({ message: 'El usuario ya existe' });
      }

      // Crear nuevo usuario
      user = new User({ name, email, password });

      // Hashear la contraseña
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password, salt);

      // Guardar usuario en la base de datos
      await user.save();

      // Generar token JWT
      const payload = { id: user.id };
      const token = jwt.sign(payload, config.get('jwtSecret'), { expiresIn: '1h' });

      res.json({ token });
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
      let user = await User.findOne({ email });
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

      res.json({ token });
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Error del servidor');
    }
  }
);

// @route    GET api/auth/me
// @desc     Obtener datos del usuario autenticado
// @access   Private
router.get('/me', async (req, res) => {
  try {
    // El middleware de autenticación debe agregar req.user
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