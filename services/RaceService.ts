import { Op, fn, col, literal } from "sequelize";
import {
  Race,
  RaceResult,
  Prediction,
  PredictionItem,
  Pilot,
  sequelize,
} from "../models/index.js";

class RaceService {
  // ==========================================
  // MÉTODOS AUXILIARES PRIVADOS
  // ==========================================

  /**
   * Formatea una carrera para respuesta de API
   * @param {Object} race - Instancia de Race
   * @param {Object} [extras] - Campos adicionales
   * @returns {Object} Carrera formateada
   */
  _formatRace(race, extras = {}) {
    return {
      id: race.id,
      name: race.name,
      officialName: race.officialName,
      circuit: race.circuit,
      country: race.country,
      city: race.city,
      flagUrl: race.flagUrl,
      circuitImageUrl: race.circuitImageUrl,
      round: race.round,
      season: race.season,
      raceDate: race.raceDate,
      qualifyingDate: race.qualifyingDate,
      sprintDate: race.sprintDate,
      predictionDeadline: race.predictionDeadline,
      status: race.status,
      laps: race.laps,
      circuitLength: race.circuitLength,
      timezone: race.timezone,
      isSprint: race.isSprint,
      ...extras,
    };
  }

  /**
   * Formatea un resultado de carrera
   * @param {Object} result - Instancia de RaceResult con Pilot
   * @returns {Object} Resultado formateado
   */
  _formatResult(result) {
    return {
      position: result.position,
      pilot: result.pilot ? {
        id: result.pilot.id,
        name: result.pilot.name,
        acronym: result.pilot.acronym,
        team: result.pilot.team,
        number: result.pilot.number,
      } : null,
      points: result.points,
      status: result.status,
      timeOrGap: result.timeOrGap,
      fastestLap: result.fastestLap,
    };
  }

  /**
   * Calcula la fecha límite efectiva para predicciones
   * @param {Object} race - Instancia de Race
   * @returns {Date} Fecha límite
   */
  _getEffectiveDeadline(race) {
    return race.predictionDeadline || race.qualifyingDate || race.raceDate;
  }

  // ==========================================
  // CONSULTAS DE CARRERAS
  // ==========================================

  /**
   * Obtiene la próxima carrera programada
   * @param {number|null} userId - ID del usuario (para verificar predicción)
   * @returns {Promise<Object|null>} Próxima carrera o null
   */
  async getNextRace(userId = null) {
    const now = new Date();

    const race = await Race.findOne({
      where: {
        raceDate: { [Op.gt]: now },
        status: { [Op.in]: ['scheduled', 'qualifying'] },
      },
      order: [['raceDate', 'ASC']],
    });

    if (!race) {
      return null;
    }

    // Verificar si el usuario tiene predicción
    let hasPrediction = false;
    let predictionId = null;

    if (userId) {
      const prediction = await Prediction.findOne({
        where: {
          userId,
          raceId: race.id,
          status: { [Op.in]: ['submitted', 'locked'] },
        },
        attributes: ['id'],
      });

      hasPrediction = !!prediction;
      predictionId = prediction?.id || null;
    }

    // Calcular si se puede predecir
    const deadline = this._getEffectiveDeadline(race);
    const canPredict = now < new Date(deadline) && race.status === 'scheduled';

    // Calcular tiempo restante para deadline
    const timeToDeadline = new Date(deadline) - now;
    const hoursToDeadline = Math.max(0, Math.floor(timeToDeadline / (1000 * 60 * 60)));
    const minutesToDeadline = Math.max(0, Math.floor((timeToDeadline % (1000 * 60 * 60)) / (1000 * 60)));

    return this._formatRace(race, {
      hasPrediction,
      predictionId,
      canPredict,
      deadline,
      timeToDeadline: {
        hours: hoursToDeadline,
        minutes: minutesToDeadline,
        isPastDeadline: timeToDeadline <= 0,
      },
    });
  }

  /**
   * Obtiene una carrera por ID
   * @param {number} raceId - ID de la carrera
   * @param {number|null} userId - ID del usuario
   * @returns {Promise<Object|null>} Carrera o null
   */
  async getRaceById(raceId, userId = null) {
    const race = await Race.findByPk(raceId);

    if (!race) {
      return null;
    }

    let hasPrediction = false;
    let predictionId = null;

    if (userId) {
      const prediction = await Prediction.findOne({
        where: { userId, raceId },
        attributes: ['id', 'status'],
      });

      hasPrediction = !!prediction;
      predictionId = prediction?.id || null;
    }

    const deadline = this._getEffectiveDeadline(race);
    const canPredict = new Date() < new Date(deadline) && race.status === 'scheduled';

    return this._formatRace(race, {
      hasPrediction,
      predictionId,
      canPredict,
      deadline,
    });
  }

  /**
   * Obtiene una carrera con sus resultados
   * @param {number} raceId - ID de la carrera
   * @returns {Promise<Object|null>} Carrera con resultados
   */
  async getRaceWithResults(raceId) {
    const race = await Race.findByPk(raceId, {
      include: [
        {
          model: RaceResult,
          as: 'results',
          include: [
            {
              model: Pilot,
              as: 'pilot',
              attributes: ['id', 'name', 'acronym', 'team', 'number'],
            },
          ],
        },
      ],
    });

    if (!race) {
      return null;
    }

    // Ordenar resultados por posición
    const sortedResults = (race.results || [])
      .sort((a, b) => a.position - b.position)
      .map((r) => this._formatResult(r));

    return this._formatRace(race, {
      results: sortedResults,
      hasResults: sortedResults.length > 0,
    });
  }

  /**
   * Obtiene todas las carreras de una temporada
   * @param {number} season - Año de la temporada
   * @param {Object} [options] - Opciones adicionales
   * @param {string} [options.status] - Filtrar por estado
   * @param {number} [options.userId] - Para verificar predicciones
   * @returns {Promise<Array>} Lista de carreras
   */
  async getRacesBySeason(season, options = {}) {
    const { status, userId } = options;

    const whereClause = { season };
    if (status) {
      whereClause.status = status;
    }

    const races = await Race.findAll({
      where: whereClause,
      order: [['round', 'ASC']],
    });

    // Si hay userId, obtener predicciones del usuario para esta temporada
    let userPredictions = new Map();
    if (userId) {
      const predictions = await Prediction.findAll({
        where: {
          userId,
          raceId: { [Op.in]: races.map((r) => r.id) },
        },
        attributes: ['raceId', 'id', 'status', 'pointsEarned'],
      });

      predictions.forEach((p) => {
        userPredictions.set(p.raceId, {
          id: p.id,
          status: p.status,
          pointsEarned: p.pointsEarned,
        });
      });
    }

    return races.map((race) => {
      const userPrediction = userPredictions.get(race.id);
      const deadline = this._getEffectiveDeadline(race);
      const canPredict = new Date() < new Date(deadline) && race.status === 'scheduled';

      return {
        id: race.id,
        name: race.name,
        circuit: race.circuit,
        country: race.country,
        flagUrl: race.flagUrl,
        round: race.round,
        raceDate: race.raceDate,
        status: race.status,
        isSprint: race.isSprint,
        canPredict,
        hasPrediction: !!userPrediction,
        prediction: userPrediction || null,
      };
    });
  }

  /**
   * Obtiene carreras pasadas (completadas)
   * @param {Object} [options] - Opciones
   * @param {number} [options.limit=10] - Límite de resultados
   * @param {number} [options.offset=0] - Offset para paginación
   * @param {number} [options.season] - Filtrar por temporada
   * @returns {Promise<Object>} Carreras con paginación
   */
  async getPastRaces(options = {}) {
    const { limit = 10, offset = 0, season } = options;

    const whereClause = {
      status: 'completed',
    };

    if (season) {
      whereClause.season = season;
    }

    const { count, rows: races } = await Race.findAndCountAll({
      where: whereClause,
      order: [['raceDate', 'DESC']],
      limit,
      offset,
    });

    return {
      races: races.map((race) => ({
        id: race.id,
        name: race.name,
        circuit: race.circuit,
        country: race.country,
        flagUrl: race.flagUrl,
        round: race.round,
        season: race.season,
        raceDate: race.raceDate,
        isSprint: race.isSprint,
      })),
      pagination: {
        total: count,
        limit,
        offset,
        hasMore: offset + limit < count,
      },
    };
  }

  /**
   * Obtiene carreras próximas (programadas)
   * @param {Object} [options] - Opciones
   * @param {number} [options.limit=5] - Límite de resultados
   * @param {number} [options.userId] - Para verificar predicciones
   * @returns {Promise<Array>} Carreras próximas
   */
  async getUpcomingRaces(options = {}) {
    const { limit = 5, userId } = options;
    const now = new Date();

    const races = await Race.findAll({
      where: {
        raceDate: { [Op.gt]: now },
        status: { [Op.in]: ['scheduled', 'qualifying'] },
      },
      order: [['raceDate', 'ASC']],
      limit,
    });

    // Obtener predicciones si hay userId
    let userPredictions = new Map();
    if (userId && races.length > 0) {
      const predictions = await Prediction.findAll({
        where: {
          userId,
          raceId: { [Op.in]: races.map((r) => r.id) },
        },
        attributes: ['raceId', 'id'],
      });

      predictions.forEach((p) => {
        userPredictions.set(p.raceId, p.id);
      });
    }

    return races.map((race) => {
      const deadline = this._getEffectiveDeadline(race);
      const canPredict = now < new Date(deadline) && race.status === 'scheduled';

      return {
        id: race.id,
        name: race.name,
        circuit: race.circuit,
        country: race.country,
        flagUrl: race.flagUrl,
        round: race.round,
        raceDate: race.raceDate,
        deadline,
        canPredict,
        hasPrediction: userPredictions.has(race.id),
        isSprint: race.isSprint,
      };
    });
  }

  // ==========================================
  // VERIFICACIONES
  // ==========================================

  /**
   * Verifica si se pueden hacer predicciones para una carrera
   * @param {number} raceId - ID de la carrera
   * @returns {Promise<Object>} Estado de predicciones
   */
  async canPredict(raceId) {
    const race = await Race.findByPk(raceId);

    if (!race) {
      return {
        canPredict: false,
        reason: 'race_not_found',
        message: 'Carrera no encontrada',
      };
    }

    if (race.status !== 'scheduled') {
      return {
        canPredict: false,
        reason: 'race_not_scheduled',
        message: `La carrera está en estado: ${race.status}`,
        status: race.status,
      };
    }

    const now = new Date();
    const deadline = this._getEffectiveDeadline(race);

    if (now >= new Date(deadline)) {
      return {
        canPredict: false,
        reason: 'deadline_passed',
        message: 'El plazo para predicciones ha terminado',
        deadline,
      };
    }

    // Calcular tiempo restante
    const timeRemaining = new Date(deadline) - now;
    const hoursRemaining = Math.floor(timeRemaining / (1000 * 60 * 60));
    const minutesRemaining = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));

    return {
      canPredict: true,
      reason: 'ok',
      deadline,
      timeRemaining: {
        hours: hoursRemaining,
        minutes: minutesRemaining,
        totalMinutes: Math.floor(timeRemaining / (1000 * 60)),
      },
    };
  }

  /**
   * Verifica si una carrera tiene resultados
   * @param {number} raceId - ID de la carrera
   * @returns {Promise<boolean>} Si tiene resultados
   */
  async hasResults(raceId) {
    const count = await RaceResult.count({ where: { raceId } });
    return count > 0;
  }

  // ==========================================
  // GESTIÓN DE CARRERAS (ADMIN)
  // ==========================================

  /**
   * Crea una nueva carrera
   * @param {Object} data - Datos de la carrera
   * @returns {Promise<Object>} Carrera creada
   */
  async createRace(data) {
    // Validaciones
    if (!data.name || !data.circuit || !data.country || !data.round || !data.raceDate) {
      throw new Error('Campos requeridos: name, circuit, country, round, raceDate');
    }

    // Verificar que no exista otra carrera con mismo round/season
    const season = data.season || new Date().getFullYear();
    const existing = await Race.findOne({
      where: { season, round: data.round },
    });

    if (existing) {
      throw new Error(`Ya existe una carrera en la ronda ${data.round} de la temporada ${season}`);
    }

    const race = await Race.create({
      name: data.name.trim(),
      officialName: data.officialName?.trim() || null,
      circuit: data.circuit.trim(),
      country: data.country.trim(),
      city: data.city?.trim() || null,
      flagUrl: data.flagUrl || null,
      circuitImageUrl: data.circuitImageUrl || null,
      round: data.round,
      season,
      raceDate: new Date(data.raceDate),
      qualifyingDate: data.qualifyingDate ? new Date(data.qualifyingDate) : null,
      sprintDate: data.sprintDate ? new Date(data.sprintDate) : null,
      fp1Date: data.fp1Date ? new Date(data.fp1Date) : null,
      fp2Date: data.fp2Date ? new Date(data.fp2Date) : null,
      fp3Date: data.fp3Date ? new Date(data.fp3Date) : null,
      predictionDeadline: data.predictionDeadline ? new Date(data.predictionDeadline) : null,
      laps: data.laps || null,
      circuitLength: data.circuitLength || null,
      timezone: data.timezone || null,
      isSprint: data.isSprint || false,
      status: 'scheduled',
    });

    return this._formatRace(race);
  }

  /**
   * Actualiza una carrera
   * @param {number} raceId - ID de la carrera
   * @param {Object} data - Datos a actualizar
   * @returns {Promise<Object>} Carrera actualizada
   */
  async updateRace(raceId, data) {
    const race = await Race.findByPk(raceId);

    if (!race) {
      throw new Error('Carrera no encontrada');
    }

    // No permitir editar carreras completadas (excepto ciertos campos)
    if (race.status === 'completed') {
      const allowedFields = ['officialName', 'circuitImageUrl', 'flagUrl'];
      const attemptedFields = Object.keys(data);
      const disallowedFields = attemptedFields.filter((f) => !allowedFields.includes(f));

      if (disallowedFields.length > 0) {
        throw new Error('No se puede modificar una carrera completada');
      }
    }

    // Construir objeto de actualización
    const updateData = {};
    const allowedUpdates = [
      'name', 'officialName', 'circuit', 'country', 'city',
      'flagUrl', 'circuitImageUrl', 'raceDate', 'qualifyingDate',
      'sprintDate', 'fp1Date', 'fp2Date', 'fp3Date', 'predictionDeadline',
      'laps', 'circuitLength', 'timezone', 'isSprint', 'status',
    ];

    allowedUpdates.forEach((field) => {
      if (data[field] !== undefined) {
        if (['raceDate', 'qualifyingDate', 'sprintDate', 'fp1Date', 'fp2Date', 'fp3Date', 'predictionDeadline'].includes(field)) {
          updateData[field] = data[field] ? new Date(data[field]) : null;
        } else if (typeof data[field] === 'string') {
          updateData[field] = data[field].trim();
        } else {
          updateData[field] = data[field];
        }
      }
    });

    await race.update(updateData);

    return this._formatRace(race);
  }

  /**
   * Cambia el estado de una carrera
   * @param {number} raceId - ID de la carrera
   * @param {string} newStatus - Nuevo estado
   * @returns {Promise<Object>} Carrera actualizada
   */
  async updateRaceStatus(raceId, newStatus) {
    const validStatuses = ['scheduled', 'qualifying', 'in_progress', 'completed', 'cancelled', 'postponed'];

    if (!validStatuses.includes(newStatus)) {
      throw new Error(`Estado inválido. Debe ser uno de: ${validStatuses.join(', ')}`);
    }

    const race = await Race.findByPk(raceId);

    if (!race) {
      throw new Error('Carrera no encontrada');
    }

    // Validar transiciones de estado
    const validTransitions = {
      scheduled: ['qualifying', 'cancelled', 'postponed'],
      qualifying: ['in_progress', 'cancelled', 'postponed'],
      in_progress: ['completed', 'cancelled'],
      completed: [], // Estado final
      cancelled: ['scheduled'], // Puede reprogramarse
      postponed: ['scheduled'], // Puede reprogramarse
    };

    if (!validTransitions[race.status]?.includes(newStatus)) {
      throw new Error(`No se puede cambiar de "${race.status}" a "${newStatus}"`);
    }

    await race.update({ status: newStatus });

    // Si se marca como completada, bloquear predicciones pendientes
    if (newStatus === 'completed') {
      await Prediction.update(
        { status: 'locked' },
        {
          where: {
            raceId,
            status: 'submitted',
          },
        }
      );
    }

    return this._formatRace(race);
  }

  // ==========================================
  // GESTIÓN DE RESULTADOS (ADMIN)
  // ==========================================

  /**
   * Guarda los resultados de una carrera
   * @param {number} raceId - ID de la carrera
   * @param {Array} results - Array de resultados [{pilotId, position, points, status, timeOrGap, fastestLap}]
   * @returns {Promise<Object>} Carrera con resultados
   */
  async saveRaceResults(raceId, results) {
    const transaction = await sequelize.transaction();

    try {
      const race = await Race.findByPk(raceId);

      if (!race) {
        throw new Error('Carrera no encontrada');
      }

      // Validar que hay resultados
      if (!results || !Array.isArray(results) || results.length === 0) {
        throw new Error('Debe proporcionar al menos un resultado');
      }

      // Validar posiciones únicas
      const positions = results.map((r) => r.position);
      const uniquePositions = new Set(positions);
      if (positions.length !== uniquePositions.size) {
        throw new Error('Las posiciones deben ser únicas');
      }

      // Validar pilotos únicos
      const pilotIds = results.map((r) => r.pilotId);
      const uniquePilots = new Set(pilotIds);
      if (pilotIds.length !== uniquePilots.size) {
        throw new Error('Los pilotos deben ser únicos');
      }

      // Verificar que los pilotos existen
      const pilots = await Pilot.findAll({
        where: { id: { [Op.in]: pilotIds } },
        attributes: ['id'],
      });

      if (pilots.length !== pilotIds.length) {
        throw new Error('Algunos pilotos no existen');
      }

      // Eliminar resultados anteriores si existen
      await RaceResult.destroy({
        where: { raceId },
        transaction,
      });

      // Crear nuevos resultados
      const resultData = results.map((r) => ({
        raceId,
        pilotId: r.pilotId,
        position: r.position,
        points: r.points || 0,
        status: r.status || 'finished',
        timeOrGap: r.timeOrGap || null,
        fastestLap: r.fastestLap || false,
      }));

      await RaceResult.bulkCreate(resultData, { transaction });

      // Actualizar estado de la carrera si está programada
      if (race.status !== 'completed') {
        await race.update({ status: 'completed' }, { transaction });
      }

      await transaction.commit();

      return this.getRaceWithResults(raceId);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Obtiene los resultados de una carrera
   * @param {number} raceId - ID de la carrera
   * @returns {Promise<Array>} Lista de resultados
   */
  async getRaceResults(raceId) {
    const results = await RaceResult.findAll({
      where: { raceId },
      include: [
        {
          model: Pilot,
          as: 'pilot',
          attributes: ['id', 'name', 'acronym', 'team', 'number'],
        },
      ],
      order: [['position', 'ASC']],
    });

    return results.map((r) => this._formatResult(r));
  }

  // ==========================================
  // ESTADÍSTICAS
  // ==========================================

  /**
   * Obtiene estadísticas de una temporada
   * @param {number} season - Año de la temporada
   * @returns {Promise<Object>} Estadísticas de la temporada
   */
  async getSeasonStats(season) {
    const races = await Race.findAll({
      where: { season },
      attributes: ['id', 'status'],
    });

    const totalRaces = races.length;
    const completedRaces = races.filter((r) => r.status === 'completed').length;
    const upcomingRaces = races.filter((r) => r.status === 'scheduled').length;
    const cancelledRaces = races.filter((r) => r.status === 'cancelled').length;

    // Contar predicciones totales de la temporada
    const raceIds = races.map((r) => r.id);
    const totalPredictions = await Prediction.count({
      where: { raceId: { [Op.in]: raceIds } },
    });

    // Promedio de predicciones por carrera completada
    const avgPredictionsPerRace = completedRaces > 0
      ? Math.round(totalPredictions / completedRaces)
      : 0;

    return {
      season,
      totalRaces,
      completedRaces,
      upcomingRaces,
      cancelledRaces,
      progressPercentage: totalRaces > 0 ? Math.round((completedRaces / totalRaces) * 100) : 0,
      totalPredictions,
      avgPredictionsPerRace,
    };
  }

  /**
   * Obtiene el calendario completo de una temporada
   * @param {number} season - Año de la temporada
   * @returns {Promise<Array>} Calendario con meses agrupados
   */
  async getSeasonCalendar(season) {
    const races = await Race.findAll({
      where: { season },
      order: [['round', 'ASC']],
    });

    // Agrupar por mes
    const calendar = {};

    races.forEach((race) => {
      const date = new Date(race.raceDate);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthName = date.toLocaleString('es-ES', { month: 'long', year: 'numeric' });

      if (!calendar[monthKey]) {
        calendar[monthKey] = {
          month: monthName,
          races: [],
        };
      }

      calendar[monthKey].races.push({
        id: race.id,
        name: race.name,
        circuit: race.circuit,
        country: race.country,
        flagUrl: race.flagUrl,
        round: race.round,
        raceDate: race.raceDate,
        status: race.status,
        isSprint: race.isSprint,
      });
    });

    return Object.values(calendar);
  }
}

export default new RaceService();