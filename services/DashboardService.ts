import { Op, fn, col, literal } from "sequelize";
import {
  User,
  Pilot,
  Race,
  RaceResult,
  Prediction,
  PredictionItem,
  League,
  LeagueMember,
  UserStats,
  sequelize,
} from "../models/index.js";

class DashboardService {
  /**
   * Obtiene todos los datos del dashboard para un usuario
   * @param {number} userId - ID del usuario
   * @returns {Object} Datos completos del dashboard
   */
  async getFullDashboard(userId) {
    const [leagues, stats, nextRace, recentPredictions, pilotStats] = await Promise.all([
      this.getUserLeagues(userId),
      this.getUserStats(userId),
      this.getNextRace(userId),
      this.getRecentPredictions(userId),
      this.getPilotStats(userId),
    ]);

    return {
      leagues,
      stats,
      nextRace,
      recentPredictions,
      mostPickedPilot: pilotStats.mostPicked,
      bestPerformingPilot: pilotStats.bestPerforming,
    };
  }

  /**
   * Obtiene las ligas del usuario con su ranking y puntos
   * @param {number} userId - ID del usuario
   * @returns {Array} Lista de ligas
   */
  async getUserLeagues(userId) {
    // Obtener membresías del usuario
    const memberships = await LeagueMember.findAll({
      where: { userId },
      include: [
        {
          model: League,
          as: 'league',
          include: [
            {
              model: LeagueMember,
              as: 'leagueMemberships',
              attributes: ['userId', 'totalPoints'],
            },
          ],
        },
      ],
      order: [[{ model: League, as: 'league' }, 'name', 'ASC']],
    });

    return memberships.map((membership) => {
      const league = membership.league;
      const allMembers = league.leagueMemberships;
      
      // Calcular ranking del usuario en esta liga
      const sortedMembers = [...allMembers].sort((a, b) => b.totalPoints - a.totalPoints);
      const userRank = sortedMembers.findIndex((m) => m.userId === userId) + 1;
      const userMember = allMembers.find((m) => m.userId === userId);

      return {
        id: league.id,
        name: league.name,
        slug: league.slug,
        memberCount: allMembers.length,
        userRank,
        userPoints: userMember?.totalPoints || 0,
        isAdmin: membership.role === 'admin',
      };
    });
  }

  /**
   * Obtiene o calcula las estadísticas del usuario
   * @param {number} userId - ID del usuario
   * @returns {Object} Estadísticas del usuario
   */
  async getUserStats(userId) {
    // Intentar obtener stats cacheadas
    let userStats = await UserStats.findOne({ where: { userId } });

    // Si no existen o están desactualizadas (más de 1 hora), recalcular
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    if (!userStats || userStats.lastUpdated < oneHourAgo) {
      userStats = await this.calculateAndSaveUserStats(userId);
    }

    return {
      totalPoints: userStats.totalPoints,
      totalPredictions: userStats.totalPredictions,
      currentStreak: userStats.currentStreak,
      bestStreak: userStats.bestStreak,
      avgPointsPerRace: Math.round(userStats.avgPointsPerRace * 100) / 100,
      perfectPredictions: userStats.perfectPredictions,
    };
  }

  /**
   * Calcula y guarda las estadísticas del usuario
   * @param {number} userId - ID del usuario
   * @returns {Object} UserStats actualizado
   */
  async calculateAndSaveUserStats(userId) {
    // Obtener todas las predicciones scored del usuario
    const predictions = await Prediction.findAll({
      where: {
        userId,
        status: 'scored',
      },
      order: [['submittedAt', 'DESC']],
    });

    const totalPredictions = predictions.length;
    const totalPoints = predictions.reduce((sum, p) => sum + p.pointsEarned, 0);
    const avgPointsPerRace = totalPredictions > 0 ? totalPoints / totalPredictions : 0;
    
    // Predicciones perfectas (todas las posiciones correctas)
    const perfectPredictions = predictions.filter(
      (p) => p.correctPositions === p.totalPositions
    ).length;

    // Calcular rachas (streak)
    const { currentStreak, bestStreak } = this.calculateStreaks(predictions);

    // Upsert de estadísticas
    const [userStats] = await UserStats.upsert({
      userId,
      totalPoints,
      totalPredictions,
      currentStreak,
      bestStreak,
      perfectPredictions,
      avgPointsPerRace,
      lastUpdated: new Date(),
    }, {
      returning: true,
    });

    return userStats;
  }

  /**
   * Calcula rachas de predicciones con puntos
   * @param {Array} predictions - Predicciones ordenadas por fecha desc
   * @returns {Object} { currentStreak, bestStreak }
   */
  calculateStreaks(predictions) {
    if (predictions.length === 0) {
      return { currentStreak: 0, bestStreak: 0 };
    }

    let currentStreak = 0;
    let bestStreak = 0;
    let tempStreak = 0;
    let isCurrentStreak = true;

    for (const prediction of predictions) {
      // Consideramos "streak" si obtuvo al menos 1 punto
      if (prediction.pointsEarned > 0) {
        tempStreak++;
        if (isCurrentStreak) {
          currentStreak = tempStreak;
        }
        bestStreak = Math.max(bestStreak, tempStreak);
      } else {
        isCurrentStreak = false;
        tempStreak = 0;
      }
    }

    return { currentStreak, bestStreak };
  }

  /**
   * Obtiene la próxima carrera y si el usuario ya tiene predicción
   * @param {number} userId - ID del usuario
   * @returns {Object|null} Datos de la próxima carrera
   */
  async getNextRace(userId) {
    const now = new Date();

    // Buscar próxima carrera programada
    const race = await Race.findOne({
      where: {
        raceDate: { [Op.gt]: now },
        status: 'scheduled',
      },
      order: [['raceDate', 'ASC']],
    });

    if (!race) {
      return null;
    }

    // Verificar si el usuario ya tiene predicción para esta carrera
    const existingPrediction = await Prediction.findOne({
      where: {
        userId,
        raceId: race.id,
      },
    });

    return {
      id: race.id,
      name: race.name,
      circuit: race.circuit,
      country: race.country,
      date: race.raceDate,
      flagUrl: race.flagUrl,
      hasPrediction: !!existingPrediction,
    };
  }

  /**
   * Obtiene las predicciones recientes del usuario
   * @param {number} userId - ID del usuario
   * @param {number} limit - Cantidad máxima de resultados
   * @returns {Array} Lista de predicciones recientes
   */
  async getRecentPredictions(userId, limit = 5) {
    const predictions = await Prediction.findAll({
      where: {
        userId,
        status: 'scored',
      },
      include: [
        {
          model: Race,
          as: 'race',
          attributes: ['id', 'name', 'raceDate'],
        },
      ],
      order: [['submittedAt', 'DESC']],
      limit,
    });

    return predictions.map((p) => ({
      id: p.id,
      raceName: p.race.name,
      raceDate: p.race.raceDate,
      pointsEarned: p.pointsEarned,
      correctPositions: p.correctPositions,
      totalPositions: p.totalPositions,
    }));
  }

  /**
   * Obtiene estadísticas de pilotos para el usuario
   * @param {number} userId - ID del usuario
   * @returns {Object} { mostPicked, bestPerforming }
   */
  async getPilotStats(userId) {
    // Piloto más elegido
    const mostPicked = await this.getMostPickedPilot(userId);
    
    // Piloto con mejor rendimiento
    const bestPerforming = await this.getBestPerformingPilot(userId);

    return { mostPicked, bestPerforming };
  }

  /**
   * Obtiene el piloto más elegido por el usuario
   * @param {number} userId - ID del usuario
   * @returns {Object|null} Datos del piloto más elegido
   */
  async getMostPickedPilot(userId) {
    const result = await PredictionItem.findOne({
      attributes: [
        'pilotId',
        [fn('COUNT', col('pilotId')), 'count'],
      ],
      include: [
        {
          model: Prediction,
          as: 'prediction',
          attributes: [],
          where: { userId },
        },
        {
          model: Pilot,
          as: 'pilot',
          attributes: ['id', 'name', 'team', 'acronym'],
        },
      ],
      group: ['pilotId', 'pilot.id'],
      order: [[literal('count'), 'DESC']],
      subQuery: false,
    });

    if (!result) {
      return null;
    }

    return {
      id: result.pilot.id,
      name: result.pilot.name,
      team: result.pilot.team,
      acronym: result.pilot.acronym,
      count: parseInt(result.getDataValue('count')),
    };
  }

  /**
   * Obtiene el piloto con mejor rendimiento para el usuario
   * (Mayor tasa de acierto cuando lo elige)
   * @param {number} userId - ID del usuario
   * @returns {Object|null} Datos del piloto mejor performante
   */
  async getBestPerformingPilot(userId) {
    const result = await PredictionItem.findOne({
      attributes: [
        'pilotId',
        [fn('COUNT', col('PredictionItem.id')), 'totalPicks'],
        [fn('SUM', literal('CASE WHEN `PredictionItem`.`isCorrect` = 1 THEN 1 ELSE 0 END')), 'correctPicks'],
        [literal('(SUM(CASE WHEN `PredictionItem`.`isCorrect` = 1 THEN 1 ELSE 0 END) / COUNT(`PredictionItem`.`id`)) * 100'), 'successRate'],
      ],
      include: [
        {
          model: Prediction,
          as: 'prediction',
          attributes: [],
          where: { 
            userId,
            status: 'scored',
          },
        },
        {
          model: Pilot,
          as: 'pilot',
          attributes: ['id', 'name', 'team', 'acronym'],
        },
      ],
      group: ['pilotId', 'pilot.id'],
      having: literal('COUNT(`PredictionItem`.`id`) >= 3'), // Mínimo 3 picks para ser relevante
      order: [[literal('successRate'), 'DESC']],
      subQuery: false,
    });

    if (!result) {
      return null;
    }

    return {
      id: result.pilot.id,
      name: result.pilot.name,
      team: result.pilot.team,
      acronym: result.pilot.acronym,
      successRate: Math.round(parseFloat(result.getDataValue('successRate')) * 100) / 100,
    };
  }
}

export default new DashboardService();