const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Constantes de configuración
const DEFAULT_JWT_SECRET = 'tu_secreto_muy_largo_y_seguro'; // Clave predeterminada (reemplazar en producción)
const JWT_EXPIRY = '1h'; // Tiempo de expiración del token (puedes ajustar)

// Middleware para validar campos requeridos
const validateRequiredFields = (req, res, fields) => {
  for (const field of fields) {
    if (!req.body[field]) {
      return res.status(400).json({ message: `El campo ${field} es requerido` });
    }
  }
  return null;
};

// Registro de un nuevo usuario
router.post('/register', async (req, res) => {
  try {
    // Validar campos requeridos
    const requiredFields = ['name', 'email', 'password', 'parsecId'];
    const validationError = validateRequiredFields(req, res, requiredFields);
    if (validationError) return validationError;

    const { name, email, password, parsecId } = req.body;

    // Normalizar email (minúsculas) y validar formato (opcional)
    const normalizedEmail = email.toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return res.status(400).json({ message: 'Email inválido' });
    }

    // Verificar si el usuario ya existe
    let user = await User.findOne({ email: normalizedEmail });
    if (user) return res.status(400).json({ message: 'El usuario ya existe' });

    // Hashear la contraseña
    const salt = await bcrypt.genSalt(12); // Aumenté a 12 para mayor seguridad
    const hashedPassword = await bcrypt.hash(password, salt);

    // Crear el nuevo usuario
    user = new User({
      name,
      email: normalizedEmail,
      password: hashedPassword,
      parsecId
    });
    await user.save();

    // Generar token JWT
    const payload = { id: user._id };
    const token = jwt.sign(payload, process.env.JWT_SECRET || DEFAULT_JWT_SECRET, { expiresIn: JWT_EXPIRY });

    // Respuesta con token y datos del usuario (excluyendo la contraseña)
    res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email, parsecId: user.parsecId }
    });
  } catch (err) {
    console.error('Error en /auth/register:', err);
    res.status(500).json({ message: 'Error del servidor' });
  }
});

// Inicio de sesión
router.post('/login', async (req, res) => {
  try {
    // Validar campos requeridos
    const requiredFields = ['email', 'password'];
    const validationError = validateRequiredFields(req, res, requiredFields);
    if (validationError) return validationError;

    const { email, password } = req.body;

    // Normalizar email
    const normalizedEmail = email.toLowerCase();

    // Buscar al usuario
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) return res.status(400).json({ message: 'Credenciales inválidas' });

    // Comparar la contraseña
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Credenciales inválidas' });

    // Generar token JWT
    const payload = { id: user._id };
    const token = jwt.sign(payload, process.env.JWT_SECRET || DEFAULT_JWT_SECRET, { expiresIn: JWT_EXPIRY });

    // Respuesta con token y datos del usuario
    res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email, parsecId: user.parsecId }
    });
  } catch (err) {
    console.error('Error en /auth/login:', err);
    res.status(500).json({ message: 'Error del servidor' });
  }
});

// Obtener datos del usuario autenticado
router.get('/me', async (req, res) => {
  const token = req.header('x-auth-token');
  if (!token) return res.status(401).json({ message: 'No autorizado, falta token' });

  try {
    // Verificar token JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET || DEFAULT_JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password'); // Excluir la contraseña
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });

    res.json({ id: user._id, name: user.name, email: user.email, parsecId: user.parsecId });
  } catch (err) {
    console.error('Error en /auth/me:', err);
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expirado' });
    }
    res.status(401).json({ message: 'Token inválido' });
  }
});

// Middleware para proteger rutas (opcional, si necesitas usarlo en otras rutas)
router.use((err, req, res, next) => {
  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({ message: 'No autorizado' });
  }
  next(err);
});

module.exports = router;