import express from "express";
import Pilot from "../models/Pilot.js";
import authMiddleware from "../middleware/auth.js";

const router = express.Router();

// GET /api/pilots - Obtener todos los pilotos (requiere autenticación)
router.get("/", authMiddleware, async (req, res) => {
  try {
    const pilots = await Pilot.findAll({ 
      order: [["id", "ASC"]] 
    });
    
    res.json(pilots);
  } catch (err) {
    console.error("❌ Error al obtener pilotos:", err);
    res.status(500).json({ error: "Error al obtener pilotos" });
  }}
)

export default router;