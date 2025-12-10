import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import sequelize from "./database.js";
import createDatabaseIfNotExists from './init-db.js';

import Pilot from "./models/Pilot.js";
import { seedPilots } from "./seed.js";

async function startServer() {
  // 1️⃣ Crear DB si no existe
  await createDatabaseIfNotExists();

  // 2️⃣ Sincronizar Sequelize (crear tablas)
  await sequelize.sync();

  // 3️⃣ Levantar servidor
  const app = express();
  app.listen(process.env.PORT || 3000, () => {
    console.log('Servidor corriendo');
  });
}

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

startServer();

// Ruta de prueba
app.get("/api/ping", (req, res) => {
  res.json({ message: "pong" });
});

app.get("/api/pilots", async (req, res) => {
  try {
    const pilots = await Pilot.findAll({ order: [["id", "ASC"]] });
    res.json(pilots);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener pilotos" });
  }
});

app.post("/api/predictions", async (req, res) => {
  const { userName, raceName, items } = req.body;

  try {
    const prediction = await Prediction.create(
      { userName, raceName, items },
      { include: ["items"] } // para crear PredictionItems automáticamente
    );
    res.json({ success: true, prediction });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Arrancar servidor + conectar base de datos
app.listen(PORT, async () => {
  try {
    await sequelize.authenticate();
    console.log("✅ Conexión a la base de datos exitosa");

    // Crear tablas si no existen
    await sequelize.sync();
    console.log("✅ Tablas sincronizadas");

    // Cargar seed de pilotos
    await seedPilots();

    console.log(`Servidor corriendo en http://localhost:${PORT}`);
  } catch (err) {
    console.error("❌ Error arrancando el servidor:", err);
  }
});
