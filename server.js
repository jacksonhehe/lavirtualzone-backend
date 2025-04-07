const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { expressjwt: expressJwt } = require('express-jwt');
const bcrypt = require('bcryptjs'); // Añadido para hashear contraseñas
const fs = require('fs').promises;
const path = require('path');

const app = express();

// Middleware para parsear JSON
app.use(express.json());

// Configuración de CORS
app.use(cors({
    origin: process.env.FRONTEND_URL || ['http://127.0.0.1:8080', 'http://localhost:8080'], // Dominio del frontend en producción
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'x-auth-token']
}));

// Conectar a MongoDB usando variable de entorno
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost/lavirtualzone', {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log('Conectado a MongoDB');
}).catch(err => {
    console.error('Error al conectar a MongoDB:', err);
});

// Esquemas de Mongoose
const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    parsecId: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

// Hashear contraseña antes de guardar
userSchema.pre('save', async function(next) {
    if (this.isModified('password')) {
        this.password = await bcrypt.hash(this.password, 10);
    }
    next();
});

const User = mongoose.model('User', userSchema);

const clubSchema = new mongoose.Schema({
    name: { type: String, default: '[Sin registrar]' },
    budget: { type: Number, default: 100000000 },
    players: [{
        _id: String,
        name: String,
        rating: { type: Number, default: 50 },
        value: { type: Number, default: 1000000 }
    }],
    color: { type: String, default: '#00ffff' },
    wins: { type: Number, default: 0 },
    watchlist: [{
        _id: String,
        name: String,
        value: Number
    }],
    gamesPlayed: { type: Number, default: 0 },
    transactions: [{
        type: String,
        playerName: String,
        value: Number,
        date: { type: Date, default: Date.now }
    }],
    seasonWins: { type: Number, default: 0 },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
});

const Club = mongoose.model('Club', clubSchema);

// Middleware de autenticación JWT
const jwtSecret = process.env.JWT_SECRET || 'tu-secreto-jwt'; // Usa variable de entorno en producción
const auth = expressJwt({
    secret: jwtSecret,
    algorithms: ['HS256'],
    getToken: req => req.headers['x-auth-token']
});

// Rutas API
// 1. Registrar un usuario (POST /api/register)
app.post('/api/register', async (req, res) => {
    try {
        const { name, email, password, parsecId } = req.body;

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'El email ya está registrado' });
        }

        const newUser = new User({ name, email, password, parsecId });
        await newUser.save();

        const newClub = new Club({ name: '[Sin registrar]', userId: newUser._id });
        await newClub.save();

        const token = jwt.sign({ id: newUser._id }, jwtSecret, { expiresIn: '1h' });
        res.json({ token, user: { name: newUser.name, email: newUser.email, parsecId: newUser.parsecId } });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// 2. Iniciar sesión (POST /api/login)
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ message: 'Credenciales inválidas' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Credenciales inválidas' });
        }

        const token = jwt.sign({ id: user._id }, jwtSecret, { expiresIn: '1h' });
        res.json({ token, user: { name: user.name, email: user.email, parsecId: user.parsecId } });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// 3. Obtener datos del club (GET /api/club/me)
app.get('/api/club/me', auth, async (req, res) => {
    try {
        const club = await Club.findOne({ userId: req.user.id });
        if (!club) return res.status(404).json({ message: 'Club no encontrado' });
        res.json(club);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// 4. Actualizar nombre y color del club (PUT /api/club/me)
app.put('/api/club/me', auth, async (req, res) => {
    try {
        const { name, color } = req.body;
        const club = await Club.findOneAndUpdate(
            { userId: req.user.id },
            { name, color },
            { new: true, runValidators: true }
        );
        if (!club) return res.status(404).json({ message: 'Club no encontrado' });
        res.json(club);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// 5. Entrenar un jugador (POST /api/club/me/train)
app.post('/api/club/me/train', auth, async (req, res) => {
    try {
        const { playerId, cost } = req.body;
        const club = await Club.findOne({ userId: req.user.id });
        if (!club) return res.status(404).json({ message: 'Club no encontrado' });

        if (club.budget < cost) {
            return res.status(400).json({ message: 'No tienes suficiente presupuesto' });
        }

        const playerIndex = club.players.findIndex(p => p._id === playerId);
        if (playerIndex === -1) {
            return res.status(404).json({ message: 'Jugador no encontrado' });
        }

        club.budget -= cost;
        club.players[playerIndex].rating = Math.min(club.players[playerIndex].rating + 1, 99);
        club.players[playerIndex].value += cost;
        club.transactions.push({
            type: 'Entrenamiento',
            playerName: club.players[playerIndex].name,
            value: cost,
            date: new Date()
        });

        await club.save();
        res.json(club);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// 6. Reiniciar el club (POST /api/club/me/reset)
app.post('/api/club/me/reset', auth, async (req, res) => {
    try {
        const club = await Club.findOneAndUpdate(
            { userId: req.user.id },
            {
                name: '[Sin registrar]',
                budget: 100000000,
                players: [],
                color: '#00ffff',
                wins: 0,
                watchlist: [],
                gamesPlayed: 0,
                transactions: [],
                seasonWins: 0
            },
            { new: true, runValidators: true }
        );
        if (!club) return res.status(404).json({ message: 'Club no encontrado' });
        res.json(club);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// 7. Simular un partido (POST /api/club/me/simulate)
app.post('/api/club/me/simulate', auth, async (req, res) => {
    try {
        const { win } = req.body;
        const club = await Club.findOne({ userId: req.user.id });
        if (!club) return res.status(404).json({ message: 'Club no encontrado' });

        if (club.players.length === 0) {
            return res.status(400).json({ message: 'No tienes jugadores en tu club' });
        }

        club.gamesPlayed += 1;
        if (win) {
            club.wins += 1;
            club.seasonWins += 1;
        }

        await club.save();
        res.json(club);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// 8. Obtener la clasificación (GET /api/leaderboard)
app.get('/api/leaderboard', auth, async (req, res) => {
    try {
        const clubs = await Club.find().sort({ wins: -1, gamesPlayed: 1 }).limit(10);
        const leaderboard = clubs.map(club => ({
            clubName: club.name,
            wins: club.wins,
            avgRating: club.players.length ? (club.players.reduce((sum, p) => sum + p.rating, 0) / club.players.length).toFixed(1) : 0
        }));
        res.json(leaderboard);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// 9. Verificar si el club es el mejor equipo (GET /api/best-team)
app.get('/api/best-team', auth, async (req, res) => {
    try {
        const club = await Club.findOne({ userId: req.user.id });
        if (!club) return res.status(404).json({ message: 'Club no encontrado' });

        const allClubs = await Club.find();
        const bestTeam = allClubs.reduce((best, current) => {
            const bestAvg = best.players.length ? best.players.reduce((sum, p) => sum + p.rating, 0) / best.players.length : 0;
            const currentAvg = current.players.length ? current.players.reduce((sum, p) => sum + p.rating, 0) / current.players.length : 0;
            return bestAvg > currentAvg ? best : current;
        }, club);

        const isBestTeam = bestTeam._id.toString() === club._id.toString();
        res.json({ isBestTeam });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// 10. Ruta para el mercado de fichajes (GET /api/market)
app.get('/api/market', auth, async (req, res) => {
    try {
        const players = [
            { _id: 'player1', name: 'CyberStriker', rating: 75, value: 5000000 },
            { _id: 'player2', name: 'PixelBlaster', rating: 80, value: 7500000 },
            { _id: 'player3', name: 'ByteRunner', rating: 70, value: 4000000 }
        ];
        res.json(players);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Procesar register.json al iniciar el servidor (solo en desarrollo)
async function processRegisterJson() {
    if (process.env.NODE_ENV === 'production') return; // No ejecutar en producción

    const registerJsonPath = path.join(__dirname, 'register.json');
    try {
        const data = await fs.readFile(registerJsonPath, 'utf8');
        const userData = JSON.parse(data);

        const existingUser = await User.findOne({ email: userData.email });
        if (!existingUser) {
            const newUser = new User({
                name: userData.name,
                email: userData.email,
                password: userData.password,
                parsecId: userData.parsecId
            });
            await newUser.save();

            const newClub = new Club({ name: '[Sin registrar]', userId: newUser._id });
            await newClub.save();

            console.log('Usuario registrado desde register.json:', userData.name);
        } else {
            console.log('El usuario ya está registrado:', userData.email);
        }
    } catch (err) {
        console.error('Error al procesar register.json:', err);
    }
}

// Llamar a processRegisterJson al iniciar el servidor
processRegisterJson();

// Puerto del servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
});