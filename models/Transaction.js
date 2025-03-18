const mongoose = require('mongoose');

// Definir el esquema de la transacción
const transactionSchema = new mongoose.Schema({
  // ID del usuario que realizó la transacción
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'El ID del usuario es obligatorio'],
    immutable: true // No permitir cambios después de la creación
  },
  
  // ID del club involucrado en la transacción
  clubId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Club',
    required: [true, 'El ID del club es obligatorio'],
    immutable: true
  },
  
  // Tipo de transacción: compra, venta, prestamo, entrenamiento, bonificación
  type: {
    type: String,
    enum: {
      values: ['compra', 'venta', 'prestamo', 'entrenamiento', 'bonificación'],
      message: 'Tipo de transacción inválido. Debe ser: compra, venta, prestamo, entrenamiento o bonificación'
    },
    required: [true, 'El tipo de transacción es obligatorio']
  },
  
  // Nombre del jugador involucrado (si aplica)
  playerName: {
    type: String,
    trim: true,
    required: function() {
      return ['compra', 'venta', 'prestamo', 'entrenamiento'].includes(this.type);
    },
    minlength: [3, 'El nombre del jugador debe tener al menos 3 caracteres'],
    maxlength: [50, 'El nombre del jugador no puede exceder los 50 caracteres']
  },
  
  // ID del jugador involucrado (opcional, para referencia directa)
  playerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player',
    default: null
  },
  
  // Valor de la transacción (monto)
  value: {
    type: Number,
    required: [true, 'El valor de la transacción es obligatorio'],
    min: [0, 'El valor no puede ser negativo']
  },
  
  // Fecha de la transacción
  date: {
    type: Date,
    default: Date.now,
    immutable: true // No permitir cambios después de la creación
  },
  
  // Detalles adicionales (opcional, para notas o descripciones)
  details: {
    type: String,
    trim: true,
    maxlength: [200, 'Los detalles no pueden exceder los 200 caracteres']
  }
}, {
  // Opciones del esquema
  timestamps: true, // Añade createdAt y updatedAt automáticamente
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Índice para optimizar búsquedas por usuario y club
transactionSchema.index({ userId: 1, clubId: 1, date: -1 });

// Virtual para obtener el nombre del tipo de transacción en español
transactionSchema.virtual('typeName').get(function() {
  const typeNames = {
    'compra': 'Compra de jugador',
    'venta': 'Venta de jugador',
    'prestamo': 'Préstamo de jugador',
    'entrenamiento': 'Entrenamiento',
    'bonificación': 'Bonificación'
  };
  return typeNames[this.type] || 'Desconocido';
});

// Método estático para registrar una transacción fácilmente
transactionSchema.statics.recordTransaction = async function(userId, clubId, type, playerName, value, playerId = null, details = '') {
  const transaction = new this({
    userId,
    clubId,
    type,
    playerName,
    playerId,
    value,
    details
  });
  return transaction.save();
};

// Exportar el modelo
module.exports = mongoose.model('Transaction', transactionSchema);