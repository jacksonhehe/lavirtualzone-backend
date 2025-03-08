const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { expressjwt: expressJwt } = require('express-jwt');
const bcrypt = require('bcryptjs');
const fs = require('fs').promises;
const path = require('path');

const app = express();

// Middleware para parsear JSON
app.use(express.json());

// Configuración de CORS
app.use(cors({
    origin: ['http://127.0.0.1:8080', 'http://localhost:8080', 'https://lavirtualzone-backend.onrender.com'],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'x-auth-token']
}));

// Conectar a MongoDB
mongoose.connect(process.env.MONGO_URI, {
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

const User = mongoose.model('User', userSchema);

const clubSchema = new mongoose.Schema({
    name: { type: String, default: '[Sin registrar]' },
    budget: { type: Number, default: 100000000 },
    players: [{
        _id: { type: String, required: true },
        name: { type: String, required: true },
        rating: { type: Number, default: 50 },
        value: { type: Number, default: 1000000 }
    }],
    color: { type: String, default: '#00ffff' },
    wins: { type: Number, default: 0 },
    watchlist: [{}],
    gamesPlayed: { type: Number, default: 0 },
    transactions: [{
        type: { type: String },
        playerName: { type: String },
        value: { type: Number },
        date: { type: Date }
    }],
    seasonWins: { type: Number, default: 0 },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
});

const Club = mongoose.model('Club', clubSchema);

// Middleware de autenticación JWT
const auth = expressJwt({
    secret: process.env.JWT_SECRET,
    algorithms: ['HS256'],
    getToken: req => req.headers['x-auth-token']
});

// Ruta raíz
app.get('/', (req, res) => {
    res.send('¡Bienvenido a La Virtual Zone! Este es el backend.');
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

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = new User({ name, email, password: hashedPassword, parsecId });
        await newUser.save();

        const newClub = new Club({ name: '[Sin registrar]', userId: newUser._id });
        await newClub.save();

        const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
        res.json({ token, user: { name: newUser.name, email: newUser.email, parsecId: newUser.parsecId } });
    } catch (err) {
        console.error('Error en /api/register:', err);
        res.status(500).json({ message: 'Error al registrar usuario' });
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

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
        res.json({ token, user: { name: user.name, email: user.email, parsecId: user.parsecId } });
    } catch (err) {
        console.error('Error en /api/login:', err);
        res.status(500).json({ message: 'Error al iniciar sesión' });
    }
});

// 3. Obtener datos del club (GET /api/club/me)
app.get('/api/club/me', auth, async (req, res) => {
    try {
        const club = await Club.findOne({ userId: req.user.id });
        if (!club) {
            return res.status(404).json({ message: 'Club no encontrado' });
        }
        res.json(club);
    } catch (err) {
        console.error('Error en /api/club/me:', err);
        res.status(500).json({ message: 'Error al obtener datos del club' });
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
        console.error('Error en /api/club/me:', err);
        res.status(500).json({ message: 'Error al actualizar el club' });
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
        console.error('Error en /api/club/me/train:', err);
        res.status(500).json({ message: 'Error al entrenar jugador' });
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
        console.error('Error en /api/club/me/reset:', err);
        res.status(500).json({ message: 'Error al reiniciar el club' });
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
        console.error('Error en /api/club/me/simulate:', err);
        res.status(500).json({ message: 'Error al simular partido' });
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
        console.error('Error en /api/leaderboard:', err);
        res.status(500).json({ message: 'Error al obtener la clasificación' });
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
        console.error('Error en /api/best-team:', err);
        res.status(500).json({ message: 'Error al verificar el mejor equipo' });
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
        console.error('Error en /api/market:', err);
        res.status(500).json({ message: 'Error al obtener jugadores del mercado' });
    }
});

// Procesar register.json al iniciar el servidor
async function processRegisterJson() {
    const registerJsonPath = path.join(__dirname, 'register.json');
    try {
        const data = await fs.readFile(registerJsonPath, 'utf8');
        const userData = JSON.parse(data);

        const existingUser = await User.findOne({ email: userData.email });
        if (!existingUser) {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(userData.password, salt);
            const newUser = new User({
                name: userData.name,
                email: userData.email,
                password: hashedPassword,
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

processRegisterJson();

// Puerto del servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
});