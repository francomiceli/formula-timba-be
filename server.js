import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import sequelize from "./database.js";
import createDatabaseIfNotExists from './init-db.js';
import { seedPilots } from "./seed.js";

// Importar rutas
import authRoutes from "./routes/auth.js";
import pilotRoutes from "./routes/pilots.js";
import predictionRoutes from "./routes/predictions.js";

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

// Rutas
app.get("/api/ping", (req, res) => {
  res.json({ message: "pong" });
});

app.use("/api/auth", authRoutes);
app.use("/api/pilots", pilotRoutes);
app.use("/api/predictions", predictionRoutes);

// Función de inicio
async function startServer() {
  try {
    // 1️⃣ Crear DB si no existe
    await createDatabaseIfNotExists();

    // 2️⃣ Conectar a la base de datos
    await sequelize.authenticate();
    console.log("✅ Conexión a la base de datos exitosa");

    // 3️⃣ Sincronizar modelos (crear tablas)
    await sequelize.sync();
    console.log("✅ Tablas sincronizadas");

    // 4️⃣ Cargar seed de pilotos
    await seedPilots();

    // 5️⃣ Levantar servidor
    app.listen(PORT, () => {
      console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("❌ Error arrancando el servidor:", err);
    process.exit(1);
  }
}

startServer();