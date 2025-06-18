module.exports.validateRequiredFields = function(req, res, fields) {
  const missing = fields.filter(field => !req.body[field]);
  if (missing.length) {
    res.status(400).json({ message: `Faltan campos requeridos: ${missing.join(', ')}` });
    return true;
  }
  return false;
};
