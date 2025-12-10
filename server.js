import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());           // Permite conexiones desde cualquier origen (en dev)
app.use(express.json());   // Para recibir JSON en requests

// Ruta de prueba
app.get("/api/ping", (req, res) => {
  res.json({ message: "pong" });
});

// Arrancar el servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
