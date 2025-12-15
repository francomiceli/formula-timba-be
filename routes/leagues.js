import express from "express";
import LeagueController from "../controllers/LeagueController.js";
import authMiddleware from "../middleware/auth.js";

const router = express.Router();

// ==========================================
// RUTAS PÚBLICAS (requieren auth pero no permisos especiales)
// ==========================================

// Todas las rutas de ligas requieren autenticación
router.use(authMiddleware);

/**
 * @route   GET /api/leagues/search
 * @desc    Busca ligas públicas
 * @query   q (búsqueda), season, limit, offset
 * @access  Private
 */
router.get("/search", LeagueController.searchPublicLeagues);

/**
 * @route   GET /api/leagues/user
 * @desc    Obtiene las ligas del usuario autenticado
 * @query   status (active/inactive), season
 * @access  Private
 */
router.get("/user", LeagueController.getUserLeagues);

/**
 * @route   POST /api/leagues/join
 * @desc    Unirse a una liga por código de invitación
 * @body    { inviteCode }
 * @access  Private
 */
router.post("/join", LeagueController.joinByCode);

/**
 * @route   GET /api/leagues/slug/:slug
 * @desc    Obtiene una liga por su slug
 * @param   slug - Slug de la liga
 * @access  Private
 */
router.get("/slug/:slug", LeagueController.getLeagueBySlug);

/**
 * @route   POST /api/leagues
 * @desc    Crea una nueva liga
 * @body    { name, description?, isPublic?, maxMembers?, imageUrl?, season? }
 * @access  Private
 */
router.post("/", LeagueController.createLeague);

/**
 * @route   GET /api/leagues/:id
 * @desc    Obtiene una liga por ID
 * @param   id - ID de la liga
 * @access  Private
 */
router.get("/:id", LeagueController.getLeagueById);

/**
 * @route   PUT /api/leagues/:id
 * @desc    Actualiza una liga (solo admin de la liga)
 * @param   id - ID de la liga
 * @body    { name?, description?, isPublic?, maxMembers?, imageUrl? }
 * @access  Private (Admin de liga)
 */
router.put("/:id", LeagueController.updateLeague);

// ==========================================
// MEMBRESÍAS
// ==========================================

/**
 * @route   POST /api/leagues/:id/join
 * @desc    Unirse a una liga pública
 * @param   id - ID de la liga
 * @access  Private
 */
router.post("/:id/join", LeagueController.joinPublicLeague);

/**
 * @route   POST /api/leagues/:id/leave
 * @desc    Salir de una liga
 * @param   id - ID de la liga
 * @access  Private
 */
router.post("/:id/leave", LeagueController.leaveLeague);

// ==========================================
// RANKING Y ESTADÍSTICAS
// ==========================================

/**
 * @route   GET /api/leagues/:id/ranking
 * @desc    Obtiene el ranking de una liga
 * @param   id - ID de la liga
 * @query   limit, offset (para paginación)
 * @access  Private
 */
router.get("/:id/ranking", LeagueController.getRanking);

/**
 * @route   GET /api/leagues/:id/stats
 * @desc    Obtiene estadísticas de una liga
 * @param   id - ID de la liga
 * @access  Private
 */
router.get("/:id/stats", LeagueController.getStats);

// ==========================================
// ADMINISTRACIÓN DE LIGA
// ==========================================

/**
 * @route   POST /api/leagues/:id/regenerate-code
 * @desc    Regenera el código de invitación (solo admin)
 * @param   id - ID de la liga
 * @access  Private (Admin de liga)
 */
router.post("/:id/regenerate-code", LeagueController.regenerateInviteCode);

/**
 * @route   PUT /api/leagues/:id/members/:userId/role
 * @desc    Cambia el rol de un miembro (solo admin)
 * @param   id - ID de la liga
 * @param   userId - ID del usuario a modificar
 * @body    { role: 'admin' | 'moderator' | 'member' }
 * @access  Private (Admin de liga)
 */
router.put("/:id/members/:userId/role", LeagueController.changeMemberRole);

/**
 * @route   POST /api/leagues/:id/members/:userId/ban
 * @desc    Banea a un miembro (admin o moderator)
 * @param   id - ID de la liga
 * @param   userId - ID del usuario a banear
 * @access  Private (Admin/Moderator de liga)
 */
router.post("/:id/members/:userId/ban", LeagueController.banMember);

export default router;