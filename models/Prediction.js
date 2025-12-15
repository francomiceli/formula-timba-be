import { DataTypes } from "sequelize";
import sequelize from "../database.js";

const Prediction = sequelize.define("Prediction", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  
  // === Relaciones ===
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id',
    },
  },
  raceId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'races',
      key: 'id',
    },
  },
  leagueId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'leagues',
      key: 'id',
    },
    comment: 'null = predicción personal sin liga específica',
  },
  
  // === Scoring (calculado después de la carrera) ===
  pointsEarned: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Puntos totales obtenidos en esta predicción',
  },
  correctPositions: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Cantidad de posiciones exactamente acertadas',
  },
  totalPositions: {
    type: DataTypes.INTEGER,
    defaultValue: 10,
    comment: 'Total de posiciones predichas (normalmente top 10)',
  },
  
  // === Métricas adicionales de scoring ===
  nearMisses: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Pilotos predichos que quedaron ±1 posición',
  },
  bonusPoints: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Puntos bonus (ej: acertar podio completo)',
  },
  
  // === Estado ===
  status: {
    type: DataTypes.ENUM('draft', 'submitted', 'locked', 'scored', 'cancelled'),
    defaultValue: 'submitted',
    comment: 'draft=borrador, submitted=enviada, locked=bloqueada (pasó deadline), scored=puntuada, cancelled=cancelada',
  },
  
  // === Timestamps personalizados ===
  submittedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    comment: 'Fecha de envío original',
  },
  lastModifiedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Última modificación (si se permite editar)',
  },
  scoredAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Fecha cuando se calcularon los puntos',
  },
  
  // === Metadata ===
  submissionCount: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
    comment: 'Veces que se modificó la predicción',
  },
  ipAddress: {
    type: DataTypes.STRING(45),
    allowNull: true,
    comment: 'IP desde donde se envió (para auditoría)',
  },
}, {
  tableName: 'predictions',
  timestamps: true,
  paranoid: true, // Soft delete
  indexes: [
    {
      unique: true,
      fields: ['userId', 'raceId', 'leagueId'],
      name: 'unique_user_race_league',
    },
    {
      fields: ['raceId', 'status'],
      name: 'idx_predictions_race_status',
    },
    {
      fields: ['userId', 'status'],
      name: 'idx_predictions_user_status',
    },
    {
      fields: ['leagueId', 'raceId'],
      name: 'idx_predictions_league_race',
    },
    {
      fields: ['pointsEarned'],
      name: 'idx_predictions_points',
    },
  ],
});

// === Métodos de instancia ===

// Verificar si la predicción es perfecta
Prediction.prototype.isPerfect = function() {
  return this.correctPositions === this.totalPositions;
};

// Calcular porcentaje de acierto
Prediction.prototype.getAccuracyPercentage = function() {
  if (this.totalPositions === 0) return 0;
  return Math.round((this.correctPositions / this.totalPositions) * 100);
};

// Verificar si se puede editar
Prediction.prototype.canEdit = function() {
  return ['draft', 'submitted'].includes(this.status);
};

// === Métodos estáticos ===

// Obtener predicción de un usuario para una carrera
Prediction.getByUserAndRace = async function(userId, raceId, leagueId = null) {
  return await this.findOne({
    where: { userId, raceId, leagueId },
  });
};

// Verificar si existe predicción
Prediction.exists = async function(userId, raceId, leagueId = null) {
  const count = await this.count({
    where: { userId, raceId, leagueId },
  });
  return count > 0;
};

export default Prediction;