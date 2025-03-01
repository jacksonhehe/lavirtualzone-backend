const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Registro de un nuevo usuario
router.post('/register', async (req, res) => {
  const { name, email, password, parsecId } = req.body;
  try {
    // Validación de campos requeridos
    if (!name || !email || !password || !parsecId) {
      return res.status(400).json({ message: 'Todos los campos son requeridos: name, email, password, parsecId' });
    }

    // Verificar si el usuario ya existe
    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ message: 'El usuario ya existe' });

    // Hashear la contraseña
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Crear el nuevo usuario
    user = new User({
      name,
      email,
      password: hashedPassword,
      parsecId
    });
    await user.save();

    // Generar token JWT
    const payload = { id: user._id };
    const token = jwt.sign(payload, process.env.JWT_SECRET || 'tu_secreto_muy_largo_y_seguro', { expiresIn: '1h' });

    // Respuesta con token y datos del usuario
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
  const { email, password } = req.body;
  try {
    // Validación de campos requeridos
    if (!email || !password) {
      return res.status(400).json({ message: 'Email y contraseña son requeridos' });
    }

    // Buscar al usuario
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'Credenciales inválidas' });

    // Comparar la contraseña
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Credenciales inválidas' });

    // Generar token JWT
    const payload = { id: user._id };
    const token = jwt.sign(payload, process.env.JWT_SECRET || 'tu_secreto_muy_largo_y_seguro', { expiresIn: '1h' });

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
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'tu_secreto_muy_largo_y_seguro');
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

module.exports = router;