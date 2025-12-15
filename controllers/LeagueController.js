import LeagueService from "../services/LeagueService.js";

class LeagueController {
  // ==========================================
  // CRUD DE LIGAS
  // ==========================================

  /**
   * POST /api/leagues
   * Crea una nueva liga
   */
  async createLeague(req, res) {
    try {
      const userId = req.userId;
      const { name, description, isPublic, maxMembers, imageUrl, season } = req.body;

      // Validación básica
      if (!name || name.trim().length < 3) {
        return res.status(400).json({
          success: false,
          message: "El nombre de la liga debe tener al menos 3 caracteres",
        });
      }

      if (name.trim().length > 100) {
        return res.status(400).json({
          success: false,
          message: "El nombre no puede exceder 100 caracteres",
        });
      }

      const league = await LeagueService.createLeague({
        name,
        description,
        isPublic,
        maxMembers,
        imageUrl,
        season,
      }, userId);

      res.status(201).json({
        success: true,
        message: "Liga creada exitosamente",
        data: league,
      });
    } catch (error) {
      console.error("Error al crear liga:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Error al crear la liga",
      });
    }
  }

  /**
   * GET /api/leagues/:id
   * Obtiene una liga por ID
   */
  async getLeagueById(req, res) {
    try {
      const leagueId = parseInt(req.params.id);
      const userId = req.userId;

      if (!leagueId || isNaN(leagueId)) {
        return res.status(400).json({
          success: false,
          message: "ID de liga inválido",
        });
      }

      const league = await LeagueService.getLeagueById(leagueId, userId);

      if (!league) {
        return res.status(404).json({
          success: false,
          message: "Liga no encontrada",
        });
      }

      res.json({
        success: true,
        data: league,
      });
    } catch (error) {
      console.error("Error al obtener liga:", error);
      res.status(500).json({
        success: false,
        message: "Error al obtener la liga",
      });
    }
  }

  /**
   * GET /api/leagues/slug/:slug
   * Obtiene una liga por slug
   */
  async getLeagueBySlug(req, res) {
    try {
      const { slug } = req.params;
      const userId = req.userId;

      if (!slug) {
        return res.status(400).json({
          success: false,
          message: "Slug requerido",
        });
      }

      const league = await LeagueService.getLeagueBySlug(slug, userId);

      if (!league) {
        return res.status(404).json({
          success: false,
          message: "Liga no encontrada",
        });
      }

      res.json({
        success: true,
        data: league,
      });
    } catch (error) {
      console.error("Error al obtener liga por slug:", error);
      res.status(500).json({
        success: false,
        message: "Error al obtener la liga",
      });
    }
  }

  /**
   * PUT /api/leagues/:id
   * Actualiza una liga (solo admin)
   */
  async updateLeague(req, res) {
    try {
      const leagueId = parseInt(req.params.id);
      const userId = req.userId;
      const { name, description, isPublic, maxMembers, imageUrl } = req.body;

      if (!leagueId || isNaN(leagueId)) {
        return res.status(400).json({
          success: false,
          message: "ID de liga inválido",
        });
      }

      const league = await LeagueService.updateLeague(leagueId, {
        name,
        description,
        isPublic,
        maxMembers,
        imageUrl,
      }, userId);

      res.json({
        success: true,
        message: "Liga actualizada exitosamente",
        data: league,
      });
    } catch (error) {
      console.error("Error al actualizar liga:", error);

      if (error.message.includes("permisos")) {
        return res.status(403).json({
          success: false,
          message: error.message,
        });
      }

      res.status(500).json({
        success: false,
        message: error.message || "Error al actualizar la liga",
      });
    }
  }

  /**
   * POST /api/leagues/:id/regenerate-code
   * Regenera el código de invitación (solo admin)
   */
  async regenerateInviteCode(req, res) {
    try {
      const leagueId = parseInt(req.params.id);
      const userId = req.userId;

      if (!leagueId || isNaN(leagueId)) {
        return res.status(400).json({
          success: false,
          message: "ID de liga inválido",
        });
      }

      const newCode = await LeagueService.regenerateInviteCode(leagueId, userId);

      res.json({
        success: true,
        message: "Código regenerado exitosamente",
        data: { inviteCode: newCode },
      });
    } catch (error) {
      console.error("Error al regenerar código:", error);

      if (error.message.includes("permisos")) {
        return res.status(403).json({
          success: false,
          message: error.message,
        });
      }

      res.status(500).json({
        success: false,
        message: "Error al regenerar el código",
      });
    }
  }

  // ==========================================
  // MEMBRESÍAS
  // ==========================================

  /**
   * GET /api/leagues/user
   * Obtiene las ligas del usuario autenticado
   */
  async getUserLeagues(req, res) {
    try {
      const userId = req.userId;
      const { status, season } = req.query;

      const leagues = await LeagueService.getUserLeagues(userId, {
        status,
        season: season ? parseInt(season) : undefined,
      });

      res.json({
        success: true,
        data: leagues,
      });
    } catch (error) {
      console.error("Error al obtener ligas del usuario:", error);
      res.status(500).json({
        success: false,
        message: "Error al obtener las ligas",
      });
    }
  }

  /**
   * POST /api/leagues/join
   * Unirse a una liga por código de invitación
   */
  async joinByCode(req, res) {
    try {
      const userId = req.userId;
      const { inviteCode } = req.body;

      if (!inviteCode) {
        return res.status(400).json({
          success: false,
          message: "Código de invitación requerido",
        });
      }

      const result = await LeagueService.joinLeagueByCode(userId, inviteCode);

      res.status(201).json({
        success: true,
        message: result.message || "Te has unido a la liga exitosamente",
        data: result,
      });
    } catch (error) {
      console.error("Error al unirse a liga:", error);

      // Errores específicos con código 400
      const badRequestErrors = ["inválido", "miembro", "baneado", "máximo"];
      const isBadRequest = badRequestErrors.some((e) => error.message.toLowerCase().includes(e));

      res.status(isBadRequest ? 400 : 500).json({
        success: false,
        message: error.message || "Error al unirse a la liga",
      });
    }
  }

  /**
   * POST /api/leagues/:id/join
   * Unirse a una liga pública
   */
  async joinPublicLeague(req, res) {
    try {
      const userId = req.userId;
      const leagueId = parseInt(req.params.id);

      if (!leagueId || isNaN(leagueId)) {
        return res.status(400).json({
          success: false,
          message: "ID de liga inválido",
        });
      }

      const result = await LeagueService.joinPublicLeague(userId, leagueId);

      res.status(201).json({
        success: true,
        message: "Te has unido a la liga exitosamente",
        data: result,
      });
    } catch (error) {
      console.error("Error al unirse a liga pública:", error);

      const badRequestErrors = ["no encontrada", "privada", "miembro", "baneado", "máximo"];
      const isBadRequest = badRequestErrors.some((e) => error.message.toLowerCase().includes(e));

      res.status(isBadRequest ? 400 : 500).json({
        success: false,
        message: error.message || "Error al unirse a la liga",
      });
    }
  }

  /**
   * POST /api/leagues/:id/leave
   * Salir de una liga
   */
  async leaveLeague(req, res) {
    try {
      const userId = req.userId;
      const leagueId = parseInt(req.params.id);

      if (!leagueId || isNaN(leagueId)) {
        return res.status(400).json({
          success: false,
          message: "ID de liga inválido",
        });
      }

      const result = await LeagueService.leaveLeague(userId, leagueId);

      res.json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      console.error("Error al salir de liga:", error);

      res.status(400).json({
        success: false,
        message: error.message || "Error al salir de la liga",
      });
    }
  }

  // ==========================================
  // RANKING Y ESTADÍSTICAS
  // ==========================================

  /**
   * GET /api/leagues/:id/ranking
   * Obtiene el ranking de una liga
   */
  async getRanking(req, res) {
    try {
      const leagueId = parseInt(req.params.id);
      const { limit, offset } = req.query;

      if (!leagueId || isNaN(leagueId)) {
        return res.status(400).json({
          success: false,
          message: "ID de liga inválido",
        });
      }

      const ranking = await LeagueService.getLeagueRanking(leagueId, {
        limit: limit ? parseInt(limit) : undefined,
        offset: offset ? parseInt(offset) : 0,
      });

      res.json({
        success: true,
        data: ranking,
      });
    } catch (error) {
      console.error("Error al obtener ranking:", error);

      if (error.message.includes("no encontrada")) {
        return res.status(404).json({
          success: false,
          message: error.message,
        });
      }

      res.status(500).json({
        success: false,
        message: "Error al obtener el ranking",
      });
    }
  }

  /**
   * GET /api/leagues/:id/stats
   * Obtiene estadísticas de una liga
   */
  async getStats(req, res) {
    try {
      const leagueId = parseInt(req.params.id);

      if (!leagueId || isNaN(leagueId)) {
        return res.status(400).json({
          success: false,
          message: "ID de liga inválido",
        });
      }

      const stats = await LeagueService.getLeagueStats(leagueId);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      console.error("Error al obtener estadísticas:", error);

      if (error.message.includes("no encontrada")) {
        return res.status(404).json({
          success: false,
          message: error.message,
        });
      }

      res.status(500).json({
        success: false,
        message: "Error al obtener estadísticas",
      });
    }
  }

  // ==========================================
  // BÚSQUEDA
  // ==========================================

  /**
   * GET /api/leagues/search
   * Busca ligas públicas
   */
  async searchPublicLeagues(req, res) {
    try {
      const { q, season, limit, offset } = req.query;

      const result = await LeagueService.searchPublicLeagues({
        search: q,
        season: season ? parseInt(season) : undefined,
        limit: limit ? parseInt(limit) : 20,
        offset: offset ? parseInt(offset) : 0,
      });

      res.json({
        success: true,
        data: result.leagues,
        pagination: result.pagination,
      });
    } catch (error) {
      console.error("Error al buscar ligas:", error);
      res.status(500).json({
        success: false,
        message: "Error al buscar ligas",
      });
    }
  }

  // ==========================================
  // ADMINISTRACIÓN DE MIEMBROS
  // ==========================================

  /**
   * PUT /api/leagues/:id/members/:userId/role
   * Cambia el rol de un miembro (solo admin)
   */
  async changeMemberRole(req, res) {
    try {
      const leagueId = parseInt(req.params.id);
      const targetUserId = parseInt(req.params.userId);
      const requesterId = req.userId;
      const { role } = req.body;

      if (!leagueId || isNaN(leagueId) || !targetUserId || isNaN(targetUserId)) {
        return res.status(400).json({
          success: false,
          message: "IDs inválidos",
        });
      }

      if (!role) {
        return res.status(400).json({
          success: false,
          message: "Rol requerido",
        });
      }

      const result = await LeagueService.changeMemberRole(leagueId, targetUserId, role, requesterId);

      res.json({
        success: true,
        message: result.message,
        data: result,
      });
    } catch (error) {
      console.error("Error al cambiar rol:", error);

      if (error.message.includes("permisos") || error.message.includes("No puedes")) {
        return res.status(403).json({
          success: false,
          message: error.message,
        });
      }

      res.status(400).json({
        success: false,
        message: error.message || "Error al cambiar el rol",
      });
    }
  }

  /**
   * POST /api/leagues/:id/members/:userId/ban
   * Banea a un miembro (solo admin/moderator)
   */
  async banMember(req, res) {
    try {
      const leagueId = parseInt(req.params.id);
      const targetUserId = parseInt(req.params.userId);
      const requesterId = req.userId;

      if (!leagueId || isNaN(leagueId) || !targetUserId || isNaN(targetUserId)) {
        return res.status(400).json({
          success: false,
          message: "IDs inválidos",
        });
      }

      const result = await LeagueService.banMember(leagueId, targetUserId, requesterId);

      res.json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      console.error("Error al banear miembro:", error);

      if (error.message.includes("permisos") || error.message.includes("No puedes")) {
        return res.status(403).json({
          success: false,
          message: error.message,
        });
      }

      res.status(400).json({
        success: false,
        message: error.message || "Error al banear miembro",
      });
    }
  }
}

export default new LeagueController();