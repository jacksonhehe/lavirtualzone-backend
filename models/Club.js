const mongoose = require('mongoose');

const clubSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'El nombre del club es obligatorio'],
    unique: true,
    trim: true,
    minlength: [3, 'El nombre debe tener al menos 3 caracteres'],
    maxlength: [50, 'El nombre no puede exceder los 50 caracteres']
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'El ID del usuario es obligatorio'],
    immutable: true
  },
  budget: {
    type: Number,
    default: 100000000,
    min: [0, 'El presupuesto no puede ser negativo']
  },
  players: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player'
  }],
  wins: {
    type: Number,
    default: 0,
    min: [0, 'Las victorias no pueden ser negativas']
  },
  watchlist: [{
    _id: { type: mongoose.Schema.Types.ObjectId, ref: 'Player' },
    name: String,
    value: Number
  }],
  gamesPlayed: {
    type: Number,
    default: 0,
    min: [0, 'Los partidos jugados no pueden ser negativos']
  },
  transactions: [{
    type: { 
      type: String, 
      enum: ['compra', 'venta', 'prestamo', 'entrenamiento'],
      required: true 
    },
    playerName: String,
    value: Number,
    date: { type: Date, default: Date.now }
  }],
  seasonWins: {
    type: Number,
    default: 0,
    min: [0, 'Las victorias de temporada no pueden ser negativas']
  },
  color: {
    type: String,
    default: '#00ffff',
    match: [/^#([0-9A-Fa-f]{3}){1,2}$/, 'El color debe ser un código hexadecimal válido']
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Índice único para el nombre del club
clubSchema.index({ name: 1 }, { unique: true });

// Virtual para el valor total de los jugadores (requiere que se haga populate)
clubSchema.virtual('totalPlayerValue').get(function() {
  return this.players.reduce((total, player) => total + (player.value || 0), 0);
});

// Método para agregar una transacción y guardarla
clubSchema.methods.addTransaction = function(type, playerName, value) {
  this.transactions.push({ type, playerName, value });
  return this.save();
};

// Hook pre-save para evitar que un usuario cree más de un club
clubSchema.pre('save', async function(next) {
  if (this.isNew) {
    const existingClub = await mongoose.model('Club').findOne({ userId: this.userId });
    if (existingClub) {
      return next(new Error('El usuario ya tiene un club'));
    }
  }
  next();
});

module.exports = mongoose.model('Club', clubSchema);
