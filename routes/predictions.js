import express from "express";
import Pilot from "../models/Pilot.js";
import authMiddleware from "../middleware/auth.js";

const router = express.Router();

router.get("/", authMiddleware, async (req, res) => {
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

export default router;