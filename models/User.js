const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Definir el esquema del usuario
const userSchema = new mongoose.Schema({
  // Nombre del usuario: requerido
  name: {
    type: String,
    required: [true, 'El nombre es obligatorio'],
    trim: true,                      // Elimina espacios en blanco al inicio y final
    minlength: [3, 'El nombre debe tener al menos 3 caracteres'],
    maxlength: [50, 'El nombre no puede exceder los 50 caracteres']
  },
  
  // Email del usuario: requerido, único y con formato válido
  email: {
    type: String,
    required: [true, 'El email es obligatorio'],
    unique: true,
    lowercase: true,                // Convertir a minúsculas para evitar duplicados por mayúsculas
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'El email no es válido']  // Regex para validar formato de email
  },
  
  // Contraseña: requerida, será hasheada automáticamente antes de guardar
  password: {
    type: String,
    required: [true, 'La contraseña es obligatoria'],
    minlength: [8, 'La contraseña debe tener al menos 8 caracteres']
  },
  
  // ID de Parsec: requerido y único (identificador de usuario en la plataforma Parsec)
  parsecId: {
    type: String,
    required: [true, 'El ID de Parsec es obligatorio'],
    unique: true,
    trim: true
  },

  // Fecha de creación de la cuenta
  createdAt: {
    type: Date,
    default: Date.now,
    immutable: true                 // No permitir cambios después de la creación
  },

  // Rol del usuario (por ejemplo, 'user' o 'admin')
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
  timestamps: true,  // Añade también campo updatedAt automáticamente
  toJSON: { 
    virtuals: true,
    // Transformar la salida JSON para no devolver la contraseña
    transform: (doc, ret) => { delete ret.password; return ret; }
  },
  toObject: { virtuals: true }
});

// Índices únicos para asegurar unicidad de email y parsecId en la base de datos
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ parsecId: 1 }, { unique: true });

// Hook pre-save para hashear la contraseña antes de guardar el usuario
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();      // Si la contraseña no fue modificada, continuar
  const salt = await bcrypt.genSalt(12);                // Generar salt con factor de costo 12
  this.password = await bcrypt.hash(this.password, salt); // Reemplazar contraseña con su hash
  next();
});

// Método de instancia para comparar contraseñas ingresadas con la almacenada (hasheada)
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Virtual (ejemplo) para obtener nombre completo (a futuro se podría concatenar nombres)
userSchema.virtual('fullName').get(function() {
  return this.name;
});

// Exportar el modelo User basado en el esquema userSchema
module.exports = mongoose.model('User', userSchema);
