const jwt = require('jsonwebtoken');

function auth(req, res, next) {
  // Leer el token del header
  const token = req.header('x-auth-token');
  if (!token) {
    return res.status(401).json({ message: 'No hay token, autorización denegada' });
  }
  try {
    // Verificar el token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // Adjuntar el ID de usuario decodificado a la solicitud
    req.user = decoded.id ? decoded.id : decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Token inválido' });
  }
}

module.exports = auth;
