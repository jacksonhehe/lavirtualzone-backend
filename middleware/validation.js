// middleware/validation.js
function validateRequiredFields(req, res, fields) {
  for (const field of fields) {
    if (!req.body[field]) {
      res.status(400).json({ message: `El campo ${field} es requerido` });
      return true; // Se encontró error
    }
  }
  return false; // No hay error
}

module.exports = { validateRequiredFields };
