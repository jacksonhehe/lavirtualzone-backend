const mongoose = require('mongoose');

const playerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'El nombre del jugador es obligatorio'],
    unique: true,
    trim: true,
    minlength: [3, 'El nombre del jugador debe tener al menos 3 caracteres'],
    maxlength: [50, 'El nombre del jugador no puede exceder los 50 caracteres']
  },
  position: {
    type: String,
    enum: {
      values: ['Delantero', 'Mediocampista', 'Defensor', 'Portero'],
      message: 'Posición inválida. Debe ser: Delantero, Mediocampista, Defensor o Portero'
    },
    required: [true, 'La posición del jugador es obligatoria']
  },
  rating: {
    type: Number,
    min: [0, 'El rating no puede ser menor a 0'],
    max: [99, 'El rating no puede ser mayor a 99'],
    required: [true, 'El rating es obligatorio']
  },
  value: {
    type: Number,
    min: [0, 'El valor del jugador no puede ser negativo'],
    required: [true, 'El valor es obligatorio']
  },
  createdAt: {
    type: Date,
    default: Date.now,
    immutable: true
  },
  clubId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Club',
    default: null
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Índice único para el nombre del jugador
playerSchema.index({ name: 1 }, { unique: true });

// Virtual para calcular el costo de entrenamiento (10% del valor)
playerSchema.virtual('trainingCost').get(function() {
  return Math.round(this.value * 0.1);
});

// Método para actualizar el rating del jugador validando el rango
playerSchema.methods.updateRating = function(newRating) {
  if (newRating < 0 || newRating > 99) {
    throw new Error('El rating debe estar entre 0 y 99');
  }
  this.rating = newRating;
  return this.save();
};

module.exports = mongoose.model('Player', playerSchema);
