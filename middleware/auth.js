// middleware/auth.js
const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '') || req.header('x-auth-token');
  if (!token) return res.status(401).json({ message: 'No autorizado, falta token' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // Se asigna directamente el id del usuario para mayor consistencia
    req.user = decoded.id || decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expirado' });
    } else if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Token inválido' });
    }
    res.status(500).json({ message: 'Error del servidor en autenticación' });
  }
};
