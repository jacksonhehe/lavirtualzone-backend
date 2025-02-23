const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = express();

// Middleware para parsear JSON
app.use(express.json());

// Configuración de variables de entorno
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://jackson:lolitopro123@cluster0.6gaqc.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const JWT_SECRET = process.env.JWT_SECRET || '2330';

// Conexión a MongoDB
mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Conectado a MongoDB'))
  .catch(err => console.error('Error de conexión:', err));

// Modelo de Usuario (ajusta según tu esquema)
const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  parsecId: String
});
const User = mongoose.model('User', userSchema);

// Ruta de Registro
app.post('/api/auth/register', async (req, res) => {
  console.log('Solicitud recibida en /api/auth/register:', req.body);
  const { name, email, password, parsecId } = req.body;

  try {
    // Verifica si el usuario ya existe
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log('Usuario ya existe:', email);
      return res.status(400).json({ message: 'El usuario ya existe' });
    }

    // Hashea la contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // Crea el usuario
    const user = new User({
      name,
      email,
      password: hashedPassword,
      parsecId
    });
    await user.save();

    // Genera el token JWT
    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '1h' });

    console.log('Usuario registrado exitosamente:', email);
    res.status(201).json({ token });
  } catch (error) {
    console.error('Error en /api/auth/register:', error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
});

// Ruta de Login
app.post('/api/auth/login', async (req, res) => {
  console.log('Solicitud recibida en /api/auth/login:', req.body);
  const { email, password } = req.body;

  try {
    // Busca el usuario
    const user = await User.findOne({ email });
    if (!user) {
      console.log('Usuario no encontrado:', email);
      return res.status(400).json({ message: 'Credenciales inválidas' });
    }

    // Verifica la contraseña
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log('Contraseña incorrecta para:', email);
      return res.status(400).json({ message: 'Credenciales inválidas' });
    }

    // Genera el token JWT
    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '1h' });

    console.log('Login exitoso para:', email);
    res.json({ token });
  } catch (error) {
    console.error('Error en /api/auth/login:', error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
});

// Inicia el servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});

app.get('/', (req, res) => {
  console.log('Solicitud recibida en /');
  res.status(200).send('Backend activo');
});

// Antes de las rutas
app.use((req, res, next) => {
  console.log(`Solicitud recibida: ${req.method} ${req.url}`);
  next();
});