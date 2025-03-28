function validateRequiredFields(req, res, fields) {
    for (const field of fields) {
      if (req.body[field] === undefined || req.body[field] === null || req.body[field] === '') {
        // Si falta un campo requerido, responder con error 400
        return res.status(400).json({ message: `El campo ${field} es requerido` });
      }
    }
    return null;
  }
  
  module.exports = { validateRequiredFields };
  