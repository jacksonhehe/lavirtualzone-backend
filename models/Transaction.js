const mongoose = require('mongoose');

// Definir el esquema de la transacción
const transactionSchema = new mongoose.Schema({
  // Referencia al usuario que realizó la transacción
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'El ID del usuario es obligatorio'],
    immutable: true  // No modificable una vez creada la transacción
  },
  
  // Referencia al club involucrado en la transacción
  clubId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Club',
    required: [true, 'El ID del club es obligatorio'],
    immutable: true
  },
  
  // Tipo de transacción (compra, venta, prestamo, entrenamiento)
  type: {
    type: String,
    enum: {
      values: ['compra', 'venta', 'prestamo', 'entrenamiento'],
      message: 'Tipo de transacción inválido. Debe ser compra, venta, prestamo o entrenamiento'
    },
    required: [true, 'El tipo de transacción es obligatorio']
  },
  
  // Nombre del jugador involucrado (si aplica a la transacción)
  playerName: {
    type: String,
    trim: true,
    required: function() {
      // Solo es obligatorio si el tipo de transacción involucra a un jugador
      return ['compra', 'venta', 'prestamo', 'entrenamiento'].includes(this.type);
    },
    minlength: [3, 'El nombre del jugador debe tener al menos 3 caracteres'],
    maxlength: [50, 'El nombre del jugador no puede exceder los 50 caracteres']
  },
  
  // Referencia al jugador involucrado (opcional, puede ser null si no aplica)
  playerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player',
    default: null
  },
  
  // Valor (monto) de la transacción
  value: {
    type: Number,
    required: [true, 'El valor de la transacción es obligatorio'],
    min: [0, 'El valor no puede ser negativo']
  },
  
  // Fecha de la transacción
  date: {
    type: Date,
    default: Date.now,
    immutable: true  // La fecha de una transacción no debe cambiarse
  },
  
  // Detalles adicionales (opcional, por ejemplo notas)
  details: {
    type: String,
    trim: true,
    maxlength: [200, 'Los detalles no pueden exceder los 200 caracteres']
  }
}, {
  // Opciones del esquema
  timestamps: true,            // createdAt y updatedAt automáticos
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Índice para optimizar búsquedas frecuentes (buscar transacciones por usuario y club, ordenadas por fecha)
transactionSchema.index({ userId: 1, clubId: 1, date: -1 });

// Virtual: nombre descriptivo del tipo de transacción (por ejemplo, para uso en frontend)
transactionSchema.virtual('typeName').get(function() {
  const types = {
    'compra': 'Compra de jugador',
    'venta': 'Venta de jugador',
    'prestamo': 'Préstamo de jugador',
    'entrenamiento': 'Entrenamiento'
  };
  return types[this.type] || 'Desconocido';
});

// Método estático: registrar fácilmente una nueva transacción 
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

// Exportar el modelo Transaction basado en el esquema transactionSchema
module.exports = mongoose.model('Transaction', transactionSchema);
