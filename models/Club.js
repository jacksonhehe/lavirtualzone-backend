const mongoose = require('mongoose');

const clubSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  budget: { type: Number, default: 100000000 },
  players: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Player' }],
  wins: { type: Number, default: 0 },
});

module.exports = mongoose.model('Club', clubSchema);