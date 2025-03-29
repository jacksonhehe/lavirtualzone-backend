const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'El ID del usuario es obligatorio'],
    immutable: true
  },
  clubId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Club',
    required: [true, 'El ID del club es obligatorio'],
    immutable: true
  },
  type: {
    type: String,
    enum: {
      values: ['compra', 'venta', 'prestamo', 'entrenamiento'],
      message: 'Tipo de transacción inválido. Debe ser compra, venta, prestamo o entrenamiento'
    },
    required: [true, 'El tipo de transacción es obligatorio']
  },
  playerName: {
    type: String,
    trim: true,
    required: function() {
      return ['compra', 'venta', 'prestamo', 'entrenamiento'].includes(this.type);
    },
    minlength: [3, 'El nombre del jugador debe tener al menos 3 caracteres'],
    maxlength: [50, 'El nombre del jugador no puede exceder los 50 caracteres']
  },
  playerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player',
    default: null
  },
  value: {
    type: Number,
    required: [true, 'El valor de la transacción es obligatorio'],
    min: [0, 'El valor no puede ser negativo']
  },
  date: {
    type: Date,
    default: Date.now,
    immutable: true
  },
  details: {
    type: String,
    trim: true,
    maxlength: [200, 'Los detalles no pueden exceder los 200 caracteres']
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Índice para búsquedas frecuentes
transactionSchema.index({ userId: 1, clubId: 1, date: -1 });

// Virtual para nombre descriptivo del tipo de transacción
transactionSchema.virtual('typeName').get(function() {
  const types = {
    'compra': 'Compra de jugador',
    'venta': 'Venta de jugador',
    'prestamo': 'Préstamo de jugador',
    'entrenamiento': 'Entrenamiento'
  };
  return types[this.type] || 'Desconocido';
});

// Método estático para registrar una transacción
transactionSchema.statics.recordTransaction = async function(userId, clubId, type, playerName, value, playerId = null, details = '') {
  const transaction = new this({ userId, clubId, type, playerName, playerId, value, details });
  return transaction.save();
};

module.exports = mongoose.model('Transaction', transactionSchema);
