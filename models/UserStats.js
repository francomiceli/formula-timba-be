import { DataTypes } from "sequelize";
import sequelize from "../database.js";

const UserStats = sequelize.define("UserStats", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: true,
    references: {
      model: 'users',
      key: 'id',
    },
  },
  // === Estadísticas Globales ===
  totalPoints: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Puntos totales acumulados en todas las ligas',
  },
  totalPredictions: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Cantidad total de predicciones realizadas',
  },
  scoredPredictions: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Predicciones que ya fueron puntuadas',
  },
  
  // === Rachas ===
  currentStreak: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Racha actual de carreras con al menos 1 punto',
  },
  bestStreak: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Mejor racha histórica',
  },
  
  // === Aciertos ===
  perfectPredictions: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Predicciones donde acertó todas las posiciones',
  },
  totalCorrectPositions: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Total de posiciones exactas acertadas',
  },
  
  // === Promedios ===
  avgPointsPerRace: {
    type: DataTypes.FLOAT,
    defaultValue: 0,
    comment: 'Promedio de puntos por carrera',
  },
  avgCorrectPositions: {
    type: DataTypes.FLOAT,
    defaultValue: 0,
    comment: 'Promedio de posiciones acertadas por predicción',
  },
  
  // === Piloto más elegido ===
  mostPickedPilotId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'Pilots',
      key: 'id',
    },
  },
  mostPickedCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Veces que eligió a su piloto más elegido',
  },
  
  // === Piloto mejor performante ===
  bestPerformingPilotId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'Pilots',
      key: 'id',
    },
  },
  bestPerformingSuccessRate: {
    type: DataTypes.FLOAT,
    defaultValue: 0,
    comment: 'Tasa de acierto del piloto mejor performante (%)',
  },
  
  // === Metadata ===
  lastCalculatedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    comment: 'Última vez que se recalcularon las estadísticas',
  },
  cacheVersion: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
    comment: 'Versión del cache para invalidación',
  },
}, {
  tableName: 'user_stats',
  timestamps: true,
  indexes: [
    {
      fields: ['totalPoints'],
      name: 'idx_user_stats_points',
    },
    {
      fields: ['lastCalculatedAt'],
      name: 'idx_user_stats_calculated',
    },
  ],
});

// Método de instancia para verificar si necesita recálculo
UserStats.prototype.needsRecalculation = function(maxAgeMinutes = 60) {
  const maxAge = maxAgeMinutes * 60 * 1000; // convertir a ms
  const now = new Date();
  const lastCalc = new Date(this.lastCalculatedAt);
  return (now - lastCalc) > maxAge;
};

export default UserStats;