import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { sequelize } from "./models/index.js";
import createDatabaseIfNotExists from './init-db.js';
import { seedPilots } from "./seed.js";

// Importar rutas
import authRoutes from "./routes/auth.js";
import pilotRoutes from "./routes/pilots.js";
import predictionRoutes from "./routes/predictions.js";
import dashboardRoutes from "./routes/dashboard.js";
import leagueRoutes from "./routes/leagues.js";
import raceRoutes from "./routes/races.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://apexleague.online', 'https://www.apexleague.online']
    : 'http://localhost:9000', // Puerto de Quasar en dev
  credentials: true
}));
app.use(express.json());

// Health check
app.get("/api/ping", (req, res) => {
  res.json({ message: "pong", timestamp: new Date().toISOString() });
});

// Rutas de la API
app.use("/api/auth", authRoutes);
app.use("/api/pilots", pilotRoutes);
app.use("/api/predictions", predictionRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/leagues", leagueRoutes);
app.use("/api/races", raceRoutes);

// Manejo de rutas no encontradas
app.use((req, res) => {
  res.status(404).json({ message: "Ruta no encontrada" });
});

// Manejo global de errores
app.use((err, req, res, next) => {
  console.error("Error no manejado:", err);
  res.status(500).json({ 
    message: "Error interno del servidor",
    error: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// Función de inicio
async function startServer() {
  try {
    // 1️⃣ Crear DB si no existe
    await createDatabaseIfNotExists();

    // 2️⃣ Conectar a la base de datos
    await sequelize.authenticate();
    console.log("✅ Conexión a la base de datos exitosa");

    // 3️⃣ Sincronizar modelos (crear tablas)
    // En producción, usar migrations en lugar de sync
    await sequelize.sync({ alter: process.env.NODE_ENV === 'development' });
    console.log("✅ Tablas sincronizadas");

    // 4️⃣ Cargar seed de pilotos
    await seedPilots();

    // 5️⃣ Levantar servidor
    app.listen(PORT, () => {
      console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
      console.log(`📋 Entorno: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (err) {
    console.error("❌ Error arrancando el servidor:", err);
    process.exit(1);
  }
}

startServer();