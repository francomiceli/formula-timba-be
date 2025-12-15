import RaceService from "../services/RaceService.js";

class RaceController {
  // ==========================================
  // CONSULTAS PÚBLICAS
  // ==========================================

  /**
   * GET /api/races/next
   * Obtiene la próxima carrera programada
   */
  async getNextRace(req, res) {
    try {
      const userId = req.userId; // Puede ser undefined si no está autenticado

      const nextRace = await RaceService.getNextRace(userId);

      res.json({
        success: true,
        data: nextRace,
      });
    } catch (error) {
      console.error("Error al obtener próxima carrera:", error);
      res.status(500).json({
        success: false,
        message: "Error al obtener la próxima carrera",
      });
    }
  }

  /**
   * GET /api/races/:id
   * Obtiene una carrera por ID
   */
  async getRaceById(req, res) {
    try {
      const raceId = parseInt(req.params.id);
      const userId = req.userId;

      if (!raceId || isNaN(raceId)) {
        return res.status(400).json({
          success: false,
          message: "ID de carrera inválido",
        });
      }

      const race = await RaceService.getRaceById(raceId, userId);

      if (!race) {
        return res.status(404).json({
          success: false,
          message: "Carrera no encontrada",
        });
      }

      res.json({
        success: true,
        data: race,
      });
    } catch (error) {
      console.error("Error al obtener carrera:", error);
      res.status(500).json({
        success: false,
        message: "Error al obtener la carrera",
      });
    }
  }

  /**
   * GET /api/races/:id/results
   * Obtiene una carrera con sus resultados
   */
  async getRaceWithResults(req, res) {
    try {
      const raceId = parseInt(req.params.id);

      if (!raceId || isNaN(raceId)) {
        return res.status(400).json({
          success: false,
          message: "ID de carrera inválido",
        });
      }

      const race = await RaceService.getRaceWithResults(raceId);

      if (!race) {
        return res.status(404).json({
          success: false,
          message: "Carrera no encontrada",
        });
      }

      res.json({
        success: true,
        data: race,
      });
    } catch (error) {
      console.error("Error al obtener carrera con resultados:", error);
      res.status(500).json({
        success: false,
        message: "Error al obtener la carrera",
      });
    }
  }

  /**
   * GET /api/races
   * Obtiene todas las carreras de una temporada
   */
  async getRaces(req, res) {
    try {
      const season = parseInt(req.query.season) || new Date().getFullYear();
      const status = req.query.status;
      const userId = req.userId;

      const races = await RaceService.getRacesBySeason(season, { status, userId });

      res.json({
        success: true,
        data: races,
        meta: {
          season,
          total: races.length,
        },
      });
    } catch (error) {
      console.error("Error al obtener carreras:", error);
      res.status(500).json({
        success: false,
        message: "Error al obtener las carreras",
      });
    }
  }

  /**
   * GET /api/races/past
   * Obtiene carreras pasadas (completadas)
   */
  async getPastRaces(req, res) {
    try {
      const limit = parseInt(req.query.limit) || 10;
      const offset = parseInt(req.query.offset) || 0;
      const season = req.query.season ? parseInt(req.query.season) : undefined;

      const result = await RaceService.getPastRaces({ limit, offset, season });

      res.json({
        success: true,
        data: result.races,
        pagination: result.pagination,
      });
    } catch (error) {
      console.error("Error al obtener carreras pasadas:", error);
      res.status(500).json({
        success: false,
        message: "Error al obtener carreras pasadas",
      });
    }
  }

  /**
   * GET /api/races/upcoming
   * Obtiene próximas carreras programadas
   */
  async getUpcomingRaces(req, res) {
    try {
      const limit = parseInt(req.query.limit) || 5;
      const userId = req.userId;

      const races = await RaceService.getUpcomingRaces({ limit, userId });

      res.json({
        success: true,
        data: races,
      });
    } catch (error) {
      console.error("Error al obtener próximas carreras:", error);
      res.status(500).json({
        success: false,
        message: "Error al obtener próximas carreras",
      });
    }
  }

  // ==========================================
  // VERIFICACIONES
  // ==========================================

  /**
   * GET /api/races/:id/can-predict
   * Verifica si se puede hacer predicción para una carrera
   */
  async canPredict(req, res) {
    try {
      const raceId = parseInt(req.params.id);

      if (!raceId || isNaN(raceId)) {
        return res.status(400).json({
          success: false,
          message: "ID de carrera inválido",
        });
      }

      const result = await RaceService.canPredict(raceId);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error("Error al verificar predicción:", error);
      res.status(500).json({
        success: false,
        message: "Error al verificar estado de predicción",
      });
    }
  }

  // ==========================================
  // ESTADÍSTICAS
  // ==========================================

  /**
   * GET /api/races/season/:season/stats
   * Obtiene estadísticas de una temporada
   */
  async getSeasonStats(req, res) {
    try {
      const season = parseInt(req.params.season);

      if (!season || isNaN(season)) {
        return res.status(400).json({
          success: false,
          message: "Temporada inválida",
        });
      }

      const stats = await RaceService.getSeasonStats(season);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      console.error("Error al obtener estadísticas de temporada:", error);
      res.status(500).json({
        success: false,
        message: "Error al obtener estadísticas",
      });
    }
  }

  /**
   * GET /api/races/season/:season/calendar
   * Obtiene el calendario de una temporada agrupado por meses
   */
  async getSeasonCalendar(req, res) {
    try {
      const season = parseInt(req.params.season);

      if (!season || isNaN(season)) {
        return res.status(400).json({
          success: false,
          message: "Temporada inválida",
        });
      }

      const calendar = await RaceService.getSeasonCalendar(season);

      res.json({
        success: true,
        data: calendar,
        meta: { season },
      });
    } catch (error) {
      console.error("Error al obtener calendario:", error);
      res.status(500).json({
        success: false,
        message: "Error al obtener calendario",
      });
    }
  }

  // ==========================================
  // ADMINISTRACIÓN (ADMIN)
  // ==========================================

  /**
   * POST /api/races
   * Crea una nueva carrera (Admin)
   */
  async createRace(req, res) {
    try {
      const {
        name,
        officialName,
        circuit,
        country,
        city,
        flagUrl,
        circuitImageUrl,
        round,
        season,
        raceDate,
        qualifyingDate,
        sprintDate,
        fp1Date,
        fp2Date,
        fp3Date,
        predictionDeadline,
        laps,
        circuitLength,
        timezone,
        isSprint,
      } = req.body;

      // Validaciones básicas
      if (!name || !circuit || !country || !round || !raceDate) {
        return res.status(400).json({
          success: false,
          message: "Campos requeridos: name, circuit, country, round, raceDate",
        });
      }

      const race = await RaceService.createRace({
        name,
        officialName,
        circuit,
        country,
        city,
        flagUrl,
        circuitImageUrl,
        round,
        season,
        raceDate,
        qualifyingDate,
        sprintDate,
        fp1Date,
        fp2Date,
        fp3Date,
        predictionDeadline,
        laps,
        circuitLength,
        timezone,
        isSprint,
      });

      res.status(201).json({
        success: true,
        message: "Carrera creada exitosamente",
        data: race,
      });
    } catch (error) {
      console.error("Error al crear carrera:", error);

      if (error.message.includes("Ya existe")) {
        return res.status(409).json({
          success: false,
          message: error.message,
        });
      }

      res.status(500).json({
        success: false,
        message: error.message || "Error al crear la carrera",
      });
    }
  }

  /**
   * PUT /api/races/:id
   * Actualiza una carrera (Admin)
   */
  async updateRace(req, res) {
    try {
      const raceId = parseInt(req.params.id);

      if (!raceId || isNaN(raceId)) {
        return res.status(400).json({
          success: false,
          message: "ID de carrera inválido",
        });
      }

      const race = await RaceService.updateRace(raceId, req.body);

      res.json({
        success: true,
        message: "Carrera actualizada exitosamente",
        data: race,
      });
    } catch (error) {
      console.error("Error al actualizar carrera:", error);

      if (error.message.includes("no encontrada")) {
        return res.status(404).json({
          success: false,
          message: error.message,
        });
      }

      if (error.message.includes("No se puede modificar")) {
        return res.status(400).json({
          success: false,
          message: error.message,
        });
      }

      res.status(500).json({
        success: false,
        message: error.message || "Error al actualizar la carrera",
      });
    }
  }

  /**
   * PATCH /api/races/:id/status
   * Cambia el estado de una carrera (Admin)
   */
  async updateRaceStatus(req, res) {
    try {
      const raceId = parseInt(req.params.id);
      const { status } = req.body;

      if (!raceId || isNaN(raceId)) {
        return res.status(400).json({
          success: false,
          message: "ID de carrera inválido",
        });
      }

      if (!status) {
        return res.status(400).json({
          success: false,
          message: "Estado requerido",
        });
      }

      const race = await RaceService.updateRaceStatus(raceId, status);

      res.json({
        success: true,
        message: `Estado cambiado a "${status}"`,
        data: race,
      });
    } catch (error) {
      console.error("Error al cambiar estado:", error);

      if (error.message.includes("no encontrada")) {
        return res.status(404).json({
          success: false,
          message: error.message,
        });
      }

      if (error.message.includes("inválido") || error.message.includes("No se puede cambiar")) {
        return res.status(400).json({
          success: false,
          message: error.message,
        });
      }

      res.status(500).json({
        success: false,
        message: error.message || "Error al cambiar estado",
      });
    }
  }

  // ==========================================
  // RESULTADOS (ADMIN)
  // ==========================================

  /**
   * POST /api/races/:id/results
   * Guarda los resultados de una carrera (Admin)
   */
  async saveResults(req, res) {
    try {
      const raceId = parseInt(req.params.id);
      const { results } = req.body;

      if (!raceId || isNaN(raceId)) {
        return res.status(400).json({
          success: false,
          message: "ID de carrera inválido",
        });
      }

      if (!results || !Array.isArray(results) || results.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Debe proporcionar un array de resultados",
        });
      }

      // Validar estructura de cada resultado
      for (const result of results) {
        if (!result.pilotId || !result.position) {
          return res.status(400).json({
            success: false,
            message: "Cada resultado debe tener pilotId y position",
          });
        }
      }

      const race = await RaceService.saveRaceResults(raceId, results);

      res.json({
        success: true,
        message: "Resultados guardados exitosamente",
        data: race,
      });
    } catch (error) {
      console.error("Error al guardar resultados:", error);

      if (error.message.includes("no encontrada")) {
        return res.status(404).json({
          success: false,
          message: error.message,
        });
      }

      if (error.message.includes("únicas") || error.message.includes("únicos") || error.message.includes("no existen")) {
        return res.status(400).json({
          success: false,
          message: error.message,
        });
      }

      res.status(500).json({
        success: false,
        message: error.message || "Error al guardar resultados",
      });
    }
  }

  /**
   * GET /api/races/:id/results
   * Obtiene solo los resultados de una carrera
   */
  async getResults(req, res) {
    try {
      const raceId = parseInt(req.params.id);

      if (!raceId || isNaN(raceId)) {
        return res.status(400).json({
          success: false,
          message: "ID de carrera inválido",
        });
      }

      const results = await RaceService.getRaceResults(raceId);

      res.json({
        success: true,
        data: results,
        meta: {
          raceId,
          hasResults: results.length > 0,
          totalPositions: results.length,
        },
      });
    } catch (error) {
      console.error("Error al obtener resultados:", error);
      res.status(500).json({
        success: false,
        message: "Error al obtener resultados",
      });
    }
  }
}

export default new RaceController();