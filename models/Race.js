import { DataTypes } from "sequelize";
import sequelize from "../database.js";

const Race = sequelize.define("Race", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  // === Información básica ===
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: 'Nombre del Gran Premio (ej: "Gran Premio de Mónaco")',
  },
  officialName: {
    type: DataTypes.STRING(150),
    allowNull: true,
    comment: 'Nombre oficial completo incluyendo sponsor',
  },
  
  // === Ubicación ===
  circuit: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: 'Nombre del circuito',
  },
  country: {
    type: DataTypes.STRING(60),
    allowNull: false,
  },
  city: {
    type: DataTypes.STRING(60),
    allowNull: true,
  },
  flagUrl: {
    type: DataTypes.STRING(500),
    allowNull: true,
    comment: 'URL de la bandera del país',
  },
  circuitImageUrl: {
    type: DataTypes.STRING(500),
    allowNull: true,
    comment: 'URL del layout del circuito',
  },
  
  // === Calendario ===
  round: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'Número de ronda en el campeonato',
  },
  season: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: () => new Date().getFullYear(),
  },
  
  // === Fechas y horarios (UTC) ===
  raceDate: {
    type: DataTypes.DATE,
    allowNull: false,
    comment: 'Fecha y hora de la carrera (UTC)',
  },
  qualifyingDate: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Fecha y hora de la clasificación (UTC)',
  },
  sprintDate: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Fecha de sprint si aplica (UTC)',
  },
  fp1Date: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  fp2Date: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  fp3Date: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  
  // === Predicciones ===
  predictionDeadline: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Fecha límite para enviar predicciones (si null, usa qualifyingDate)',
  },
  
  // === Estado ===
  status: {
    type: DataTypes.ENUM('scheduled', 'qualifying', 'in_progress', 'completed', 'cancelled', 'postponed'),
    defaultValue: 'scheduled',
  },
  
  // === Información adicional ===
  laps: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Número de vueltas de la carrera',
  },
  circuitLength: {
    type: DataTypes.FLOAT,
    allowNull: true,
    comment: 'Longitud del circuito en km',
  },
  timezone: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'Zona horaria local del circuito',
  },
  
  // === Flags de formato especial ===
  isSprint: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Si el fin de semana incluye carrera sprint',
  },
}, {
  tableName: 'races',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['season', 'round'],
      name: 'unique_season_round',
    },
    {
      fields: ['raceDate'],
      name: 'idx_races_date',
    },
    {
      fields: ['status'],
      name: 'idx_races_status',
    },
    {
      fields: ['season', 'status'],
      name: 'idx_races_season_status',
    },
  ],
});

// === Métodos de instancia ===

// Obtener la fecha límite efectiva para predicciones
Race.prototype.getEffectiveDeadline = function() {
  return this.predictionDeadline || this.qualifyingDate || this.raceDate;
};

// Verificar si se pueden hacer predicciones
Race.prototype.canAcceptPredictions = function() {
  if (this.status !== 'scheduled') return false;
  const deadline = this.getEffectiveDeadline();
  return new Date() < new Date(deadline);
};

// Verificar si la carrera ya terminó
Race.prototype.isCompleted = function() {
  return this.status === 'completed';
};

// === Métodos estáticos ===

// Obtener próxima carrera
Race.getNextRace = async function() {
  return await this.findOne({
    where: {
      raceDate: { [sequelize.Sequelize.Op.gt]: new Date() },
      status: 'scheduled',
    },
    order: [['raceDate', 'ASC']],
  });
};

// Obtener carreras de una temporada
Race.getBySeason = async function(season) {
  return await this.findAll({
    where: { season },
    order: [['round', 'ASC']],
  });
};

export default Race;