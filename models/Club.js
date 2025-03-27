const mongoose = require('mongoose');

// Definir el esquema del club
const clubSchema = new mongoose.Schema({
  // Nombre del club: único y requerido
  name: {
    type: String,
    required: [true, 'El nombre del club es obligatorio'],
    unique: true,
    trim: true,                         // Sin espacios al inicio/final
    minlength: [3, 'El nombre debe tener al menos 3 caracteres'],
    maxlength: [50, 'El nombre no puede exceder los 50 caracteres']
  },
  
  // Referencia al usuario propietario del club
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'El ID del usuario es obligatorio'],
    immutable: true                     // No cambiar una vez creado el club
  },
  
  // Presupuesto del club
  budget: {
    type: Number,
    default: 100000000,                 // 100 millones por defecto
    min: [0, 'El presupuesto no puede ser negativo']
  },
  
  // Lista de jugadores (referencias a Player) que pertenecen al club
  players: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player'
  }],
  
  // Victorias totales del club
  wins: {
    type: Number,
    default: 0,
    min: [0, 'Las victorias no pueden ser negativas']
  },
  
  // Lista de observación (watchlist) de jugadores (ej. jugadores que el club sigue)
  watchlist: [{
    _id: { type: mongoose.Schema.Types.ObjectId, ref: 'Player' },
    name: String,
    value: Number
  }],
  
  // Partidos jugados por el club
  gamesPlayed: {
    type: Number,
    default: 0,
    min: [0, 'Los partidos jugados no pueden ser negativos']
  },
  
  // Transacciones del club (resumen interno: tipo, nombre de jugador, valor, fecha)
  transactions: [{
    type: { 
      type: String, 
      enum: ['compra', 'venta', 'prestamo', 'entrenamiento'], // tipos válidos de transacción
      required: true 
    },
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
  
  // Color representativo del club (código hexadecimal)
  color: {
    type: String,
    default: '#00ffff',                 // Color por defecto
    match: [/^#([0-9A-Fa-f]{3}){1,2}$/, 'El color debe ser un código hexadecimal válido']
  }
}, {
  // Opciones del esquema
  timestamps: true,    // createdAt y updatedAt automáticos
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Índice único para el nombre del club (asegura nombres distintos)
clubSchema.index({ name: 1 }, { unique: true });

// Virtual: calcula el valor total de todos los jugadores del club
clubSchema.virtual('totalPlayerValue').get(function() {
  // Suma los valores de los jugadores (asumiendo que los documentos de jugador están poblados)
  return this.players.reduce((total, player) => total + (player.value || 0), 0);
});

// Método de instancia: añadir una transacción al resumen interno del club
clubSchema.methods.addTransaction = function(type, playerName, value) {
  this.transactions.push({ type, playerName, value });
  return this.save();
};

// Hook pre-save: verificar que un usuario no cree más de un club
clubSchema.pre('save', async function(next) {
  if (this.isNew) {  // Solo en creación, no en actualizaciones
    const existingClub = await mongoose.model('Club').findOne({ userId: this.userId });
    if (existingClub) {
      return next(new Error('El usuario ya tiene un club'));  // Evita duplicados
    }
  }
  next();
});

// Exportar el modelo Club basado en el esquema clubSchema
module.exports = mongoose.model('Club', clubSchema);
