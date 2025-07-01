const express = require('express');
const cors = require('cors');
const axios = require('axios');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const enviarCorreoGraph = require('./enviarCorreoGraph');
require('dotenv').config();

const app = express();
const corsOptions = {
  origin: 'https://tactiqaec.com',  
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};
app.use(cors(corsOptions));
app.use(express.json());

// Usuarios
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

// Middleware JWT
const authenticateJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (authHeader) {
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
      if (err) return res.sendStatus(403);
      req.user = user;
      next();
    });
  } else {
    res.sendStatus(401);
  }
};

// Login
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const user = users.find(u => u.username === username);
  if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
    return res.status(401).json({ error: 'Credenciales inválidas' });
  }

  const token = jwt.sign(
    { userId: user.id, username: user.username, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );
  res.json({ token });
});

// Proxy autenticado
app.post('/proxy', authenticateJWT, async (req, res) => {
  try {
    const response = await axios.post('https://api-test.avalburo.com/services/V8/getWebService', req.body, {
      headers: {
        'Authorization': 'Basic ' + Buffer.from('WSTEST-TAQTICA:1Ex#YXTbaK').toString('base64'),
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0'
      }
    });
    res.json(response.data);
  } catch (error) {
    console.error('Error en /proxy:', error.response?.data || error.message);
    res.status(500).json({ error: error.message });
  }
});

// MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('Conectado a MongoDB'))
  .catch(err => console.error('Error al conectar a MongoDB:', err));

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

// Enviar correo con Graph
app.post('/enviarCorreo', async (req, res) => {
  const { pdfBase64, nombreArchivo, destinatarios } = req.body;
  try {
    await enviarCorreoGraph(destinatarios, pdfBase64, nombreArchivo);
    res.json({ mensaje: 'Correo enviado con Microsoft Graph' });
  } catch (err) {
    console.error('Error al enviar correo:', err);
    res.status(500).json({ error: 'Error al enviar con Graph' });
  }
});

app.listen(3000, 'localhost', () => {
  console.log("Servidor escuchando en localhost:3000");
});