const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const cors = require('cors'); // Añadido para soportar CORS

const app = express();

// Habilitar CORS para permitir solicitudes desde cualquier origen (puedes restringirlo a dominios específicos si lo prefieres)
app.use(cors());

// Middleware para parsear JSON
app.use(express.json());

// Configuración de variables de entorno
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://jackson:lolitopro123@cluster0.6gaqc.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const JWT_SECRET = process.env.JWT_SECRET || '2330';

// Middleware para registrar todas las solicitudes
app.use((req, res, next) => {
  console.log(`Solicitud recibida: ${req.method} ${req.url} a las ${new Date().toISOString()}`);
  next();
});

// Conexión a MongoDB
mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Conectado a MongoDB'))
  .catch(err => console.error('Error de conexión a MongoDB:', err));

// Modelo de Usuario
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

// Ruta Raíz para Depuración
app.get('/', (req, res) => {
  console.log('Solicitud recibida en /');
  res.status(200).send('Backend activo');
});

// Endpoint para mantener el backend activo (opcional, útil para Render gratuito)
app.get('/ping', (req, res) => {
  console.log('Ping recibido a las', new Date().toISOString());
  res.status(200).send('OK');
});

// Inicia el servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT} a las ${new Date().toISOString()}`);
});

const clubSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: String,
  budget: Number,
  players: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Player' }],
  color: String,
  wins: Number
});
const Club = mongoose.model('Club', clubSchema);

const playerSchema = new mongoose.Schema({
  name: String,
  value: Number,
  position: String,
  rating: Number
});
const Player = mongoose.model('Player', playerSchema);

const transactionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: String, // 'compra', 'venta', 'prestamo'
  playerName: String,
  value: Number,
  date: { type: Date, default: Date.now }
});
const Transaction = mongoose.model('Transaction', transactionSchema);

// Crear un club
app.post('/api/club/create', async (req, res) => {
  try {
    const { userId, name, color } = req.body;
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'No autorizado' });

    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.id !== userId) return res.status(403).json({ message: 'Acceso denegado' });

    const existingClub = await Club.findOne({ userId });
    if (existingClub) return res.status(400).json({ message: 'Ya tienes un club registrado' });

    const club = new Club({ userId, name, budget: 100000000, players: [], color, wins: 0 });
    await club.save();

    res.status(201).json({ message: 'Club creado exitosamente', club });
  } catch (error) {
    console.error('Error en /api/club/create:', error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
});

// Obtener datos del club
app.get('/api/club/:userId', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'No autorizado' });

    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.id !== req.params.userId) return res.status(403).json({ message: 'Acceso denegado' });

    const club = await Club.findOne({ userId: req.params.userId }).populate('players');
    if (!club) return res.status(404).json({ message: 'Club no encontrado' });

    res.json({ success: true, club });
  } catch (error) {
    console.error('Error en /api/club/:userId:', error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
});

// Registrar una transacción
app.post('/api/transaction', async (req, res) => {
  try {
    const { userId, type, playerName, value } = req.body;
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'No autorizado' });

    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.id !== userId) return res.status(403).json({ message: 'Acceso denegado' });

    const transaction = new Transaction({ userId, type, playerName, value });
    await transaction.save();

    // Actualizar presupuesto del club
    const club = await Club.findOne({ userId });
    if (type === 'compra') club.budget -= value;
    else if (type === 'venta') club.budget += value;
    else if (type === 'prestamo') club.budget -= value;
    await club.save();

    res.status(201).json({ message: 'Transacción registrada exitosamente', transaction });
  } catch (error) {
    console.error('Error en /api/transaction:', error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
});

// Contar clubes para estadísticas
app.get('/api/club/count', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'No autorizado' });

    jwt.verify(token, JWT_SECRET); // Solo verifica el token, no necesita userId específico para estadísticas públicas
    const count = await Club.countDocuments();
    res.json({ success: true, count });
  } catch (error) {
    console.error('Error en /api/club/count:', error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
});