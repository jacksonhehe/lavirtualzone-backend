const mongoose = require('mongoose');

// Definir el esquema del jugador
const playerSchema = new mongoose.Schema({
  // Nombre del jugador: debe ser único y requerido
  name: {
    type: String,
    required: [true, 'El nombre del jugador es obligatorio'],
    unique: true,
    trim: true, // Elimina espacios en blanco al inicio y final
    minlength: [3, 'El nombre debe tener al menos 3 caracteres'],
    maxlength: [50, 'El nombre no puede exceder los 50 caracteres']
  },
  
  // Posición del jugador: restringida a valores específicos
  position: {
    type: String,
    enum: {
      values: ['Delantero', 'Mediocampista', 'Defensor', 'Portero'],
      message: 'Posición inválida. Debe ser: Delantero, Mediocampista, Defensor o Portero'
    },
    required: [true, 'La posición del jugador es obligatoria']
  },
  
  // Rating del jugador: entre 0 y 99
  rating: {
    type: Number,
    min: [0, 'El rating no puede ser menor a 0'],
    max: [99, 'El rating no puede ser mayor a 99'],
    required: [true, 'El rating es obligatorio']
  },
  
  // Valor del jugador: debe ser positivo
  value: {
    type: Number,
    min: [0, 'El valor del jugador no puede ser negativo'],
    required: [true, 'El valor es obligatorio']
  },
  
  // Fecha de creación
  createdAt: {
    type: Date,
    default: Date.now,
    immutable: true // No permitir cambios después de la creación
  },
  
  // Club al que pertenece el jugador (opcional, para referencia)
  clubId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Club',
    default: null
  }
}, {
  // Opciones del esquema
  timestamps: true, // Añade updatedAt automáticamente
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Índice único para el nombre del jugador
playerSchema.index({ name: 1 }, { unique: true });

// Virtual para calcular el costo de entrenamiento (ejemplo)
playerSchema.virtual('trainingCost').get(function() {
  // 10% del valor del jugador
  return Math.round(this.value * 0.1);
});

// Método para actualizar el rating del jugador
playerSchema.methods.updateRating = function(newRating) {
  if (newRating < 0 || newRating > 99) {
    throw new Error('El rating debe estar entre 0 y 99');
  }
  this.rating = newRating;
  return this.save();
};

// Exportar el modelo
module.exports = mongoose.model('Player', playerSchema);
