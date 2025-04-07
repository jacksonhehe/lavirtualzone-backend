const mongoose = require('mongoose');

const playerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  position: { type: String, enum: ['Delantero', 'Mediocampista', 'Defensor', 'Portero'], required: true },
  rating: { type: Number, min: 0, max: 99, required: true },
  value: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Player', playerSchema);