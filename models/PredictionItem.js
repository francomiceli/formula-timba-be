import { DataTypes } from "sequelize";
import sequelize from "../database.js";

const PredictionItem = sequelize.define("PredictionItem", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  
  // === Relaciones ===
  predictionId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'predictions',
      key: 'id',
    },
  },
  pilotId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Pilots',
      key: 'id',
    },
  },
  
  // === Predicción ===
  position: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1,
      max: 22,
    },
    comment: 'Posición predicha por el usuario',
  },
  
  // === Resultado (calculado después de la carrera) ===
  actualPosition: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Posición real del piloto en la carrera',
  },
  isCorrect: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'true si acertó la posición exacta',
  },
  positionDiff: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Diferencia entre predicción y resultado (puede ser negativo)',
  },
  
  // === Puntuación ===
  pointsAwarded: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Puntos otorgados por este ítem',
  },
  
  // === Metadata de scoring ===
  scoringReason: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'Razón del puntaje: "exact", "near_miss", "in_top10", etc.',
  },
}, {
  tableName: 'prediction_items',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['predictionId', 'position'],
      name: 'unique_prediction_position',
    },
    {
      unique: true,
      fields: ['predictionId', 'pilotId'],
      name: 'unique_prediction_pilot',
    },
    {
      fields: ['pilotId'],
      name: 'idx_items_pilot',
    },
    {
      fields: ['predictionId', 'isCorrect'],
      name: 'idx_items_correct',
    },
  ],
});

// === Métodos de instancia ===

// Verificar si fue un "near miss" (±1 posición)
PredictionItem.prototype.isNearMiss = function() {
  if (this.actualPosition === null || this.isCorrect) return false;
  return Math.abs(this.position - this.actualPosition) === 1;
};

// Calcular diferencia de posición
PredictionItem.prototype.calculateDiff = function() {
  if (this.actualPosition === null) return null;
  return this.actualPosition - this.position;
};

// === Métodos estáticos ===

// Crear múltiples items de predicción
PredictionItem.bulkCreateForPrediction = async function(predictionId, items, transaction = null) {
  const data = items.map((item, index) => ({
    predictionId,
    pilotId: item.pilotId,
    position: item.position || index + 1,
  }));
  
  return await this.bulkCreate(data, { transaction });
};

// Obtener items ordenados por posición
PredictionItem.getByPrediction = async function(predictionId) {
  return await this.findAll({
    where: { predictionId },
    order: [['position', 'ASC']],
  });
};

export default PredictionItem;