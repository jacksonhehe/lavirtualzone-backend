const mongoose = require('mongoose');

// Definir el esquema del club
const clubSchema = new mongoose.Schema({
  // Nombre del club: debe ser único y requerido
  name: {
    type: String,
    required: [true, 'El nombre del club es obligatorio'],
    unique: true,
    trim: true, // Elimina espacios en blanco al inicio y final
    minlength: [3, 'El nombre debe tener al menos 3 caracteres'],
    maxlength: [50, 'El nombre no puede exceder los 50 caracteres']
  },
  
  // ID del usuario propietario del club
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'El ID del usuario es obligatorio'],
    immutable: true // No permitir cambios después de la creación
  },
  
  // Presupuesto del club
  budget: {
    type: Number,
    default: 100000000,
    min: [0, 'El presupuesto no puede ser negativo']
  },
  
  // Lista de jugadores del club
  players: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player'
  }],
  
  // Victorias del club
  wins: {
    type: Number,
    default: 0,
    min: [0, 'Las victorias no pueden ser negativas']
  },
  
  // Lista de observación (watchlist) de jugadores
  watchlist: [{
    _id: { type: mongoose.Schema.Types.ObjectId, ref: 'Player' },
    name: String,
    value: Number
  }],
  
  // Partidos jugados
  gamesPlayed: {
    type: Number,
    default: 0,
    min: [0, 'Los partidos jugados no pueden ser negativos']
  },
  
  // Transacciones del club
  transactions: [{
    type: { type: String, enum: ['compra', 'venta', 'Entrenamiento'], required: true },
    playerName: String,
    value: Number,
    date: { type: Date, default: Date.now }
  }],
  
  // Victorias en la temporada actual
  seasonWins: {
    type: Number,
    default: 0,
    min: [0, 'Las victorias de temporada no pueden ser negativas']
  },
  
  // Color del club
  color: {
    type: String,
    default: '#00ffff',
    match: [/^#([0-9a-f]{3}){1,2}$/i, 'El color debe ser un código hexadecimal válido']
  }
}, {
  // Opciones del esquema
  timestamps: true, // Añade createdAt y updatedAt automáticamente
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Índice único para el nombre del club
clubSchema.index({ name: 1 }, { unique: true });

// Virtual para calcular el valor total de los jugadores
clubSchema.virtual('totalPlayerValue').get(function() {
  return this.players.reduce((total, player) => total + (player.value || 0), 0);
});

// Método para añadir una transacción
clubSchema.methods.addTransaction = function(type, playerName, value) {
  this.transactions.push({ type, playerName, value });
  return this.save();
};

// Validar que el usuario no tenga más de un club
clubSchema.pre('save', async function(next) {
  if (this.isNew) {
    const existingClub = await mongoose.model('Club').findOne({ userId: this.userId });
    if (existingClub) {
      return next(new Error('El usuario ya tiene un club'));
    }
  }
  next();
});

// Exportar el modelo
module.exports = mongoose.model('Club', clubSchema);