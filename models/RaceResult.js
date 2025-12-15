import { DataTypes } from "sequelize";
import sequelize from "../database.js";

const RaceResult = sequelize.define("RaceResult", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  raceId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'races',
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
  position: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1,
      max: 22,
    },
  },
  // Puntos F1 oficiales obtenidos por el piloto
  points: {
    type: DataTypes.FLOAT,
    defaultValue: 0,
  },
  // Estado del piloto en la carrera
  status: {
    type: DataTypes.ENUM('finished', 'dnf', 'dsq', 'dns'),
    defaultValue: 'finished',
    comment: 'finished=terminó, dnf=no terminó, dsq=descalificado, dns=no largó',
  },
  // Tiempo de carrera o diferencia con el líder
  timeOrGap: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Tiempo total o diferencia con P1 (ej: "+5.123s", "1 lap")',
  },
  // Vuelta rápida
  fastestLap: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
}, {
  tableName: 'race_results',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['raceId', 'pilotId'],
      name: 'unique_race_pilot',
    },
    {
      unique: true,
      fields: ['raceId', 'position'],
      name: 'unique_race_position',
    },
    {
      fields: ['raceId'],
      name: 'idx_race_results_race',
    },
  ],
});

export default RaceResult;