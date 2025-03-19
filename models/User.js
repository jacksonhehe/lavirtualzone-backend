const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Definir el esquema del usuario
const userSchema = new mongoose.Schema({
  // Nombre del usuario: requerido
  name: {
    type: String,
    required: [true, 'El nombre es obligatorio'],
    trim: true, // Elimina espacios en blanco al inicio y final
    minlength: [3, 'El nombre debe tener al menos 3 caracteres'],
    maxlength: [50, 'El nombre no puede exceder los 50 caracteres']
  },
  
  // Email del usuario: requerido, único y validado
  email: {
    type: String,
    required: [true, 'El email es obligatorio'],
    unique: true,
    lowercase: true, // Convertir a minúsculas
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'El email no es válido']
  },
  
  // Contraseña: requerida, hasheada automáticamente
  password: {
    type: String,
    required: [true, 'La contraseña es obligatoria'],
    minlength: [8, 'La contraseña debe tener al menos 8 caracteres']
  },
  
  // ID de Parsec: requerido y único
  parsecId: {
    type: String,
    required: [true, 'El ID de Parsec es obligatorio'],
    unique: true,
    trim: true
  },
  
  // Fecha de creación
  createdAt: {
    type: Date,
    default: Date.now,
    immutable: true // No permitir cambios después de la creación
  },
  
  // Rol del usuario (por ejemplo, 'user', 'admin')
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  
  // Estado de la cuenta (activa, suspendida, etc.)
  status: {
    type: String,
    enum: ['active', 'suspended', 'banned'],
    default: 'active'
  }
}, {
  // Opciones del esquema
  timestamps: true, // Añade updatedAt automáticamente
  toJSON: { virtuals: true, transform: (doc, ret) => { delete ret.password; return ret; } },
  toObject: { virtuals: true }
});

// Índice único para email y parsecId
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ parsecId: 1 }, { unique: true });

// Hook para hashear la contraseña antes de guardarla
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12); // Más rondas para mayor seguridad
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Método para comparar contraseñas
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Virtual para obtener el nombre completo (si añades campos como firstName y lastName en el futuro)
userSchema.virtual('fullName').get(function() {
  return this.name; // Podrías expandirlo si divides el nombre
});

// Exportar el modelo
module.exports = mongoose.model('User', userSchema);