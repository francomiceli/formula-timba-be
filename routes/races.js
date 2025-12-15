import express from "express";
import RaceController from "../controllers/RaceController.js";
import authMiddleware from "../middleware/auth.js";

const router = express.Router();

// ==========================================
// RUTAS PÚBLICAS (con auth opcional para info de predicción)
// ==========================================

/**
 * Middleware opcional de auth
 * Intenta autenticar pero no falla si no hay token
 */
const optionalAuth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return next();
  }

  // Si hay token, intenta validarlo
  authMiddleware(req, res, (err) => {
    // Si falla la auth, continúa sin userId
    if (err) {
      req.userId = null;
    }
    next();
  });
};

/**
 * @route   GET /api/races/next
 * @desc    Obtiene la próxima carrera programada
 * @access  Public (con info extra si está autenticado)
 */
router.get("/next", optionalAuth, RaceController.getNextRace);

/**
 * @route   GET /api/races/upcoming
 * @desc    Obtiene las próximas carreras programadas
 * @query   limit (default: 5)
 * @access  Public (con info extra si está autenticado)
 */
router.get("/upcoming", optionalAuth, RaceController.getUpcomingRaces);

/**
 * @route   GET /api/races/past
 * @desc    Obtiene carreras pasadas (completadas)
 * @query   limit (default: 10), offset (default: 0), season
 * @access  Public
 */
router.get("/past", RaceController.getPastRaces);

/**
 * @route   GET /api/races/season/:season/stats
 * @desc    Obtiene estadísticas de una temporada
 * @param   season - Año de la temporada
 * @access  Public
 */
router.get("/season/:season/stats", RaceController.getSeasonStats);

/**
 * @route   GET /api/races/season/:season/calendar
 * @desc    Obtiene el calendario de una temporada agrupado por meses
 * @param   season - Año de la temporada
 * @access  Public
 */
router.get("/season/:season/calendar", RaceController.getSeasonCalendar);

// ==========================================
// RUTAS PROTEGIDAS (requieren autenticación)
// ==========================================

/**
 * @route   GET /api/races
 * @desc    Obtiene todas las carreras de una temporada
 * @query   season (default: año actual), status (opcional)
 * @access  Private
 */
router.get("/", authMiddleware, RaceController.getRaces);

/**
 * @route   GET /api/races/:id
 * @desc    Obtiene una carrera por ID
 * @param   id - ID de la carrera
 * @access  Private
 */
router.get("/:id", authMiddleware, RaceController.getRaceById);

/**
 * @route   GET /api/races/:id/results
 * @desc    Obtiene una carrera con sus resultados completos
 * @param   id - ID de la carrera
 * @access  Private
 */
router.get("/:id/results", authMiddleware, RaceController.getRaceWithResults);

/**
 * @route   GET /api/races/:id/can-predict
 * @desc    Verifica si se puede hacer predicción para una carrera
 * @param   id - ID de la carrera
 * @access  Private
 */
router.get("/:id/can-predict", authMiddleware, RaceController.canPredict);

// ==========================================
// RUTAS DE ADMINISTRACIÓN (requieren rol admin)
// TODO: Agregar middleware de verificación de admin
// ==========================================

/**
 * @route   POST /api/races
 * @desc    Crea una nueva carrera (Admin)
 * @body    { name, circuit, country, round, raceDate, ... }
 * @access  Private (Admin)
 */
router.post("/", authMiddleware, RaceController.createRace);

/**
 * @route   PUT /api/races/:id
 * @desc    Actualiza una carrera (Admin)
 * @param   id - ID de la carrera
 * @body    { name?, circuit?, country?, raceDate?, ... }
 * @access  Private (Admin)
 */
router.put("/:id", authMiddleware, RaceController.updateRace);

/**
 * @route   PATCH /api/races/:id/status
 * @desc    Cambia el estado de una carrera (Admin)
 * @param   id - ID de la carrera
 * @body    { status: 'scheduled' | 'qualifying' | 'in_progress' | 'completed' | 'cancelled' | 'postponed' }
 * @access  Private (Admin)
 */
router.patch("/:id/status", authMiddleware, RaceController.updateRaceStatus);

/**
 * @route   POST /api/races/:id/results
 * @desc    Guarda los resultados de una carrera (Admin)
 * @param   id - ID de la carrera
 * @body    { results: [{ pilotId, position, points?, status?, timeOrGap?, fastestLap? }] }
 * @access  Private (Admin)
 */
router.post("/:id/results", authMiddleware, RaceController.saveResults);

export default router;