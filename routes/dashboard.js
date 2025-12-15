import express from "express";
import DashboardController from "../controllers/DashboardController.js";
import authMiddleware from "../middleware/auth.js";

const router = express.Router();

// Todas las rutas del dashboard requieren autenticación
router.use(authMiddleware);

/**
 * @route   GET /api/dashboard
 * @desc    Obtiene todos los datos del dashboard del usuario
 * @access  Private
 */
router.get("/", DashboardController.getFullDashboard);

/**
 * @route   GET /api/dashboard/stats
 * @desc    Obtiene solo las estadísticas del usuario
 * @access  Private
 */
router.get("/stats", DashboardController.getStats);

/**
 * @route   GET /api/dashboard/predictions
 * @desc    Obtiene las predicciones recientes del usuario
 * @query   limit (opcional) - Cantidad de predicciones a retornar
 * @access  Private
 */
router.get("/predictions", DashboardController.getRecentPredictions);

/**
 * @route   GET /api/dashboard/pilot-stats
 * @desc    Obtiene estadísticas de pilotos del usuario
 * @access  Private
 */
router.get("/pilot-stats", DashboardController.getPilotStats);

export default router;