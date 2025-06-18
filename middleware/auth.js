const jwt = require('jsonwebtoken');

module.exports = function(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1] || req.header('x-auth-token');
  if (!token) return res.status(401).json({ message: 'No autorizado' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'tu_secreto_muy_largo_y_seguro');
    req.user = { id: decoded.id };
    next();
  } catch (err) {
    res.status(401).json({ message: 'Token inválido' });
  }
};
