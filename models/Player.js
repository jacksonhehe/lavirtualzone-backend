const mongoose = require('mongoose');

// Definir el esquema del jugador
const playerSchema = new mongoose.Schema({
  // Nombre del jugador: único y requerido
  name: {
    type: String,
    required: [true, 'El nombre del jugador es obligatorio'],
    unique: true,
    trim: true,                         // Sin espacios extra
    minlength: [3, 'El nombre debe tener al menos 3 caracteres'],
    maxlength: [50, 'El nombre no puede exceder los 50 caracteres']
  },
  
  // Posición del jugador: debe ser una de las posiciones válidas
  position: {
    type: String,
    enum: {
      values: ['Delantero', 'Mediocampista', 'Defensor', 'Portero'],
      message: 'Posición inválida. Debe ser: Delantero, Mediocampista, Defensor o Portero'
    },
    required: [true, 'La posición del jugador es obligatoria']
  },
  
  // Rating del jugador: entre 0 y 99 (nivel de habilidad)
  rating: {
    type: Number,
    min: [0, 'El rating no puede ser menor a 0'],
    max: [99, 'El rating no puede ser mayor a 99'],
    required: [true, 'El rating es obligatorio']
  },
  
  // Valor de mercado del jugador
  value: {
    type: Number,
    min: [0, 'El valor del jugador no puede ser negativo'],
    required: [true, 'El valor es obligatorio']
  },
  
  // Fecha de creación del registro del jugador
  createdAt: {
    type: Date,
    default: Date.now,
    immutable: true  // No modificable después de crear
  },
  
  // Club al que pertenece el jugador (opcional)
  clubId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Club',
    default: null    // Si es null, significa que el jugador no tiene club asignado actualmente
  }
}, {
  // Opciones del esquema
  timestamps: true,            // Añade campo updatedAt automáticamente
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Índice único para el nombre del jugador (evita jugadores duplicados por nombre)
playerSchema.index({ name: 1 }, { unique: true });

// Virtual: calcular un costo de entrenamiento estimado (por ejemplo, 10% de su valor)
playerSchema.virtual('trainingCost').get(function() {
  return Math.round(this.value * 0.1);
});

// Método de instancia: actualizar el rating del jugador con validación de rango
playerSchema.methods.updateRating = function(newRating) {
  if (newRating < 0 || newRating > 99) {
    throw new Error('El rating debe estar entre 0 y 99');
  }
  this.rating = newRating;
  return this.save();
};

// Exportar el modelo Player basado en el esquema playerSchema
module.exports = mongoose.model('Player', playerSchema);
