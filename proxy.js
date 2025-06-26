const express = require('express');
const cors = require('cors');
const axios = require('axios');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Usuarios (en producción deberían estar en una base de datos)
const users = [
  {
    id: 1,
    username: process.env.ADMIN_USER,
    passwordHash: bcrypt.hashSync(process.env.ADMIN_PASSWORD, 10),
    role: 'admin'
  },
  {
    id: 2,
    username: process.env.ANALYST_USER,
    passwordHash: bcrypt.hashSync(process.env.ANALYST_PASSWORD, 10),
    role: 'analyst'
  }
];

// Middleware de autenticación
const authenticateJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (authHeader) {
    const token = authHeader.split(' ')[1];
    
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
      if (err) {
        return res.sendStatus(403);
      }
      
      req.user = user;
      next();
    });
  } else {
    res.sendStatus(401);
  }
};

// Ruta de login
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  
  const user = users.find(u => u.username === username);
  if (!user) {
    return res.status(401).json({ error: 'Usuario no encontrado' });
  }
  
  if (!bcrypt.compareSync(password, user.passwordHash)) {
    return res.status(401).json({ error: 'Contraseña incorrecta' });
  }
  
  const token = jwt.sign(
    { userId: user.id, username: user.username, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );
  
  res.json({ token });
});


// Proteger la ruta del proxy con autenticación
app.post('/proxy', authenticateJWT, async (req, res) => {
  try {
    const response = await axios.post('https://api.avalburo.com/services/V8/getWebService', req.body, {
      headers: {
        'Authorization': 'Basic ' + Buffer.from('WS-TAQTICA:&jg4I(iKGA').toString('base64'),
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36'
      }
    });
    res.json(response.data);
  } catch (error) {
    console.error('Error en /proxy:', error.response?.data || error.message);
    res.status(500).json({
      error: error.message,
      details: error.response?.data || null
    });
  }
});

// Ruta protegida de ejemplo
app.get('/protected', authenticateJWT, (req, res) => {
  res.json({ message: `Hola ${req.user.username}, tienes rol ${req.user.role}` });
});

// app.post('/datadiver', authenticateJWT, async (req, res) => {
//   try {
//     const loginRes = await axios.post('https://datadiverservi.com/api/login', {
//       params: {
//         email: 'api@demo.com',
//         password: '123456'
//       }
//     });

//     const tokenDbook = loginRes.data?.token;
//     if (!token) {
//       return res.status(500).json({ error: 'No se pudo obtener el token de DataDiver' });
//     }
//     const queryRes = await axios.get('https://datadiverservi.com/api/busqueda-test', {
//       params: { nombre: req.query.nombre || '1' },
//       headers: {
//         'Authorization': `Bearer ${tokenDbook}`
//       }
//     });

//     res.json(queryRes.data);
//   } catch (error) {
//     console.error('Error en /datadiver:', error.response?.data || error.message);
//     res.status(500).json({
//       error: error.message,
//       details: error.response?.data || null
//     });
//   }
// });

// Conectar a MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('Conectado a MongoDB'))
  .catch(err => console.error('Error al conectar a MongoDB:', err));
  // Esquema y modelo
const AnalisisSchema = new mongoose.Schema({
  cedulaDeudor: String,
  nombreDeudor: String,
  scoreDeudor: Number,
  evaluacionIntegralDeudor: String,
  cedulaConyuge: String,
  nombreConyuge: String,
  scoreConyuge: Number,
  evaluacionIntegralConyuge: String,
  patrimonio: Number,
  ingresos: Number,
  gastos: Number,
  marca: String,
  modelo: String,
  valorVehiculo: Number,
  entrada: Number,
  gtosLegales: Number,
  dispositivo: Number,
  seguroDesgravamen: Number,
  seguroVehicular: Number,
  montoFinanciar: String,
  cuotaMensual: String,
  plazo: Number,
  indicadorEndeudamiento: String,
  decisionFinal: String,
  fecha: Date
});

const Analisis = mongoose.model('Analisis', AnalisisSchema);

// Ruta para guardar análisis
app.post('/guardarAnalisis', async (req, res) => {
  try {
    const nuevoAnalisis = new Analisis(req.body);
    await nuevoAnalisis.save();
    res.json({ mensaje: 'Análisis guardado correctamente' });
  } catch (err) {
    console.error('Error al guardar en MongoDB:', err);
    res.status(500).json({ error: 'Error al guardar análisis en MongoDB' });
  }
});

app.listen(3000, () => console.log('Servidor proxy corriendo en puerto 3000'));