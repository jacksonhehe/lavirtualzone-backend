// middleware/validation.js
module.exports.validateRequiredFields = (req, res, fields) => {
  for (const field of fields) {
    if (!req.body[field]) {
      res.status(400).json({ message: `El campo ${field} es requerido` });
      return true;
    }
  }
  return false;
};
